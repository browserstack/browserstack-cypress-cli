const fs = require('fs'),
      path = require('path'),
      request = require('request'),
      logger = require('./logger').winstonLogger,
      utils = require("./utils"),
      Constants = require('./constants'),
      config = require("./config"),
      decompress = require('decompress');

let reportGenerator = (bsConfig, buildId, args, rawArgs, buildReportData, cb) => {
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

  logger.debug('Started fetching the build json and html reports.');

  return request.get(options, async function (err, resp, body) {
    let message = null;
    let messageType = null;
    let errorCode = null;
    let build;
  
    if (err) {
      message = err;
      messageType = Constants.messageTypes.ERROR;
      errorCode = 'api_failed_build_report';

      logger.error('Generating the build report failed.');
      logger.error(utils.formatRequest(err, resp, body));

      utils.sendUsageReport(bsConfig, args, message, messageType, errorCode, buildReportData, rawArgs);
      return;
    } else {
      logger.debug('Received reports data from upstream.');
      try {
        build = JSON.parse(body);
      } catch (error) {
        build = null;
      }
    }

    if (resp.statusCode == 299) {
      messageType = Constants.messageTypes.INFO;
      errorCode = 'api_deprecated';
      if (build) {
        message = build.message;
        logger.info(message);
      } else {
        message = Constants.userMessages.API_DEPRECATED;
        logger.info(message);
      }
    } else if (resp.statusCode === 422) {
      messageType = Constants.messageTypes.ERROR;
      errorCode = 'api_failed_build_generate_report';
      try {
        response = JSON.parse(body);
        message = response.message;
      } catch (error) {
        logger.error(`Error generating the report: ${error}`);
        response = {message: message};
      }
      logger.error(utils.formatRequest(err, resp, body));
    } else if (resp.statusCode != 200) {
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
        logger.error(utils.formatRequest(err, resp, body));
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
  });
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
    request.get(reportJsonUrl).on('response', function(response) {

      if(response.statusCode != 200) {
        let message = `Received non 200 response while fetching reports, code: ${response.statusCode}`;
        reject(message);
      } else {
        //ensure that the user can call `then()` only when the file has
        //been downloaded entirely.
        response.pipe(writer);
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
    });
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
