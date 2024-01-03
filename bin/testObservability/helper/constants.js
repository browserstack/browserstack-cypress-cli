const path = require('path');

exports.consoleHolder = Object.assign({},console);
exports.BATCH_SIZE = 1000;
exports.BATCH_INTERVAL = 2000;
exports.API_URL = 'https://collector-observability.browserstack.com';

exports.IPC_EVENTS = {
  LOG: 'testObservability:cypressLog',
  CONFIG: 'testObservability:cypressConfig',
  SCREENSHOT: 'testObservability:cypressScreenshot',
  COMMAND: 'testObservability:cypressCommand',
  CUCUMBER: 'testObservability:cypressCucumberStep',
  PLATFORM_DETAILS: 'testObservability:cypressPlatformDetails'
};

exports.OBSERVABILITY_ENV_VARS = [
  "BROWSERSTACK_TEST_OBSERVABILITY",
  "BROWSERSTACK_AUTOMATION",
  "BS_TESTOPS_BUILD_COMPLETED",
  "BS_TESTOPS_JWT",
  "BS_TESTOPS_BUILD_HASHED_ID",
  "BS_TESTOPS_ALLOW_SCREENSHOTS",
  "OBSERVABILITY_LAUNCH_SDK_VERSION",
  "BROWSERSTACK_OBSERVABILITY_DEBUG",
  "OBS_CRASH_REPORTING_USERNAME",
  "OBS_CRASH_REPORTING_ACCESS_KEY",
  "OBS_CRASH_REPORTING_BS_CONFIG_PATH",
  "OBS_CRASH_REPORTING_CYPRESS_CONFIG_PATH"
];

exports.TEST_OBSERVABILITY_REPORTER = 'browserstack-cypress-cli/bin/testObservability/reporter';

exports.TEST_OBSERVABILITY_REPORTER_LOCAL = path.join(__dirname, '..', 'reporter');
