'use strict';
const usageReporting =  require('./usageReporting'),
  logger = require('./logger').winstonLogger,
  Constants = require('./constants');

exports.validateBstackJson = (bsConfigPath) => {
  return new Promise(function(resolve, reject){
    try {
      logger.info(`Reading config from ${bsConfigPath}`);
      let bsConfig = require(bsConfigPath);
      resolve(bsConfig);
    }
    catch (e) {
      reject(e);
    }
  });
}

exports.getErrorCodeFromMsg = (errMsg) => {
  let errorCode = null;
  switch (errMsg) {
    case Constants.validationMessages.EMPTY_BROWSERSTACK_JSON:
      errorCode = "bstack_json_invalid_empty";
      break;
    case Constants.validationMessages.INCORRECT_AUTH_PARAMS:
      errorCode = "bstack_json_invalid_missing_keys";
      break;
    case Constants.validationMessages.EMPTY_BROWSER_LIST:
      errorCode = "bstack_json_invalid_no_browsers";
      break;
    case Constants.validationMessages.EMPTY_RUN_SETTINGS:
      errorCode = "bstack_json_invalid_no_run_settings";
      break;
    case Constants.validationMessages.EMPTY_SPEC_FILES:
      errorCode = "bstack_json_invalid_values";
      break;
  }
  return errorCode;
}

exports.getErrorCodeFromErr = (err) => {
  let errorCode = null;
  if (err.code === 'SyntaxError') {
    errorCode = 'bstack_json_parse_error';
  } else if (err.code === 'EACCES') {
    errorCode = 'bstack_json_no_permission';
  } else {
    errorCode = 'bstack_json_invalid_unknown';
  }
  return errorCode
}

exports.sendUsageReport = (bsConfig, args, message, message_type, error_code) => {
  usageReporting.send({
    cli_args: args,
    message: message,
    message_type: message_type,
    error_code: error_code,
    bstack_config: bsConfig
  });
}

exports.setUsageReportingFlag = (bsConfig, disableUsageReporting) => {
  if (disableUsageReporting === undefined && bsConfig && bsConfig['disable-usage-reporting'] != undefined) {
    process.env.DISABLE_USAGE_REPORTING = bsConfig['disable-usage-reporting'];
  } else {
    process.env.DISABLE_USAGE_REPORTING = disableUsageReporting;
  }
}
