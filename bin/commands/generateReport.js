'use strict';
const request = require('request');

const config = require("../helpers/config"),
  logger = require("../helpers/logger").winstonLogger,
  Constants = require("../helpers/constants"),
  utils = require("../helpers/utils"),
  reportGenerator = require('../helpers/reporter-html').reporterHTML;


module.exports = function info(args) {
  let bsConfigPath = utils.getConfigPath(args.cf);

  return utils.validateBstackJson(bsConfigPath).then(function (bsConfig) {
    // setting setDefaultAuthHash to {} if not present and set via env variables or via args.
    utils.setDefaultAuthHash(bsConfig, args);

    // accept the username from command line if provided
    utils.setUsername(bsConfig, args);

    // accept the access key from command line if provided
    utils.setAccessKey(bsConfig, args);

    utils.setUsageReportingFlag(bsConfig, args.disableUsageReporting);

    // set cypress config filename
    utils.setCypressConfigFilename(bsConfig, args);

    let buildId = args._[1];

    let options = {
      url: `${config.buildUrl}${buildId}/custom_report`,
      auth: {
        user: bsConfig.auth.username,
        password: bsConfig.auth.access_key,
      },
      rejectUnauthorized: false,
      headers: {
        'User-Agent': utils.getUserAgent(),
      },
    };

    request.get(options, function (err, resp, body) {
      let message = null;
      let messageType = null;
      let errorCode = null;
      let build;

      if (err) {
        message = Constants.userMessages.BUILD_INFO_FAILED;
        messageType = Constants.messageTypes.ERROR;
        errorCode = 'api_failed_build_info';

        logger.info(message);
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
      } else if (resp.statusCode != 200) {
        messageType = Constants.messageTypes.ERROR;
        errorCode = 'api_failed_build_generate_report';

        if (build) {
          message = `${
            Constants.userMessages.BUILD_GENERATE_REPORT_FAILED.replace('<build-id>>', buildId)
          } with error: \n${JSON.stringify(build, null, 2)}`;
          logger.error(message);
          if (build.message === 'Unauthorized') errorCode = 'api_auth_failed';
        } else {
          message = Constants.userMessages.BUILD_GENERATE_REPORT_FAILED.replace('<build-id>>', buildId);
          logger.error(message);
        }
      } else {
        messageType = Constants.messageTypes.SUCCESS;
        message = `Report for build: ${buildId} was successfully created.`;
        reportGenerator(build);
        logger.info(message);
      }
      utils.sendUsageReport(bsConfig, args, message, messageType, errorCode);
    });
  }).catch(function (err) {
    logger.error(err);
    utils.setUsageReportingFlag(null, args.disableUsageReporting);
    utils.sendUsageReport(null, args, err.message, Constants.messageTypes.ERROR, utils.getErrorCodeFromErr(err));
  });
};
