'use strict';
const Config = require("./config"),
  logger = require("./logger").syncCliLogger,
  Constants = require("./constants"),
  utils = require("./utils"),
  request = require('request'),
  specDetails = require('./sync/failedSpecsDetails'),
  specsSummary = require('./sync/specsSummary'),
  { table, getBorderCharacters } = require('table'),
  chalk = require('chalk');

exports.pollBuildStatus = (bsConfig, buildDetails) => {
  logBuildDetails(bsConfig, buildDetails);
  printSpecsStatus().then((data) => {
    return specsSummary.printSpecsRunSummary(data.specs, data.time, data.machines);
  }).then((data) => {
    return specDetails.failedSpecsDetails(data);
  }).then((successExitCode) => {
    return resolveExitCode(successExitCode); // exit code 0
  }).catch((nonZeroExitCode) => {
    return resolveExitCode(nonZeroExitCode); // exit code 1
  }).finally(() => {
    logger.info(Constants.userMessages.BUILD_REPORT_MESSAGE);
    logger.info(`${Config.dashboardUrl}${buildDetails.dashboard_url}`);
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

let resolveExitCode = (exitCode) => {
  return new Promise((resolve, _reject) => { resolve(exitCode) });
};
