'use strict';
const archiver = require("../helpers/archiver"),
  zipUploader = require("../helpers/zipUpload"),
  build = require("../helpers/build"),
  logger = require("../helpers/logger").winstonLogger,
  config = require("../helpers/config"),
  capabilityHelper = require("../helpers/capabilityHelper"),
  Constants = require("../helpers/constants"),
  utils = require("../helpers/utils"),
  fileHelpers = require("../helpers/fileHelpers");

module.exports = function run(args) {
  let bsConfigPath = utils.getConfigPath(args.cf);
  //Delete build_results.txt from log folder if already present.
  utils.deleteResults();

  return utils.validateBstackJson(bsConfigPath).then(function (bsConfig) {
    utils.setUsageReportingFlag(bsConfig, args.disableUsageReporting);

    // accept the username from command line if provided
    utils.setUsername(bsConfig, args);

    // accept the access key from command line if provided
    utils.setAccessKey(bsConfig, args);

    // accept the build name from command line if provided
    utils.setBuildName(bsConfig, args);

    // Validate browserstack.json values and parallels specified via arguments
    return capabilityHelper.validate(bsConfig, args).then(function (validated) {
      logger.info(validated);

      // accept the number of parallels
      utils.setParallels(bsConfig, args);

      // Archive the spec files
      return archiver.archive(bsConfig.run_settings, config.fileName, args.exclude).then(function (data) {

        // Uploaded zip file
        return zipUploader.zipUpload(bsConfig, config.fileName).then(function (zip) {

          // Create build
          return build.createBuild(bsConfig, zip).then(function (data) {
            let message = `${data.message}! ${Constants.userMessages.BUILD_CREATED} with build id: ${data.build_id}`;
            let dashboardLink = `${Constants.userMessages.VISIT_DASHBOARD} ${config.dashboardUrl}${data.build_id}`;
            utils.exportResults(data.build_id, `${config.dashboardUrl}${data.build_id}`);
            if ((utils.isUndefined(bsConfig.run_settings.parallels) && utils.isUndefined(args.parallels)) || (!utils.isUndefined(bsConfig.run_settings.parallels) && bsConfig.run_settings.parallels == Constants.cliMessages.RUN.DEFAULT_PARALLEL_MESSAGE)) {
              logger.warn(Constants.userMessages.NO_PARALLELS);
            }

            if(!args.disableNpmWarning && bsConfig.run_settings.npm_dependencies  && Object.keys(bsConfig.run_settings.npm_dependencies).length <= 0) logger.warn(Constants.userMessages.NO_NPM_DEPENDENCIES);
    
            logger.info(message);
            logger.info(dashboardLink);
            utils.sendUsageReport(bsConfig, args, `${message}\n${dashboardLink}`, Constants.messageTypes.SUCCESS, null);
            return;
          }).catch(function (err) {
            // Build creation failed
            logger.error(err);
            utils.sendUsageReport(bsConfig, args, err, Constants.messageTypes.ERROR, 'build_failed');
          });
        }).catch(function (err) {
          // Zip Upload failed
          logger.error(err);
          logger.error(Constants.userMessages.ZIP_UPLOAD_FAILED);
          utils.sendUsageReport(bsConfig, args, `${err}\n${Constants.userMessages.ZIP_UPLOAD_FAILED}`, Constants.messageTypes.ERROR, 'zip_upload_failed');
        }).finally(function () {
          fileHelpers.deleteZip();
        });
      }).catch(function (err) {
        // Zipping failed
        logger.error(err);
        logger.error(Constants.userMessages.FAILED_TO_ZIP);
        utils.sendUsageReport(bsConfig, args, `${err}\n${Constants.userMessages.FAILED_TO_ZIP}`, Constants.messageTypes.ERROR, 'zip_creation_failed');
        try {
          fileHelpers.deleteZip();
        } catch (err) {
          utils.sendUsageReport(bsConfig, args, Constants.userMessages.ZIP_DELETE_FAILED, Constants.messageTypes.ERROR, 'zip_deletion_failed');
        }
      });
    }).catch(function (err) {
      // browerstack.json is not valid
      logger.error(err);

      // display browserstack.json is not valid only if validation of browserstack.json field has failed, otherwise display just the error message
      // If parallels specified in arguments are invalid do not display browserstack.json is invalid message
      if (!(err === Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION && !utils.isUndefined(args.parallels))) {
        logger.error(Constants.validationMessages.NOT_VALID);
      }

      let error_code = utils.getErrorCodeFromMsg(err);
      utils.sendUsageReport(bsConfig, args, `${err}\n${Constants.validationMessages.NOT_VALID}`, Constants.messageTypes.ERROR, error_code);
    });
  }).catch(function (err) {
    logger.error(err);
    utils.setUsageReportingFlag(null, args.disableUsageReporting);
    utils.sendUsageReport(null, args, err.message, Constants.messageTypes.ERROR, utils.getErrorCodeFromErr(err));
  });
}
