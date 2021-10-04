'use strict';

const fs = require('fs'),
      path = require('path');

const axios = require('axios'),
  unzipper = require('unzipper');

const logger = require('./logger').winstonLogger,
      utils = require("./utils"),
      Constants = require("./constants"),
      config = require("./config");


let BUILD_ARTIFACTS_TOTAL_COUNT = 0;
let BUILD_ARTIFACTS_FAIL_COUNT = 0;

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
        BUILD_ARTIFACTS_TOTAL_COUNT += 1;
        all_promises.push(downloadAndUnzip(filePath, fileName, data[comb][sessionId]).catch((error) => {
          BUILD_ARTIFACTS_FAIL_COUNT += 1;
          // delete malformed zip if present
          let tmpFilePath = path.join(filePath, fileName);
          if(fs.existsSync(tmpFilePath)){
            fs.unlinkSync(tmpFilePath);
          }
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
  let tmpFilePath = path.join(filePath, fileName);
  const writer = fs.createWriteStream(tmpFilePath);

  return axios({
    method: 'get',
    url: url,
    responseType: 'stream',
  }).then(response => {

    //ensure that the user can call `then()` only when the file has
    //been downloaded entirely.

    return new Promise(async (resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      writer.on('error', err => {
        error = err;
        writer.close();
        reject(err);
      });
      writer.on('close', async () => {
        if (!error) {
          await unzipFile(filePath, fileName);
          fs.unlinkSync(tmpFilePath);
          resolve(true);
        }
        //no need to call the reject here, as it will have been called in the
        //'error' stream;
      });
    });
  });
}

const unzipFile = async (filePath, fileName) => {
  return new Promise( async (resolve, reject) => {
    await unzipper.Open.file(path.join(filePath, fileName))
      .then(d => d.extract({path: filePath, concurrency: 5}))
      .catch((err) => reject(err));
    resolve();
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
        eligible_download_folders: BUILD_ARTIFACTS_TOTAL_COUNT,
        successfully_downloaded_folders: BUILD_ARTIFACTS_TOTAL_COUNT - BUILD_ARTIFACTS_FAIL_COUNT
      },
      reporter: reporter
    }
  }

  try {
    await axios.post(url, data, options);
  } catch (err) {
    utils.sendUsageReport(bsConfig, args, err, Constants.messageTypes.ERROR, 'api_failed_build_artifacts_status_update');
  }
}

exports.downloadBuildArtifacts = async (bsConfig, buildId, args) => {
  BUILD_ARTIFACTS_FAIL_COUNT = 0;
  BUILD_ARTIFACTS_TOTAL_COUNT = 0;

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

      if (BUILD_ARTIFACTS_FAIL_COUNT > 0) {
        messageType = Constants.messageTypes.ERROR;
        message = Constants.userMessages.DOWNLOAD_BUILD_ARTIFACTS_FAILED.replace('<build-id>', buildId).replace('<machine-count>', BUILD_ARTIFACTS_FAIL_COUNT);
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

    if (BUILD_ARTIFACTS_FAIL_COUNT > 0) {
      messageType = Constants.messageTypes.ERROR;
      message = Constants.userMessages.DOWNLOAD_BUILD_ARTIFACTS_FAILED.replace('<build-id>', buildId).replace('<machine-count>', BUILD_ARTIFACTS_FAIL_COUNT);
      logger.error(message);
    } else {
      logger.error('Downloading the build artifacts failed.');
    }

    utils.sendUsageReport(bsConfig, args, err, messageType, errorCode);
  }
};
