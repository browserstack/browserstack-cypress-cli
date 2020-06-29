'use strict';
const request = require('request');

const config = require("../helpers/config"),
  logger = require("../helpers/logger").winstonLogger,
  Constants = require("../helpers/constants"),
  utils = require("../helpers/utils");

module.exports = function stop(args) {
  let bsConfigPath = process.cwd() + args.cf;

  return utils.validateBstackJson(bsConfigPath).then(function (bsConfig) {
    // accept the username from command line if provided
    utils.setUsername(bsConfig, args);

    // accept the access key from command line if provided
    utils.setAccessKey(bsConfig, args);

    utils.setUsageReportingFlag(bsConfig, args.disableUsageReporting);

    let buildId = args._[1];

    let options = {
      url: config.buildStopUrl + buildId,
      auth: {
        user: bsConfig.auth.username,
        password: bsConfig.auth.access_key,
      },
      headers: {
        "User-Agent": utils.getUserAgent(),
      },
    };

    request.post(options, function (err, resp, body) {
      let message = null;
      let messageType = null;
      let errorCode = null;

      if (err) {
        message = Constants.userMessages.BUILD_STOP_FAILED;
        messageType = Constants.messageTypes.ERROR;
        errorCode = 'api_failed_build_stop';

        logger.info(message);
      } else {
        let build = null
        try {
          build = JSON.parse(body)
        } catch (error) {
          build = null
        }

        if (resp.statusCode == 299) {
          messageType = Constants.messageTypes.INFO;
          errorCode = "api_deprecated";

          if (build) {
            message = build.message;
            logger.info(message);
          } else {
            message = Constants.userMessages.API_DEPRECATED;
            logger.info(message);
          }
        } else if (resp.statusCode != 200) {
          messageType = Constants.messageTypes.ERROR;
          errorCode = "api_failed_build_stop";

          if (build) {
            message = `${
              Constants.userMessages.BUILD_STOP_FAILED
            } with error: \n${JSON.stringify(build, null, 2)}`;
            logger.error(message);
            if (build.message === "Unauthorized") errorCode = "api_auth_failed";
          } else {
            message = Constants.userMessages.BUILD_STOP_FAILED;
            logger.error(message);
          }
        } else {
          messageType = Constants.messageTypes.SUCCESS;
          message = `${JSON.stringify(build, null, 2)}`;
          logger.info(message);
        }
      }
      utils.sendUsageReport(bsConfig, args, message, messageType, errorCode);
    })
  }).catch(function (err) {
    logger.error(err);
    utils.setUsageReportingFlag(null, args.disableUsageReporting);
    utils.sendUsageReport(null, args, err.message, Constants.messageTypes.ERROR, utils.getErrorCodeFromErr(err));
  })
}
