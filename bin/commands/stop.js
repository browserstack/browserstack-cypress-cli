'use strict';
const request = require('request');

const config = require("../helpers/config"),
  logger = require("../helpers/logger").winstonLogger,
  Constants = require("../helpers/constants"),
  utils = require("../helpers/utils"),
  getInitialDetails = require('../helpers/getInitialDetails').getInitialDetails;

module.exports = function stop(args, rawArgs) {
  let bsConfigPath = utils.getConfigPath(args.cf);

  return utils.validateBstackJson(bsConfigPath).then(async function (bsConfig) {
    utils.setDefaults(bsConfig, args);

    // accept the username from command line if provided
    utils.setUsername(bsConfig, args);

    // accept the access key from command line if provided
    utils.setAccessKey(bsConfig, args);

    utils.setUsageReportingFlag(bsConfig, args.disableUsageReporting);

    // set cypress config filename
    utils.setCypressConfigFilename(bsConfig, args);

    let buildId = args._[1];
    let buildReportData = null;

    if (!Constants.turboScaleObj.enabled) {
      buildReportData = await getInitialDetails(bsConfig, args, rawArgs);
    }

    await utils.stopBrowserStackBuild(bsConfig, args, buildId, rawArgs, buildReportData);
  }).catch(function (err) {
    logger.error(err);
    utils.setUsageReportingFlag(null, args.disableUsageReporting);
    utils.sendUsageReport(null, args, err.message, Constants.messageTypes.ERROR, utils.getErrorCodeFromErr(err), null, rawArgs);
    process.exitCode = Constants.ERROR_EXIT_CODE;
  })
}
