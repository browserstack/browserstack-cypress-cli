'use strict';
const syncSpecsLogs = require('./sync/syncSpecsLogs'),
  specDetails = require('./sync/failedSpecsDetails'),
  specsSummary = require('./sync/specsSummary');

exports.pollBuildStatus = (bsConfig, buildDetails) => {
  return new Promise((resolve, reject) => {
    syncSpecsLogs.printSpecsStatus(bsConfig, buildDetails).then((data) => {
      return syncSpecsLogs.fetchResourceErrors(bsConfig, buildDetails, data)
    }).then((specData) => {
      return specDetails.failedSpecsDetails(specData);
    }).then((data) => {
      return specsSummary.printSpecsRunSummary(data, buildDetails.machines);
    }).then((successExitCode) => {
      resolve(successExitCode); // exit code 0
    }).catch((nonZeroExitCode) => {
      resolve(nonZeroExitCode); // exit code 1
    })
  });
};
