"use strict";
const os = require("os");
const path = require("path");
const fs = require("fs");

const usageReporting = require("./usageReporting"),
  logger = require("./logger").winstonLogger,
  Constants = require("./constants");

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

exports.setParallels = (bsConfig, args) => {
  if (!this.isUndefined(args.parallels)) {
    bsConfig["run_settings"]["parallels"] = args.parallels;
  }
};

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
  return `BStack-Cypress-CLI/1.3.0 (${os.arch()}/${os.platform()}/${os.release()})`;
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
  let parentTokens = cypressDir.split("/").filter((i) => i.length);
  let childTokens = integrationFolderDir.split("/").filter((i) => i.length);
  return parentTokens.every((t, i) => childTokens[i] === t);
};

exports.getLocalFlag = (connectionSettings) => {
  return (
    !this.isUndefined(connectionSettings) &&
    !this.isUndefined(connectionSettings.local) &&
    connectionSettings.local
  );
};

exports.setLocal = (bsConfig) => {
  if (!this.isUndefined(process.env.BROWSERSTACK_LOCAL)) {
    let local = false;
    if (String(process.env.BROWSERSTACK_LOCAL).toLowerCase() === "true")
      local = true;
    bsConfig["connection_settings"]["local"] = local;
    logger.info(
      "Reading local setting from the environment variable BROWSERSTACK_LOCAL"
    );
  }
};

exports.setLocalIdentifier = (bsConfig) => {
  if (!this.isUndefined(process.env.BROWSERSTACK_LOCAL_IDENTIFIER)) {
    bsConfig["connection_settings"]["local_identifier"] =
      process.env.BROWSERSTACK_LOCAL_IDENTIFIER;
    logger.info(
      "Reading local identifier from the environment variable BROWSERSTACK_LOCAL_IDENTIFIER"
    );
  }
};
