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
  return new Promise((resolve, reject) => {
    let all_promises = [];
    let combs = Object.keys(data);
    for(let i = 0; i < combs.length; i++) {
      let comb = combs[i];
      let sessions = Object.keys(data[comb]);
      for(let j = 0; j < sessions.length; j++) {
        let sessionId = sessions[j];
        let filePath = path.join('./', 'buildArtifacts', buildId, comb, sessionId);
        let fileName = 'buildArtifacts.zip';
        console.log(`adding promise for sessionID=${sessionId}`);
        process.env.BUILD_ARTIFACTS_TOTAL_COUNT = Number(process.env.BUILD_ARTIFACTS_TOTAL_COUNT) + 1
        all_promises.push(downloadAndUnzip(filePath, fileName, data[comb][sessionId]).catch((error) => {
          process.env.BUILD_ARTIFACTS_FAIL_COUNT = Number(process.env.BUILD_ARTIFACTS_FAIL_COUNT) + 1;
          reject;
        }));
      }
    }
    Promise.all(all_promises)
      .then(() => {
        resolve;
      })
  });
}

const createDirectories = async (buildId, data) => {
  // create dir for buildArtifacts if not already present
  let artifactsDir = path.join('./', 'buildArtifacts');
  if (!fs.existsSync(artifactsDir)){
    fs.mkdirSync(artifactsDir);
  }

  // create dir for buildId if not already present
  let buildDir = path.join('./', 'buildArtifacts', buildId);
  if (fs.existsSync(buildDir)){
    // remove dir in case already exists
    fs.rmdirSync(buildDir, { recursive: true, force: true });
  }
  fs.mkdirSync(buildDir);

  // create subdirs for combinations inside build
  Object.keys(data).forEach(comb => {
    let combDir = path.join('./', 'buildArtifacts', buildId, comb);
    if (!fs.existsSync(combDir)){
      fs.mkdirSync(combDir);
    }

    // create subdirs for each parellel consumed for each combination
    Object.keys(data[comb]).forEach(sessionId => {
      let sessionDir = path.join('./', 'buildArtifacts', buildId, comb, sessionId);
      if (!fs.existsSync(sessionDir)){
        fs.mkdirSync(sessionDir);
      }
    })
  });
}

const downloadAndUnzip = async (filePath, fileName, url) => {
  return new Promise((resolve, reject) => {
    let tmpFilePath = path.join(filePath, fileName);
    https.get(url, function(response) {
      response.on('data', function (data) {
        fs.appendFileSync(tmpFilePath, data);
      });
      response.on('end', function() {
        fs.createReadStream(tmpFilePath).pipe(unzipper.Extract({ path: filePath })
          .on('close', function () {
            fs.unlinkSync(tmpFilePath);
            resolve;
          })
          .on('error', function(err) {
            reject;
          })
        );
      });
      response.on('error', function () {
        reject;
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
  let build;

  try {
      const res = await axios.get(url, options);
      let buildDetails = res.data;

      await createDirectories(buildId, buildDetails);
      await parseAndDownloadArtifacts(buildId, buildDetails);
      await sendUpdatesToBstack(bsConfig, buildId, args, options);

      messageType = Constants.messageTypes.SUCCESS;
      message = `Build artifacts for build: ${buildId} were successfully downloaded.`;
      logger.info(message);
  } catch (err) {
    //TODO: handle error codes - 422 etc

    message = err;
    messageType = Constants.messageTypes.ERROR;
    errorCode = 'api_failed_build_artifacts';

    logger.error('Downloading the build artifacts failed.');
    logger.error(message);
    utils.sendUsageReport(bsConfig, args, message, messageType, errorCode);
  }
};