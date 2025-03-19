'use strict';

const fs = require('fs'),
      path = require('path');

const logger = require('./logger').winstonLogger,
      utils = require("./utils"),
      Constants = require("./constants"),
      config = require("./config");

const { default: axios } = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');
const FormData = require('form-data');
const decompress = require('decompress');
const unzipper = require("unzipper");
const { setAxiosProxy } = require('./helper');

let BUILD_ARTIFACTS_TOTAL_COUNT = 0;
let BUILD_ARTIFACTS_FAIL_COUNT = 0;

const parseAndDownloadArtifacts = async (buildId, data, bsConfig, args, rawArgs, buildReportData) => {
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
          if (error === Constants.userMessages.DOWNLOAD_BUILD_ARTIFACTS_NOT_FOUND) {
            // Don't consider build artifact 404 error as a failure
            let warningMessage = Constants.userMessages.DOWNLOAD_BUILD_ARTIFACTS_NOT_FOUND.replace('<session-id>', sessionId);
            logger.warn(warningMessage);
            utils.sendUsageReport(bsConfig, args, warningMessage, Constants.messageTypes.ERROR, 'build_artifacts_not_found', buildReportData, rawArgs);
          } else {
            BUILD_ARTIFACTS_FAIL_COUNT += 1;
            const errorMsg = `Error downloading build artifacts for ${sessionId} with error: ${error}`;
            logger.debug(errorMsg);
            utils.sendUsageReport(bsConfig, args, errorMsg, Constants.messageTypes.ERROR, 'build_artifacts_parse_error', buildReportData, rawArgs);
          }
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

  logger.debug(`Downloading build artifact for: ${filePath}`)
  return new Promise(async (resolve, reject) => {
    try {
      const axiosConfig = {
        responseType: 'stream', 
        validateStatus: status => (status >= 200 && status < 300) || status === 404
      };
      setAxiosProxy(axiosConfig);
      const response = await axios.get(url, axiosConfig);
      if(response.status != 200) {
        if (response.status === 404) {
          reject(Constants.userMessages.DOWNLOAD_BUILD_ARTIFACTS_NOT_FOUND);
        }
        const errorMsg = `Non 200 status code, got status code: ${response.status}`;
        reject(errorMsg);
      } else {
        //ensure that the user can call `then()` only when the file has
        //been downloaded entirely.
        response.data.pipe(writer);
        let error = null;
        writer.on('error', err => {
          error = err;
          writer.close();
          reject(err);
        });
        writer.on('close', async () => {
          try {
            if (!error) {
              await unzipFile(filePath, fileName);
              fs.unlinkSync(tmpFilePath);
            }
          } catch (error) {
            reject(error);
          }
          resolve(true);
        });
      }
    } catch (error) {
      reject(error);
    }
  });
}

const unzipFile = async (filePath, fileName) => {
  return new Promise( async (resolve, reject) => {
    try {
      await decompress(path.join(filePath, fileName), filePath);
      resolve();
    } catch (error) {
      logger.debug(`Error unzipping with decompress, trying with unzipper. Stacktrace: ${error}.`);
      try {
        fs.createReadStream(path.join(filePath, fileName))
          .pipe(unzipper.Extract({ path: filePath }))
          .on("close", () => {
            resolve();
          })
          .on("error", (err) => {
            reject(err);
          });
      } catch (unzipperError) {
        logger.debug(`Unzipper package error: ${unzipperError}`);
        reject(Constants.userMessages.BUILD_ARTIFACTS_UNZIP_FAILURE);
      }
    }
  });
}

const sendUpdatesToBstack = async (bsConfig, buildId, args, options, rawArgs, buildReportData) => {
  options.url = `${config.buildUrl}${buildId}/build_artifacts/status`;

  let cypressConfigFile = utils.getCypressConfigFile(bsConfig);

  let reporter = null;
  if(!utils.isUndefined(args.reporter)) {
    reporter = args.reporter;
  } else if(cypressConfigFile !== undefined){
    reporter = cypressConfigFile.reporter;
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

  options.formData = data.toString();
  const axiosConfig = {
    auth: {
      username: options.auth.username,
      password: options.auth.password
    },
    headers: options.headers
  };
  setAxiosProxy(axiosConfig);

  let responseData = null;
  return new Promise (async (resolve, reject) => {
    try {
      const response = await axios.post(options.url, data, axiosConfig);
      try {
        responseData = response.data;
      } catch(e) {
        responseData = {};
      }
      if (response.status != 200) {
        if (responseData && responseData["error"]) {
          utils.sendUsageReport(bsConfig, args, responseData["error"], Constants.messageTypes.ERROR, 'api_failed_build_artifacts_status_update', buildReportData, rawArgs);
          reject(responseData["error"])
        }
      }
      resolve();
    } catch (error) {
      if(error.response) {
        utils.sendUsageReport(bsConfig, args, error.response, Constants.messageTypes.ERROR, 'api_failed_build_artifacts_status_update', buildReportData, rawArgs);
        logger.error(utils.formatRequest(error.response.statusText, error.response, error.response.data));
        reject(errror.response.data.message);
      }
    }
  });
}

exports.downloadBuildArtifacts = async (bsConfig, buildId, args, rawArgs, buildReportData = null, isTurboScaleSession = false) => {
  return new Promise ( async (resolve, reject) => {
    BUILD_ARTIFACTS_FAIL_COUNT = 0;
    BUILD_ARTIFACTS_TOTAL_COUNT = 0;

    let options = {
      url: isTurboScaleSession
        ? `${config.turboScaleBuildsUrl}/${buildId}/build_artifacts`
        : `${config.buildUrl}${buildId}/build_artifacts`,
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
    let buildDetails = null;
    options.config = {
      auth: options.auth,
      headers: options.headers
    }
    setAxiosProxy(options.config);
    let response;
    try {
      response = await axios.get(options.url, options.config);
      buildDetails = response.data;
      await createDirectories(buildId, buildDetails);
      await parseAndDownloadArtifacts(buildId, buildDetails, bsConfig, args, rawArgs, buildReportData);
      if (BUILD_ARTIFACTS_FAIL_COUNT > 0) {
        messageType = Constants.messageTypes.ERROR;
        message = Constants.userMessages.DOWNLOAD_BUILD_ARTIFACTS_FAILED.replace('<build-id>', buildId).replace('<machine-count>', BUILD_ARTIFACTS_FAIL_COUNT);
        logger.error(message);
        process.exitCode = Constants.ERROR_EXIT_CODE;
      } else {
        messageType = Constants.messageTypes.SUCCESS;
        message = Constants.userMessages.DOWNLOAD_BUILD_ARTIFACTS_SUCCESS.replace('<build-id>', buildId).replace('<user-path>', process.cwd());
        logger.info(message);
      }
      await sendUpdatesToBstack(bsConfig, buildId, args, options, rawArgs, buildReportData)
      utils.sendUsageReport(bsConfig, args, message, messageType, null, buildReportData, rawArgs);
    } catch (err) {
      messageType = Constants.messageTypes.ERROR;
      errorCode = 'api_failed_build_artifacts';
      if(err.response && err.response.status !== 200) {
        logger.error('Downloading the build artifacts failed.');
        logger.error(`Error: Request failed with status code ${err.response.status}`)
        logger.error(utils.formatRequest(err.response.statusText, err.response, err.response.data));
        utils.sendUsageReport(bsConfig, args, JSON.stringify(buildDetails), Constants.messageTypes.ERROR, 'api_failed_build_artifacts', buildReportData, rawArgs);
      } else {
        if (BUILD_ARTIFACTS_FAIL_COUNT > 0) {
          messageType = Constants.messageTypes.ERROR;
          message = Constants.userMessages.DOWNLOAD_BUILD_ARTIFACTS_FAILED.replace('<build-id>', buildId).replace('<machine-count>', BUILD_ARTIFACTS_FAIL_COUNT);
          logger.error(message);
        } else {
          logger.error('Downloading the build artifacts failed.');
        }
        utils.sendUsageReport(bsConfig, args, err, messageType, errorCode, buildReportData, rawArgs);
        logger.error(`Error: Request failed with status code ${resp.status}`)
        logger.error(utils.formatRequest(err, resp, body));
      }
      process.exitCode = Constants.ERROR_EXIT_CODE;
    }
    resolve();
  });
};
