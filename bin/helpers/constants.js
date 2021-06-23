let config = require("./config");

const syncCLI = {
  FAILED_SPEC_DETAILS_COL_HEADER: ['Spec', 'Status', 'Browser', 'BrowserStack Session ID'],
  LOGS: {
    INIT_LOG: "All tests:"
  },
  INITIAL_DELAY_MULTIPLIER: 10
};

const userMessages = {
  BUILD_FAILED: "Build creation failed.",
  BUILD_GENERATE_REPORT_FAILED: "Generating report for the build <build-id> failed.",
  BUILD_CREATED: "Build created",
  BUILD_INFO_FAILED: "Failed to get build info.",
  BUILD_STOP_FAILED: "Failed to stop build.",
  BUILD_REPORT_MESSAGE: "See the entire build report here:",
  ZIP_UPLOADER_NOT_REACHABLE: "Could not reach BrowserStack APIs. Please check your network or see if you need to whitelist *.browserstack.com",
  ZIP_UPLOAD_FAILED: "Zip Upload failed.",
  ZIP_UPLOAD_LIMIT_EXCEEDED: "The directory size which contains the cypress config file is more than 200 MB. For more info, check out https://www.browserstack.com/docs/automate/cypress/exclude-files",
  CONFIG_FILE_CREATED: "BrowserStack Config File created, you can now run browserstack-cypress --config-file run",
  CONFIG_FILE_EXISTS: "File already exists, delete the browserstack.json file manually. skipping...",
  DIR_NOT_FOUND: "Given path does not exist. Failed to create browserstack.json in %s",
  ZIP_DELETE_FAILED: "Could not delete tests.zip successfully.",
  ZIP_DELETED: "Deleted tests.zip successfully.",
  API_DEPRECATED: "This version of API is deprecated, please use latest version of API.",
  FAILED_TO_ZIP: "Failed to zip files.",
  VISIT_DASHBOARD: "Visit the Automate dashboard for real-time test reporting:",
  CONFLICTING_INIT_ARGUMENTS: "Conflicting arguments given. You can use --path only with a file name, and not with a file path.",
  NO_PARALLELS: "Your specs will run sequentially on a single machine. Read more about running your specs in parallel here: https://www.browserstack.com/docs/automate/cypress/run-tests-in-parallel",
  NO_NPM_DEPENDENCIES: "No npm dependencies specified - your specs might fail if they need any packages to be installed before running.",
  NO_NPM_DEPENDENCIES_READ_MORE: "Read more about npm dependencies here: https://www.browserstack.com/docs/automate/cypress/npm-packages. You can suppress this warning by using --disable-npm-warning flag.",
  VALIDATING_CONFIG: "Validating the config",
  UPLOADING_TESTS: "Uploading the tests to BrowserStack",
  LOCAL_TRUE: "you will now be able to test localhost / private URLs",
  LOCAL_FALSE: "you won't be able to test localhost / private URLs",
  EXIT_SYNC_CLI_MESSAGE: "Exiting the CLI, but your build is still running. You can use the --sync option to keep getting test updates. You can also use the build-info <build-id> command now.",
  FATAL_NETWORK_ERROR: `fatal: unable to access '${config.buildUrl}': Could not resolve host: ${config.rails_host}`,
  RETRY_LIMIT_EXCEEDED: `Max retries exceeded trying to connect to the host (retries: ${config.retries})`,
  CHECK_DASHBOARD_AT: "Please check the build status at: ",
  CYPRESS_VERSION_CHANGED: "Your build will run using Cypress <actualVersion> instead of Cypress <preferredVersion>. Read more about supported versions here: http://browserstack.com/docs/automate/cypress/supported-versions",
  LOCAL_START_FAILED: "Local Testing setup failed.",
  LOCAL_STOP_FAILED: "Local Binary stop failed.",
  INVALID_LOCAL_MODE_WARNING: "Invalid value specified for local_mode. local_mode: (\"always-on\" | \"on-demand\"). For more info, check out https://www.browserstack.com/docs/automate/cypress/cli-reference",
  SPEC_LIMIT_WARNING: "You might not see all your results on the dashboard because of high spec count, please consider reducing the number of spec files in this folder."
};

const validationMessages = {
  INCORRECT_AUTH_PARAMS: "Incorrect auth params.",
  EMPTY_BROWSER_LIST: "Browser list is empty",
  EMPTY_TEST_SUITE: "Test suite is empty",
  EMPTY_BROWSERSTACK_JSON: "Empty browserstack.json",
  EMPTY_RUN_SETTINGS: "Empty run settings",
  EMPTY_CYPRESS_PROJ_DIR: "cypress_proj_dir is not set in run_settings. See https://www.browserstack.com/docs/automate/cypress/sample-tutorial to learn more.",
  VALIDATED: "browserstack.json file is validated",
  NOT_VALID: "browerstack.json is not valid",
  NOT_VALID_JSON: "browerstack.json is not a valid json",
  INVALID_EXTENSION: "Invalid files, please remove these files and try again.",
  INVALID_PARALLELS_CONFIGURATION: "Invalid value specified for parallels to use. Maximum parallels to use should be a number greater than 0.",
  INVALID_CYPRESS_CONFIG_FILE: "Invalid cypress_config_file",
  CYPRESS_JSON_NOT_FOUND: "cypress.json file is not found at cypress_proj_dir path ",
  INVALID_CYPRESS_JSON: "cypress.json is not a valid json",
  INVALID_DEFAULT_AUTH_PARAMS: "Your username and access key are required to run your tests on BrowserStack. Learn more at https://www.browserstack.com/docs/automate/cypress/authentication",
  LOCAL_NOT_SET: "To test <baseUrlValue> on BrowserStack, you will have to set up Local testing. Read more here: https://www.browserstack.com/docs/automate/cypress/local-testing",
  INCORRECT_DIRECTORY_STRUCTURE: "No tests to run. Note that your Cypress tests should be in the same directory where the cypress.json exists.",
  INVALID_CLI_LOCAL_IDENTIFIER: "When using --local-identifier, a value needs to be supplied. \n--local-identifier <String>.\nFor more info, check out https://www.browserstack.com/docs/automate/cypress/cli-reference",
  INVALID_LOCAL_MODE: "When using --local-mode, a value needs to be supplied. \n--local-mode (\"always-on\" | \"on-demand\").\nFor more info, check out https://www.browserstack.com/docs/automate/cypress/cli-reference",
  INVALID_LOCAL_CONFIG_FILE: "Using --local-config-file requires an input of the form /path/to/config-file.yml.\nFor more info, check out https://www.browserstack.com/docs/automate/cypress/cli-reference",
  INVALID_LOCAL_IDENTIFIER: "Invalid value specified for local_identifier. For more info, check out https://www.browserstack.com/docs/automate/cypress/cli-reference"
};

const cliMessages = {
  VERSION: {
    INFO: "shows version information",
    HELP: "Specify --help for available options",
    DEMAND: "Requires init, run or poll argument",
  },
  INIT: {
    INFO: "create a browserstack.json file in the folder specified with the default configuration options.",
    DESC: "Init in a specified folder",
  },
  BUILD: {
    INFO: "Check status of your build.",
    STOP: "Stop your build.",
    DEMAND: "Requires a build id.",
    DESC: "Path to BrowserStack config",
    CONFIG_DEMAND: "config file is required",
    INFO_MESSAGE: "Getting information for buildId ",
    STOP_MESSAGE: "Stopping build with given buildId ",
  },
  RUN: {
    PARALLEL_DESC: "The maximum number of parallels to use to run your test suite",
    INFO: "Run your tests on BrowserStack.",
    DESC: "Path to BrowserStack config",
    CYPRESS_DESC: "Path to Cypress config file",
    CONFIG_DEMAND: "config file is required",
    CYPRESS_CONFIG_DEMAND: "Cypress config file is required",
    BUILD_NAME: "The build name you want to use to name your test runs",
    EXCLUDE: "Exclude files matching a pattern from zipping and uploading",
    DEFAULT_PARALLEL_MESSAGE: "Here goes the number of parallels you want to run",
    SPECS_DESCRIPTION: "Specify the spec files to run",
    ENV_DESCRIPTION: "Specify the environment variables for your spec files",
    SYNC_DESCRIPTION: "Makes the run command in sync",
    BUILD_REPORT_MESSAGE: "See the entire build report here",
    HEADED: "Run your tests in a headed browser instead of a headless browser",
    LOCAL: "Accepted values: (true | false) - create a local testing connection to let you test staging and localhost websites, or sites behind proxies; learn more at browserstack.com/local-testing",
    LOCAL_MODE: 'Accepted values: ("always-on" | "on-demand") - if you choose to keep the binary "always-on", it will speed up your tests by keeping the Local connection warmed up in the background; otherwise, you can choose to have it spawn and killed for every build',
    LOCAL_IDENTIFIER: "Accepted values: String - assign an identifier to your Local process instance",
    LOCAL_CONFIG_FILE: "Accepted values: String - path to local config-file to your Local process instance. Learn more at https://www.browserstack.com/local-testing/binary-params",
    SYNC_NO_WRAP: "Wrap the spec names in --sync mode in case of smaller terminal window size pass --no-wrap"
  },
  COMMON: {
    DISABLE_USAGE_REPORTING: "Disable usage reporting",
    USERNAME: "Your BrowserStack username",
    ACCESS_KEY: "Your BrowserStack access key",
    NO_NPM_WARNING: "No NPM warning if npm_dependencies is empty",
  },
  GENERATE_REPORT: {
    INFO: "Generates the build report"
  },
};

const messageTypes = {
  SUCCESS: "success",
  ERROR: "error",
  INFO: "info",
  WARNING: "warning",
  UNKNOWN: "unknown",
  NULL: null
}

const allowedFileTypes = ['js', 'json', 'txt', 'ts', 'feature', 'features', 'pdf', 'jpg', 'jpeg', 'png', 'zip', 'npmrc', 'xml', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jsx', 'coffee', 'cjsx', 'csv', 'tsv', 'yml', 'yaml'];

const filesToIgnoreWhileUploading = [
  '**/node_modules/**',
  'node_modules/**',
  'package-lock.json',
  'package.json',
  'browserstack-package.json',
  'tests.zip',
  'cypress.json',
  '.idea/**',
  '.vscode/**',
  '.npm/**',
  '.yarn/**',
];

const specFileTypes = ['js', 'ts', 'feature', 'jsx', 'coffee', 'cjsx'];

const DEFAULT_CYPRESS_SPEC_PATH = "cypress/integration"

const SPEC_TOTAL_CHAR_LIMIT = 32243;
const METADATA_CHAR_BUFFER_PER_SPEC = 175;

module.exports = Object.freeze({
  syncCLI,
  userMessages,
  cliMessages,
  validationMessages,
  messageTypes,
  allowedFileTypes,
  filesToIgnoreWhileUploading,
  specFileTypes,
  DEFAULT_CYPRESS_SPEC_PATH,
  SPEC_TOTAL_CHAR_LIMIT,
  METADATA_CHAR_BUFFER_PER_SPEC
});
