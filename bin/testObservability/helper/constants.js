const path = require('path');

exports.consoleHolder = Object.assign({},console);
exports.BATCH_SIZE = 1000;
exports.BATCH_INTERVAL = 2000;
const DEFAULT_API_URL = 'https://collector-observability.browserstack.com';

// Overridable so the reporter on the remote machine posts to the collector the build was created
// on. Errors never echo the value: it can carry credentials and callers log them.
const httpsOverride = (name) => {
  const value = process.env[name];
  if (!value) return undefined;
  let parsed;
  try {
    parsed = new URL(value);
  } catch (err) {
    throw new Error(`${name} must be a valid https:// URL`);
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname) {
    throw new Error(`${name} must be an https:// URL`);
  }
  if (parsed.search || parsed.hash) {
    throw new Error(`${name} must not contain a query or fragment`);
  }
  // Endpoints are appended as `${base}/${path}`.
  return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
};

const API_URL_ENV = 'BROWSERSTACK_TEST_OBSERVABILITY_API_URL';
// Separate override for when the remote machine cannot reach the cli's own collector.
const REMOTE_API_URL_ENV = 'BROWSERSTACK_TEST_OBSERVABILITY_REMOTE_API_URL';
exports.API_URL_ENV = API_URL_ENV;
exports.REMOTE_API_URL_ENV = REMOTE_API_URL_ENV;

exports.apiUrl = () => httpsOverride(API_URL_ENV) || DEFAULT_API_URL;
exports.remoteReporterApiUrl = () => httpsOverride(REMOTE_API_URL_ENV) || exports.apiUrl();

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
  "BROWSERSTACK_TEST_REPORTING",
  "BROWSERSTACK_AUTOMATION",
  "BS_TESTOPS_BUILD_COMPLETED",
  "BS_TESTOPS_JWT",
  "BS_TESTOPS_BUILD_HASHED_ID",
  "BS_TESTOPS_ALLOW_SCREENSHOTS",
  "OBSERVABILITY_LAUNCH_SDK_VERSION",
  "BROWSERSTACK_OBSERVABILITY_DEBUG",
  "BROWSERSTACK_TEST_REPORTING_DEBUG",  
  "OBS_CRASH_REPORTING_USERNAME",
  "OBS_CRASH_REPORTING_ACCESS_KEY",
  "OBS_CRASH_REPORTING_BS_CONFIG_PATH",
  "OBS_CRASH_REPORTING_CYPRESS_CONFIG_PATH"
];

exports.TEST_OBSERVABILITY_REPORTER = 'browserstack-cypress-cli/bin/testObservability/reporter';

exports.TEST_OBSERVABILITY_REPORTER_LOCAL = path.join(__dirname, '..', 'reporter');

exports.PENDING_QUEUES_FILE = `pending_queues_${process.pid}.json`;

exports.TEST_REPORTING_ANALYTICS = 'TEST REPORTING AND ANALYTICS';
