'use strict';
const request = require('request');

const config = require("../helpers/config"),
  logger = require("../helpers/logger").winstonLogger,
  Constants = require("../helpers/constants"),
  utils = require("../helpers/utils"),
  getInitialDetails = require('../helpers/getInitialDetails').getInitialDetails;

module.exports = function info(args, rawArgs) {
  let bsConfigPath = utils.getConfigPath(args.cf);

  return utils.validateBstackJson(bsConfigPath).then(function (bsConfig) {
    utils.setDefaults(bsConfig, args);

    // accept the username from command line if provided
    utils.setUsername(bsConfig, args);

    // accept the access key from command line if provided
    utils.setAccessKey(bsConfig, args);

    getInitialDetails(bsConfig, args, rawArgs).then((buildReportData) => {

      utils.setUsageReportingFlag(bsConfig, args.disableUsageReporting);

      // set cypress config filename
      utils.setCypressConfigFilename(bsConfig, args);

      let buildId = args._[1];

      let options = {
        url: config.buildUrl + buildId,
        auth: {
          user: bsConfig.auth.username,
          password: bsConfig.auth.access_key,
        },
        headers: {
          'User-Agent': utils.getUserAgent(),
        },
      };

      if (Constants.turboScaleObj.enabled) {
        options.url = `${config.turboScaleBuildsUrl}/${buildId}`;
      }

      request.get(options, function (err, resp, body) {
        let message = null;
        let messageType = null;
        let errorCode = null;
  
        if (err) {
          message = Constants.userMessages.BUILD_INFO_FAILED;
          messageType = Constants.messageTypes.ERROR;
          errorCode = 'api_failed_build_info';
  
          logger.info(message);
          logger.error(utils.formatRequest(err, resp, body));
        } else {
          let build = null;
          try {
            build = JSON.parse(body);
          } catch (error) {
            build = null;
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
            logger.info(utils.formatRequest(err, resp, body));
          } else if (resp.statusCode != 200) {
            messageType = Constants.messageTypes.ERROR;
            errorCode = 'api_failed_build_info';
  
            if (build) {
              message = `${
                Constants.userMessages.BUILD_INFO_FAILED
              } with error: \n${JSON.stringify(build, null, 2)}`;
              logger.error(message);
              if (build.message === 'Unauthorized') errorCode = 'api_auth_failed';
            } else {
              message = Constants.userMessages.BUILD_INFO_FAILED;
              logger.error(message);
            }
            logger.error(utils.formatRequest(err, resp, body));
          } else {
            messageType = Constants.messageTypes.SUCCESS;
            message = `Build info for build id: \n ${JSON.stringify(
              build,
              null,
              2
            )}`;
            logger.info(message);
          }
        }
        utils.sendUsageReport(bsConfig, args, message, messageType, errorCode, buildReportData, rawArgs);
      });
    }).catch((err) => {
      logger.warn(err);
    });
  }).catch(function (err) {
    logger.error(err);
    utils.setUsageReportingFlag(null, args.disableUsageReporting);
    utils.sendUsageReport(null, args, err.message, Constants.messageTypes.ERROR, utils.getErrorCodeFromErr(err), null, rawArgs);
    process.exitCode = Constants.ERROR_EXIT_CODE;
  })
}
