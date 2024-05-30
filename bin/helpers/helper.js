/* Helper methods used by Accessibility and Observability */

const logger = require("../helpers/logger").winstonLogger;
const utils = require('../helpers/utils');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const request = require('request');
const gitLastCommit = require('git-last-commit');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const { promisify } = require('util');
const getRepoInfo = require('git-repo-info');
const gitconfig = require('gitconfiglocal');
const { spawn, execSync } = require('child_process');
const glob = require('glob');
const pGitconfig = promisify(gitconfig);
const { readCypressConfigFile } = require('./readCypressConfigUtil');
const CrashReporter = require('../testObservability/crashReporter');
const { MAX_GIT_META_DATA_SIZE_IN_BYTES, GIT_META_DATA_TRUNCATED } = require('./constants')

exports.debug = (text, shouldReport = false, throwable = null) => {
  if (process.env.BROWSERSTACK_OBSERVABILITY_DEBUG === "true" || process.env.BROWSERSTACK_OBSERVABILITY_DEBUG === "1") {
    logger.info(`[ OBSERVABILITY ] ${text}`);
  }
  if(shouldReport) {
    CrashReporter.getInstance().uploadCrashReport(text, throwable ? throwable && throwable.stack : null);
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
  let _path = path.join(__dirname, '../../package.json');
  if(fs.existsSync(_path))
    return require(_path).version;
}

exports.getGitMetaData = () => {
  return new Promise(async (resolve, reject) => {
    try {
      var info = getRepoInfo();
      if(!info.commonGitDir) {
        logger.debug(`Unable to find a Git directory`);
        exports.debug(`Unable to find a Git directory`);
        resolve({});
      }
      if(!info.author && exports.findGitConfig(process.cwd())) {
        /* commit objects are packed */
        gitLastCommit.getLastCommit(async (err, commit) => {
          if(err) {
            logger.debug(`Exception in populating Git Metadata with error : ${err}`, true, err);
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
            let gitMetaData = {
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
            };

            gitMetaData = exports.checkAndTruncateVCSInfo(gitMetaData);

            resolve(gitMetaData);
          } catch(e) {
            exports.debug(`Exception in populating Git Metadata with error : ${e}`, true, e);
            logger.debug(`Exception in populating Git Metadata with error : ${e}`, true, e);
            return resolve({});
          }
        }, {dst: exports.findGitConfig(process.cwd())});
      } else {
        const { remote } = await pGitconfig(info.commonGitDir);
        const remotes = Object.keys(remote).map(remoteName =>  ({name: remoteName, url: remote[remoteName]['url']}));
        let gitMetaData = {
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
        };

        gitMetaData = exports.checkAndTruncateVCSInfo(gitMetaData);

        resolve(gitMetaData);
      }
    } catch(err) {
      exports.debug(`Exception in populating Git metadata with error : ${err}`, true, err);
      logger.debug(`Exception in populating Git metadata with error : ${err}`, true, err);
      resolve({});
    }
  })
}
exports.getCiInfo = () => {
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

exports.getBuildDetails = (bsConfig, isO11y = false) => {
  const isTestObservabilityOptionsPresent = isO11y && !utils.isUndefined(bsConfig["testObservabilityOptions"]);

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

exports.setBrowserstackCypressCliDependency = (bsConfig) => {
  const runSettings = bsConfig.run_settings;
  if (runSettings.npm_dependencies !== undefined && 
    typeof runSettings.npm_dependencies === 'object') {
    if (!("browserstack-cypress-cli" in runSettings.npm_dependencies)) {
      logger.warn("Missing browserstack-cypress-cli not found in npm_dependencies");        
      runSettings.npm_dependencies['browserstack-cypress-cli'] = this.getAgentVersion() || "latest";
      logger.warn(`Adding browserstack-cypress-cli version ${runSettings.npm_dependencies['browserstack-cypress-cli']} in npm_dependencies`);
    }
  }
}

exports.deleteSupportFileOrDir = (fileOrDirPath) => {
  try {
    // Sanitize the input to remove any characters that could be used for directory traversal
    const sanitizedPath = fileOrDirPath.replace(/(\.\.\/|\.\/|\/\/)/g, '');
    const resolvedPath = path.resolve(sanitizedPath);
    if (fs.existsSync(resolvedPath)) {
      if (fs.lstatSync(resolvedPath).isDirectory()) {
        fs.readdirSync(resolvedPath).forEach((file) => {
          const sanitizedFile = file.replace(/(\.\.\/|\.\/|\/\/)/g, '');
          const currentPath = path.join(resolvedPath, sanitizedFile);
          fs.unlinkSync(currentPath);
        });
        fs.rmdirSync(resolvedPath);
      } else {
        fs.unlinkSync(resolvedPath);
      }
    }
  } catch(err) {}
}

exports.getSupportFiles = (bsConfig, isA11y) => {
  let extension = null;
  try {
    extension = bsConfig.run_settings.cypress_config_file.split('.').pop();
  } catch (err) {}
  let supportFile = '/**/cypress/support/**/*.{js,ts}';
  let cleanupParams = {};
  let userSupportFile = null;
  try {
    const completeCypressConfigFile = readCypressConfigFile(bsConfig)
    let cypressConfigFile = {};
    if (!utils.isUndefined(completeCypressConfigFile)) {
      cypressConfigFile = !utils.isUndefined(completeCypressConfigFile.default) ? completeCypressConfigFile.default : completeCypressConfigFile
    }
    userSupportFile = cypressConfigFile.e2e?.supportFile !== null ? cypressConfigFile.e2e?.supportFile : cypressConfigFile.component?.supportFile !== null ? cypressConfigFile.component?.supportFile : cypressConfigFile.supportFile;
    if(userSupportFile == false && extension) {
      const supportFolderPath = path.join(process.cwd(), 'cypress', 'support');
      if (!fs.existsSync(supportFolderPath)) {
        fs.mkdirSync(supportFolderPath);
        cleanupParams.deleteSupportDir = true;
      }
      const sanitizedExtension = extension.replace(/(\.\.\/|\.\/|\/\/)/g, '');
      const supportFilePath = path.join(supportFolderPath, `tmpBstackSupportFile.${sanitizedExtension}`);
      fs.writeFileSync(supportFilePath, "");
      supportFile = `/cypress/support/tmpBstackSupportFile.${sanitizedExtension}`;
      const currEnvVars = bsConfig.run_settings.system_env_vars;
      const supportFileEnv = `CYPRESS_SUPPORT_FILE=${supportFile.substring(1)}`;
      if(!currEnvVars) {
        bsConfig.run_settings.system_env_vars = [supportFileEnv];
      } else {
        bsConfig.run_settings.system_env_vars = [...currEnvVars, supportFileEnv];
      }
      cleanupParams.deleteSupportFile = true;
    } else if(typeof userSupportFile == 'string') {
      if (userSupportFile.startsWith('${') && userSupportFile.endsWith('}')) {
        /* Template strings to reference environment variables */
        const envVar = userSupportFile.substring(2, userSupportFile.length - 1);
        supportFile = process.env[envVar];
      } else {
        /* Single file / glob pattern */
        supportFile = userSupportFile;
      }
    } else if(Array.isArray(userSupportFile)) {
      supportFile = userSupportFile[0];
    }
  } catch (err) {}
  if(supportFile && supportFile[0] != '/') supportFile = '/' + supportFile;
  return {
    supportFile,
    cleanupParams: Object.keys(cleanupParams).length ? cleanupParams : null
  };
}

exports.checkAndTruncateVCSInfo = (gitMetaData) => {
  const gitMetaDataSizeInBytes = exports.getSizeOfJsonObjectInBytes(gitMetaData);

  if (gitMetaDataSizeInBytes && gitMetaDataSizeInBytes > MAX_GIT_META_DATA_SIZE_IN_BYTES) {
    const truncateSize = gitMetaDataSizeInBytes - MAX_GIT_META_DATA_SIZE_IN_BYTES;
    gitMetaData.commit_message = exports.truncateString(gitMetaData.commit_message, truncateSize);
    logger.info(`The commit has been truncated. Size of commit after truncation is ${ exports.getSizeOfJsonObjectInBytes(gitMetaData) / 1024} KB`);
  }

  return gitMetaData;
};

exports.getSizeOfJsonObjectInBytes = (jsonData) => {
  try {
    if (jsonData && jsonData instanceof Object) {
      const buffer = Buffer.from(JSON.stringify(jsonData));

      return buffer.length;
    }
  } catch (error) {
    logger.debug(`Something went wrong while calculating size of JSON object: ${error}`);
  }

  return -1;
};

exports.truncateString = (field, truncateSizeInBytes) => {
  try {
    const bufferSizeInBytes = Buffer.from(GIT_META_DATA_TRUNCATED).length;

    const fieldBufferObj = Buffer.from(field);
    const lenOfFieldBufferObj = fieldBufferObj.length;
    const finalLen = Math.ceil(lenOfFieldBufferObj - truncateSizeInBytes - bufferSizeInBytes);
    if (finalLen > 0) {
      const truncatedString = fieldBufferObj.subarray(0, finalLen).toString() + GIT_META_DATA_TRUNCATED;

      return truncatedString;
    }
  } catch (error) {
    logger.debug(`Error while truncating field, nothing was truncated here: ${error}`);
  }

  return field;
};
