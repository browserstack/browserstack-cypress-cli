const logger = require("../helpers/logger").winstonLogger;
const { API_URL } = require('./constants');
const utils = require('../helpers/utils');
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
        logger.debug(`Unable to find a Git directory`);
        resolve({});
      }
      if(!info.author && exports.findGitConfig(process.cwd())) {
        /* commit objects are packed */
        gitLastCommit.getLastCommit(async (err, commit) => {
          if(err) {
            logger.debug(`Exception in populating Git Metadata with error : ${err}`, true, err);
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
            logger.debug(`Exception in populating Git Metadata with error : ${e}`, true, e);
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
      logger.debug(`Exception in populating Git metadata with error : ${err}`, true, err);
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

exports.checkAccessibilityPlatform = (user_config) => {
  logger.info("checkAccessibilityPlatform start");
  let accessibility = false;
  // console.log("user_config.browsers", user_config.browsers)
  user_config.browsers.forEach(browser => {
    console.log("browser", browser)
    if (browser.accessibility) {
      console.log("inside browser.accessibility")
      accessibility = true;
      return true;
    }
  })
  return accessibility;
}

exports.setAccessibilityCypressCapabilities = async (user_config, accessibilityResponse) => {
  if (user_config.run_settings.accessibilityOptions) {

  } else {
    user_config.run_settings.accessibilityOptions = {}
  }
  user_config.run_settings.accessibilityOptions.authToken = accessibilityResponse.data.accessibilityToken;
  user_config.run_settings.accessibilityOptions.scannerVersion = accessibilityResponse.data.scannerVersion;
}

exports.createAccessibilityTestRun = async (user_config, framework) => {

  const userName = user_config["auth"]["username"];
  const accessKey = user_config["auth"]["access_key"];

  try {
    let settings = user_config.run_settings.accessibilityOptions;

    const {
      buildName,
      projectName,
      buildDescription
    } = getBuildDetails(user_config);

    const data = {
      'projectName': projectName,
      'buildName': buildName,
      'startTime': (new Date()).toISOString(),
      'description': buildDescription,
      'source': {
        frameworkName: "framework",
        frameworkVersion: "frameworkVersion",
        sdkVersion: "sdkVersion"
      },
      'settings': settings,
      'versionControl': await getGitMetaData(),
      'ciInfo':  getCiInfo(),
      'hostInfo': {
        hostname: os.hostname(),
        platform: os.platform(),
        type: os.type(),
        version: os.version(),
        arch: os.arch()
      },
      'browserstackAutomation': true // fix!!
    };

    const config = {
      auth: {
        user: userName,
        pass: accessKey
      },
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await nodeRequest(
      'POST', 'test_runs', data, config
    );
    logger.info("response in createAccessibilityTestRun", response);

    process.env.BS_A11Y_JWT = response.data.data.accessibilityToken;
    process.env.BS_A11Y_TEST_RUN_ID = response.data.data.id;
  
    this.setAccessibilityCypressCapabilities(user_config, response.data);
    setAccessibilityEventListeners();

  } catch (error) {
    if (error.response) {
      logger.error(
        `Exception while creating test run for BrowserStack Accessibility Automation: ${
          error.response.status
        } ${error.response.statusText} ${JSON.stringify(error.response.data)}`
      );
    } else {
      if(error.message == 'Invalid configuration passed.') {
        logger.error(
          `Exception while creating test run for BrowserStack Accessibility Automation: ${
            error.message || error.stack
          }`
        );
        for(const errorkey of error.errors){
          logger.error(errorkey.message);
        }
        
      } else {
        logger.error(
          `Exception while creating test run for BrowserStack Accessibility Automation: ${
            error.message || error.stack
          }`
        );
      }
      user_config.accessibility = false; // since create accessibility session failed
    }
  }
}

const nodeRequest = (type, url, data, config) => {
  logger.info("API URL IN noderequest", API_URL);
  return new Promise(async (resolve, reject) => {
    const options = {...config,...{
      method: type,
      url: `${API_URL}/${url}`,
      body: data,
      json: config.headers['Content-Type'] === 'application/json',
    }};

    request(options, function callback(error, response, body) {
      if(error) {
        logger.info("error in nodeRequest", error);
        reject(error);
      } else if(!(response.statusCode == 201 || response.statusCode == 200)) {
        logger.info("response.statusCode in nodeRequest", response.statusCode);
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

const getBuildDetails = (bsConfig) => {
  let buildName = '',
      projectName = '',
      buildDescription = '',
      buildTags = [];
  
  /* Pick from environment variables */
  buildName = process.env.BROWSERSTACK_BUILD_NAME || buildName;
  projectName = process.env.BROWSERSTACK_PROJECT_NAME || projectName;
  
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

const getAccessibilityCypressCommandEventListener = () => {
  return (
    `require('browserstack-cypress-cli/bin/accessibility-automation/cypress');`
  );
}

const setAccessibilityEventListeners = () => {
  logger.info("setAccessibilityEventListeners")
  try {
    const cypressCommandEventListener = getAccessibilityCypressCommandEventListener();
    glob(process.cwd() + '/cypress/support/*.js', {}, (err, files) => {
      if(err) return logger.debug('EXCEPTION IN BUILD START EVENT : Unable to parse cypress support files');
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
          logger.debug(`Unable to modify file contents for ${file} to set event listeners with error ${e}`, true, e);
        }
      });
    });
  } catch(e) {
    logger.debug(`Unable to parse support files to set event listeners with error ${e}`, true, e);
  }
}
