'use strict';
const fs = require('fs');

const archiver = require("../helpers/archiver"),
  zipUploader = require("../helpers/zipUpload"),
  build = require("../helpers/build"),
  logger = require("../helpers/logger").winstonLogger,
  config = require("../helpers/config"),
  capabilityHelper = require("../helpers/capabilityHelper"),
  Constants = require("../helpers/constants"),
  util = require("../helpers/util");

module.exports = function run(args) {
  return runCypress(args);
}

function deleteZip() {
  fs.unlink(config.fileName, function (err) {
    if(err) {
      logger.info(Constants.userMessages.ZIP_DELETE_FAILED);
    } else {
      logger.info(Constants.userMessages.ZIP_DELETED);
    }
  });
}

function runCypress(args) {
  let bsConfigPath = process.cwd() + args.cf;

  util.validateBstackJson(bsConfigPath).then(function (bsConfig) {
    util.setUsageReportingFlag(bsConfig, args.cf.disableUsageReporting);

    // Validate browserstack.json values
    capabilityHelper.validate(bsConfig).then(function (validated) {
      logger.info(validated);

      // Archive the spec files
      archiver.archive(bsConfig.run_settings, config.fileName).then(function (data) {

        // Uploaded zip file
        zipUploader.zipUpload(bsConfig, config.fileName).then(function (zip) {

          // Create build
          build.createBuild(bsConfig, zip).then(function (data) {
            return;
          }).catch(function (err) {
            // Build creation failed
            logger.error(Constants.userMessages.BUILD_FAILED)
            util.sendUsageReport(bsConfig, args, Constants.userMessages.BUILD_FAILED, Constants.messageTypes.ERROR, 'build_failed');
          });
        }).catch(function (err) {
          // Zip Upload failed
          logger.error(err)
          logger.error(Constants.userMessages.ZIP_UPLOAD_FAILED)
          util.sendUsageReport(bsConfig, args, `${err}\n${Constants.userMessages.ZIP_UPLOAD_FAILED}`, Constants.messageTypes.ERROR, 'zip_upload_failed');
        }).finally(function () {
          deleteZip();
        });
      }).catch(function (err) {
        // Zipping failed
        logger.error(err);
        logger.error(Constants.userMessages.FAILED_TO_ZIP);
        util.sendUsageReport(bsConfig, args, `${err}\n${Constants.userMessages.FAILED_TO_ZIP}`, Constants.messageTypes.ERROR, 'zip_creation_failed');
        try {
          deleteZip();
        } catch (err) {
          util.sendUsageReport(bsConfig, args, Constants.userMessages.ZIP_DELETE_FAILED, Constants.messageTypes.ERROR, 'zip_deletion_failed');
        }
      });
    }).catch(function (err) {
      // browerstack.json is not valid
      logger.error(err);
      logger.error(Constants.validationMessages.NOT_VALID);

      let error_code = util.getErrorCodeFromMsg(err);
      util.sendUsageReport(bsConfig, args, `${err}\n${Constants.validationMessages.NOT_VALID}`, Constants.messageTypes.ERROR, error_code);
    });
  }).catch(function (err) {
    logger.error(err);
    util.setUsageReportingFlag(null, args.cf.disableUsageReporting);
    util.sendUsageReport(null, args, err.message, Constants.messageTypes.ERROR, util.getErrorCodeFromErr(err));
  })
}
