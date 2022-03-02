"use strict";
const os = require("os");
const path = require("path");
const fs = require("fs");
const glob = require('glob');
const getmac = require('getmac').default;
const { v4: uuidv4 } = require('uuid');
const browserstack = require('browserstack-local');
const crypto = require('crypto');

const usageReporting = require("./usageReporting"),
  logger = require("./logger").winstonLogger,
  Constants = require("./constants"),
  chalk = require('chalk'),
  syncCliLogger = require("../helpers/logger").syncCliLogger,
  fileHelpers = require("./fileHelpers"),
  config = require("../helpers/config"),
  pkg = require('../../package.json');

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
    case Constants.validationMessages.INVALID_LOCAL_ASYNC_ARGS:
      errorCode = 'invalid_local_async_args';
      break;
    case Constants.validationMessages.INVALID_GEO_LOCATION:
      errorCode = 'invalid_geo_location';
      break;
    case Constants.validationMessages.NOT_ALLOWED_GEO_LOCATION_AND_LOCAL_MODE:
      errorCode = 'not_allowed_geo_location_and_local_mode';
      break;
    case Constants.validationMessages.HOME_DIRECTORY_NOT_FOUND:
      errorCode = 'home_directory_not_found';
      break;
    case Constants.validationMessages.HOME_DIRECTORY_NOT_A_DIRECTORY:
      errorCode = 'home_directory_not_a_directory';
      break;
    case Constants.validationMessages.CYPRESS_CONFIG_FILE_NOT_PART_OF_HOME_DIRECTORY:
      errorCode = 'cypress_config_file_not_part_of_home_directory';
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
  error_code,
  data,
  rawArgs
) => {
  usageReporting.send({
    cli_args: args,
    message: message,
    message_type: message_type,
    error_code: error_code,
    bstack_config: bsConfig,
    data,
    raw_args: rawArgs
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

exports.getParallels = (bsConfig, args) => {
  return args.parallels || bsConfig['run_settings']['parallels'];
}

exports.setParallels = (bsConfig, args, numOfSpecs) => {
  if (!this.isUndefined(args.parallels)) {
    bsConfig["run_settings"]["parallels"] = args.parallels;
  }
  let browserCombinations = this.getBrowserCombinations(bsConfig);
  let maxParallels = browserCombinations.length * numOfSpecs;
  if (numOfSpecs <= 0) {
    bsConfig['run_settings']['parallels'] = browserCombinations.length;
    bsConfig['run_settings']['specs_count'] = numOfSpecs;
    return;
  }
  if (bsConfig['run_settings']['parallels'] > maxParallels && bsConfig['run_settings']['parallels'] != -1 ) {
    logger.warn(
      `Using ${maxParallels} machines instead of ${bsConfig['run_settings']['parallels']} that you configured as there are ${numOfSpecs} specs to be run on ${browserCombinations.length} browser combinations.`
    );
    bsConfig['run_settings']['parallels'] = maxParallels;
    bsConfig['run_settings']['specs_count'] = numOfSpecs;
  }
};

exports.warnSpecLimit = (bsConfig, args, specFiles, rawArgs) => {
  let expectedCharLength = specFiles.join("").length + Constants.METADATA_CHAR_BUFFER_PER_SPEC * specFiles.length;
  let parallels = bsConfig.run_settings.parallels;
  let combinations = this.getBrowserCombinations(bsConfig).length;
  let parallelPerCombination = parallels > combinations ? Math.floor(parallels / combinations) : 1;
  let expectedCharLengthPerParallel = Math.floor(expectedCharLength / parallelPerCombination);
  if (expectedCharLengthPerParallel > Constants.SPEC_TOTAL_CHAR_LIMIT) {
    logger.warn(Constants.userMessages.SPEC_LIMIT_WARNING);
    this.sendUsageReport(
      bsConfig,
      args,
      Constants.userMessages.SPEC_LIMIT_WARNING,
      Constants.messageTypes.WARNING,
      null,
      null,
      rawArgs
    );
  }
 }

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

  // setting cache_dependencies to true if not present
  if (this.isUndefined(bsConfig.run_settings.cache_dependencies)) {
    bsConfig.run_settings.cache_dependencies = true;
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

exports.verifyGeolocationOption = () => {
  let glOptionsSet = (this.searchForOption('-gl') || this.searchForOption('--gl'));
  let geoHyphenLocationOptionsSet = (this.searchForOption('-geo-location') || this.searchForOption('--geo-location'));
  let geoLocationOptionsSet = (this.searchForOption('-geolocation') || this.searchForOption('--geolocation'));
  return (glOptionsSet || geoHyphenLocationOptionsSet || geoLocationOptionsSet);
}

exports.setGeolocation = (bsConfig, args) => {
  let userProvidedGeolocation = this.verifyGeolocationOption();
  bsConfig.run_settings.userProvidedGeolocation = (userProvidedGeolocation || (!this.isUndefined(bsConfig.run_settings.geolocation)));

  if (userProvidedGeolocation && !this.isUndefined(args.geolocation)) {
      bsConfig.run_settings.geolocation = args.geolocation;
  }

  if (this.isUndefined(bsConfig.run_settings.geolocation)){
    bsConfig.run_settings.geolocation = null;
  } else {
    bsConfig.run_settings.geolocation = bsConfig.run_settings.geolocation.toUpperCase();
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

exports.setTestEnvs = (bsConfig, args) => {
  let envKeys = {};

  if(bsConfig.run_settings.env && Object.keys(bsConfig.run_settings.env).length !== 0) {
    envKeys = bsConfig.run_settings.env;
  }

  // set env vars passed from command line args as a string
  if (!this.isUndefined(args.env)) {
    let argsEnvVars = this.fixCommaSeparatedString(args.env).split(',');
    argsEnvVars.forEach((envVar) => {
      let env = envVar.split("=");
      envKeys[env[0]] = env.slice(1,).join('=');
    });
  }

  if (Object.keys(envKeys).length === 0) {
    bsConfig.run_settings.env = null;
  } else {
    bsConfig.run_settings.env = Object.keys(envKeys).map(key => (`${key}=${envKeys[key]}`)).join(',');
  }
}

exports.setSystemEnvs = (bsConfig) => {
  let envKeys = {};

  // set env vars which are defined in system_env_vars key
  if(!this.isUndefined(bsConfig.run_settings.system_env_vars) && Array.isArray(bsConfig.run_settings.system_env_vars) && bsConfig.run_settings.system_env_vars.length) {
    let systemEnvVars = bsConfig.run_settings.system_env_vars;
    systemEnvVars.forEach((envVar) => {
      envKeys[envVar] = process.env[envVar];
    });
  }

  // set env vars which start with CYPRESS_ and cypress_
  let pattern = /^cypress_/i;
  let matchingKeys = this.getKeysMatchingPattern(process.env, pattern);
  if (matchingKeys && matchingKeys.length) {
    matchingKeys.forEach((envVar) => {
      envKeys[envVar] = process.env[envVar];
    });
  }

  if (Object.keys(envKeys).length === 0) {
    bsConfig.run_settings.system_env_vars = null;
  } else {
    bsConfig.run_settings.system_env_vars = Object.keys(envKeys).map(key => (`${key}=${envKeys[key]}`));
  }
}

exports.getKeysMatchingPattern = (obj, pattern) => {
  let matchingKeys = Object.keys(obj).filter(function(key) {
    return pattern.test(key);
  });
  return matchingKeys;
}

exports.fixCommaSeparatedString = (string) => {
  return string.split(/\s{0,},\s+/).join(',');
}

exports.isUndefined = value => (value === undefined || value === null);

exports.isTrueString = value => (!this.isUndefined(value) && value.toString().toLowerCase() === 'true');

exports.isFloat = (value) => Number(value) && Number(value) % 1 !== 0;

exports.nonEmptyArray = (value) => {
  if(!this.isUndefined(value) && value && value.length) {
    return true;
  }
  return false;
}

exports.isParallelValid = (value) => {
  return this.isUndefined(value) || !(isNaN(value) || this.isFloat(value) || parseInt(value, 10) === 0 || parseInt(value, 10) < -1) || value === Constants.cliMessages.RUN.DEFAULT_PARALLEL_MESSAGE;
}

exports.getUserAgent = () => {
  return `BStack-Cypress-CLI/${pkg.version} (${os.arch()}/${os.platform()}/${os.release()})`;
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

exports.generateUploadParams = (bsConfig, filePath, md5data, fileDetails) => {
  let options = {
    url: config.uploadUrl,
    auth: {
      user: bsConfig.auth.username,
      password: bsConfig.auth.access_key
    },
    formData: {
      file: fs.createReadStream(filePath),
      filetype: fileDetails.filetype,
      filename: fileDetails.filename,
      zipMd5sum: md5data ? md5data : '',
    },
    headers: {
      "User-Agent": exports.getUserAgent(),
    }
  }
  return options
}

exports.sortJsonKeys = (unordered) => {
  const ordered = Object.keys(unordered).sort().reduce(
    (obj, key) => {
      obj[key] = unordered[key];
      return obj;
    },
    {}
  );
  return ordered
}

exports.generateUploadOptions = (type, md5data, packageData) => {
  let options = {};
  switch (type) {
    case 'zip':
      options =  {
        archivePresent: true,
        md5ReturnKey: "zip_url",
        urlPresent: md5data.zipUrlPresent,
        md5Data: md5data.zip_md5sum,
        url: md5data.zipUrl,
        propogateError: true,
        fileDetails: {
          filetype: "zip",
          filename: "tests"
        },
        messages: {
          uploading: Constants.userMessages.UPLOADING_TESTS,
          uploadingSuccess: Constants.userMessages.UPLOADING_TESTS_SUCCESS
        },
        cleanupMethod: fileHelpers.deleteZip,
      }
      break;
    case 'npm':
      options = {
        archivePresent: packageData.packageArchieveCreated,
        md5ReturnKey: "npm_package_url",
        urlPresent: md5data.packageUrlPresent,
        md5Data: md5data.npm_package_md5sum,
        url: md5data.npmPackageUrl,
        propogateError: false,
        fileDetails: {
          filetype: "tar.gz",
          filename: "bstackPackages"
        },
        messages: {
          uploading: Constants.userMessages.UPLOADING_NPM_PACKAGES,
          uploadingSuccess: Constants.userMessages.UPLOADING_NPM_PACKAGES_SUCCESS
        },
        cleanupMethod: fileHelpers.deletePackageArchieve,
      }
      break;
  }
  return options;
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

exports.setupLocalTesting = (bsConfig, args, rawArgs) => {
  return new Promise(async (resolve, reject) => {
    if( bsConfig['connection_settings'] && bsConfig['connection_settings']['local'] && String(bsConfig['connection_settings']['local']) === "true" ){
      let localBinaryRunning = await this.checkLocalBinaryRunning(bsConfig, bsConfig['connection_settings']['local_identifier']);
      let localIdentifierRunning;
      if (localBinaryRunning['should_spawn_binary'] == true) {
        localIdentifierRunning = false;
        if(this.isUndefined(bsConfig["connection_settings"]["local_identifier"])) {
          bsConfig["connection_settings"]["local_identifier"] = this.generateLocalIdentifier(bsConfig['connection_settings']['local_mode']);
        }
      } else {
        localIdentifierRunning = true;
        process.env.BSTACK_CYPRESS_LOCAL_BINARY_ALREADY_RUNNING = "true"; // shows message when binary is not spawned by the CLI process
        process.env.BSTACK_CYPRESS_LOCAL_BINARY_RUNNING = "true";
      }
      if (!localIdentifierRunning){
        bsConfig.connection_settings.usedAutoLocal = true;
        var bs_local = this.getLocalBinary();
        var bs_local_args = this.setLocalArgs(bsConfig, args);
        let that = this;
        logger.info('Setting up Local testing...');
        bs_local.start(bs_local_args, function (localStartError) {
          if (that.isUndefined(localStartError)) {
            process.env.BSTACK_CYPRESS_LOCAL_BINARY_RUNNING = "true";
            resolve(bs_local);
          } else {
            let message = `name: ${localStartError.name}, message: ${localStartError.message}, extra: ${localStartError.extra}`,
                errorCode = "local_start_error";
            that.sendUsageReport(
              bsConfig,
              args,
              message,
              Constants.messageTypes.ERROR,
              errorCode,
              null,
              rawArgs
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

exports.stopLocalBinary = (bsConfig, bs_local, args, rawArgs) => {
  return new Promise(async (resolve, reject) => {
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
            errorCode,
            null,
            rawArgs
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

exports.checkLocalBinaryRunning = (bsConfig, localIdentifier) => {
  let options = {
    url: `${config.cypress_v1}/local_binary_running_check`,
    auth: {
      user: bsConfig.auth.username,
      password: bsConfig.auth.access_key,
    },
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': this.getUserAgent(),
    },
    body: JSON.stringify({ localIdentifier: localIdentifier}),
  };
  return new Promise ( function(resolve, reject) {
      request.post(options, function (err, resp, body) {
        if(err){
          reject(err);
        }
        let response = JSON.parse(body);
        resolve(response);
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
  if (args.noWrap === true || this.searchForOption('--no-wrap')) {
    process.env.SYNC_NO_WRAP = true;
  } else {
    process.env.SYNC_NO_WRAP = false;
  }
}

exports.getFilesToIgnore = (runSettings, excludeFiles, logging = true) => {
  let ignoreFiles = Constants.filesToIgnoreWhileUploading;

  // exclude files asked by the user
  // args will take precedence over config file
  if (!this.isUndefined(excludeFiles)) {
    let excludePatterns = this.fixCommaSeparatedString(excludeFiles).split(',');
    ignoreFiles = ignoreFiles.concat(excludePatterns);
    if (logging) logger.info(`Excluding files matching: ${JSON.stringify(excludePatterns)}`);
  } else if (!this.isUndefined(runSettings.exclude) && runSettings.exclude.length) {
    ignoreFiles = ignoreFiles.concat(runSettings.exclude);
    if (logging) logger.info(`Excluding files matching: ${JSON.stringify(runSettings.exclude)}`);
  }

  return ignoreFiles;
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

exports.generateUniqueHash = () => {
  const loopback = /(?:[0]{2}[:-]){5}[0]{2}/
  const interFaceList = os.networkInterfaces();
  for (let inter in interFaceList){
    for (const address of interFaceList[inter]) {
      if (loopback.test(address.mac) === false) {
        return crypto.createHash('md5').update(address.mac).digest('hex');
      };
    };
  };
};

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

exports.versionChangedMessage = (preferredVersion, actualVersion, frameworkUpgradeMessage = '') => {
  let message = Constants.userMessages.CYPRESS_VERSION_CHANGED.replace("<preferredVersion>", preferredVersion);
  message = message.replace("<actualVersion>", actualVersion);
  frameworkUpgradeMessage = frameworkUpgradeMessage.replace('.latest', "");
  message = message.replace('<frameworkUpgradeMessage>', frameworkUpgradeMessage);
  return message
}

exports.latestSyntaxToActualVersionMessage = (latestSyntaxVersion, actualVersion, frameworkUpgradeMessage  = '') => {
  let message = Constants.userMessages.LATEST_SYNTAX_TO_ACTUAL_VERSION_MESSAGE.replace("<latestSyntaxVersion>", latestSyntaxVersion);
  message = message.replace("<actualVersion>", actualVersion);
  message = message.replace('<frameworkUpgradeMessage>', frameworkUpgradeMessage)
  return message
}

exports.checkError = (data) => {
  if (!this.isUndefined(data.error)) {
    return data.error
  }
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

  if( err === Constants.validationMessages.INVALID_LOCAL_ASYNC_ARGS && !this.isUndefined(args.async)) {
    return false
  }

  return invalid
}

exports.deleteBaseUrlFromError = (err) => {
  return err.replace(/To test ([\s\S]*)on BrowserStack/g, 'To test on BrowserStack');
}

exports.setBrowsers = async (bsConfig, args) => {
  return new Promise((resolve, reject) => {
    if(!this.isUndefined(args.browser)){
      try{
        bsConfig["browsers"] = []
        let browsersList = args.browser.split(',')
        browsersList.forEach((browser)=>{
          let browserHash = {}
          let osBrowserDetails =  browser.split(':')
          if (!this.isUndefined(osBrowserDetails[1])) browserHash['os'] = osBrowserDetails[1].trim()
          let browserDetails = osBrowserDetails[0].split('@')
          browserHash['browser'] = browserDetails[0].trim()
          browserHash['versions'] = []
          browserHash['versions'].push(this.isUndefined(browserDetails[1]) ? "latest" : browserDetails[1].trim())
          bsConfig["browsers"].push(browserHash)
        });
      } catch(err){
        reject(Constants.validationMessages.INVALID_BROWSER_ARGS)
      }
    }
    resolve()
  });
}

exports.setConfig = (bsConfig, args) => {
  if (!this.isUndefined(args.config)) {
    bsConfig["run_settings"]["config"] = args.config
  }
}

// blindly send other passed configs with run_settings and handle at backend
exports.setOtherConfigs = (bsConfig, args) => {
  if (!this.isUndefined(args.reporter)) {
    bsConfig["run_settings"]["reporter"] = args.reporter;
  }
  if (!this.isUndefined(args.reporterOptions)) {
    bsConfig["run_settings"]["reporter_options"] = args.reporterOptions;
  }
}

exports.readBsConfigJSON = (bsConfigPath) => {
  try {
    fs.accessSync(bsConfigPath, fs.constants.R_OK);
    return fs.readFileSync(bsConfigPath, 'utf-8');
  } catch (err) {
    return null;
  }
}

exports.getCypressJSON = (bsConfig) => {
  let cypressJSON = undefined;
  if (bsConfig.run_settings.cypress_config_file && bsConfig.run_settings.cypress_config_filename !== 'false') {
    cypressJSON = JSON.parse(
      fs.readFileSync(bsConfig.run_settings.cypressConfigFilePath)
    );
  } else if (bsConfig.run_settings.cypressProjectDir) {
    cypressJSON = JSON.parse(
      fs.readFileSync(path.join(bsConfig.run_settings.cypressProjectDir, 'cypress.json'))
    );
  }
  return cypressJSON;
}

exports.setCLIMode = (bsConfig, args) => {
  args.sync = true;
  if(!this.isUndefined(args.async) && args.async){
    args.sync = false;
  }
}

exports.stopBrowserStackBuild = async (bsConfig, args, buildId, rawArgs) => {
  let that = this;
  return new Promise(function (resolve, reject) {
    let url = config.buildStopUrl + buildId;
    let options = {
      url: url,
      auth: {
        username: bsConfig["auth"]["username"],
        password: bsConfig["auth"]["access_key"],
      },
      headers: {
        'User-Agent': that.getUserAgent(),
      },
    };
    let message = null;
    let messageType = null;
    let errorCode = null;
    let build = null;
    request.post(options, function(err, resp, data) {
      if(err) {
        message = Constants.userMessages.BUILD_STOP_FAILED;
        messageType = Constants.messageTypes.ERROR;
        errorCode = 'api_failed_build_stop';
        logger.info(message);
      } else {
        try {
          build = JSON.parse(data);
          if (resp.statusCode == 299) {
            messageType = Constants.messageTypes.INFO;
            errorCode = 'api_deprecated';
      
            if (build) {
              message = build.message;
              logger.info(message);
            } else {
              message = Constants.userMessages.API_DEPRECATED;
              logger.info(message);
            }
          } else if (resp.statusCode != 200) {
            messageType = Constants.messageTypes.ERROR;
            errorCode = 'api_failed_build_stop';
      
            if (build) {
              message = `${
                Constants.userMessages.BUILD_STOP_FAILED
              } with error: \n${JSON.stringify(build, null, 2)}`;
              logger.error(message);
              if (build.message === 'Unauthorized') errorCode = 'api_auth_failed';
            } else {
              message = Constants.userMessages.BUILD_STOP_FAILED;
              logger.error(message);
            }
          } else {
            messageType = Constants.messageTypes.SUCCESS;
            message = `${JSON.stringify(build, null, 2)}`;
            logger.info(message);
          }
        } catch(err) {
          message = Constants.userMessages.BUILD_STOP_FAILED;
          messageType = Constants.messageTypes.ERROR;
          errorCode = 'api_failed_build_stop';
          logger.info(message);
        } finally {
            that.sendUsageReport(bsConfig, args, message, messageType, errorCode, null, rawArgs);
        }
      }
      resolve();
    });
  });
}

exports.setProcessHooks = (buildId, bsConfig, bsLocal, args) => {
  let bindData = {
    buildId: buildId,
    bsConfig: bsConfig,
    bsLocalInstance: bsLocal,
    args: args
  }
  process.on('SIGINT', processExitHandler.bind(this, bindData));
  process.on('SIGTERM', processExitHandler.bind(this, bindData));
  process.on('SIGBREAK', processExitHandler.bind(this, bindData));
  process.on('uncaughtException', processExitHandler.bind(this, bindData));
}

async function processExitHandler(exitData){
  logger.warn(Constants.userMessages.PROCESS_KILL_MESSAGE);
  await this.stopBrowserStackBuild(exitData.bsConfig, exitData.args, exitData.buildId);
  await this.stopLocalBinary(exitData.bsConfig, exitData.bsLocalInstance, exitData.args);
  process.exit(0);
}

exports.fetchZipSize = (fileName) => {
  try {
    let stats = fs.statSync(fileName)
    return stats.size; // in bytes
  }
  catch(err) {
    return 0;
  }
}

exports.getVideoConfig = (cypressJson) => {
  let conf = {
    video: true,
    videoUploadOnPasses: true
  }
  if (!this.isUndefined(cypressJson.video)) conf.video = cypressJson.video;
  if (!this.isUndefined(cypressJson.videoUploadOnPasses)) conf.videoUploadOnPasses = cypressJson.videoUploadOnPasses;

  return conf;
}
