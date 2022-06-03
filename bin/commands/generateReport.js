'use strict';

const logger = require("../helpers/logger").winstonLogger,
      Constants = require("../helpers/constants"),
      utils = require("../helpers/utils"),
      reporterHTML = require('../helpers/reporterHTML'),
      getInitialDetails = require('../helpers/getInitialDetails').getInitialDetails;


module.exports = function generateReport(args, rawArgs) {
  let bsConfigPath = utils.getConfigPath(args.cf);
  let reportGenerator = reporterHTML.reportGenerator;

  return utils.validateBstackJson(bsConfigPath).then(function (bsConfig) {
    // setting setDefaults to {} if not present and set via env variables or via args.
    utils.setDefaults(bsConfig, args);

    // accept the username from command line if provided
    utils.setUsername(bsConfig, args);

    // accept the access key from command line if provided
    utils.setAccessKey(bsConfig, args);

    getInitialDetails(bsConfig, args, rawArgs).then((buildReportData) => {

      utils.setUsageReportingFlag(bsConfig, args.disableUsageReporting);
  
      // set cypress config filename
      utils.setCypressConfigFilename(bsConfig, args);
  
      let messageType = Constants.messageTypes.INFO;
      let errorCode = null;
      let buildId = args._[1];
  
      reportGenerator(bsConfig, buildId, args, rawArgs, buildReportData);
      utils.sendUsageReport(bsConfig, args, 'generate-report called', messageType, errorCode, buildReportData, rawArgs);
    }).catch((err) => {
      logger.warn(err);
    });
  }).catch(function (err) {
    logger.error(err);
    utils.setUsageReportingFlag(null, args.disableUsageReporting);
    utils.sendUsageReport(null, args, err.message, Constants.messageTypes.ERROR, utils.getErrorCodeFromErr(err), null, rawArgs);
    process.exitCode = Constants.ERROR_EXIT_CODE;
  });
};
