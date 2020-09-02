'use strict';
const os = require("os");
const path = require("path");

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
      reject("Couldn't find the browserstack.json file at \""+ bsConfigPath +"\". Please use --config-file <path to browserstack.json>.");
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
    case Constants.validationMessages.EMPTY_CYPRESS_PROJ_DIR:
      errorCode = "bstack_json_invalid_no_cypress_proj_dir";
      break;
    case Constants.validationMessages.INVALID_DEFAULT_AUTH_PARAMS:
      errorCode = "bstack_json_default_auth_keys";
      break;
    case Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION:
      errorCode = "invalid_parallels_specified";
      break;
    case Constants.validationMessages.LOCAL_NOT_SET:
      errorCode = "cypress_json_base_url_no_local";
      break;
    case Constants.validationMessages.INCORRECT_DIRECTORY_STRUCTURE:
      errorCode = "invalid_directory_structure";
      break;
  }
  if(errMsg.includes("Please use --config-file <path to browserstack.json>.")){
    errorCode = "bstack_json_path_invalid";
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
  if (disableUsageReporting === undefined && bsConfig && bsConfig['disable_usage_reporting'] != undefined) {
    process.env.DISABLE_USAGE_REPORTING = bsConfig['disable_usage_reporting'];
  } else {
    process.env.DISABLE_USAGE_REPORTING = disableUsageReporting;
  }
}

exports.setParallels = (bsConfig, args) => {
  if (!this.isUndefined(args.parallels)) {
    bsConfig['run_settings']['parallels'] = args.parallels;
  }
}

exports.setUsername = (bsConfig, args) => {
  if (!this.isUndefined(args.username)) {
    bsConfig['auth']['username'] = args.username;
  }
}

exports.setAccessKey = (bsConfig, args) => {
  if (!this.isUndefined(args.key)) {
    bsConfig['auth']['access_key'] = args.key;
  }
}

exports.setBuildName = (bsConfig, args) => {
  if (!this.isUndefined(args['build-name'])) {
    bsConfig['run_settings']['build_name'] = args['build-name'];
  }
}

exports.searchForOption = (option) => {
  return (process.argv.indexOf(option) > -1);
}

exports.verifyCypressConfigFileOption = () => {
  let ccfOptionsSet = (this.searchForOption('-ccf') || this.searchForOption('--ccf'));
  let cypressConfigFileSet = (this.searchForOption('-cypress-config-file') || this.searchForOption('--cypress-config-file'));
  let cypressConfigOptionsSet = (this.searchForOption('-cypressConfigFile') || this.searchForOption('--cypressConfigFile'));
  return (ccfOptionsSet || cypressConfigFileSet || cypressConfigOptionsSet);
}

exports.setCypressConfigFilename = (bsConfig, args) => {
  let userPassedCypessConfigFile = this.verifyCypressConfigFileOption();

  if (userPassedCypessConfigFile || this.isUndefined(bsConfig.run_settings.cypress_config_file)) {
    bsConfig.run_settings.cypress_config_filename = path.basename(args.cypressConfigFile);
    bsConfig.run_settings.cypress_config_file = args.cypressConfigFile;
  }
}

exports.isUndefined = value => (value === undefined || value === null);

exports.isFloat = value => (Number(value) && Number(value) % 1 !== 0);

exports.isParallelValid = (value) => {
  return this.isUndefined(value) || !(isNaN(value) || this.isFloat(value) || parseInt(value, 10) === 0 || parseInt(value, 10) < -1 ) || value === Constants.constants.DEFAULT_PARALLEL_MESSAGE;
}

exports.getUserAgent = () => {
  return `BStack-Cypress-CLI/1.3.0 (${os.arch()}/${os.platform()}/${os.release()})`;
}

exports.isAbsolute  = (configPath) => {
  return path.isAbsolute(configPath)
}

exports.getConfigPath = (configPath) => {
  return this.isAbsolute(configPath) ? configPath : path.join(process.cwd(), configPath);
}

exports.configCreated = (args) => {
  let message = Constants.userMessages.CONFIG_FILE_CREATED
  logger.info(message);
  this.sendUsageReport(null, args, message, Constants.messageTypes.SUCCESS, null);
}

exports.isCypressProjDirValid = (cypressDir, cypressProjDir) => {
  // Getting absolute path
  cypressDir = path.resolve(cypressDir);
  cypressProjDir = path.resolve(cypressProjDir);
  if(cypressProjDir === cypressDir) return true;
  let parentTokens = cypressDir.split('/').filter(i => i.length);
  let childTokens = cypressProjDir.split('/').filter(i => i.length);
  return parentTokens.every((t, i) => childTokens[i] === t);
}

exports.getLocalFlag = (connectionSettings) => {
  return !this.isUndefined(connectionSettings) && !this.isUndefined(connectionSettings.local) && connectionSettings.local
}
