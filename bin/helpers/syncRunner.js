'use strict';
const logger = require("./logger").syncCliLogger;
const request = require('request');
const syncSpecsLogs = require('./sync/syncSpecsLogs'),
  specDetails = require('./sync/failedSpecsDetails'),
  config = require("../helpers/config"),
  utils = require('./utils'),
  specsSummary = require('./sync/specsSummary');

exports.pollBuildStatus = (bsConfig, buildDetails, rawArgs, buildReportData) => {
  let customErrorsToPrint;
  return new Promise((resolve, reject) => {
    syncSpecsLogs.printSpecsStatus(bsConfig, buildDetails, rawArgs, buildReportData).then((data) => {
      if(data.customErrorsToPrint && data.customErrorsToPrint.length > 0) {
        customErrorsToPrint = data.customErrorsToPrint;
      }
      return specDetails.failedSpecsDetails(data);
    }).then((data) => {
      // logger.info(`--> data: ${JSON.stringify(data)}\n--> buildDetails: ${JSON.stringify(buildDetails)}\n-->${JSON.stringify(rawArgs)}`)
      // const buildId = buildDetails.build_id;
      // let options = {
      //   url: config.buildUrl + buildId,
      //   auth: {
      //     user: bsConfig.auth.username,
      //     password: bsConfig.auth.access_key,
      //   },
      //   headers: {
      //     'User-Agent': utils.getUserAgent(),
      //   },
      // };
      // logger.info(`--> options: ${JSON.stringify(options)}`)
      // request.get(options, function (err, resp, body) {
      //   logger.info(`\n\n--> build details body: ${JSON.stringify(body)}`)
      //   let message = null;
      //   let messageType = null;
      //   let errorCode = null;
      //   if (err) {
      //     message = Constants.userMessages.BUILD_INFO_FAILED;
      //     messageType = Constants.messageTypes.ERROR;
      //     errorCode = 'api_failed_build_info';
  
      //     logger.info(message);
      //     logger.error(utils.formatRequest(err, resp, body));
      //   } else {
      //     let build = null;
      //     try {
      //       build = JSON.parse(body);
      //     } catch (error) {
      //       build = null;
      //     }
      //     logger.info(`\n\n--> build details: ${JSON.stringify(build)}`)
      //   }
      // });
      return specsSummary.printSpecsRunSummary(data, buildDetails.machines, customErrorsToPrint);
    }).then((successExitCode) => {
      resolve(successExitCode); // exit code 0
    }).catch((nonZeroExitCode) => {
      resolve(nonZeroExitCode); // exit code 1
    })
  });
};
