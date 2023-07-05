const ipc = require('node-ipc');
const { connectIPCClient } = require('./ipcClient');
const { IPC_EVENTS } = require('../helper/constants');

const browserstackTestObservabilityPlugin = (on, config, callbacks) => {
  connectIPCClient(config);

  on('task', {
    test_observability_log(log) {
      ipc.of.browserstackTestObservability.emit(IPC_EVENTS.LOG, log);
      return null;
    },
    test_observability_command(commandObj) {
      ipc.of.browserstackTestObservability.emit(IPC_EVENTS.COMMAND, commandObj);
      return null;
    },
    test_observability_platform_details(platformObj) {
      ipc.of.browserstackTestObservability.emit(IPC_EVENTS.PLATFORM_DETAILS, platformObj);
      return null;
    },
    test_observability_step(log) {
      ipc.of.browserstackTestObservability.emit(IPC_EVENTS.CUCUMBER, log);
      return null;
    }
  });

  on('after:screenshot', (screenshotInfo) => {
    let logMessage;
    if (callbacks && callbacks.screenshotLogFn && typeof callbacks.screenshotLogFn === 'function') {
      logMessage = callbacks.screenshotLogFn(screenshotInfo);
    }
    ipc.of.browserstackTestObservability.emit(IPC_EVENTS.SCREENSHOT, {
      logMessage,
      screenshotInfo,
    });
    return null;
  });
};

module.exports = browserstackTestObservabilityPlugin;
