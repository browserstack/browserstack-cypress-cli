const tablePrinter = require('table'), // { table, getBorderCharacters }
      chalk = require('chalk'),
      Constants = require("../constants"),
      logger = require("../logger").syncCliLogger,
      config = require("../config");

/**
 *
 * @param {Array.<{specName: string, status: string, combination: string, sessionId: string}>} data
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
let failedSpecsDetails = (data) => {
  return new Promise((resolve, reject) => {
    if (!data.exitCode) data.exitCode = 0;

    if (data.specs.length === 0) resolve(data); // return if no failed/skipped tests.

    let failedSpecs = false;
    let specResultHeader = Constants.syncCLI.FAILED_SPEC_DETAILS_COL_HEADER.map((col) => {
      return chalk.blueBright(col);
    });

    let specData = [specResultHeader]; // 2-D array

    data.specs.forEach((spec) => {
      if (spec.status.toLowerCase() === 'passed') {
        return;
      }
      if (spec.status && spec.status.toLowerCase() === 'failed' && !failedSpecs)
        failedSpecs = true;

      let specStatus = getSpecStatus(spec.status)
      specData.push([
        spec.specName,
        specStatus,
        spec.combination,
        spec.sessionId,
      ]);
    });

    let tableConfig = {
      border: tablePrinter.getBorderCharacters('ramac'),
      columns: {
        0: { alignment: 'left' , width: 60 },
        1: { alignment: 'left' },
        2: { alignment: 'left' },
        3: { alignment: 'left' },
      },
      /**
      * @typedef {function} drawHorizontalLine
      * @param {number} index
      * @param {number} size
      * @return {boolean}
      */
      drawHorizontalLine: (index, size) => {
        return (index === 0 || index === 1 ||  index === specData.length);
      }
    }

    let result = tablePrinter.table(specData, tableConfig);

    logger.info('\nFailed / skipped test report:');
    logger.info(result);

    if (failedSpecs && data.exitCode !== config.networkErrorExitCode) data.exitCode = 1 ; // specs failed, send exitCode as 1
    resolve(data); // No Specs failed, maybe skipped, but not failed, send exitCode as 0
  });
}

let getSpecStatus = (specStatus) => {
  switch(specStatus.toLowerCase()) {
    case 'failed': return chalk.red(specStatus);
    case 'pending':
    case 'skipped':
    case 'passed_with_skipped': return chalk.blueBright(specStatus);
    default: return chalk.yellow(specStatus);
  }
}

exports.failedSpecsDetails = failedSpecsDetails;
exports.getSpecStatus = getSpecStatus;
