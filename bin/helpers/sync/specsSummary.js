const logger = require("../logger").syncCliLogger;

/**
 *
 * @param {Array.<{specName: string, status: string, combination: string, sessionId: string}>} data
 * @param {String} time
 * @param {Number} machines
 * @returns {Promise.resolve || Promise.reject}
 */
// Example:
// [
//   {specName: 'spec1.failed.js', status: 'Failed', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'},
//   {specName: 'spec2.name.js', status: 'Skipped', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'},
//   {specName: 'spec3.network.js', status: 'Failed', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'},
//   {specName: 'spec6.utils.js', status: 'Failed', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'},
//   {specName: 'spec8.alias.js', status: 'Skipped', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'}
// ]
//
let printSpecsRunSummary = (data, machines) => {
  return new Promise((resolve, _reject) => {
    let summary = {
      total: 0,
      failed: 0,
      passed: 0,
      skipped: 0
    };

    data.specs.forEach((spec) => {
      specSummaryCount(summary, spec.status.toLowerCase());
    });

    logger.info(`Total tests: ${summary.total}, passed: ${summary.passed}, failed: ${summary.failed}, skipped: ${summary.skipped}`);
    logger.info(`Done in ${data.duration/1000} seconds using ${machines} machines\n`);

    resolve(data.exitCode);
  })
};

let specSummaryCount = (summary, status) => {
  switch (status) {
    case 'failed':
      summary.failed++;
      break;
    case 'skipped':
      summary.skipped++;
      break;
    case 'passed':
      summary.passed++;
      break;
  }
  summary.total++;
};

exports.printSpecsRunSummary = printSpecsRunSummary;
