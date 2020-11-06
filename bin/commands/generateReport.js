'use strict';
const request = require('request');

const config = require("../helpers/config"),
  logger = require("../helpers/logger").winstonLogger,
  Constants = require("../helpers/constants"),
  utils = require("../helpers/utils"),
  reportGenerator = require('../helpers/reporterHTML').reportGenerator;


module.exports = function info(args) {
  let bsConfigPath = utils.getConfigPath(args.cf);

  return utils.validateBstackJson(bsConfigPath).then(function (bsConfig) {
    // setting setDefaultAuthHash to {} if not present and set via env variables or via args.
    utils.setDefaultAuthHash(bsConfig, args);

    // accept the username from command line if provided
    utils.setUsername(bsConfig, args);

    // accept the access key from command line if provided
    utils.setAccessKey(bsConfig, args);

    utils.setUsageReportingFlag(bsConfig, args.disableUsageReporting);

    // set cypress config filename
    utils.setCypressConfigFilename(bsConfig, args);

    let buildId = args._[1];

    reportGenerator(bsConfig, buildId);
  }).catch(function (err) {
    logger.error(err);
    utils.setUsageReportingFlag(null, args.disableUsageReporting);
    utils.sendUsageReport(null, args, err.message, Constants.messageTypes.ERROR, utils.getErrorCodeFromErr(err));
  });
};
