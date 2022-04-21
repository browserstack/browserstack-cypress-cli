'use strict';
const syncSpecsLogs = require('./sync/syncSpecsLogs'),
  specDetails = require('./sync/failedSpecsDetails'),
  specsSummary = require('./sync/specsSummary');

exports.pollBuildStatus = (bsConfig, buildDetails, rawArgs, buildReportData) => {
  return new Promise((resolve, reject) => {
    syncSpecsLogs.printSpecsStatus(bsConfig, buildDetails, rawArgs, buildReportData).then((data) => {
      return specDetails.failedSpecsDetails(data);
    }).then((data) => {
      return specsSummary.printSpecsRunSummary(data, buildDetails.machines);
    }).then((successExitCode) => {
      resolve(successExitCode); // exit code 0
    }).catch((nonZeroExitCode) => {
      resolve(nonZeroExitCode); // exit code 1
    })
  });
};
