const logger = require("../logger").syncCliLogger;
const winstonlogger = require("../logger").winstonLogger;

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
let printSpecsRunSummary = (data, machines, customErrorsToPrint) => {
  return new Promise((resolve, _reject) => {
    let summary = {
      total: 0,
      failed: 0,
      passed: 0,
      skipped: 0,
      passed_with_skipped: 0,
      pending: 0
    };

    data.specs.forEach((spec) => {
      specSummaryCount(summary, spec.status.toLowerCase());
    });

    logger.info(`Total tests: ${summary.total}, passed: ${summary.passed}, failed: ${summary.failed}, skipped: ${summary.skipped}, passed_with_skipped: ${summary.passed_with_skipped}, pending: ${summary.pending}`);
    logger.info(`Done in ${data.duration} seconds using ${data.parallels} machines\n`);
    winstonlogger.debug(`CLI calculated duration is ${data.cliDuration/1000}`);

    if (customErrorsToPrint && customErrorsToPrint.length > 0) {
      for (const error of customErrorsToPrint) {
        switch(error.level) {
          case 'info':
            winstonlogger.info(error.message);
            break;
          case 'error':
            winstonlogger.error(error.message);
            break;
          default:
            winstonlogger.warn(error.message);
        }
      }
    }

    resolve(data.exitCode);
  })
};

let specSummaryCount = (summary, status) => {
  switch (status) {
    case 'failed':
      summary.failed++;
      break;
    case "passed_with_skipped":
      summary.passed_with_skipped++;
      break;
    case 'skipped':
      summary.skipped++;
      break;
    case "pending":
      summary.pending++;
      break;
    case 'passed':
      summary.passed++;
      break;
  }
  summary.total++;
};

exports.printSpecsRunSummary = printSpecsRunSummary;
