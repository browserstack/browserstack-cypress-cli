'use strict';

const fs = require('fs'),
      path = require('path'),
      https = require('https');

const axios = require('axios'),
  unzipper = require('unzipper');

const logger = require('./logger').winstonLogger,
      utils = require("./utils"),
      Constants = require("./constants"),
      config = require("./config");


const parseAndDownloadArtifacts = async (buildId, data) => {
  return new Promise(async (resolve, reject) => {
    let all_promises = [];
    let combs = Object.keys(data);
    for(let i = 0; i < combs.length; i++) {
      let comb = combs[i];
      let sessions = Object.keys(data[comb]);
      for(let j = 0; j < sessions.length; j++) {
        let sessionId = sessions[j];
        let filePath = path.join('./', 'build_artifacts', buildId, comb, sessionId);
        let fileName = 'build_artifacts.zip';
        process.env.BUILD_ARTIFACTS_TOTAL_COUNT = Number(process.env.BUILD_ARTIFACTS_TOTAL_COUNT) + 1
        all_promises.push(downloadAndUnzip(filePath, fileName, data[comb][sessionId]).catch((error) => {
          process.env.BUILD_ARTIFACTS_FAIL_COUNT = Number(process.env.BUILD_ARTIFACTS_FAIL_COUNT) + 1;
          reject(error);
        }));
      }
    }
    await Promise.all(all_promises);
    resolve();
  });
}

const createDirIfNotPresent = async (dir) => {
  return new Promise((resolve) => {
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }
    resolve();
  });
}

const createDirectories = async (buildId, data) => {
  // create dir for build_artifacts if not already present
  let artifactsDir = path.join('./', 'build_artifacts');
  if (!fs.existsSync(artifactsDir)){
    fs.mkdirSync(artifactsDir);
  }

  // create dir for buildId if not already present
  let buildDir = path.join('./', 'build_artifacts', buildId);
  if (fs.existsSync(buildDir)){
    // remove dir in case already exists
    fs.rmdirSync(buildDir, { recursive: true, force: true });
  }
  fs.mkdirSync(buildDir);

  let combDirs = [];
  let sessionDirs = [];
  let combs = Object.keys(data);

  for(let i = 0; i < combs.length; i++) {
    let comb = combs[i];
    let combDir = path.join('./', 'build_artifacts', buildId, comb);
    combDirs.push(createDirIfNotPresent(combDir));
    let sessions = Object.keys(data[comb]);
    for(let j = 0; j < sessions.length; j++) {
      let sessionId = sessions[j];
      let sessionDir = path.join('./', 'build_artifacts', buildId, comb, sessionId);
      sessionDirs.push(createDirIfNotPresent(sessionDir));
    }
  }

  return new Promise(async (resolve) => {
    // create sub dirs for each combination in build
    await Promise.all(combDirs);
    // create sub dirs for each machine id in combination
    await Promise.all(sessionDirs);
    resolve();
  });
}

const downloadAndUnzip = async (filePath, fileName, url) => {
  return new Promise(async (resolve, reject) => {
    let tmpFilePath = path.join(filePath, fileName);
    https.get(url, function(response) {
      response.on('data', function (data) {
        fs.appendFileSync(tmpFilePath, data);
      });
      response.on('end', function() {
        fs.createReadStream(tmpFilePath).pipe(unzipper.Extract({ path: filePath })
          .on('close', function () {
            fs.unlinkSync(tmpFilePath);
            resolve();
          })
          .on('error', function(err) {
            process.env.BUILD_ARTIFACTS_FAIL_COUNT = Number(process.env.BUILD_ARTIFACTS_FAIL_COUNT) + 1;
            reject(err);
          })
        );
      });
      response.on('error', function () {
        reject();
      })
    });
  });
}

const sendUpdatesToBstack = async (bsConfig, buildId, args, options) => {
  let url = `${config.buildUrl}${buildId}/build_artifacts/status`;

  let cypressJSON = utils.getCypressJSON(bsConfig);

  let reporter = null;
  if(!utils.isUndefined(args.reporter)) {
    reporter = args.reporter;
  } else if(cypressJSON !== undefined){
    reporter = cypressJSON.reporter;
  }

  let data = {
    feature_usage: {
      downloads: {
        eligible_download_folders: Number(process.env.BUILD_ARTIFACTS_TOTAL_COUNT),
        successfully_downloaded_folders: Number(process.env.BUILD_ARTIFACTS_TOTAL_COUNT) - Number(process.env.BUILD_ARTIFACTS_FAIL_COUNT)
      },
      reporter: reporter
    }
  }

  try {
    await axios.put(url, data, options);
  } catch (err) {
    utils.sendUsageReport(bsConfig, args, err, Constants.messageTypes.ERROR, 'api_failed_build_artifacts_status_update');
  }
}

exports.downloadBuildArtifacts = async (bsConfig, buildId, args) => {
  process.env.BUILD_ARTIFACTS_FAIL_COUNT = 0;
  process.env.BUILD_ARTIFACTS_TOTAL_COUNT = 0;

  let url = `${config.buildUrl}${buildId}/build_artifacts`;
  let options = {
    auth: {
      username: bsConfig.auth.username,
      password: bsConfig.auth.access_key,
    },
    headers: {
      'User-Agent': utils.getUserAgent(),
    },
  };

  let message = null;
  let messageType = null;
  let errorCode = null;

  try {
      const res = await axios.get(url, options);
      let buildDetails = res.data;

      await createDirectories(buildId, buildDetails);
      await parseAndDownloadArtifacts(buildId, buildDetails);

      if (process.env.BUILD_ARTIFACTS_FAIL_COUNT > 0) {
        messageType = Constants.messageTypes.ERROR;
        message = Constants.userMessages.DOWNLOAD_BUILD_ARTIFACTS_FAILED.replace('<build-id>', buildId).replace('<machine-count>', process.env.BUILD_ARTIFACTS_FAIL_COUNT);
        logger.error(message);
      } else {
        messageType = Constants.messageTypes.SUCCESS;
        message = Constants.userMessages.DOWNLOAD_BUILD_ARTIFACTS_SUCCESS.replace('<build-id>', buildId).replace('<user-path>', process.cwd());
        logger.info(message);
      }

      await sendUpdatesToBstack(bsConfig, buildId, args, options);
      utils.sendUsageReport(bsConfig, args, message, messageType, null);
  } catch (err) {
    messageType = Constants.messageTypes.ERROR;
    errorCode = 'api_failed_build_artifacts';

    logger.error('Downloading the build artifacts failed.');
    logger.error(err);
    utils.sendUsageReport(bsConfig, args, err, messageType, errorCode);
  }
};