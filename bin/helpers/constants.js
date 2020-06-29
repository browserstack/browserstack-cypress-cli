const userMessages = {
    BUILD_FAILED: "Build creation failed.",
    BUILD_CREATED: "Build created",
    BUILD_INFO_FAILED: "Failed to get build info.",
    BUILD_STOP_FAILED: "Failed to stop build.",
    ZIP_UPLOADER_NOT_REACHABLE: "Could not reach to zip uploader.",
    ZIP_UPLOAD_FAILED: "Zip Upload failed.",
    CONFIG_FILE_CREATED: "BrowserStack Config File created, you can now run browserstack-cypress --config-file run",
    CONFIG_FILE_EXISTS: "File already exists, delete the browserstack.json file manually. skipping...",
    ZIP_DELETE_FAILED: "Could not delete local file.",
    ZIP_DELETED: "Zip file deleted successfully.",
    API_DEPRECATED: "This version of API is deprecated, please use latest version of API.",
    FAILED_TO_ZIP: "Failed to zip files."
};

const validationMessages = {
  INCORRECT_AUTH_PARAMS: "Incorrect auth params.",
  EMPTY_BROWSER_LIST: "Browser list is empty",
  EMPTY_TEST_SUITE: "Test suite is empty",
  EMPTY_BROWSERSTACK_JSON: "Empty browserstack.json",
  EMPTY_RUN_SETTINGS: "Empty run settings",
  EMPTY_SPEC_FILES: "No spec files specified in run_settings",
  VALIDATED: "browserstack.json file is validated",
  NOT_VALID: "browerstack.json is not valid",
  NOT_VALID_JSON: "browerstack.json is not a valid json",
  INVALID_EXTENSION: "Invalid files, please remove these files and try again.",
  INVALID_PARALLELS_CONFIGURATION: "Invalid value specified for parallels to use. Maximum parallels to use should be a number greater than 0.",
  CYPRESS_JSON_NOT_FOUND: "cypress.json file is not found at cypress_proj_dir path ",
  INVALID_CYPRESS_JSON: "cypress.json is not a valid json"
};

const cliMessages = {
    VERSION: {
        INFO: "shows version information",
        HELP: "Specify --help for available options",
        DEMAND: "Requires init, run or poll argument"
    },
    INIT: {
        INFO: "create a browserstack.json file in the folder specified with the default configuration options.",
        DESC: "Init in a specified folder"
    },
    BUILD: {
        INFO: "Check status of your build.",
        STOP: "Stop your build.",
        DEMAND: "Requires a build id.",
        DESC: "Path to BrowserStack config",
        CONFIG_DEMAND: "config file is required",
        INFO_MESSAGE: "Getting information for buildId ",
        STOP_MESSAGE: "Stopping build with given buildId "
    },
    RUN: {
        PARALLEL_DESC: "The maximum number of parallels to use to run your test suite",
        INFO: "Run your tests on BrowserStack.",
        DESC: "Path to BrowserStack config",
        CONFIG_DEMAND: "config file is required",
        BUILD_NAME: "The build name you want to use to name your test runs"
    },
    COMMON: {
      DISABLE_USAGE_REPORTING: "Disable usage reporting",
      USERNAME: "Your BrowserStack username",
      ACCESS_KEY: "Your BrowserStack access key"
    }
}

const messageTypes = {
  SUCCESS: "success",
  ERROR: "error",
  INFO: "info",
  WARNING: "warning",
  UNKNOWN: "unknown",
  NULL: null
}

module.exports = Object.freeze({
  userMessages,
  cliMessages,
  validationMessages,
  messageTypes,
});
