'use strict';
const Config = require("./config"),
  logger = require("./logger").syncCliLogger,
  Constants = require("./constants"),
  utils = require("./utils"),
  request = require('request'),
  syncSpecsLogs = require('./sync/syncSpecsLogs'),
  specDetails = require('./sync/failedSpecsDetails'),
  specsSummary = require('./sync/specsSummary'),
  { table, getBorderCharacters } = require('table'),
  chalk = require('chalk');

exports.pollBuildStatus = (bsConfig, buildDetails) => {
  return new Promise((resolve, reject) => {
    //logBuildDetails(bsConfig, buildDetails);
    syncSpecsLogs.printSpecsStatus(bsConfig, buildDetails).then((data) => {
      return specDetails.failedSpecsDetails(data);
      // return specsSummary.printSpecsRunSummary(data.specs, data.duration, buildDetails.machines);
    }).then((data) => {
      return specsSummary.printSpecsRunSummary(data, buildDetails.machines);
      // return specDetails.failedSpecsDetails(data);
    }).then((successExitCode) => {
      resolve(successExitCode); // exit code 0
    }).catch((nonZeroExitCode) => {
      resolve(nonZeroExitCode); // exit code 1
    })
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
