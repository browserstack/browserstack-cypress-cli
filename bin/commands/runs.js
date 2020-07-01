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
  let bsConfigPath = process.cwd() + args.cf;

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
      return archiver.archive(bsConfig.run_settings, config.fileName).then(function (data) {

        // Uploaded zip file
        return zipUploader.zipUpload(bsConfig, config.fileName).then(function (zip) {

          // Create build
          return build.createBuild(bsConfig, zip).then(function (message) {
            logger.info(message);
            utils.sendUsageReport(bsConfig, args, message, Constants.messageTypes.SUCCESS, null);
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
