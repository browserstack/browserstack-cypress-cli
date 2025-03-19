const axios = require('axios').default;

const fs = require('fs'),
      path = require('path'),
      logger = require('./logger').winstonLogger,
      utils = require("./utils"),
      Constants = require('./constants'),
      config = require("./config"),
      decompress = require('decompress');
const { isTurboScaleSession } = require('../helpers/atsHelper');

const { setAxiosProxy } = require('./helper');

let reportGenerator = async (bsConfig, buildId, args, rawArgs, buildReportData, cb) => {
  let options = {
    url: `${config.buildUrl}${buildId}/custom_report`,
    auth: {
      user: bsConfig.auth.username,
      password: bsConfig.auth.access_key,
    },
    headers: {
      'User-Agent': utils.getUserAgent(),
    },
  };

  if (isTurboScaleSession(bsConfig)) {
    options.url = `${config.turboScaleBuildsUrl}/${buildId}/custom_report`;
  }
  
  logger.debug('Started fetching the build json and html reports.');

  let message = null;
  let messageType = null;
  let errorCode = null;
  let build;

  const axiosConfig = {
    auth: {
      username: options.auth.user,
      password: options.auth.password
    },
    headers: options.headers
  }
  setAxiosProxy(axiosConfig);

  try {
    const response = await axios.get(options.url, axiosConfig);
    logger.debug('Received reports data from upstream.');
    try {
      build = response.data;
    } catch (error) {
      build = null;
    }
    if (response.status == 299) {
      messageType = Constants.messageTypes.INFO;
      errorCode = 'api_deprecated';
      if (build) {
        message = build.message;
        logger.info(message);
      } else {
        message = Constants.userMessages.API_DEPRECATED;
        logger.info(message);
      }
    } else if (response.status === 422) {
      messageType = Constants.messageTypes.ERROR;
      errorCode = 'api_failed_build_generate_report';
      try {
        response = error.response.data;
        message = response.message;
      } catch (error) {
        logger.error(`Error generating the report: ${error}`);
        response = {message: message};
      }
      logger.error(utils.formatRequest(response.statusText, response, response.data));
    } else if (response.status != 200) {
      messageType = Constants.messageTypes.ERROR;
      errorCode = 'api_failed_build_generate_report';

      if (build) {
        message = `${
          Constants.userMessages.BUILD_GENERATE_REPORT_FAILED.replace('<build-id>', buildId)
        } with error: \n${JSON.stringify(build, null, 2)}`;
        logger.error(message);
        if (build.message === 'Unauthorized') errorCode = 'api_auth_failed';
      } else {
        message = Constants.userMessages.BUILD_GENERATE_REPORT_FAILED.replace('<build-id>', buildId);
        logger.error(utils.formatRequest(error.response.statusText, error.response, error.response.data));
      }
    } else {
      messageType = Constants.messageTypes.SUCCESS;
      message = `Report for build: ${buildId} was successfully created.`;
      await generateCypressBuildReport(build);
      logger.info(message);
    }
    logger.debug('Finished fetching the build json and html reports.');
    utils.sendUsageReport(bsConfig, args, message, messageType, errorCode, buildReportData, rawArgs);
    if (cb){
      cb();
    }
  } catch (error) {
    message = error.response.statusText;
    messageType = Constants.messageTypes.ERROR;
    errorCode = 'api_failed_build_report';

    logger.error('Generating the build report failed.');
    logger.error(utils.formatRequest(error.response.statusText, error.response, error.response.data));
    utils.sendUsageReport(bsConfig, args, message, messageType, errorCode, buildReportData, rawArgs);
    if (cb){
      cb(Constants.ERROR_EXIT_CODE);
    }
    return;
  }
}

async function generateCypressBuildReport(report_data) {
  let resultsDir = path.join('./', 'results');

  if (!fs.existsSync(resultsDir)){
    logger.debug("Results directory doesn't exists.");
    logger.debug("Creating results directory.");
    fs.mkdirSync(resultsDir);
  }
  await getReportResponse(resultsDir, 'report.zip', report_data.cypress_custom_report_url);
}

function getReportResponse(filePath, fileName, reportJsonUrl) {
  let tmpFilePath = path.join(filePath, fileName);
  const writer = fs.createWriteStream(tmpFilePath);
  logger.debug(`Fetching build reports zip.`)
  return new Promise(async (resolve, reject) => {
    try {
      const axiosConfig = {
        responseType: 'stream',
      };
      setAxiosProxy(axiosConfig);
      const response = await axios.get(reportJsonUrl, axiosConfig);
      if(response.status === 200) {
        //ensure that the user can call `then()` only when the file has
        //been downloaded entirely.
        response.data.pipe(writer);
        let error = null;
        writer.on('error', err => {
          error = err;
          writer.close();
          reject(err);
          process.exitCode = Constants.ERROR_EXIT_CODE;
        });
        writer.on('close', async () => {
          if (!error) {
            logger.debug("Unzipping downloaded html and json reports.");
            unzipFile(filePath, fileName).then((msg) => {
              logger.debug(msg);
              fs.unlinkSync(tmpFilePath);
              logger.debug("Successfully prepared json and html reports.");
              resolve(true);
            }).catch((err) =>{
              logger.debug(`Unzipping html and json report failed. Error: ${err}`)
              reject(true);
            });
          }
          //no need to call the reject here, as it will have been called in the
          //'error' stream;
        });
      }
    } catch (error) {
      let message = `Received non 200 response while fetching reports, code: ${error.response.status}`;
      reject(message);
    }
  });
}

const unzipFile = async (filePath, fileName) => {
  return new Promise( async (resolve, reject) => {
    await decompress(path.join(filePath, fileName), filePath)
    .then((files) => {
      let message = "Unzipped the json and html successfully."
      resolve(message);
    })
    .catch((error) => {
      reject(error);
      process.exitCode = Constants.ERROR_EXIT_CODE;
    });
  });
}

exports.reportGenerator = reportGenerator;
