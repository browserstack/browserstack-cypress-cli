"use strict";
const os = require("os");
const path = require("path");
const fs = require("fs");
const glob = require('glob');
const getmac = require('getmac').default;
const { v4: uuidv4 } = require('uuid');
const browserstack = require('browserstack-local');

const usageReporting = require("./usageReporting"),
  logger = require("./logger").winstonLogger,
  Constants = require("./constants"),
  chalk = require('chalk'),
  syncCliLogger = require("../helpers/logger").syncCliLogger,
  config = require("../helpers/config");

const request = require('request');

exports.validateBstackJson = (bsConfigPath) => {
  return new Promise(function (resolve, reject) {
    try {
      logger.info(`Reading config from ${bsConfigPath}`);
      let bsConfig = require(bsConfigPath);
      resolve(bsConfig);
    } catch (e) {
      reject(
        e.code === "MODULE_NOT_FOUND"
          ? "Couldn't find the browserstack.json file at \"" +
              bsConfigPath +
              '". Please use --config-file <path to browserstack.json>.'
          : `Invalid browserstack.json file. Error : ${e.message}`
      );
    }
  });
};

exports.getErrorCodeFromMsg = (errMsg) => {
  let errorCode = null;
  switch (errMsg) {
    case Constants.validationMessages.EMPTY_BROWSERSTACK_JSON:
      errorCode = 'bstack_json_invalid_empty';
      break;
    case Constants.validationMessages.INCORRECT_AUTH_PARAMS:
      errorCode = 'bstack_json_invalid_missing_keys';
      break;
    case Constants.validationMessages.EMPTY_BROWSER_LIST:
      errorCode = 'bstack_json_invalid_no_browsers';
      break;
    case Constants.validationMessages.EMPTY_RUN_SETTINGS:
      errorCode = 'bstack_json_invalid_no_run_settings';
      break;
    case Constants.validationMessages.EMPTY_CYPRESS_PROJ_DIR:
      errorCode = 'bstack_json_invalid_no_cypress_proj_dir';
      break;
    case Constants.validationMessages.INVALID_DEFAULT_AUTH_PARAMS:
      errorCode = 'bstack_json_default_auth_keys';
      break;
    case Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION:
      errorCode = 'invalid_parallels_specified';
      break;
    case Constants.validationMessages.INVALID_LOCAL_IDENTIFIER:
      errorCode = 'invalid_local_identifier';
      break;
    case Constants.validationMessages.INVALID_CLI_LOCAL_IDENTIFIER:
      errorCode = 'invalid_local_identifier';
      break;
    case Constants.validationMessages.INVALID_LOCAL_MODE:
      errorCode = 'invalid_local_mode';
      break;
    case Constants.validationMessages.INVALID_LOCAL_CONFIG_FILE:
      errorCode = 'invalid_local_config_file';
      break;
    case Constants.validationMessages.LOCAL_NOT_SET:
      errorCode = 'cypress_json_base_url_no_local';
      break;
    case Constants.validationMessages.INCORRECT_DIRECTORY_STRUCTURE:
      errorCode = 'invalid_directory_structure';
      break;
    case Constants.validationMessages.INVALID_CYPRESS_CONFIG_FILE:
      errorCode = 'invalid_cypress_config_file';
      break;
  }
  if (
    errMsg.includes("Please use --config-file <path to browserstack.json>.")
  ) {
    errorCode = "bstack_json_path_invalid";
  } else if (errMsg.includes("Invalid browserstack.json file.")) {
    errorCode = "bstack_json_invalid";
  }
  return errorCode;
};

exports.getErrorCodeFromErr = (err) => {
  let errorCode = null;
  if (err.code === "SyntaxError") {
    errorCode = "bstack_json_parse_error";
  } else if (err.code === "EACCES") {
    errorCode = "bstack_json_no_permission";
  } else {
    errorCode = "bstack_json_invalid_unknown";
  }
  return errorCode;
};

exports.sendUsageReport = (
  bsConfig,
  args,
  message,
  message_type,
  error_code
) => {
  usageReporting.send({
    cli_args: args,
    message: message,
    message_type: message_type,
    error_code: error_code,
    bstack_config: bsConfig,
  });
};

exports.setUsageReportingFlag = (bsConfig, disableUsageReporting) => {
  if (
    disableUsageReporting === undefined &&
    bsConfig &&
    bsConfig["disable_usage_reporting"] != undefined
  ) {
    process.env.DISABLE_USAGE_REPORTING = bsConfig["disable_usage_reporting"];
  } else {
    process.env.DISABLE_USAGE_REPORTING = disableUsageReporting;
  }
};

exports.setParallels = (bsConfig, args, numOfSpecs) => {
  if (!this.isUndefined(args.parallels)) {
    bsConfig["run_settings"]["parallels"] = args.parallels;
  }
  let browserCombinations = this.getBrowserCombinations(bsConfig);
  let maxParallels = browserCombinations.length * numOfSpecs;
  if (numOfSpecs <= 0) {
    bsConfig['run_settings']['parallels'] = browserCombinations.length;
    return;
  }
  if (bsConfig['run_settings']['parallels'] > maxParallels && bsConfig['run_settings']['parallels'] != -1 ) {
    logger.warn(
      `Using ${maxParallels} machines instead of ${bsConfig['run_settings']['parallels']} that you configured as there are ${numOfSpecs} specs to be run on ${browserCombinations.length} browser combinations.`
    );
    bsConfig['run_settings']['parallels'] = maxParallels;
  }
};

exports.setDefaults = (bsConfig, args) => {
  // setting setDefaultAuthHash to {} if not present and set via env variables or via args.
  if (this.isUndefined(bsConfig['auth']) && (!this.isUndefined(args.username) || !this.isUndefined(process.env.BROWSERSTACK_USERNAME))) {
    bsConfig['auth'] = {};
  }

  // setting npm_dependencies to {} if not present
  if (bsConfig.run_settings && this.isUndefined(bsConfig.run_settings.npm_dependencies)) {
    bsConfig.run_settings.npm_dependencies = {}
  }

  // setting connection_settings to {} if not present
  if (this.isUndefined(bsConfig.connection_settings)) {
    bsConfig.connection_settings = {};
  }

}

exports.setUsername = (bsConfig, args) => {
  if (!this.isUndefined(args.username)) {
    bsConfig["auth"]["username"] = args.username;
  } else if (!this.isUndefined(process.env.BROWSERSTACK_USERNAME)) {
    bsConfig["auth"]["username"] = process.env.BROWSERSTACK_USERNAME;
    logger.info(
      "Reading username from the environment variable BROWSERSTACK_USERNAME"
    );
  }
};

exports.setAccessKey = (bsConfig, args) => {
  if (!this.isUndefined(args.key)) {
    bsConfig["auth"]["access_key"] = args.key;
  } else if (!this.isUndefined(process.env.BROWSERSTACK_ACCESS_KEY)) {
    bsConfig["auth"]["access_key"] = process.env.BROWSERSTACK_ACCESS_KEY;
    logger.info(
      "Reading access key from the environment variable BROWSERSTACK_ACCESS_KEY"
    );
  }
};

exports.setBuildName = (bsConfig, args) => {
  if (!this.isUndefined(args["build-name"])) {
    bsConfig["run_settings"]["build_name"] = args["build-name"];
  }
};

exports.searchForOption = (option) => {
  return (process.argv.indexOf(option) > -1);
}

exports.verifyCypressConfigFileOption = () => {
  let ccfOptionsSet = (this.searchForOption('-ccf') || this.searchForOption('--ccf'));
  let cypressConfigFileSet = (this.searchForOption('-cypress-config-file') || this.searchForOption('--cypress-config-file'));
  let cypressConfigOptionsSet = (this.searchForOption('-cypressConfigFile') || this.searchForOption('--cypressConfigFile'));
  return (ccfOptionsSet || cypressConfigFileSet || cypressConfigOptionsSet);
}

//  TODO: Remove when cleaningup cypress_proj_dir
//
// 1. Remove demand from runner.js for --ccf option.
// 2. Remove the strict check functions: verifyCypressConfigFileOption
// 3. Just use the args.cypressConfigFile for checking the value for cypress config file.
exports.setCypressConfigFilename = (bsConfig, args) => {
  let userProvidedCypessConfigFile = this.verifyCypressConfigFileOption();

  bsConfig.run_settings.userProvidedCypessConfigFile = (userProvidedCypessConfigFile || (!this.isUndefined(bsConfig.run_settings.cypress_config_file)));

  if ((userProvidedCypessConfigFile || this.isUndefined(bsConfig.run_settings.cypress_config_file)) && !this.isUndefined(args.cypressConfigFile)) {
    bsConfig.run_settings.cypress_config_file = args.cypressConfigFile;
    bsConfig.run_settings.cypress_config_filename = path.basename(args.cypressConfigFile);
  } else if (!this.isUndefined(bsConfig.run_settings.cypress_config_file)) {
    bsConfig.run_settings.cypress_config_filename = path.basename(bsConfig.run_settings.cypress_config_file);
  }

  if (bsConfig.run_settings.userProvidedCypessConfigFile){
    bsConfig.run_settings.cypressConfigFilePath = bsConfig.run_settings.cypress_config_file;
    bsConfig.run_settings.cypressProjectDir = path.dirname(bsConfig.run_settings.cypress_config_file);
  } else {
    bsConfig.run_settings.cypressConfigFilePath = path.join(bsConfig.run_settings.cypress_proj_dir, 'cypress.json');
    bsConfig.run_settings.cypressProjectDir = bsConfig.run_settings.cypress_proj_dir;
  }
}

// specs can be passed from bstack configuration file
// specs can be passed via command line args as a string
// command line args takes precedence over config
exports.setUserSpecs = (bsConfig, args) => {
  let bsConfigSpecs = bsConfig.run_settings.specs;

  if (!this.isUndefined(args.specs)) {
    bsConfig.run_settings.specs = this.fixCommaSeparatedString(args.specs);
  } else if (!this.isUndefined(bsConfigSpecs) && Array.isArray(bsConfigSpecs)) {
    bsConfig.run_settings.specs = bsConfigSpecs.join(',');
  } else if (!this.isUndefined(bsConfigSpecs) && typeof(bsConfigSpecs) == "string") {
    bsConfig.run_settings.specs = this.fixCommaSeparatedString(bsConfigSpecs);
  } else {
    bsConfig.run_settings.specs = null;
  }
}

// env option must be set only from command line args as a string
exports.setTestEnvs = (bsConfig, args) => {
  if (!this.isUndefined(args.env)) {
    bsConfig.run_settings.env = this.fixCommaSeparatedString(args.env);
  } else {
    bsConfig.run_settings.env = null;
  }
}

exports.fixCommaSeparatedString = (string) => {
  return string.split(/\s{0,},\s+/).join(',');
}

exports.isUndefined = value => (value === undefined || value === null);

exports.isFloat = (value) => Number(value) && Number(value) % 1 !== 0;

exports.isParallelValid = (value) => {
  return this.isUndefined(value) || !(isNaN(value) || this.isFloat(value) || parseInt(value, 10) === 0 || parseInt(value, 10) < -1) || value === Constants.cliMessages.RUN.DEFAULT_PARALLEL_MESSAGE;
}

exports.getUserAgent = () => {
  return `BStack-Cypress-CLI/1.8.1 (${os.arch()}/${os.platform()}/${os.release()})`;
};

exports.isAbsolute = (configPath) => {
  return path.isAbsolute(configPath);
};

exports.getConfigPath = (configPath) => {
  return this.isAbsolute(configPath)
    ? configPath
    : path.join(process.cwd(), configPath);
};

exports.configCreated = (args) => {
  let message = Constants.userMessages.CONFIG_FILE_CREATED;
  logger.info(message);
  this.sendUsageReport(
    null,
    args,
    message,
    Constants.messageTypes.SUCCESS,
    null
  );
};

exports.exportResults = (buildId, buildUrl) => {
  let data = "BUILD_ID=" + buildId + "\nBUILD_URL=" + buildUrl;
  fs.writeFileSync("log/build_results.txt", data, function (err) {
    if (err) {
      logger.warn(
        `Couldn't write BUILD_ID with value: ${buildId} to browserstack/build_results.txt`
      );
      logger.warn(
        `Couldn't write BUILD_URL with value: ${buildUrl} to browserstack/build_results.txt`
      );
    }
  });
};

exports.deleteResults = () => {
  fs.unlink("log/build_results.txt", function (err) {});
};

exports.isCypressProjDirValid = (cypressProjDir, integrationFoldDir) => {
  // Getting absolute path
  let cypressDir = path.resolve(cypressProjDir);
  let integrationFolderDir = path.resolve(integrationFoldDir);
  if (!this.isAbsolute(integrationFoldDir)) {
    integrationFolderDir = path.resolve(path.join(cypressProjDir, integrationFoldDir));
  }
  if (integrationFolderDir === cypressDir) return true;
  let parentTokens = cypressDir.split(path.sep).filter((i) => i.length);
  let childTokens = integrationFolderDir.split(path.sep).filter((i) => i.length);
  return parentTokens.every((t, i) => childTokens[i] === t);
};

exports.getLocalFlag = (connectionSettings) => {
  return (
    !this.isUndefined(connectionSettings) &&
    !this.isUndefined(connectionSettings.local) &&
    connectionSettings.local
  );
};

exports.setLocal = (bsConfig, args) => {
  if (!this.isUndefined(args.local)) {
    let local = false;
    if (String(args.local).toLowerCase() === 'true') {
      local = true;
    }
    bsConfig['connection_settings']['local'] = local;
  } else if (!this.isUndefined(process.env.BROWSERSTACK_LOCAL)) {
    let local = false;
    if (String(process.env.BROWSERSTACK_LOCAL).toLowerCase() === 'true') {
      local = true;
    }
    bsConfig['connection_settings']['local'] = local;
    logger.info(
      'Reading local setting from the environment variable BROWSERSTACK_LOCAL'
    );
  } else if (!this.isUndefined(bsConfig['connection_settings']['local'])) {
    let local = false;
    if (String(bsConfig['connection_settings']['local']).toLowerCase() === 'true') {
      local = true;
    }
    bsConfig['connection_settings']['local'] = local;
  } else if (
    this.isUndefined(bsConfig['connection_settings']['local']) &&
    (!this.isUndefined(args.localMode) ||
      !this.isUndefined(bsConfig['connection_settings']['local_mode']))
  ) {
    bsConfig['connection_settings']['local'] = true;
    bsConfig.connection_settings.local_inferred = true;
  }
};

exports.setLocalIdentifier = (bsConfig, args) => {
  if (!this.isUndefined(args.localIdentifier)){
    bsConfig["connection_settings"]["local_identifier"] = args.localIdentifier;
    bsConfig['connection_settings']['local_mode'] = "always-on";
  } else if (!this.isUndefined(process.env.BROWSERSTACK_LOCAL_IDENTIFIER)) {
    bsConfig["connection_settings"]["local_identifier"] =
      process.env.BROWSERSTACK_LOCAL_IDENTIFIER;
    logger.info(
      "Reading local identifier from the environment variable BROWSERSTACK_LOCAL_IDENTIFIER"
    );
    bsConfig['connection_settings']['local_mode'] = 'always-on';
  } else if (
      bsConfig['connection_settings']['local'] &&
      !this.isUndefined(bsConfig["connection_settings"]["local_identifier"])
    ){
    bsConfig['connection_settings']['local_mode'] = 'always-on';
  } else if (
      bsConfig['connection_settings']['local'] &&
      this.isUndefined(bsConfig["connection_settings"]["local_identifier"])
    ){
    bsConfig["connection_settings"]["local_identifier"] = this.generateLocalIdentifier(bsConfig['connection_settings']['local_mode']);
  }
};

exports.setLocalMode = (bsConfig, args) => {
  if(String(bsConfig["connection_settings"]["local"]).toLowerCase() === "true"){
    let local_mode = 'on-demand';

    let localModeUndefined= this.isUndefined(bsConfig["connection_settings"]["local_mode"]);

    if (!this.isUndefined(args.localMode)) {
      if(String(args.localMode) === "always-on"){
        local_mode = 'always-on';
      }
    } else if (!localModeUndefined && !["always-on", "on-demand"].includes(bsConfig['connection_settings']['local_mode'])) {
      bsConfig.connection_settings.user_defined_local_mode_warning = bsConfig['connection_settings']['local_mode'];
    } else if (
      !this.isUndefined(bsConfig['connection_settings']['local_mode']) &&
      String(bsConfig['connection_settings']['local_mode']).toLowerCase() ===
        'always-on'
    ) {
      local_mode = 'always-on';
    }
    bsConfig['connection_settings']['local_mode'] = local_mode;
    if (this.isUndefined(args.sync) || !args.sync ){
      bsConfig['connection_settings']['sync_inferred'] = true;
    }
    args.sync = true;

    let localModeInferred = !(this.searchForOption('--local-mode'));

    if (localModeInferred && localModeUndefined) {
      bsConfig.connection_settings.local_mode_inferred = local_mode;
    }
  }
};

exports.setupLocalTesting = (bsConfig, args) => {
  return new Promise(async (resolve, reject) => {
    if( bsConfig['connection_settings'] && bsConfig['connection_settings']['local'] && String(bsConfig['connection_settings']['local']) === "true" ){
      let localIdentifierRunning = await this.checkLocalIdentifierRunning(
        bsConfig, bsConfig['connection_settings']['local_identifier']
      );
      if (!localIdentifierRunning){
        var bs_local = this.getLocalBinary();
        var bs_local_args = this.setLocalArgs(bsConfig, args);
        let that = this;
        logger.info('Setting up Local testing...');
        bs_local.start(bs_local_args, function (localStartError) {
          if (that.isUndefined(localStartError)) {
            resolve(bs_local);
          } else {
            let message = `name: ${localStartError.name}, message: ${localStartError.message}, extra: ${localStartError.extra}`,
                errorCode = "local_start_error";
            that.sendUsageReport(
              bsConfig,
              args,
              message,
              Constants.messageTypes.ERROR,
              errorCode
            );
            reject(Constants.userMessages.LOCAL_START_FAILED);
          }
        });
      } else {
        resolve();
      }
    } else {
      resolve();
    }
  });
};

exports.stopLocalBinary = (bsConfig, bs_local, args) => {
  return new Promise(async (resolve, reject) => {
    if(bsConfig['connection_settings'] && bsConfig['connection_settings']['local']){
      let localIdentifierRunning = await this.checkLocalIdentifierRunning(bsConfig,bsConfig["connection_settings"]["local_identifier"]);
      if(!localIdentifierRunning){
        let message = `Local Binary not running.`,
          errorCode = 'local_identifier_error';
        this.sendUsageReport(
          bsConfig,
          args,
          message,
          Constants.messageTypes.ERROR,
          errorCode
        );
      }
    }
    if (!this.isUndefined(bs_local) && bs_local.isRunning() && bsConfig['connection_settings'] && bsConfig['connection_settings']['local_mode'].toLowerCase() != "always-on") {
      let that = this;
      bs_local.stop(function (localStopError) {
        if (that.isUndefined(localStopError)) {
          resolve();
        } else {
          let message = `name: ${localStopError.name}, message: ${localStopError.message}, extra: ${localStopError.extra}`,
            errorCode = 'local_stop_error';
          that.sendUsageReport(
            bsConfig,
            args,
            message,
            Constants.messageTypes.ERROR,
            errorCode
          );
          resolve(Constants.userMessages.LOCAL_STOP_FAILED);
        }
      });
    } else {
      resolve();
    }
  });
};

exports.getLocalBinary = () => {
  return new browserstack.Local();
};

exports.setLocalArgs = (bsConfig, args) => {
  let local_args = {}
  local_args['key'] = bsConfig['auth']['access_key'];
  local_args['localIdentifier'] = bsConfig["connection_settings"]["local_identifier"];
  local_args['daemon'] = true;
  local_args['enable-logging-for-api'] = true
  local_args['source'] = `cypress:${usageReporting.cli_version_and_path(bsConfig).version}`;
  if(!this.isUndefined(bsConfig["connection_settings"]["local_config_file"])){
    local_args['config-file'] = path.resolve(bsConfig["connection_settings"]["local_config_file"]);
  }
  return local_args;
};

exports.generateLocalIdentifier = (mode) => {
  let local_identifier = undefined;
  if(mode == "always-on"){
    local_identifier = getmac();
  } else {
    local_identifier = uuidv4();
  }
  return Buffer.from(local_identifier).toString("base64");
};

exports.checkLocalIdentifierRunning = (bsConfig, localIdentifier) => {
  let options = {
    url: `${config.localTestingListUrl}?auth_token=${bsConfig.auth.access_key}&state=running`,
    auth: {
      user: bsConfig.auth.username,
      password: bsConfig.auth.access_key,
    },
    headers: {
      'User-Agent': this.getUserAgent(),
    },
  };
  let that = this;
  return new Promise ( function(resolve, reject) {
      request.get(options, function (err, resp, body) {
        if(err){
          reject(err);
        }
        let response = JSON.parse(body);
        let localInstances = [];
        if(!that.isUndefined(response['instances'])){
          localInstances = response['instances'];
        }
        let localIdentifiers = [];

        localInstances.forEach(function(instance){
          localIdentifiers.push(instance['localIdentifier']);
        });

        resolve(localIdentifiers.includes(localIdentifier));
    });
  });
};

exports.setLocalConfigFile = (bsConfig, args) => {
  if(!this.isUndefined(args.localConfigFile)){
    bsConfig['connection_settings']['local_config_file'] = args.localConfigFile;
  }
};

exports.setHeaded = (bsConfig, args) => {
  if (!this.isUndefined(args.headed) && args.headed === true) {
    bsConfig.run_settings.headless = false;
  }
};

exports.setNoWrap = (_bsConfig, args) => {
  if (args.noWrap === true) {
    process.env.SYNC_NO_WRAP = true;
  } else {
    process.env.SYNC_NO_WRAP = false;
  }
}

exports.getNumberOfSpecFiles = (bsConfig, args, cypressJson) => {
  let testFolderPath = cypressJson.integrationFolder || Constants.DEFAULT_CYPRESS_SPEC_PATH;
  let globSearchPattern = this.sanitizeSpecsPattern(bsConfig.run_settings.specs) || `${testFolderPath}/**/*.+(${Constants.specFileTypes.join("|")})`;
  let ignoreFiles = args.exclude || bsConfig.run_settings.exclude;
  let files = glob.sync(globSearchPattern, {cwd: bsConfig.run_settings.cypressProjectDir, matchBase: true, ignore: ignoreFiles});
  return files;
};

exports.sanitizeSpecsPattern = (pattern) => {
  return pattern && pattern.split(",").length > 1 ? "{" + pattern + "}" : pattern;
}

exports.getBrowserCombinations = (bsConfig) => {
  let osBrowserArray = [];
  let osBrowser = "";
  if (bsConfig.browsers) {
    bsConfig.browsers.forEach((element) => {
      osBrowser = element.os + '-' + element.browser;
      element.versions.forEach((version) => {
        osBrowserArray.push(osBrowser + version);
      });
    });
  }
  return osBrowserArray;
};
exports.capitalizeFirstLetter = (stringToCapitalize) => {
  return stringToCapitalize && (stringToCapitalize[0].toUpperCase() + stringToCapitalize.slice(1));
};

exports.handleSyncExit = (exitCode, dashboard_url) => {
  if (exitCode === config.networkErrorExitCode) {
    syncCliLogger.info(this.getNetworkErrorMessage(dashboard_url));
  } else {
    syncCliLogger.info(Constants.userMessages.BUILD_REPORT_MESSAGE);
    syncCliLogger.info(dashboard_url);
  }
  process.exit(exitCode);
}

exports.getNetworkErrorMessage = (dashboard_url) => {
  let message  =  Constants.userMessages.FATAL_NETWORK_ERROR + '\n'
                  + Constants.userMessages.RETRY_LIMIT_EXCEEDED + '\n'
                  + Constants.userMessages.CHECK_DASHBOARD_AT  + dashboard_url
  return chalk.red(message)
}

exports.versionChangedMessage = (preferredVersion, actualVersion) => {
  let message = Constants.userMessages.CYPRESS_VERSION_CHANGED.replace("<preferredVersion>", preferredVersion);
  message = message.replace("<actualVersion>", actualVersion);
  return message
}

exports.isJSONInvalid = (err, args) => {
  let invalid =  true

  if (err === Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION && !this.isUndefined(args.parallels)) {
    return false
  }

  if (this.deleteBaseUrlFromError(err) === this.deleteBaseUrlFromError(Constants.validationMessages.LOCAL_NOT_SET)) {
    return false
  }

  if( err === Constants.validationMessages.INVALID_CLI_LOCAL_IDENTIFIER || err === Constants.validationMessages.INVALID_LOCAL_MODE ){
    return false
  }

  return invalid
}

exports.deleteBaseUrlFromError = (err) => {
  return err.replace(/To test ([\s\S]*)on BrowserStack/g, 'To test on BrowserStack');
}

