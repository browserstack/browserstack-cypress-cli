'use strict';
var archiver = require("../helpers/archiver");
var zipUploader = require("../helpers/zipUpload");
var build = require("../helpers/build");
var logger = require("../helpers/logger");
var config = require('../helpers/config');
var capabilityHelper = require("../helpers/capabilityHelper");

module.exports = function run(args) {
  return runCypress(args);
}

function runCypress(args) {
  let bsConfigPath = process.cwd() + args.cf;
  logger.log(`Reading browserstack.json from ${args.cf}`);
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
          logger.error("Build creation failed. Please contact Browserstack support")
        });
      }).catch(function (err) {
        // Zip Upload failed
        logger.error("Zip Upload failed. Please contact Browserstack support")
      });
    }).catch(function (err) {
      // Zipping failed
      logger.error("Failed to zip files. Please contact Browserstack support")
    });
  }).catch(function (err) {
    // Browerstack.json is not valid
    logger.error("browerstack.json is not valid. Please contact Browserstack support")
  });
}
