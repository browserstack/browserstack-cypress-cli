"use strict";
const os = require("os");
const path = require("path");
const fs = require("fs");
const glob = require('glob');
const getmac = require('getmac').default;
const { v4: uuidv4 } = require('uuid');
const browserstack = require('browserstack-local');
const crypto = require('crypto');
const util = require('util');

const usageReporting = require("./usageReporting"),
  logger = require("./logger").winstonLogger,
  Constants = require("./constants"),
  chalk = require('chalk'),
  syncCliLogger = require("../helpers/logger").syncCliLogger,
  fileHelpers = require("./fileHelpers"),
  config = require("../helpers/config"),
  pkg = require('../../package.json'),
  transports = require('./logger').transports;

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
    case Constants.validationMessages.EMPTY_CYPRESS_CONFIG_FILE:
      errorCode = 'bstack_json_invalid_no_cypress_config_file';
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
  logger.debug(`Setting disable_usage_reporting flag as ${process.env.DISABLE_USAGE_REPORTING}`);
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

exports.warnSpecLimit = (bsConfig, args, specFiles, rawArgs, buildReportData) => {
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
      buildReportData,
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
    logger.debug(`Reading username from command line = ${args.username}`);
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
    logger.debug("Reading access_key from command line");
  } else if (!this.isUndefined(process.env.BROWSERSTACK_ACCESS_KEY)) {
    bsConfig["auth"]["access_key"] = process.env.BROWSERSTACK_ACCESS_KEY;
    logger.info(
      "Reading access key from the environment variable BROWSERSTACK_ACCESS_KEY"
    );
  }
};

exports.setBuildName = (bsConfig, args) => {
  if (!this.isUndefined(args["build-name"])) {
    logger.debug(`Reading build name from command line = ${args["build-name"]}`);
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
    logger.debug(`Looks like cypress config file was not provided. Looking for ${Constants.CYPRESS_CONFIG_FILE_NAMES.join(", ")} files at ${process.cwd()}`);
    for (const possibleCypressFileName of Constants.CYPRESS_CONFIG_FILE_NAMES) {
      let directoryPath = !this.isUndefined(bsConfig.run_settings.cypress_proj_dir) ? bsConfig.run_settings.cypress_proj_dir :  process.cwd();
      if (directoryPath.endsWith("/")) {
        directoryPath = directoryPath.slice(0,-1);
      }
      if (fs.existsSync(path.join(directoryPath, possibleCypressFileName))) {
        bsConfig.run_settings.cypressConfigFilePath = `${directoryPath}/${possibleCypressFileName}`;
        bsConfig.run_settings.cypress_config_file = `${directoryPath}/${possibleCypressFileName}`;
        bsConfig.run_settings.cypress_config_filename = path.basename(bsConfig.run_settings.cypress_config_file);
        bsConfig.run_settings.cypressProjectDir = directoryPath;
        break;
      }
    }
  }

  logger.debug(`Setting cypress config file path = ${bsConfig.run_settings.cypressConfigFilePath}`);
  logger.debug(`Setting cypress project dir = ${bsConfig.run_settings.cypressProjectDir}`);
}

exports.setCypressTestSuiteType = (bsConfig) => {
  for (const possibleCypressFileName of Constants.CYPRESS_CONFIG_FILE_NAMES) {
    if (bsConfig.run_settings.cypressConfigFilePath && 
        typeof(bsConfig.run_settings.cypressConfigFilePath) === 'string' && 
        (path.extname(bsConfig.run_settings.cypressConfigFilePath) == path.extname(possibleCypressFileName) || bsConfig.run_settings.cypressConfigFilePath.endsWith(possibleCypressFileName))) {
          bsConfig.run_settings.cypressTestSuiteType = Constants.CYPRESS_CONFIG_FILE_MAPPING[possibleCypressFileName].type;
          break;
    }
  }

  if (this.isUndefined(bsConfig.run_settings.cypressTestSuiteType)) {
    bsConfig.run_settings.cypressTestSuiteType = Constants.CYPRESS_V9_AND_OLDER_TYPE;
  }

  logger.debug(`Setting cypress test suite type as ${bsConfig.run_settings.cypressTestSuiteType}`);
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
  logger.debug(`Setting geolocation = ${bsConfig.run_settings.geolocation}`);
}

exports.isSpecTimeoutArgPassed = () => {
  return this.searchForOption('--spec-timeout') || this.searchForOption('-t'); 
}
exports.setSpecTimeout = (bsConfig, args) => {
  let specTimeout = null;
  if(this.isSpecTimeoutArgPassed()) {
    if(!this.isUndefined(args.specTimeout)) { 
      specTimeout = args.specTimeout; 
    } else {
      specTimeout = 'undefined'
    }
  } else if (!this.isUndefined(bsConfig.run_settings.spec_timeout)) {
    specTimeout = bsConfig.run_settings.spec_timeout;
  }
  bsConfig.run_settings.spec_timeout = specTimeout;
  logger.debug(`Setting spec timeout = ${specTimeout}`);
}

exports.setRecordFlag = (bsConfig, args) => {
  if(!this.isUndefined(args["record"])) {
    return true;
  }
  return bsConfig.run_settings["record"];
}

exports.setRecordKeyFlag = (bsConfig, args) => {
  if(!this.isUndefined(args["record-key"])) {
    return args["record-key"];
  } else if (!this.isUndefined(process.env.CYPRESS_RECORD_KEY)) {
    return process.env.CYPRESS_RECORD_KEY;
  }
  return bsConfig.run_settings["record-key"];
}

exports.setProjectId = (bsConfig, args) => {
  if(!this.isUndefined(args["projectId"])) {
    return args["projectId"];
  } else if(!this.isUndefined(process.env.CYPRESS_PROJECT_ID)) {
    return process.env.CYPRESS_PROJECT_ID;
  } else if(!this.isUndefined(bsConfig.run_settings["projectId"])) {
    return bsConfig.run_settings["projectId"]; 
  } else {
    let cypressConfigFile = this.getCypressConfigFile(bsConfig);
    if (!this.isUndefined(cypressConfigFile) && !this.isUndefined(cypressConfigFile["projectId"])) {  
      return cypressConfigFile["projectId"]; 
    }
  }
}

exports.setRecordCaps = (bsConfig, args) => {
  bsConfig.run_settings["record"] = this.setRecordFlag(bsConfig, args);
  bsConfig.run_settings["record-key"] = this.setRecordKeyFlag(bsConfig, args);
  bsConfig.run_settings["projectId"] = this.setProjectId(bsConfig, args);
}

exports.verifyNodeVersionOption = () => {
  let nvOptionsSet = (this.searchForOption('-nv') || this.searchForOption('--nv'));
  let nodeVersionHyphenLocationOptionsSet = (this.searchForOption('-node-version') || this.searchForOption('--node-version'));
  let nodeVersionOptionsSet = (this.searchForOption('-nodeVersion') || this.searchForOption('--nodeVersion'));
  return (nvOptionsSet || nodeVersionHyphenLocationOptionsSet || nodeVersionOptionsSet);
}

exports.setNodeVersion = (bsConfig, args) => {
  let userProvidedNodeVersion = this.verifyNodeVersionOption();
  bsConfig.run_settings.userProvidedNodeVersion = (userProvidedNodeVersion || (!this.isUndefined(bsConfig.run_settings.nodeVersion)) || (!this.isUndefined(bsConfig.run_settings.nodeversion)));

  if (bsConfig.run_settings.userProvidedNodeVersion) {
    if(!this.isUndefined(args.nodeVersion)) {
      bsConfig.run_settings.nodeVersion = args.nodeVersion;
    } else if (!this.isUndefined(bsConfig.run_settings.nodeversion)) {
      bsConfig.run_settings.nodeVersion = bsConfig.run_settings.nodeversion;
    }
  }

  if (this.isUndefined(bsConfig.run_settings.nodeVersion)) {
    bsConfig.run_settings.nodeVersion = usageReporting.get_version('node') || '';
  }

  if (bsConfig.run_settings.nodeVersion && typeof(bsConfig.run_settings.nodeVersion) === 'string' && bsConfig.run_settings.nodeVersion.charAt(0).toLowerCase() === 'v') {
    bsConfig.run_settings.nodeVersion = bsConfig.run_settings.nodeVersion.substr(1);
  }

  logger.debug(`Setting nodeVersion = ${bsConfig.run_settings.nodeVersion}`);
}

// specs can be passed from bstack configuration file
// specs can be passed via command line args as a string
// command line args takes precedence over config
exports.setUserSpecs = (bsConfig, args) => {
  let bsConfigSpecs = bsConfig.run_settings.specs;

  if (!this.isUndefined(args.specs)) {
    bsConfig.run_settings.specs = this.fixCommaSeparatedString(args.specs);
    logger.debug(`Specs provided to run using CLI argument = ${bsConfig.run_settings.specs}`);
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

  logger.debug(`Setting env vars = ${bsConfig.run_settings.env}`);
}

exports.setBuildTags = (bsConfig, args) => {
  let buildTag = undefined;
  if(!this.isUndefined(args["build-tag"])) {
    buildTag = args["build-tag"];
  } else {
    buildTag = bsConfig.run_settings.build_tag;
  }
  if(!this.isUndefined(buildTag)) {
    buildTag = buildTag.toString();
  }
  bsConfig.run_settings.build_tag = buildTag;
  logger.debug(`Setting the build tag =  ${bsConfig.run_settings.build_tag}`);
};

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

  logger.debug(`Setting system env vars = ${bsConfig.run_settings.system_env_vars}`);
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

exports.isPositiveInteger = (str) => {
  if (typeof str !== 'string') {
    return false;
  }

  const num = Number(str);

  if (this.isInteger(num) && num > 0) {
    return true;
  }

  return false;
}

exports.isTrueString = value => (!this.isUndefined(value) && value.toString().toLowerCase() === 'true');

exports.isFloat = (value) => Number(value) && Number(value) % 1 !== 0;

exports.isInteger = (value) => Number.isInteger(value);

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
  logger.debug("Writing build results to log/build_results.txt");
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
    logger.debug(`Reading local setting from command line as ${local}`);
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
    logger.debug(`local_mode set to ${bsConfig.connection_settings.local_mode_inferred}`);
  }
};

exports.setupLocalTesting = (bsConfig, args, rawArgs, buildReportData) => {
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
        logger.debug(`Local binary with identifier ${bsConfig["connection_settings"]["local_identifier"]} not running. Starting a new connection.`);
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
            logger.debug(`Error occured while starting a new Local connection with error :`,localStartError);
            let message = `name: ${localStartError.name}, message: ${localStartError.message}, extra: ${localStartError.extra}`,
                errorCode = "local_start_error";
            that.sendUsageReport(
              bsConfig,
              args,
              message,
              Constants.messageTypes.ERROR,
              errorCode,
              buildReportData,
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

exports.stopLocalBinary = (bsConfig, bs_local, args, rawArgs, buildReportData) => {
  return new Promise(async (resolve, reject) => {
    if (!this.isUndefined(bs_local) && bs_local.isRunning() && bsConfig['connection_settings'] && bsConfig['connection_settings']['local_mode'].toLowerCase() != "always-on") {
      let that = this;
      bs_local.stop(function (localStopError) {
        if (that.isUndefined(localStopError)) {
          resolve();
        } else {
          logger.debug(`Stopping local binary failed with error`, localStopError);
          let message = `name: ${localStopError.name}, message: ${localStopError.message}, extra: ${localStopError.extra}`,
            errorCode = 'local_stop_error';
          that.sendUsageReport(
            bsConfig,
            args,
            message,
            Constants.messageTypes.ERROR,
            errorCode,
            buildReportData,
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
  logger.debug("Checking if local binary running");
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
    logger.debug(`local_config_file set to ${bsConfig['connection_settings']['local_config_file']}`);
  }
};

exports.setHeaded = (bsConfig, args) => {
  if (!this.isUndefined(args.headed) && args.headed === true) {
    bsConfig.run_settings.headless = false;
  }
  logger.debug(`headless mode set to ${bsConfig.run_settings.headless}`);
};

exports.setNoWrap = (_bsConfig, args) => {
  if (args.noWrap === true || this.searchForOption('--no-wrap')) {
    process.env.SYNC_NO_WRAP = true;
  } else {
    process.env.SYNC_NO_WRAP = false;
  }
  logger.debug(`no-wrap set to ${process.env.SYNC_NO_WRAP}`);
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

exports.getNumberOfSpecFiles = (bsConfig, args, cypressConfig) => {
  let testFolderPath = cypressConfig.integrationFolder || Constants.DEFAULT_CYPRESS_SPEC_PATH;
  let globSearchPattern = this.sanitizeSpecsPattern(bsConfig.run_settings.specs) || `${testFolderPath}/**/*.+(${Constants.specFileTypes.join("|")})`;
  let ignoreFiles = args.exclude || bsConfig.run_settings.exclude;
  let files = glob.sync(globSearchPattern, {cwd: bsConfig.run_settings.cypressProjectDir, matchBase: true, ignore: ignoreFiles});
  logger.debug(`${files ? files.length : 0} spec files found at ${testFolderPath}`);
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
        logger.debug(`Browsers provided ${bsConfig["browsers"]}`);
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
    logger.debug(`Config set to ${bsConfig["run_settings"]["config"]}`);
  }
}

// blindly send other passed configs with run_settings and handle at backend
exports.setOtherConfigs = (bsConfig, args) => {
  if (!this.isUndefined(args.reporter)) {
    bsConfig["run_settings"]["reporter"] = args.reporter;
    logger.debug(`reporter set to ${args.reporter}`);
  }
  if (!this.isUndefined(args.reporterOptions)) {
    bsConfig["run_settings"]["reporter_options"] = args.reporterOptions;
    logger.debug(`reporter-options set to ${args.reporterOptions}`);
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

exports.getCypressConfigFile = (bsConfig) => {
  let cypressConfigFile = undefined;
  if (bsConfig.run_settings.cypressTestSuiteType === Constants.CYPRESS_V10_AND_ABOVE_TYPE) {
    if (bsConfig.run_settings.cypress_config_filename.endsWith("cypress.config.js")) {
      if (bsConfig.run_settings.cypress_config_file && bsConfig.run_settings.cypress_config_filename !== 'false') {
        cypressConfigFile = require(path.resolve(bsConfig.run_settings.cypressConfigFilePath));
      } else if (bsConfig.run_settings.cypressProjectDir) {
        cypressConfigFile = require(path.join(bsConfig.run_settings.cypressProjectDir, bsConfig.run_settings.cypress_config_filename));
      }
    } else {
      cypressConfigFile = {};
    }
  } else {
    if (bsConfig.run_settings.cypress_config_file && bsConfig.run_settings.cypress_config_filename !== 'false') {
      cypressConfigFile = JSON.parse(fs.readFileSync(bsConfig.run_settings.cypressConfigFilePath))
    } else if (bsConfig.run_settings.cypressProjectDir) {
      cypressConfigFile = JSON.parse(fs.readFileSync(path.join(bsConfig.run_settings.cypressProjectDir, bsConfig.run_settings.cypress_config_filename)));
    }
  }
  return cypressConfigFile;
}

exports.setCLIMode = (bsConfig, args) => {
  args.sync = true;
  if(!this.isUndefined(args.async) && args.async){
    args.sync = false;
  }
  logger.debug(`sync mode set to ${args.sync}`);
}

exports.formatRequest = (err, resp, body) => {
  return {
    err,
    status: resp ? resp.statusCode : null,
    body: body ? util.format('%j', body) : null
  }
}

exports.setDebugMode = (args) => {
  if(args.cliDebug || String(process.env.DEBUG).toLowerCase() === 'true'){
    args.cliDebug ? 
      logger.info("CLI is running with the --cli-debug argument. Running CLI in the debug mode...") :
      logger.info("DEBUG environment variable set to 'true'. Running CLI in the debug mode...") ;
    transports.loggerConsole.level = 'debug';
    return;
  }

  transports.loggerConsole.level = 'info';
}


exports.stopBrowserStackBuild = async (bsConfig, args, buildId, rawArgs, buildReportData = null) => {
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
            that.sendUsageReport(bsConfig, args, message, messageType, errorCode, buildReportData, rawArgs);
        }
      }
      resolve();
    });
  });
}

exports.setProcessHooks = (buildId, bsConfig, bsLocal, args, buildReportData) => {
  let bindData = {
    buildId: buildId,
    bsConfig: bsConfig,
    bsLocalInstance: bsLocal,
    args: args,
    buildReportData: buildReportData
  }
  process.on('SIGINT', processExitHandler.bind(this, bindData));
  process.on('SIGTERM', processExitHandler.bind(this, bindData));
  process.on('SIGBREAK', processExitHandler.bind(this, bindData));
  process.on('uncaughtException', processExitHandler.bind(this, bindData));
}

async function processExitHandler(exitData){
  logger.warn(Constants.userMessages.PROCESS_KILL_MESSAGE);
  await this.stopBrowserStackBuild(exitData.bsConfig, exitData.args, exitData.buildId, null, exitData.buildReportData);
  await this.stopLocalBinary(exitData.bsConfig, exitData.bsLocalInstance, exitData.args, null, exitData.buildReportData);
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

exports.getVideoConfig = (cypressConfig) => {
  let conf = {
    video: true,
    videoUploadOnPasses: true
  }
  if (!this.isUndefined(cypressConfig.video)) conf.video = cypressConfig.video;
  if (!this.isUndefined(cypressConfig.videoUploadOnPasses)) conf.videoUploadOnPasses = cypressConfig.videoUploadOnPasses;

  logger.debug(`Setting video = ${conf.video}`);
  logger.debug(`Setting videoUploadOnPasses = ${conf.videoUploadOnPasses}`);
  return conf;
}

exports.getMajorVersion = (version) => {
  try {
    if (!version || !version.match(/^(\d+\.)?(\d+\.)?(\*|\d+)$/)) {
      return null;
    }

    const matches = version.match(/^(\d+\.)?(\d+\.)?(\*|\d+)$/)
    if(matches && matches.length >= 2) {
      if (!matches[1]) {
        return matches[0];
      }
      return matches[1].replace('.','');
    } else {
      return null;
    }
  } catch(error) {
    logger.debug(`Some Error occurred while fetching major version of ${version}. Returning null. Error Details: ${error}`)
    return null;
  } 
}
