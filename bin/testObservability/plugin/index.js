const ipc = require('node-ipc');
const { connectIPCClient } = require('./ipcClient');
const { IPC_EVENTS } = require('../helper/constants');

const browserstackTestObservabilityPlugin = (on, config, callbacks) => {

  try {
    config.env.BROWSERSTACK_O11Y_LOGS = 'true';
    process.env.BROWSERSTACK_O11Y_LOGS = 'true';
  } catch (err) {}

  connectIPCClient(config);

  const IPC_EVENT_FOR_TASK = {
    test_observability_log: IPC_EVENTS.LOG,
    test_observability_command: IPC_EVENTS.COMMAND,
    test_observability_platform_details: IPC_EVENTS.PLATFORM_DETAILS,
    test_observability_step: IPC_EVENTS.CUCUMBER,
  };

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
    },
    /* [SDK-7399] One task per flush instead of one per event — see cypress/index.js.
     * Fans out to the same IPC events; the per-event tasks stay for back-compat. */
    test_observability_batch(events) {
      if (!Array.isArray(events)) return null;
      events.forEach((event) => {
        try {
          const ipcEvent = event && IPC_EVENT_FOR_TASK[event.task];
          if (!ipcEvent) return;
          ipc.of.browserstackTestObservability.emit(ipcEvent, event.data);
        } catch (e) {
          /* one bad entry must not drop the rest */
        }
      });
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
