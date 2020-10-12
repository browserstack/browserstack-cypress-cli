'use strict';
const config = require("./config"),
  logger = require("./logger").winstonLogger,
  Constants = require("./constants"),
  utils = require("./utils"),
  request = require('request');

exports.pollBuildStatus = (bsConfig, buildDetails) => {
  return new Promise(function (resolve, reject) {
    logBuildDetails(bsConfig, buildDetails);
    printSpecsStatus()
      .then((data) => {
        printSpecsRunSummary();
      })
      .then((data) => {
        printFailedSpecsDetails();
      })
      .then((data) => {
        printBuildDashboardLink(buildDetails.dashboard_url);
        // success case!
        resolve(0); // exit code 0
      })
      .catch((err) => {
        // failed case!
        reject(err); // exit code 1
      });
    });
};

let logBuildDetails = (bsConfig, buildDetails) => {
  let parallels_enabled = false;
  if (bsConfig.run_settings.parallels) {
    parallels_enabled = true;
  }
  let parallelMessage = `Run in parallel: ${parallels_enabled ? 'enabled' : 'disabled'}`;
  if (parallels_enabled) parallelMessage = parallelMessage + ` (attempting to run on ${buildDetails.machines} machines)`;

  logger.info(`Browser Combinations: ${buildDetails.combinations}`);
  logger.info(parallelMessage);
  logger.info(`BrowserStack Dashboard: ${buildDetails.dashboard_url}`);
};

let printSpecsStatus = () => {
  return new Promise(function (resolve, reject) {
    resolve();
  });
};

let printSpecsRunSummary = () => {
  return new Promise(function (resolve, reject) {
    resolve();
  });
};

let printFailedSpecsDetails = () => {
  return new Promise(function (resolve, reject) {
    resolve();
  });
};

let printBuildDashboardLink = (dashboardUrl) => {
  logger.info(`${Constants.cliMessages.RUN.BUILD_REPORT_MESSAGE}: ${dashboardUrl}`);
};
