let config = require("./config");
let chalk = require("chalk");

const syncCLI = {
  FAILED_SPEC_DETAILS_COL_HEADER: [
    "Spec",
    "Status",
    "Browser",
    "BrowserStack Session ID",
  ],
  LOGS: {
    INIT_LOG: "All tests:",
  },
  INITIAL_DELAY_MULTIPLIER: 10,
  DEFAULT_LINE_SEP:
    "\n--------------------------------------------------------------------------------",
  STARTUP_MESSAGE:
    "BrowserStack machines are now setting up Cypress with the specified npm dependencies for running your tests. It might take some time before your tests start runnning and showing up below...",
};

const userMessages = {
  BUILD_FAILED: "Build creation failed.",
  BUILD_GENERATE_REPORT_FAILED:
    "Generating report for the build <build-id> failed.",
  BUILD_CREATED: "Build created",
  BUILD_INFO_FAILED: "Failed to get build info.",
  BUILD_STOP_FAILED: "Failed to stop build.",
  BUILD_REPORT_MESSAGE: "See the entire build report here:",
  ZIP_UPLOADER_NOT_REACHABLE:
    "Could not reach BrowserStack APIs. Please check your network or see if you need to whitelist *.browserstack.com",
  ZIP_UPLOAD_FAILED: "Zip Upload failed.",
  ZIP_UPLOAD_LIMIT_EXCEEDED:
    "The directory size which contains the cypress config file is more than 200 MB. For more info, check out https://www.browserstack.com/docs/automate/cypress/exclude-files",
  NODE_MODULES_LIMIT_EXCEEDED:
    "node_modules upload failed as the size %SIZE% MB is not supported. Dependencies will be installed in runtime. This will have a negative impact on build performance. Reach out to us at browserstack.com/support if you see this warning.",
  CONFIG_FILE_CREATED:
    "BrowserStack Config File created, you can now run browserstack-cypress --config-file run",
  CONFIG_FILE_EXISTS:
    "File already exists, delete the browserstack.json file manually. skipping...",
  DIR_NOT_FOUND:
    "Given path does not exist. Failed to create browserstack.json in %s",
  MD5_CHECK_FAILED:
    "There was some issue while checking if zip is already uploaded.",
  ZIP_DELETE_FAILED: "Could not delete tests.zip successfully.",
  ZIP_DELETED: "Deleted tests.zip successfully.",
  NPM_INSTALL:
  "Installing required dependencies",
  NPM_UPLOAD:
    "Building the package to upload to BrowserStack",
  NPM_DELETE_FAILED: "Could not delete the dependency packages.",
  NPM_DELETED: "Deleted dependency packages successfully.",
  API_DEPRECATED:
    "This version of API is deprecated, please use latest version of API.",
  FAILED_TO_ZIP: "Failed to zip files.",
  FAILED_CREATE_NPM_ARCHIVE:
    "CLI execution failed due to some issue in npm setup. Please retry.",
  FAILED_MD5_CHECK:
    "Something went wrong - you can retry running browserstack-cypress with ‘--force-upload’ parameter, or contact BrowserStack Support.",
  VISIT_DASHBOARD: "Visit the Automate dashboard for real-time test reporting:",
  CONFLICTING_INIT_ARGUMENTS:
    "Conflicting arguments given. You can use --path only with a file name, and not with a file path.",
  NO_PARALLELS:
    "Your specs will run sequentially on a single machine. Read more about running your specs in parallel here: https://www.browserstack.com/docs/automate/cypress/run-tests-in-parallel",
  NO_NPM_DEPENDENCIES:
    "No npm dependencies specified - your specs might fail if they need any packages to be installed before running.",
  NO_NPM_DEPENDENCIES_READ_MORE:
    "Read more about npm dependencies here: https://www.browserstack.com/docs/automate/cypress/npm-packages. You can suppress this warning by using --disable-npm-warning flag.",
  VALIDATING_CONFIG: "Validating the config",
  UPLOADING_TESTS: "Uploading the tests to BrowserStack",
  UPLOADING_TESTS_SUCCESS: "Uploaded tests successfully",
  UPLOADING_NPM_PACKAGES: "Uploading required node_modules to BrowserStack",
  UPLOADING_NPM_PACKAGES_SUCCESS: "Uploaded node_modules successfully",
  SKIP_UPLOADING_TESTS:
    "Skipping zip upload since BrowserStack already has your test suite that has not changed since the last run.",
  SKIP_NPM_INSTALL:
    "Skipping NPM Install as the enforce_settings has been passed.",
  SKIP_UPLOADING_NPM_PACKAGES:
    "Skipping the upload of node_modules since BrowserStack has already cached your npm dependencies that have not changed since the last run.",
  LOCAL_TRUE: "you will now be able to test localhost / private URLs",
  LOCAL_FALSE: "you won't be able to test localhost / private URLs",
  EXIT_SYNC_CLI_MESSAGE:
    "Exiting the CLI, but your build is still running. You can use the --sync option to keep getting test updates. You can also use the build-info <build-id> command now.",
  FATAL_NETWORK_ERROR: `fatal: unable to access '${config.buildUrl}': Could not resolve host: ${config.rails_host}`,
  RETRY_LIMIT_EXCEEDED: `Max retries exceeded trying to connect to the host (retries: ${config.retries})`,
  CHECK_DASHBOARD_AT: "Please check the build status at: ",
  CYPRESS_VERSION_CHANGED:
    "Your build will run using Cypress <actualVersion> instead of Cypress <preferredVersion>.<frameworkUpgradeMessage> Read more about supported versions here: http://browserstack.com/docs/automate/cypress/supported-versions",
  LOCAL_START_FAILED: "Local Testing setup failed.",
  LOCAL_STOP_FAILED: "Local Binary stop failed.",
  INVALID_TIMEZONE:
    'The timezone specified is invalid. Refer to our documentation page https://www.browserstack.com/docs/automate/cypress/configure-timezones for the supported time zones.',
  INVALID_LOCAL_MODE_WARNING:
    'Invalid value specified for local_mode. local_mode: ("always-on" | "on-demand"). For more info, check out https://www.browserstack.com/docs/automate/cypress/cli-reference',
  LOCAL_BINARY_ALREADY_RUNNING:
    "We found an existing BrowserStack Local connection running from your account. Using the existing connection for this build. If you wish to use a new Local connection for your build, please specify a value for 'local_identifier' within 'connection_settings' in your browserstack.json config.",
  SPEC_LIMIT_WARNING:
    "You might not see all your results on the dashboard because of high spec count, please consider reducing the number of spec files in this folder.",
  DOWNLOAD_BUILD_ARTIFACTS_FAILED:
    "Downloading build artifact(s) for the build <build-id> failed for <machine-count> machines.",
  DOWNLOAD_BUILD_ARTIFACTS_NOT_FOUND:
    "Build artifact(s) for the session <session-id> was either not generated or not uploaded.",
  ASYNC_DOWNLOADS:
    "Test artifacts as specified under 'downloads' can be downloaded after the build has completed its run, using 'browserstack-cypress generate-downloads <build-id>'",
  DOWNLOAD_BUILD_ARTIFACTS_SUCCESS:
    "Your build artifact(s) have been successfully downloaded in '<user-path>/build_artifacts/<build-id>' directory",
  LATEST_SYNTAX_TO_ACTUAL_VERSION_MESSAGE:
    "Your build will run using Cypress <actualVersion> as you had specified <latestSyntaxVersion>.<frameworkUpgradeMessage> Read more about supported versions here: http://browserstack.com/docs/automate/cypress/supported-versions",
  PROCESS_KILL_MESSAGE:
    "Stopping the CLI and the execution of the build on BrowserStack",
  BUILD_FAILED_ERROR:
    "The above stacktrace has been thrown by Cypress when we tried to run your build. If your test suite requires npm dependencies then please specify them on browserstack.json. Read more at " +
    chalk.blueBright(
      "https://www.browserstack.com/docs/automate/cypress/npm-packages"
    ) +
    ". Also, we recommend you to try running the build locally using ‘cypress run’ and if it works fine then please reach out to support at " +
    chalk.blueBright("https://www.browserstack.com/contact#technical-support"),
  SPEC_TIMEOUT_LIMIT_WARNING:
    "Value for the 'spec_timeout' key not in the 1-120 range. Going ahead with 30 mins as the default spec timeout. Read more about how to specify the option in https://browserstack.com/docs/automate/cypress/spec-timeout",
  SPEC_LIMIT_SUCCESS_MESSAGE:
    "Spec timeout specified as <x> minutes. If any of your specs exceed the specified time limit, it would be forcibly killed by BrowserStack",
  NO_CONNECTION_WHILE_UPDATING_UPLOAD_PROGRESS_BAR:
    "Unable to determine zip upload progress due to undefined/null connection request",
  CYPRESS_PORT_WARNING:
    "The requested port number <x> is ignored. The default BrowserStack port will be used for this execution",
  CYPRESS_INTERACTIVE_SESSION_CONFLICT_VALUES:
    "Conflicting values (True & False) were found for the interactive_debugging capability. Please resolve this issue to proceed further."
};

const validationMessages = {
  INCORRECT_AUTH_PARAMS: "Incorrect auth params.",
  EMPTY_BROWSER_LIST: "Browser list is empty",
  EMPTY_TEST_SUITE: "Test suite is empty",
  EMPTY_BROWSERSTACK_JSON: "Empty browserstack.json",
  EMPTY_RUN_SETTINGS: "Empty run settings",
  EMPTY_CYPRESS_PROJ_DIR:
    "cypress_proj_dir is not set in run_settings. See https://www.browserstack.com/docs/automate/cypress/sample-tutorial to learn more.",
  EMPTY_CYPRESS_CONFIG_FILE:
    "cypress_config_file is not set in run_settings. See https://www.browserstack.com/docs/automate/cypress/configuration-file to learn more.",
  EMPTY_SPECS_IN_BROWSERSTACK_JSON:
    "specs is required when enforce_settings is true in run_settings of browserstack.json",
  VALIDATED: "browserstack.json file is validated",
  NOT_VALID: "browserstack.json is not valid",
  NOT_VALID_JSON: "browerstack.json is not a valid json",
  INVALID_EXTENSION: "Invalid files, please remove these files and try again.",
  INVALID_PARALLELS_CONFIGURATION:
    "Invalid value specified for parallels to use. Maximum parallels to use should be a number greater than 0.",
  INVALID_CYPRESS_CONFIG_FILE: "Invalid cypress_config_file",
  CYPRESS_CONFIG_FILE_NOT_FOUND:
    "No cypress config file was found at <location> directory.",
  MORE_THAN_ONE_CYPRESS_CONFIG_FILE_FOUND:
    "Cypress does not allow more than one cypress config file.",
  INVALID_CYPRESS_JSON: "cypress.json is not a valid json",
  INVALID_DEFAULT_AUTH_PARAMS:
    "Your username and access key are required to run your tests on BrowserStack. Learn more at https://www.browserstack.com/docs/automate/cypress/authentication",
  LOCAL_NOT_SET:
    "To test <baseUrlValue> on BrowserStack, you will have to set up Local testing. Read more here: https://www.browserstack.com/docs/automate/cypress/local-testing",
  INCORRECT_DIRECTORY_STRUCTURE:
    "No tests to run. Note that your Cypress tests should be in the same directory where the cypress.json exists.",
  INVALID_CLI_LOCAL_IDENTIFIER:
    "When using --local-identifier, a value needs to be supplied. \n--local-identifier <String>.\nFor more info, check out https://www.browserstack.com/docs/automate/cypress/cli-reference",
  INVALID_LOCAL_MODE:
    'When using --local-mode, a value needs to be supplied. \n--local-mode ("always-on" | "on-demand").\nFor more info, check out https://www.browserstack.com/docs/automate/cypress/cli-reference',
  INVALID_LOCAL_CONFIG_FILE:
    "Using --local-config-file requires an input of the form /path/to/config-file.yml.\nFor more info, check out https://www.browserstack.com/docs/automate/cypress/cli-reference",
  INVALID_LOCAL_IDENTIFIER:
    "Invalid value specified for local_identifier. For more info, check out https://www.browserstack.com/docs/automate/cypress/cli-reference",
  INVALID_BROWSER_ARGS:
    "Aborting as an unacceptable value was passed for --browser. Read more at https://www.browserstack.com/docs/automate/cypress/cli-reference",
  INVALID_LOCAL_ASYNC_ARGS:
    "Cannot run in --async mode when local is set to true. Please run the build after removing --async",
  INVALID_GEO_LOCATION:
    "[BROWSERSTACK_INVALID_COUNTRY_CODE] The country code specified for 'geolocation' is invalid. For list of supported countries, refer to -  https://www.browserstack.com/ip-geolocation",
  NOT_SUPPORTED_GEO_LOCATION:
    "The country code you have passed for IP Geolocation is currently not supported. Please refer the link https://www.browserstack.com/ip-geolocation for a list of supported countries.",
  NOT_AVAILABLE_GEO_LOCATION:
    "The country code you have passed for IP Geolocation is not available at the moment. Please try again in a few hours.",
  ACCESS_DENIED_GEO_LOCATION:
    "'geolocation' (IP Geolocation feature) capability is not supported in your account. It is only available under Enterprise plans, refer https://www.browserstack.com/ip-geolocation for more details.",
  NOT_ALLOWED_GEO_LOCATION_AND_LOCAL_MODE:
    "IP Geolocation feature is not available in conjunction with BrowserStack Local.",
  HOME_DIRECTORY_NOT_FOUND:
    "Specified home directory could not be found. Please make sure the path of the home directory is correct.",
  HOME_DIRECTORY_NOT_A_DIRECTORY:
    "Specified home directory is not a directory. The home directory can only be a directory and not a file.",
  CYPRESS_CONFIG_FILE_NOT_PART_OF_HOME_DIRECTORY:
    "Could not find cypress.json within the specified home directory. Please make sure cypress.json resides within the home directory.",
  SPEC_TIMEOUT_LIMIT_ERROR:
    "The maximum allowed value of 'spec_timeout' is 120. Read more on https://browserstack.com/docs/automate/cypress/spec-timeout ",
  SPEC_TIMEOUT_NOT_PASSED_ERROR:
    "'spec_timeout' key not specified. Going ahead with 30 mins as the default spec timeout. Read more about how to specify the option in https://browserstack.com/docs/automate/cypress/spec-timeout ",
  PROJECT_ID_MISSING:
    "You have specified '--record' flag but you've not provided the 'projectId' in cypress.json or in browserstack.json. Your record functionality on cypress.io dashboard might not work as it needs both the key and the projectId",
  RECORD_KEY_MISSING:
    "You have specified '--record' flag but you've not provided the '--record-key' and we could not find any value in 'CYPRESS_RECORD_KEY' environment variable. Your record functionality on cypress.io dashboard might not work as it needs the key and projectId",
  NODE_VERSION_PARSING_ERROR:
    "We weren't able to successfully parse the specified nodeVersion. We will be using the default nodeVersion to run your tests.",
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
    INFO_MESSAGE: "Getting information for buildId ",
    STOP_MESSAGE: "Stopping build with given buildId ",
  },
  RUN: {
    PARALLEL_DESC:
      "The maximum number of parallels to use to run your test suite",
    INFO: "Run your tests on BrowserStack. For more help: `browserstack-cypress run --help`.",
    CYPRESS_DESC: "Path to Cypress config file",
    CYPRESS_CONFIG_DEMAND: "Cypress config file is required",
    BUILD_NAME: "The build name you want to use to name your test runs",
    EXCLUDE: "Exclude files matching a pattern from zipping and uploading",
    DEFAULT_PARALLEL_MESSAGE:
      "Here goes the number of parallels you want to run",
    SPECS_DESCRIPTION: "Specify the spec files to run",
    ENV_DESCRIPTION: "Specify the environment variables for your spec files",
    SYNC_DESCRIPTION: "Makes the run command in sync",
    ASYNC_DESCRIPTION: "Makes the run command in async",
    BUILD_REPORT_MESSAGE: "See the entire build report here",
    HEADED: "Run your tests in a headed browser instead of a headless browser",
    LOCAL:
      "Accepted values: (true | false) - create a local testing connection to let you test staging and localhost websites, or sites behind proxies; learn more at browserstack.com/local-testing",
    LOCAL_MODE:
      'Accepted values: ("always-on" | "on-demand") - if you choose to keep the binary "always-on", it will speed up your tests by keeping the Local connection warmed up in the background; otherwise, you can choose to have it spawn and killed for every build',
    LOCAL_IDENTIFIER:
      "Accepted values: String - assign an identifier to your Local process instance",
    LOCAL_CONFIG_FILE:
      "Accepted values: String - path to local config-file to your Local process instance. Learn more at https://www.browserstack.com/local-testing/binary-params",
    SYNC_NO_WRAP:
      "Wrap the spec names in --sync mode in case of smaller terminal window size pass --no-wrap",
    BROWSER_DESCRIPTION: "Specify the browsers you need to run your tests on.",
    CONFIG_DESCRIPTION:
      "Set configuration values. Separate multiple values with a comma. The values set here override any values set in your configuration file.",
    REPORTER: "Specify the custom reporter to use",
    REPORTER_OPTIONS: "Specify reporter options for custom reporter",
    CYPRESS_GEO_LOCATION: "Enterprise feature to simulate website and mobile behavior from different locations.",
    SPEC_TIMEOUT: "Specify a value for a hard timeout for each spec execution in the 1-120 mins range. Read https://browserstack.com/docs/automate/cypress/spec-timeout for more details.",
    RECORD: "Pass the --record flag to record your Cypress runs on Cypress.io dashboard. Note: You also need to specify '--record-key' and '--projectId' arguments either in CLI or in browserstack.json.",
    RECORD_KEY: "You can specify the 'key' that is needed to record your runs on Cypress.io dashboard using the '--record-key' argument. Alternatively, you can also pass it on browserstack.json",
    PROJECT_ID: "You can pass the 'projectId' of your Cypress.io project where you want to record your runs if specifying the '--record' key. You can also specify this in your cypress.json or in your browserstack.json.",
    NODE_VERSION: "Pass the node version that you want BrowserStack to use to run your Cypress tests on.",
    BUILD_TAG: "Add a tag to your build to filter builds based on tag values on the Dashboard."
  },
  COMMON: {
    DISABLE_USAGE_REPORTING: "Disable usage reporting",
    FORCE_UPLOAD:
      "Force the upload of your test files even if BrowserStack has detected no changes in your suite since you last ran",
    USERNAME: "Your BrowserStack username",
    ACCESS_KEY: "Your BrowserStack access key",
    NO_NPM_WARNING: "No NPM warning if npm_dependencies is empty",
    CONFIG_DEMAND: "config file is required",
    CONFIG_FILE_PATH: "Path to BrowserStack config",
    DEBUG: "Use this option to get debug logs on the CLI console.",
  },
  GENERATE_REPORT: {
    INFO: "Generates the build report",
  },
  GENERATE_DOWNLOADS: {
    INFO: "Downloads the build artifacts",
  },
};

const messageTypes = {
  SUCCESS: "success",
  ERROR: "error",
  INFO: "info",
  WARNING: "warning",
  UNKNOWN: "unknown",
  NULL: null,
};

const allowedFileTypes = [
  "js",
  "json",
  "txt",
  "ts",
  "feature",
  "features",
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "zip",
  "npmrc",
  "xml",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "jsx",
  "coffee",
  "cjsx",
  "csv",
  "tsv",
  "yml",
  "yaml",
  "env",
  "mov",
  "mp4",
  "mp3",
  "wav",
  "gz",
  "tgz",
  "tiff",
  "bmp",
  "msg",
  "gif",
  "sql",
  "pmc",
  "pmp",
  "max",
  "mjpeg",
  "y4m",
  "cjs",
  "mjs",
  "tsx",
  "pfx",
  "cfr",
  "ico",
  "html",
  "json5"
];

const filesToIgnoreWhileUploading = [
  "**/node_modules/**",
  "node_modules/**",
  "package-lock.json",
  "**/package-lock.json",
  "package.json",
  "**/package.json",
  "browserstack-package.json",
  "**/browserstack-package.json",
  "tests.zip",
  "**/tests.zip",
  "cypress.json",
  "cypress.config.js",
  "cypress.config.ts",
  "cypress.config.cjs",
  "cypress.config.mjs",
  ".idea/**",
  ".vscode/**",
  ".npm/**",
  "bstackPackages.tar.gz",
  "tmpBstackPackages/**",
  ".yarn/**",
  "build_artifacts/**"
];

const readDirOptions = {
  cwd: ".",
  matchBase: true,
  ignore: [],
  dot: true,
  stat: true,
  pattern: "",
};

const hashingOptions = {
  parallel: 10,
  algo: "md5",
  encoding: "hex",
};

const packageInstallerOptions = {
  npmLoad: {
    loglevel: "silent",
    only: "dev",
    "save-dev": true,
    "only-dev": true,
  },
};

const specFileTypes = ["js", "ts", "feature", "jsx", "coffee", "cjsx"];

const DEFAULT_CYPRESS_SPEC_PATH = "cypress/integration";
const DEFAULT_CYPRESS_10_SPEC_PATH = "cypress/e2e";

const SPEC_TOTAL_CHAR_LIMIT = 32243;
const METADATA_CHAR_BUFFER_PER_SPEC = 175;

const usageReportingConstants = {
  GENERATE_DOWNLOADS: "generate-downloads called",
};

const LATEST_VERSION_SYNTAX_REGEX = /\d*.latest(.\d*)?/gm;

const AUTH_REGEX = /"auth" *: *{[\s\S]*?}/g;

const CLI_ARGS_REGEX = /(?<=("u"|"username"|"k"|"key") *: *)"[^,}]*/g;

const RAW_ARGS_REGEX = /(?<=("-u"|"-username"|"-k"|"-key") *, *)"[^,\]]*/g;

const ERROR_EXIT_CODE = 1;

const BUILD_FAILED_EXIT_CODE = 3;

const REDACTED = "[REDACTED]";

const REDACTED_AUTH = `auth: { "username": ${REDACTED}, "access_key": ${REDACTED} }`;

const SPEC_TIMEOUT_LIMIT = 120; // IN MINS

const CYPRESS_CUSTOM_ERRORS_TO_PRINT_KEY = "custom_errors_to_print";

const CYPRESS_V9_AND_OLDER_TYPE = "CYPRESS_V9_AND_OLDER_TYPE";

const CYPRESS_V10_AND_ABOVE_TYPE = "CYPRESS_V10_AND_ABOVE_TYPE";

const CYPRESS_CONFIG_FILE_MAPPING = {
  "cypress.json": {
    type: CYPRESS_V9_AND_OLDER_TYPE
  },
  "cypress.config.js": {
    type: CYPRESS_V10_AND_ABOVE_TYPE
  },
  "cypress.config.ts": {
    type: CYPRESS_V10_AND_ABOVE_TYPE
  },
  "cypress.config.mjs": {
    type: CYPRESS_V10_AND_ABOVE_TYPE
  },
  "cypress.config.cjs": {
    type: CYPRESS_V10_AND_ABOVE_TYPE
  }
};

const CYPRESS_CONFIG_FILE_NAMES = Object.keys(CYPRESS_CONFIG_FILE_MAPPING);

const CYPRESS_V10_AND_ABOVE_CONFIG_FILE_EXTENSIONS = ['js', 'ts', 'cjs', 'mjs']

// Maximum size of VCS info which is allowed
const MAX_GIT_META_DATA_SIZE_IN_BYTES = 64 * 1024;

/* The value to be appended at the end if git metadata is larger than
MAX_GIT_META_DATA_SIZE_IN_BYTES
*/
const GIT_META_DATA_TRUNCATED = '...[TRUNCATED]';

const turboScaleObj = {};

module.exports = Object.freeze({
  syncCLI,
  userMessages,
  cliMessages,
  validationMessages,
  messageTypes,
  allowedFileTypes,
  filesToIgnoreWhileUploading,
  readDirOptions,
  hashingOptions,
  packageInstallerOptions,
  specFileTypes,
  turboScaleObj,
  DEFAULT_CYPRESS_SPEC_PATH,
  DEFAULT_CYPRESS_10_SPEC_PATH,
  SPEC_TOTAL_CHAR_LIMIT,
  METADATA_CHAR_BUFFER_PER_SPEC,
  usageReportingConstants,
  LATEST_VERSION_SYNTAX_REGEX,
  ERROR_EXIT_CODE,
  AUTH_REGEX,
  CLI_ARGS_REGEX,
  RAW_ARGS_REGEX,
  REDACTED_AUTH,
  REDACTED,
  BUILD_FAILED_EXIT_CODE,
  SPEC_TIMEOUT_LIMIT,
  CYPRESS_CUSTOM_ERRORS_TO_PRINT_KEY,
  CYPRESS_V9_AND_OLDER_TYPE,
  CYPRESS_V10_AND_ABOVE_TYPE,
  CYPRESS_CONFIG_FILE_MAPPING,
  CYPRESS_CONFIG_FILE_NAMES,
  CYPRESS_V10_AND_ABOVE_CONFIG_FILE_EXTENSIONS,
  MAX_GIT_META_DATA_SIZE_IN_BYTES,
  GIT_META_DATA_TRUNCATED
});
