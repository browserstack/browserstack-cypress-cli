const fs = require('fs'),
      path = require('path'),
      request = require('request'),
      logger = require('./logger').winstonLogger,
      utils = require("./utils"),
      Constants = require('./constants'),
      config = require("./config");
const unzipper = require('unzipper');

let reportGenerator = (bsConfig, buildId, args, rawArgs, cb) => {
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

      utils.sendUsageReport(bsConfig, args, message, messageType, errorCode, null, rawArgs);
      return;
    } else {
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
    utils.sendUsageReport(bsConfig, args, message, messageType, errorCode, null, rawArgs);
    if (cb){
      cb();
    }
  });
}

async function generateCypressBuildReport(report_data) {
  let resultsDir = path.join('./', 'results');

  if (!fs.existsSync(resultsDir)){
    fs.mkdirSync(resultsDir);
  }
  await getReportResponse(resultsDir, 'report.zip', report_data.cypress_custom_report_url)
}

function getReportResponse(filePath, fileName, reportJsonUrl) {
  let tmpFilePath = path.join(filePath, fileName);
  const writer = fs.createWriteStream(tmpFilePath);
  return new Promise(async (resolve, reject) => {
    request.get(reportJsonUrl).on('response', function(response) {

      if(response.statusCode != 200) {
        reject();
      } else {
        //ensure that the user can call `then()` only when the file has
        //been downloaded entirely.
        response.pipe(writer);
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
      }
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

exports.reportGenerator = reportGenerator;
