'use strict';
var archiver = require("../helpers/archiver");
var zipUploader = require("../helpers/zipUpload");
var build = require("../helpers/build");
var logger = require("../helpers/logger");
var config = require('../helpers/config');
var capabilityHelper = require("../helpers/capabilityHelper");
var fs = require('fs');
const Constants = require('../helpers/constants');
const fileHelpers = require('../helpers/fileHelpers');

module.exports = function run(args) {
  return runCypress(args);
}

function deleteZip() {
  fs.unlink(config.fileName, function (err) {
    if(err) {
      logger.log(Constants.userMessages.ZIP_DELETE_FAILED);
    } else {
      logger.log(Constants.userMessages.ZIP_DELETED);
    }
  });
}

function runCypress(args) {
  let bsConfigPath = process.cwd() + args.cf;
  logger.log(`Reading config from ${args.cf}`);
  fileHelpers.fileExists(bsConfigPath, (configExists) => {
    if (configExists) {
      var bsConfig = require(bsConfigPath);

      // Validate browserstack.json
      capabilityHelper.validate(bsConfig).then(function (validated) {
        logger.log(validated);
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
            });
          }).catch(function (err) {
            // Zip Upload failed
            logger.error(err)
            logger.error(Constants.userMessages.ZIP_UPLOAD_FAILED)
          }).finally(function () {
            deleteZip();
          });
        }).catch(function (err) {
          // Zipping failed
          logger.error(err)
          logger.error(Constants.userMessages.FAILED_TO_ZIP)
          deleteZip();
        });
      }).catch(function (err) {
        // browerstack.json is not valid
        logger.error(err)
        logger.error(Constants.validationMessages.NOT_VALID)
      });
    } else {
      logger.error('Could not find browserstack.json, you can create it by running `browserstack-cypress init`');
    }
  });
}
