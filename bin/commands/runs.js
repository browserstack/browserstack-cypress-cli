'use strict';
var archiver = require("../helpers/archiver");
var zipUploader = require("../helpers/zipUpload");
var build = require("../helpers/build");
var logger = require("../helpers/logger");
var config = require('../helpers/config');
var capabilityHelper = require("../helpers/capabilityHelper");
var fs = require('fs');
const Constants = require('../helpers/constants');

module.exports = function run(args) {
  return runCypress(args);
}

function runCypress(args) {
  let bsConfigPath = process.cwd() + args.cf;
  logger.log(`Reading config from ${args.cf}`);
  var bsConfig = require(bsConfigPath);

  // Validate browserstack.json
  capabilityHelper.validate(bsConfig).then(function (validated) {
    logger.log(validated);
    // Archive the spec files
    archiver.archive(bsConfig.run_settings.specs, config.fileName).then(function (data) {
      // Uploaded zip file
      zipUploader.zipUpload(bsConfig, config.fileName).then(function (zip) {
        // Create build
        build.createBuild(bsConfig, zip).then(function (data) {
          return;
        }).catch(function (err) {
          // Build creation failed
          logger.error(Constants.userMessages.BUILD_FAILED)
        }).finally(function() {
          // Delete zip file from local storage
          fs.unlink(config.fileName, function (err) {
            if(err) {
              logger.log(Constants.userMessages.ZIP_DELETE_FAILED);
            } else {
              logger.log(Constants.userMessages.ZIP_DELETED);
            }            
          });
        });
      }).catch(function (err) {
        // Zip Upload failed
        logger.error(err)
        logger.error(Constants.userMessages.ZIP_UPLOAD_FAILED)
      });
    }).catch(function (err) {
      // Zipping failed
      logger.error(err)
      logger.error(Constants.userMessages.FAILED_TO_ZIP)
    });
  }).catch(function (err) {
    // browerstack.json is not valid
    logger.error(err)
    logger.error(Constants.validationMessages.NOT_VALID)
  });
}
