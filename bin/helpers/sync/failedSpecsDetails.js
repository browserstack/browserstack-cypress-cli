const tablePrinter = require('table'), // { table, getBorderCharacters }
      chalk = require('chalk'),
      Constants = require("../constants"),
      logger = require("../logger").syncCliLogger,
      winstonLogger = require("../logger").winstonLogger
      config = require("../config"),
      request = require("request");

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
    // let url = "https://automate-local.bsstag.com/s3-upload/cypress-dev-staging/s3.eu-central-1/35d4ac2a6af5eb3240b300981786aad81c0e09ae/session_debug.log?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA2XUQHUQMPPWQOQEM%2F20211215%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20211215T114635Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=13d27fe3dcd2af9da8e94d58ac8902bb7505118d53cf4a9ca4ada5af05689836";
    // data.resourceErrors = {
    //   "NPM_INSTALL_FAILED": {
    //     "combinations": [
    //       {
    //         "name": "OS X Mojave chrome96",
    //         "error_source": url

    //       }
    //     ]
    //   }
    // }
    let anyResourceErrors = false;
    if (Object.keys(data.resourceErrors).length > 0) anyResourceErrors = true;
    if (data.specs.length === 0 && !anyResourceErrors) resolve(data); // return if no failed/skipped tests.

    if (data.specs.length != 0) {
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

        let specStatus =
          spec.status && spec.status.toLowerCase() === 'failed'
            ? chalk.red(spec.status)
            : chalk.yellow(spec.status);
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
    }
    
    if (anyResourceErrors) {
      winstonLogger.error('\nWe encountered some error(s) occurred during the tests :');
      Object.keys(data.resourceErrors).forEach((errorType) => {
        logger.info("\n" + errorType + " for combination(s) -");
        data.resourceErrors[errorType].combinations.forEach((combinationErrorObject) => {
          logger.info(combinationErrorObject.name + ":")
          // TODO: test stacktrace value by using new expiring url
          logger.info(combinationErrorObject.stacktrace);
        })
      })
    }
    // logger.info("\nSome tests fail to ran, stacktrace:");
    // let anyResourceErrors = false;
    // if (data.resourceErrors && Object.keys(data.resourceErrors).length > 0){
    //   anyResourceErrors = true;
    // }
    // Object.keys(data.resourceErrors).forEach((errorType) => {
    //   logger.info("\nError : " + errorType + " details :\n");
    //   request(url, function (error, response, body) {
    //     console.log(body);
    //   });
    // })
    // TODO: Fix exit code here
    if ((failedSpecs || anyResourceErrors) && data.exitCode !== config.networkErrorExitCode) data.exitCode = 1 ; // specs failed, send exitCode as 1
    resolve(data); // No Specs failed, maybe skipped, but not failed, send exitCode as 0
  });
}

exports.failedSpecsDetails = failedSpecsDetails;
