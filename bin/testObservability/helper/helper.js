const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const request = require('request');
var gitLastCommit = require('git-last-commit');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const { promisify } = require('util');
const getRepoInfo = require('git-repo-info');
const gitconfig = require('gitconfiglocal');
const { spawn, execSync } = require('child_process');
const glob = require('glob');

const pGitconfig = promisify(gitconfig);

const logger = require("../../helpers/logger").winstonLogger;
const utils = require('../../helpers/utils');
const CrashReporter = require('../crashReporter');

// Getting global packages path
const GLOBAL_MODULE_PATH = execSync('npm root -g').toString().trim();

const { name, version } = require('../../../package.json');

const { CYPRESS_V10_AND_ABOVE_CONFIG_FILE_EXTENSIONS } = require('../../helpers/constants');
const { consoleHolder, API_URL, TEST_OBSERVABILITY_REPORTER } = require('./constants');
exports.pending_test_uploads = {
  count: 0
};

exports.debug = (text, shouldReport = false, throwable = null) => {
  if (process.env.BROWSERSTACK_OBSERVABILITY_DEBUG === "true" || process.env.BROWSERSTACK_OBSERVABILITY_DEBUG === "1") {
    logger.info(`[ OBSERVABILITY ] ${text}`);
  }
  if(shouldReport) {
    CrashReporter.getInstance().uploadCrashReport(text, throwable ? throwable && throwable.stack : null);
  }
}

const supportFileContentMap = {};

exports.httpsKeepAliveAgent = new https.Agent({
  keepAlive: true,
  timeout: 60000,
  maxSockets: 2,
  maxTotalSockets: 2
});

const httpsScreenshotsKeepAliveAgent = new https.Agent({
  keepAlive: true,
  timeout: 60000,
  maxSockets: 2,
  maxTotalSockets: 2
});

const supportFileCleanup = () => {
  Object.keys(supportFileContentMap).forEach(file => {
    try {
      fs.writeFileSync(file, supportFileContentMap[file], {encoding: 'utf-8'});
    } catch(e) {
      exports.debug(`Error while replacing file content for ${file} with it's original content with error : ${e}`, true, e);
    }
  });
}

exports.printBuildLink = async (shouldStopSession, exitCode = null) => {
  if(!this.isTestObservabilitySession()) return;
  try {
    if(shouldStopSession) {
      supportFileCleanup();
      await this.stopBuildUpstream();
    }
    try {
      if(process.env.BS_TESTOPS_BUILD_HASHED_ID 
        && process.env.BS_TESTOPS_BUILD_HASHED_ID != "null" 
        && process.env.BS_TESTOPS_BUILD_HASHED_ID != "undefined") {
          console.log();
          logger.info(`Visit https://observability.browserstack.com/builds/${process.env.BS_TESTOPS_BUILD_HASHED_ID} to view build report, insights, and many more debugging information all at one place!\n`);
      }
    } catch(err) {
      exports.debug('Build Not Found');
    }
  } catch(err) {
    exports.debug(`Error while stopping build with error : ${err}`, true, err);
  }
  if(exitCode) process.exit(exitCode);
}

const nodeRequest = (type, url, data, config) => {
  return new Promise(async (resolve, reject) => {
    const options = {...config,...{
      method: type,
      url: `${API_URL}/${url}`,
      body: data,
      json: config.headers['Content-Type'] === 'application/json',
      agent: this.httpsKeepAliveAgent
    }};

    if(url === exports.requestQueueHandler.screenshotEventUrl) {
      options.agent = httpsScreenshotsKeepAliveAgent;
    }

    request(options, function callback(error, response, body) {
      if(error) {
        reject(error);
      } else if(response.statusCode != 200) {
        reject(response && response.body ? response.body : `Received response from BrowserStack Server with status : ${response.statusCode}`);
      } else {
        try {
          if(typeof(body) !== 'object') body = JSON.parse(body);
        } catch(e) {
          if(!url.includes('/stop')) {
            reject('Not a JSON response from BrowserStack Server');
          }
        }
        resolve({
          data: body
        });
      }
    });
  });
}

exports.failureData = (errors,tag) => {
  if(!errors) return [];
  try {
    if(tag === 'test') {
      return errors.map((failure) => {
        let {stack, ...expanded} = failure
        let expandedArray = Object.keys(expanded).map((key) => {
          return `${key}: ${expanded[key]}`
        })
        return { backtrace: stack.split(/\r?\n/), expanded: expandedArray }
      })
    } else if(tag === 'err') {
      let failureArr = [], failureChildArr = [];
      Object.keys(errors).forEach((key) => {
        try {
          failureChildArr.push(`${key}: ${errors[key]}`);
        } catch(e) {
          exports.debug(`Exception in populating test failure data with error : ${e.message} : ${e.backtrace}`, true, e);
        }
      })
      failureArr.push({ backtrace: errors.stack.split(/\r?\n/), expanded: failureChildArr });
      return failureArr;
    } else {
      return [];
    }
  } catch(e) {
    exports.debug(`Exception in populating test failure data with error : ${e.message} : ${e.backtrace}`, true, e);
  }
  return [];
}

exports.getTestEnv = () => {
  return {
    "ci": "generic",
    "key": uuidv4(),
    "version": version,
    "collector": `js-${name}`,
  }
}

exports.getFileSeparatorData = () => {
  return /^win/.test(process.platform) ? "\\" : "/";
}

exports.findGitConfig = (filePath) => {
  const fileSeparator = exports.getFileSeparatorData();
  if(filePath == null || filePath == '' || filePath == fileSeparator) {
    return null;
  }
  try {
    fs.statSync(filePath + fileSeparator + '.git' + fileSeparator + 'config');
    return filePath;
  } catch(e) {
    let parentFilePath = filePath.split(fileSeparator);
    parentFilePath.pop();
    return exports.findGitConfig(parentFilePath.join(fileSeparator));
  }
}

const getGitMetaData = () => {
  return new Promise(async (resolve, reject) => {
    try {
      var info = getRepoInfo();
      if(!info.commonGitDir) {
        exports.debug(`Unable to find a Git directory`);
        resolve({});
      }
      if(!info.author && exports.findGitConfig(process.cwd())) {
        /* commit objects are packed */
        gitLastCommit.getLastCommit(async (err, commit) => {
          if(err) {
            exports.debug(`Exception in populating Git Metadata with error : ${err}`, true, err);
            return resolve({});
          }
          try {
            info["author"] = info["author"] || `${commit["author"]["name"].replace(/[“]+/g, '')} <${commit["author"]["email"].replace(/[“]+/g, '')}>`;
            info["authorDate"] = info["authorDate"] || commit["authoredOn"];
            info["committer"] = info["committer"] || `${commit["committer"]["name"].replace(/[“]+/g, '')} <${commit["committer"]["email"].replace(/[“]+/g, '')}>`;
            info["committerDate"] = info["committerDate"] || commit["committedOn"];
            info["commitMessage"] = info["commitMessage"] || commit["subject"];

            const { remote } = await pGitconfig(info.commonGitDir);
            const remotes = Object.keys(remote).map(remoteName =>  ({name: remoteName, url: remote[remoteName]['url']}));
            resolve({
              "name": "git",
              "sha": info["sha"],
              "short_sha": info["abbreviatedSha"],
              "branch": info["branch"],
              "tag": info["tag"],
              "committer": info["committer"],
              "committer_date": info["committerDate"],
              "author": info["author"],
              "author_date": info["authorDate"],
              "commit_message": info["commitMessage"],
              "root": info["root"],
              "common_git_dir": info["commonGitDir"],
              "worktree_git_dir": info["worktreeGitDir"],
              "last_tag": info["lastTag"],
              "commits_since_last_tag": info["commitsSinceLastTag"],
              "remotes": remotes
            });
          } catch(e) {
            exports.debug(`Exception in populating Git Metadata with error : ${e}`, true, e);
            return resolve({});
          }
        }, {dst: exports.findGitConfig(process.cwd())});
      } else {
        const { remote } = await pGitconfig(info.commonGitDir);
        const remotes = Object.keys(remote).map(remoteName =>  ({name: remoteName, url: remote[remoteName]['url']}));
        resolve({
          "name": "git",
          "sha": info["sha"],
          "short_sha": info["abbreviatedSha"],
          "branch": info["branch"],
          "tag": info["tag"],
          "committer": info["committer"],
          "committer_date": info["committerDate"],
          "author": info["author"],
          "author_date": info["authorDate"],
          "commit_message": info["commitMessage"],
          "root": info["root"],
          "common_git_dir": info["commonGitDir"],
          "worktree_git_dir": info["worktreeGitDir"],
          "last_tag": info["lastTag"],
          "commits_since_last_tag": info["commitsSinceLastTag"],
          "remotes": remotes
        });
      }
    } catch(err) {
      exports.debug(`Exception in populating Git metadata with error : ${err}`, true, err);
      resolve({});
    }
  })
}

const getCiInfo = () => {
  var env = process.env;
  // Jenkins
  if ((typeof env.JENKINS_URL === "string" && env.JENKINS_URL.length > 0) || (typeof env.JENKINS_HOME === "string" && env.JENKINS_HOME.length > 0)) {
    return {
      name: "Jenkins",
      build_url: env.BUILD_URL,
      job_name: env.JOB_NAME,
      build_number: env.BUILD_NUMBER
    }
  }
  // CircleCI
  if (env.CI === "true" && env.CIRCLECI === "true") {
    return {
      name: "CircleCI",
      build_url: env.CIRCLE_BUILD_URL,
      job_name: env.CIRCLE_JOB,
      build_number: env.CIRCLE_BUILD_NUM
    }
  }
  // Travis CI
  if (env.CI === "true" && env.TRAVIS === "true") {
    return {
      name: "Travis CI",
      build_url: env.TRAVIS_BUILD_WEB_URL,
      job_name: env.TRAVIS_JOB_NAME,
      build_number: env.TRAVIS_BUILD_NUMBER
    }
  }
  // Codeship
  if (env.CI === "true" && env.CI_NAME === "codeship") {
    return {
      name: "Codeship",
      build_url: null,
      job_name: null,
      build_number: null
    }
  }
  // Bitbucket
  if (env.BITBUCKET_BRANCH && env.BITBUCKET_COMMIT) {
    return {
      name: "Bitbucket",
      build_url: env.BITBUCKET_GIT_HTTP_ORIGIN,
      job_name: null,
      build_number: env.BITBUCKET_BUILD_NUMBER
    }
  }
  // Drone
  if (env.CI === "true" && env.DRONE === "true") {
    return {
      name: "Drone",
      build_url: env.DRONE_BUILD_LINK,
      job_name: null,
      build_number: env.DRONE_BUILD_NUMBER
    }
  }
  // Semaphore
  if (env.CI === "true" && env.SEMAPHORE === "true") {
    return {
      name: "Semaphore",
      build_url: env.SEMAPHORE_ORGANIZATION_URL,
      job_name: env.SEMAPHORE_JOB_NAME,
      build_number: env.SEMAPHORE_JOB_ID
    }
  }
  // GitLab
  if (env.CI === "true" && env.GITLAB_CI === "true") {
    return {
      name: "GitLab",
      build_url: env.CI_JOB_URL,
      job_name: env.CI_JOB_NAME,
      build_number: env.CI_JOB_ID
    }
  }
  // Buildkite
  if (env.CI === "true" && env.BUILDKITE === "true") {
    return {
      name: "Buildkite",
      build_url: env.BUILDKITE_BUILD_URL,
      job_name: env.BUILDKITE_LABEL || env.BUILDKITE_PIPELINE_NAME,
      build_number: env.BUILDKITE_BUILD_NUMBER
    }
  }
  // Visual Studio Team Services
  if (env.TF_BUILD === "True") {
    return {
      name: "Visual Studio Team Services",
      build_url: `${env.SYSTEM_TEAMFOUNDATIONSERVERURI}${env.SYSTEM_TEAMPROJECTID}`,
      job_name: env.SYSTEM_DEFINITIONID,
      build_number: env.BUILD_BUILDID
    }
  }
  // if no matches, return null
  return null;
}

let packages = {};

exports.getPackageVersion = (package_, bsConfig = null) => {
  if(packages[package_]) return packages[package_];
  let packageVersion;
  /* Try to find version from module path */
  try {
    packages[package_] = this.requireModule(`${package_}/package.json`).version;
    logger.info(`Getting ${package_} package version from module path = ${packages[package_]}`);
    packageVersion = packages[package_];
  } catch(e) {
    exports.debug(`Unable to find package ${package_} at module path with error ${e}`);
  }

  /* Read package version from npm_dependencies in browserstack.json file if present */
  if(utils.isUndefined(packageVersion) && bsConfig && (process.env.BROWSERSTACK_AUTOMATION == "true" || process.env.BROWSERSTACK_AUTOMATION == "1")) {
    const runSettings = bsConfig.run_settings;
    if (runSettings && runSettings.npm_dependencies !== undefined && 
      Object.keys(runSettings.npm_dependencies).length !== 0 &&
      typeof runSettings.npm_dependencies === 'object') {
      if (package_ in runSettings.npm_dependencies) {
        packages[package_] = runSettings.npm_dependencies[package_];
        logger.info(`Getting ${package_} package version from browserstack.json = ${packages[package_]}`);
        packageVersion = packages[package_];
      }
    }
  }

  /* Read package version from project's package.json if present */
  const packageJSONPath = path.join(process.cwd(), 'package.json');
  if(utils.isUndefined(packageVersion) && fs.existsSync(packageJSONPath)) {
    const packageJSONContents = require(packageJSONPath);
    if(packageJSONContents.devDependencies && !utils.isUndefined(packageJSONContents.devDependencies[package_])) packages[package_] = packageJSONContents.devDependencies[package_];
    if(packageJSONContents.dependencies && !utils.isUndefined(packageJSONContents.dependencies[package_])) packages[package_] = packageJSONContents.dependencies[package_];
    logger.info(`Getting ${package_} package version from package.json = ${packages[package_]}`);
    packageVersion = packages[package_];
  }

  return packageVersion;
}

exports.getAgentVersion = () => {
  let _path = path.join(__dirname, '../../../package.json');
  if(fs.existsSync(_path))
    return require(_path).version;
}

const setEnvironmentVariablesForRemoteReporter = (BS_TESTOPS_JWT, BS_TESTOPS_BUILD_HASHED_ID, BS_TESTOPS_ALLOW_SCREENSHOTS, OBSERVABILITY_LAUNCH_SDK_VERSION) => {
  process.env.BS_TESTOPS_JWT = BS_TESTOPS_JWT;
  process.env.BS_TESTOPS_BUILD_HASHED_ID = BS_TESTOPS_BUILD_HASHED_ID;
  process.env.BS_TESTOPS_ALLOW_SCREENSHOTS = BS_TESTOPS_ALLOW_SCREENSHOTS;
  process.env.OBSERVABILITY_LAUNCH_SDK_VERSION = OBSERVABILITY_LAUNCH_SDK_VERSION;
}

const getCypressCommandEventListener = () => {
  return (
    `require('browserstack-cypress-cli/bin/testObservability/cypress');`
  );
}

const setEventListeners = () => {
  try {
    const cypressCommandEventListener = getCypressCommandEventListener();
    glob(process.cwd() + '/cypress/support/*.js', {}, (err, files) => {
      if(err) return exports.debug('EXCEPTION IN BUILD START EVENT : Unable to parse cypress support files');
      files.forEach(file => {
        try {
          if(!file.includes('commands.js')) {
            const defaultFileContent = fs.readFileSync(file, {encoding: 'utf-8'});
            
            if(!defaultFileContent.includes(cypressCommandEventListener)) {
              let newFileContent =  defaultFileContent + 
                                  '\n' +
                                  cypressCommandEventListener +
                                  '\n'
              fs.writeFileSync(file, newFileContent, {encoding: 'utf-8'});
              supportFileContentMap[file] = defaultFileContent;
            }
          }
        } catch(e) {
          exports.debug(`Unable to modify file contents for ${file} to set event listeners with error ${e}`, true, e);
        }
      });
    });
  } catch(e) {
    exports.debug(`Unable to parse support files to set event listeners with error ${e}`, true, e);
  }
}

const getBuildDetails = (bsConfig) => {
  const isTestObservabilityOptionsPresent = !utils.isUndefined(bsConfig["testObservabilityOptions"]);
  let buildName = '',
      projectName = '',
      buildDescription = '',
      buildTags = [];
  
  /* Pick from environment variables */
  buildName = process.env.BROWSERSTACK_BUILD_NAME || buildName;
  projectName = process.env.BROWSERSTACK_PROJECT_NAME || projectName;
  
  /* Pick from testObservabilityOptions */
  if(isTestObservabilityOptionsPresent) {
    buildName = buildName || bsConfig["testObservabilityOptions"]["buildName"];
    projectName = projectName || bsConfig["testObservabilityOptions"]["projectName"];
    if(!utils.isUndefined(bsConfig["testObservabilityOptions"]["buildTag"])) buildTags = [...buildTags, ...bsConfig["testObservabilityOptions"]["buildTag"]];
    buildDescription = buildDescription || bsConfig["testObservabilityOptions"]["buildDescription"];
  }

  /* Pick from run settings */
  buildName = buildName || bsConfig["run_settings"]["build_name"];
  projectName = projectName || bsConfig["run_settings"]["project_name"];
  if(!utils.isUndefined(bsConfig["run_settings"]["build_tag"])) buildTags = [...buildTags, bsConfig["run_settings"]["build_tag"]];

  buildName = buildName || path.basename(path.resolve(process.cwd()));

  return {
    buildName,
    projectName,
    buildDescription,
    buildTags
  };
}

const setBrowserstackCypressCliDependency = (bsConfig) => {
  const runSettings = bsConfig.run_settings;
  if (runSettings.npm_dependencies !== undefined && 
    typeof runSettings.npm_dependencies === 'object') {
    if (!("browserstack-cypress-cli" in runSettings.npm_dependencies)) {
      logger.warn("Missing browserstack-cypress-cli not found in npm_dependencies");        
      runSettings.npm_dependencies['browserstack-cypress-cli'] = exports.getAgentVersion() || "latest";
      logger.warn(`Adding browserstack-cypress-cli version ${runSettings.npm_dependencies['browserstack-cypress-cli']} in npm_dependencies`);
    }
  }
}

const getCypressConfigFileContent = (bsConfig, cypressConfigPath) => {
  try {
    const cypressConfigFile = require(path.resolve(bsConfig ? bsConfig.run_settings.cypress_config_file : cypressConfigPath));
    if(bsConfig) process.env.OBS_CRASH_REPORTING_CYPRESS_CONFIG_PATH = bsConfig.run_settings.cypress_config_file;
    return cypressConfigFile;
  } catch(e) {
    exports.debug(`Encountered an error when trying to import Cypress Config File ${e}`);
    return {};
  }
}

exports.setCrashReportingConfigFromReporter = (credentialsStr, bsConfigPath, cypressConfigPath) => {
  try {
    const browserstackConfigFile = utils.readBsConfigJSON(bsConfigPath);
    const cypressConfigFile = getCypressConfigFileContent(null, cypressConfigPath);

    if(!credentialsStr) {
      credentialsStr = JSON.stringify({
        username: process.env.OBS_CRASH_REPORTING_USERNAME,
        password: process.env.OBS_CRASH_REPORTING_ACCESS_KEY
      });
    }
    CrashReporter.getInstance().setConfigDetails(credentialsStr, browserstackConfigFile, cypressConfigFile);
  } catch(e) {
    exports.debug(`Encountered an error when trying to set Crash Reporting Config from reporter ${e}`);
  }
}

const setCrashReportingConfig = (bsConfig, bsConfigPath) => {
  try {
    const browserstackConfigFile = utils.readBsConfigJSON(bsConfigPath);
    const cypressConfigFile = getCypressConfigFileContent(bsConfig, null);
    const credentialsStr = JSON.stringify({
      username: bsConfig["auth"]["username"],
      password: bsConfig["auth"]["access_key"]
    });
    CrashReporter.getInstance().setConfigDetails(credentialsStr, browserstackConfigFile, cypressConfigFile);
    process.env.OBS_CRASH_REPORTING_USERNAME = bsConfig["auth"]["username"];
    process.env.OBS_CRASH_REPORTING_ACCESS_KEY = bsConfig["auth"]["access_key"];
    process.env.OBS_CRASH_REPORTING_BS_CONFIG_PATH = bsConfigPath ? path.relative(process.cwd(), bsConfigPath) : null;
  } catch(e) {
    exports.debug(`Encountered an error when trying to set Crash Reporting Config ${e}`);
  }
}

exports.launchTestSession = async (user_config, bsConfigPath) => {
  setCrashReportingConfig(user_config, bsConfigPath);
  
  const obsUserName = user_config["auth"]["username"];
  const obsAccessKey = user_config["auth"]["access_key"];
  
  const BSTestOpsToken = `${obsUserName || ''}:${obsAccessKey || ''}`;
  if(BSTestOpsToken === '') {
    exports.debug('EXCEPTION IN BUILD START EVENT : Missing authentication token', true, null);
    process.env.BS_TESTOPS_BUILD_COMPLETED = false;
    return [null, null];
  } else {
    try {
      const {
        buildName,
        projectName,
        buildDescription,
        buildTags
      } = getBuildDetails(user_config);
      const data = {
        'format': 'json',
        'project_name': projectName,
        'name': buildName,
        'description': buildDescription,
        'start_time': (new Date()).toISOString(),
        'tags': buildTags,
        'host_info': {
          hostname: os.hostname(),
          platform: os.platform(),
          type: os.type(),
          version: os.version(),
          arch: os.arch()
        },
        'ci_info': getCiInfo(),
        'build_run_identifier': process.env.BROWSERSTACK_BUILD_RUN_IDENTIFIER,
        'failed_tests_rerun': process.env.BROWSERSTACK_RERUN || false,
        'version_control': await getGitMetaData(),
        'observability_version': {
          frameworkName: "Cypress",
          frameworkVersion: exports.getPackageVersion('cypress', user_config),
          sdkVersion: exports.getAgentVersion()
        }
      };
      const config = {
        auth: {
          username: obsUserName,
          password: obsAccessKey
        },
        headers: {
          'Content-Type': 'application/json',
          'X-BSTACK-TESTOPS': 'true'
        }
      };

      const response = await nodeRequest('POST','api/v1/builds',data,config);
      exports.debug('Build creation successfull!');
      process.env.BS_TESTOPS_BUILD_COMPLETED = true;
      setEnvironmentVariablesForRemoteReporter(response.data.jwt, response.data.build_hashed_id, response.data.allow_screenshots, data.observability_version.sdkVersion);
      // setEventListeners();
      if(this.isBrowserstackInfra()) setBrowserstackCypressCliDependency(user_config);
    } catch(error) {
      if(!error.errorType) {
        if (error.response) {
          exports.debug(`EXCEPTION IN BUILD START EVENT : ${error.response.status} ${error.response.statusText} ${JSON.stringify(error.response.data)}`, true, error);
        } else {
          exports.debug(`EXCEPTION IN BUILD START EVENT : ${error.message || error}`, true, error);
        }
      } else {
        const { errorType, message } = error;
        switch (errorType) {
          case 'ERROR_INVALID_CREDENTIALS':
            logger.error(message);
            break;
          case 'ERROR_ACCESS_DENIED':
            logger.info(message);
            break;
          case 'ERROR_SDK_DEPRECATED':
            logger.error(message);
            break;
          default:
            logger.error(message);
        }
      }

      process.env.BS_TESTOPS_BUILD_COMPLETED = false;
      setEnvironmentVariablesForRemoteReporter(null, null, null);
    }
  }
}

exports.getHookDetails = (hookTitle) => {
  if(!hookTitle || typeof(hookTitle) != 'string') return [null, null];
  if(hookTitle.indexOf('hook:') !== -1) {
    const hook_details = hookTitle.split('hook:');
    return [hook_details[0].slice(0,-1).split('"')[1], hook_details[1].substring(1)];
  } else if(hookTitle.indexOf('hook') !== -1) {
    const hook_details = hookTitle.split('hook');
    return [hook_details[0].slice(0,-1).split('"')[1], hookTitle];
  } else {
    return [null, null];
  }
}

exports.getHooksForTest = (test) => {
  if(!test || !test.parent) return [];
  const hooksArr = [];
  ['_beforeAll','_afterAll','_beforeEach','_afterEach'].forEach(hookType => {
    let hooks = test.parent[hookType] || []
    hooks.forEach(testHook => {
      if(testHook.hookAnalyticsId) hooksArr.push(testHook.hookAnalyticsId);
    })
  });
  return [...hooksArr,...exports.getHooksForTest(test.parent)];
}

exports.mapTestHooks = (test) => {
  if(!test || !test.parent) return;
  ['_beforeAll','_afterAll','_beforeEach','_afterEach'].forEach(hookType => {
    let hooks = test.parent[hookType] || []
    hooks.forEach(testHook => {
      if(!testHook.hookAnalyticsId) {
        testHook.hookAnalyticsId = uuidv4();
      } else if(testHook.markedStatus && hookType == '_afterEach') {
        testHook.hookAnalyticsId = uuidv4();
        delete testHook.markedStatus;
      }
      testHook['test_run_id'] = testHook['test_run_id'] || test.testAnalyticsId;
    })
  });
  exports.mapTestHooks(test.parent);
}

exports.batchAndPostEvents = async (eventUrl, kind, data) => {
  const config = {
    headers: {
      'Authorization': `Bearer ${process.env.BS_TESTOPS_JWT}`,
      'Content-Type': 'application/json',
      'X-BSTACK-TESTOPS': 'true'
    }
  };

  try {
    const response = await nodeRequest('POST',eventUrl,data,config);
    if(response.data.error) {
      throw({message: response.data.error});
    } else {
      exports.debug(`${kind} event successfull!`)
      exports.pending_test_uploads.count = Math.max(0,exports.pending_test_uploads.count - data.length);
    }
  } catch(error) {
    if (error.response) {
      exports.debug(`EXCEPTION IN ${kind} REQUEST TO TEST OBSERVABILITY : ${error.response.status} ${error.response.statusText} ${JSON.stringify(error.response.data)}`, true, error);
    } else {
      exports.debug(`EXCEPTION IN ${kind} REQUEST TO TEST OBSERVABILITY : ${error.message || error}`, true, error);
    }
    exports.pending_test_uploads.count = Math.max(0,exports.pending_test_uploads.count - data.length);
  }
}

const RequestQueueHandler = require('./requestQueueHandler');
exports.requestQueueHandler = new RequestQueueHandler();

exports.uploadEventData = async (eventData, run=0) => {
  const log_tag = {
    ['TestRunStarted']: 'Test_Start_Upload',
    ['TestRunFinished']: 'Test_End_Upload',
    ['TestRunSkipped']: 'Test_Skipped_Upload',
    ['LogCreated']: 'Log_Upload',
    ['HookRunStarted']: 'Hook_Start_Upload',
    ['HookRunFinished']: 'Hook_End_Upload',
    ['CBTSessionCreated']: 'CBT_Upload',
    ['BuildUpdate']: 'Build_Update'
  }[eventData.event_type];

  if(run === 0 && process.env.BS_TESTOPS_JWT != "null") exports.pending_test_uploads.count += 1;
  
  if (process.env.BS_TESTOPS_BUILD_COMPLETED === "true") {
    if(process.env.BS_TESTOPS_JWT == "null") {
      exports.debug(`EXCEPTION IN ${log_tag} REQUEST TO TEST OBSERVABILITY : missing authentication token`);
      exports.pending_test_uploads.count = Math.max(0,exports.pending_test_uploads.count-1);
      return {
        status: 'error',
        message: 'Token/buildID is undefined, build creation might have failed'
      };
    } else {
      let data = eventData, event_api_url = 'api/v1/event';
      
      exports.requestQueueHandler.start();
      const { shouldProceed, proceedWithData, proceedWithUrl } = exports.requestQueueHandler.add(eventData);
      if(!shouldProceed) {
        return;
      } else if(proceedWithData) {
        data = proceedWithData;
        event_api_url = proceedWithUrl;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${process.env.BS_TESTOPS_JWT}`,
          'Content-Type': 'application/json',
          'X-BSTACK-TESTOPS': 'true'
        }
      };
  
      try {
        const response = await nodeRequest('POST',event_api_url,data,config);
        if(response.data.error) {
          throw({message: response.data.error});
        } else {
          exports.debug(`${event_api_url !== exports.requestQueueHandler.eventUrl ? log_tag : 'Batch-Queue'}[${run}] event successfull!`)
          exports.pending_test_uploads.count = Math.max(0,exports.pending_test_uploads.count - (event_api_url === 'api/v1/event' ? 1 : data.length));
          return {
            status: 'success',
            message: ''
          };
        }
      } catch(error) {
        if (error.response) {
          exports.debug(`EXCEPTION IN ${event_api_url !== exports.requestQueueHandler.eventUrl ? log_tag : 'Batch-Queue'} REQUEST TO TEST OBSERVABILITY : ${error.response.status} ${error.response.statusText} ${JSON.stringify(error.response.data)}`, true, error);
        } else {
          exports.debug(`EXCEPTION IN ${event_api_url !== exports.requestQueueHandler.eventUrl ? log_tag : 'Batch-Queue'} REQUEST TO TEST OBSERVABILITY : ${error.message || error}`, true, error);
        }
        exports.pending_test_uploads.count = Math.max(0,exports.pending_test_uploads.count - (event_api_url === 'api/v1/event' ? 1 : data.length));
        return {
          status: 'error',
          message: error.message || (error.response ? `${error.response.status}:${error.response.statusText}` : error)
        };
      }
    }
  } else if (run >= 5) {
    exports.debug(`EXCEPTION IN ${log_tag} REQUEST TO TEST OBSERVABILITY : Build Start is not completed and ${log_tag} retry runs exceeded`);
    if(process.env.BS_TESTOPS_JWT != "null") exports.pending_test_uploads.count = Math.max(0,exports.pending_test_uploads.count-1);
    return {
      status: 'error',
      message: 'Retry runs exceeded'
    };
  } else if(process.env.BS_TESTOPS_BUILD_COMPLETED !== "false") {
    setTimeout(function(){ exports.uploadEventData(eventData, run+1) }, 1000);
  }
}

exports.isTestObservabilitySupportedCypressVersion = (cypress_config_filename) => {
  const extension = cypress_config_filename.split('.').pop();
  return CYPRESS_V10_AND_ABOVE_CONFIG_FILE_EXTENSIONS.includes(extension);
}

exports.setTestObservabilityFlags = (bsConfig) => {
  /* testObservability */
  let isTestObservabilitySession = false;
  try {
    /* set default again but under try catch in case of wrong config */
    isTestObservabilitySession = utils.nonEmptyArray(bsConfig.run_settings.downloads) ? false : true;

    if(!utils.isUndefined(bsConfig["testObservability"])) isTestObservabilitySession = ( bsConfig["testObservability"] == true || bsConfig["testObservability"] == 1 );
    if(!utils.isUndefined(process.env.BROWSERSTACK_TEST_OBSERVABILITY)) isTestObservabilitySession = ( process.env.BROWSERSTACK_TEST_OBSERVABILITY == "true" || process.env.BROWSERSTACK_TEST_OBSERVABILITY == "1" );
    if(process.argv.includes('--disable-test-observability')) isTestObservabilitySession = false;
    isTestObservabilitySession = isTestObservabilitySession && this.isTestObservabilitySupportedCypressVersion(bsConfig.run_settings.cypress_config_file);
  } catch(e) {
    isTestObservabilitySession = false;
    exports.debug(`EXCEPTION while parsing testObservability capability with error ${e}`, true, e);
  }
  
  /* browserstackAutomation */
  let isBrowserstackInfra = true;
  try {
    if(!utils.isUndefined(bsConfig["browserstackAutomation"])) isBrowserstackInfra = ( bsConfig["browserstackAutomation"] == true || bsConfig["browserstackAutomation"] == 1 );
    if(!utils.isUndefined(process.env.BROWSERSTACK_AUTOMATION)) isBrowserstackInfra = ( process.env.BROWSERSTACK_AUTOMATION == "true" || process.env.BROWSERSTACK_AUTOMATION == "1" );
    if(process.argv.includes('--disable-browserstack-automation')) isBrowserstackInfra = false;
  } catch(e) {
    isBrowserstackInfra = true;
    exports.debug(`EXCEPTION while parsing browserstackAutomation capability with error ${e}`, true, e);
  }
  
  if(isTestObservabilitySession) logger.warn("testObservability is set to true. Other test reporters you are using will be automatically disabled. Learn more at browserstack.com/docs/test-observability/overview/what-is-test-observability");

  process.env.BROWSERSTACK_TEST_OBSERVABILITY = isTestObservabilitySession;
  process.env.BROWSERSTACK_AUTOMATION = isBrowserstackInfra;

  return [isTestObservabilitySession, isBrowserstackInfra];
}

exports.isTestObservabilitySession = () => {
  return ( process.env.BROWSERSTACK_TEST_OBSERVABILITY == "true" );
}

exports.isBrowserstackInfra = () => {
  return ( process.env.BROWSERSTACK_AUTOMATION == "true" );
}

exports.shouldReRunObservabilityTests = () => {
  return (process.env.BROWSERSTACK_RERUN_TESTS && process.env.BROWSERSTACK_RERUN_TESTS !== "null") ? true : false
}

exports.stopBuildUpstream = async () => {
  if (process.env.BS_TESTOPS_BUILD_COMPLETED === "true") {
    if(process.env.BS_TESTOPS_JWT == "null" || process.env.BS_TESTOPS_BUILD_HASHED_ID == "null") {
      exports.debug('EXCEPTION IN stopBuildUpstream REQUEST TO TEST OBSERVABILITY : Missing authentication token');
      return {
        status: 'error',
        message: 'Token/buildID is undefined, build creation might have failed'
      };
    } else {
      const data = {
        'stop_time': (new Date()).toISOString()
      };
      const config = {
        headers: {
          'Authorization': `Bearer ${process.env.BS_TESTOPS_JWT}`,
          'Content-Type': 'application/json',
          'X-BSTACK-TESTOPS': 'true'
        }
      };
  
      try {
        const response = await nodeRequest('PUT',`api/v1/builds/${process.env.BS_TESTOPS_BUILD_HASHED_ID}/stop`,data,config);
        if(response.data && response.data.error) {
          throw({message: response.data.error});
        } else {
          exports.debug(`stopBuildUpstream event successfull!`)
          return {
            status: 'success',
            message: ''
          };
        }
      } catch(error) {
        if (error.response) {
          exports.debug(`EXCEPTION IN stopBuildUpstream REQUEST TO TEST OBSERVABILITY : ${error.response.status} ${error.response.statusText} ${JSON.stringify(error.response.data)}`, true, error);
        } else {
          exports.debug(`EXCEPTION IN stopBuildUpstream REQUEST TO TEST OBSERVABILITY : ${error.message || error}`, true, error);
        }
        return {
          status: 'error',
          message: error.message || error.response ? `${error.response.status}:${error.response.statusText}` : error
        };
      }
    }
  }
}

exports.getHookSkippedTests = (suite) => {
  const subSuitesSkippedTests = suite.suites.reduce((acc, subSuite) => {
    const subSuiteSkippedTests = exports.getHookSkippedTests(subSuite);
    if (subSuiteSkippedTests) {
      acc = acc.concat(subSuiteSkippedTests);
    }
    return acc;
  }, []);
  const tests = suite.tests.filter(test => {
    const isSkippedTest = test.type != 'hook' && 
                            !test.markedStatus && 
                            test.state != 'passed' &&
                            test.state != 'failed' &&
                            !test.pending
    return isSkippedTest;
  });
  return tests.concat(subSuitesSkippedTests);
}

const getPlatformName = () => {
  if (process.platform === 'win32') return 'Windows'
  if (process.platform === 'darwin') return 'OS X'
  if (process.platform === "linux") return 'Linux'
  return 'Unknown'
}

const getMacOSVersion = () => {
  return execSync("awk '/SOFTWARE LICENSE AGREEMENT FOR macOS/' '/System/Library/CoreServices/Setup Assistant.app/Contents/Resources/en.lproj/OSXSoftwareLicense.rtf' | awk -F 'macOS ' '{print $NF}' | awk '{print substr($0, 0, length($0)-1)}'").toString().trim()
}

exports.getOSDetailsFromSystem = async (product) => {
  let platformName = getPlatformName();
  let platformVersion = os.release().toString();

  switch (platformName) {
    case 'OS X':
      platformVersion = getMacOSVersion();
      break;
    case 'Windows':
      try {
        const windowsRelease = (await import('windows-release')).default;
        platformVersion = windowsRelease();
      } catch (e) {
      }
      break
    case 'Linux':
      try {
        const details = await getLinuxDetails();
        if (details.dist) platformName = details.dist;
        if (details.release) platformVersion = details.release.toString();
      } catch (e) {
      }
      break;
    default:
      break;
  }

  return {
    os: product == 'automate' && platformName == 'Linux' ? 'OS X' : platformName,
    os_version: platformVersion
  };
}

exports.requireModule = (module, internal = false) => {
  logger.debug(`Getting ${module} from ${process.cwd()}`);
  let local_path = "";
  if(process.env["browserStackCwd"]){
   local_path = path.join(process.env["browserStackCwd"], 'node_modules', module);
  } else if(internal) {
    local_path = path.join(process.cwd(), 'node_modules', 'browserstack-cypress-cli', 'node_modules', module);
  } else {
    local_path = path.join(process.cwd(), 'node_modules', module);
  }
  if(!fs.existsSync(local_path)) {
    logger.debug(`${module} doesn\'t exist at ${process.cwd()}`);
    logger.debug(`Getting ${module} from ${GLOBAL_MODULE_PATH}`);

    let global_path;
    if(['jest-runner', 'jest-runtime'].includes(module))
      global_path = path.join(GLOBAL_MODULE_PATH, 'jest', 'node_modules', module);
    else
      global_path = path.join(GLOBAL_MODULE_PATH, module);
    if(!fs.existsSync(global_path)) {
      throw new Error(`${module} doesn't exist.`);
    }
    return require(global_path);
  }
  return require(local_path);
}

const getReRunSpecs = (rawArgs) => {
  if (this.isTestObservabilitySession() && this.shouldReRunObservabilityTests()) {
    let startIdx = -1, numEle = 0;
    for(let idx=0; idx<rawArgs.length; idx++) {
      if(rawArgs[idx] == '--spec') {
        startIdx = idx;
      } else if(rawArgs[idx].includes('--') && startIdx != -1) {
        break;
      } else if(startIdx != -1) {
        numEle++;
      }
    }
    if(startIdx != -1) rawArgs.splice(startIdx, numEle + 1);
    return [...rawArgs, '--spec', process.env.BROWSERSTACK_RERUN_TESTS];
  } else {
    return rawArgs;
  }
}

const getLocalSessionReporter = () => {
  if(this.isTestObservabilitySession() && process.env.BS_TESTOPS_JWT) {
    return ['--reporter', TEST_OBSERVABILITY_REPORTER];
  } else {
    return [];
  }
}

const cleanupTestObservabilityFlags = (rawArgs) => {
  const newRawArgs = [];
  for(let idx=0; idx<rawArgs.length; idx++) {
    if(!['--disable-browserstack-automation', '--disable-test-observability'].includes(rawArgs[idx])) {
      newRawArgs.push(rawArgs[idx]);
    }
  }
  return newRawArgs;
}

exports.runCypressTestsLocally = (bsConfig, args, rawArgs) => {
  try {
    rawArgs = cleanupTestObservabilityFlags(rawArgs);
    logger.info(`Running npx cypress run ${getReRunSpecs(rawArgs.slice(1)).join(' ')} ${getLocalSessionReporter().join(' ')}`);
    const cypressProcess = spawn(
      'npx',
      ['cypress', 'run', ...getReRunSpecs(rawArgs.slice(1)), ...getLocalSessionReporter()],
      { stdio: 'inherit', cwd: process.cwd(), env: process.env, shell: true }
    );
    cypressProcess.on('close', async (code) => {
      logger.info(`Cypress process exited with code ${code}`);
      await this.printBuildLink(true);
    });

    cypressProcess.on('error', (err) => {
      logger.info(`Cypress process encountered an error ${err}`);
    });
  } catch(e) {
    exports.debug(`Encountered an error when trying to spawn a Cypress test locally ${e}`, true, e);
  }
}

class PathHelper {
  constructor(config, prefix) {
    this.config = config
    this.prefix = prefix
  }

  relativeTestFilePath(testFilePath) {
    // Based upon https://github.com/facebook/jest/blob/49393d01cdda7dfe75718aa1a6586210fa197c72/packages/jest-reporters/src/relativePath.ts#L11
    const dir = this.config.cwd || this.config.rootDir
    return path.relative(dir, testFilePath)
  }

  prefixTestPath(testFilePath) {
    const relativePath = this.relativeTestFilePath(testFilePath)
    return this.prefix ? path.join(this.prefix, relativePath) : relativePath
  }
}
exports.PathHelper = PathHelper;
