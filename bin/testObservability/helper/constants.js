exports.consoleHolder = Object.assign({},console);
exports.BATCH_SIZE = 1000;
exports.BATCH_INTERVAL = 2000;
exports.API_URL = 'https://collector-observability.browserstack.com';

exports.IPC_EVENTS = {
  LOG: 'testObservability:cypressLog',
  CONFIG: 'testObservability:cypressConfig',
  SCREENSHOT: 'testObservability:cypressScreenshot',
  COMMAND: 'testObservability:cypressCommand',
  PLATFORM_DETAILS: 'testObservability:cypressPlatformDetails'
};
