'use strict';
const config = require("./config"),
  logger = require("./logger").winstonLogger,
  Constants = require("./constants"),
  utils = require("./utils"),
  request = require('request');

exports.pollBuildStatus = (bsConfig, buildId) => {

  logger.info(Constants.userMessages.BUILD_REPORT_MESSAGE);
  logger.info(`${config.dashboardUrl}${buildId}`);
  return 0;
};
