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
    /*
     * [SDK-7399] Accepts a whole flush as ONE task so the browser side issues one
     * Cypress command per flush instead of one per event. Each cy.task round-trip costs
     * roughly 0.8s on a remote terminal, so a command-heavy test used to spend minutes
     * in its afterEach and the spec was killed at spec_timeout, reporting every test that
     * had not run yet as skipped. Measured: 600 events as 600 calls = 581s; the same 600
     * events as 1 call = 109s, i.e. baseline.
     * Fans out to exactly the same IPC events as the individual tasks above, which stay
     * registered for backward compatibility.
     */
    test_observability_batch(events) {
      if (!Array.isArray(events)) return null;
      events.forEach((event) => {
        try {
          const ipcEvent = event && IPC_EVENT_FOR_TASK[event.task];
          if (!ipcEvent) return;
          ipc.of.browserstackTestObservability.emit(ipcEvent, event.data);
        } catch (e) {
          /* one malformed event must not drop the rest of the batch */
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
