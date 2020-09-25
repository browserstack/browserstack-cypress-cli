'use strict';
const config = require("./config"),
  logger = require("./logger").winstonLogger,
  Constants = require("./constants"),
  utils = require("./utils"),
  request = require('request');

exports.pollBuildStatus = (bsConfig, buildId) => {
  logBuildDetails().then((data) => {
    printSpecsStatus();
  }).then((data) => {
    printSpecsRunSummary();
  }).then((data) => {
    printFailedSpecsDetails();
  }).then((data) => {
    printBuildDashboardLink(buildId);
  }).then((data) => {
    // success case!
    return 0; // exit code 0
  }).catch((err) => {
    // failed case!
    return 1; // exit code 1
  });
};

let logBuildDetails = () => {

};

let printSpecsStatus = () => {

};

let printSpecsRunSummary = () => {

};

let printFailedSpecsDetails = () => {

};

let printBuildDashboardLink = (buildId) => {
  new Promise((resolve, reject) => {
    logger.info(Constants.userMessages.BUILD_REPORT_MESSAGE);
    logger.info(`${config.dashboardUrl}${buildId}`);
  });
};
