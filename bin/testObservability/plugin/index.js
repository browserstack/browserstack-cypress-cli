const ipc = require('node-ipc');
const { connectIPCClient } = require('./ipcClient');
const { IPC_EVENTS } = require('../helper/constants');

const axios = require('axios');

const browserstackTestObservabilityPlugin = (on, config, callbacks) => {
  connectIPCClient(config);

  on('task', {
    test_observability_log(log) {

      (async () => {
        try {
          await axios.post(
            "https://ef2d-122-171-17-46.ngrok-free.app/plugin",
            {
              message: "plugin on task event's function test_observability_log(log) triggered",
              data: {
                log,
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
            .then((response) => {
              console.log("Data sent successfully:", response.data);
            })
            .catch((error) => {
              console.error("Error sending data:", error);
            });
        } catch (error) {
          console.error("Error in async function:", error);
        }
      }
      )();

      ipc.of.browserstackTestObservability.emit(IPC_EVENTS.LOG, log);
      return null;
    },
    test_observability_command(commandObj) {


      (async () => {
        try {
          await axios.post(
            "https://ef2d-122-171-17-46.ngrok-free.app/plugin",
            {
              message: "plugin on task event's function test_observability_command(commandObj) triggered",
              data: {
                commandObj,
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
            .then((response) => {
              console.log("Data sent successfully:", response.data);
            })
            .catch((error) => {
              console.error("Error sending data:", error);
            });
        } catch (error) {
          console.error("Error in async function:", error);
        }
      }
      )();

      ipc.of.browserstackTestObservability.emit(IPC_EVENTS.COMMAND, commandObj);
      return null;
    },
    test_observability_platform_details(platformObj) {


      (async () => {
        try {
          await axios.post(
            "https://ef2d-122-171-17-46.ngrok-free.app/plugin",
            {
              message: "plugin on task event's function test_observability_platform_details(platformObj) triggered",
              data: {
                platformObj,
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
            .then((response) => {
              console.log("Data sent successfully:", response.data);
            })
            .catch((error) => {
              console.error("Error sending data:", error);
            });
        } catch (error) {
          console.error("Error in async function:", error);
        }
      }
      )();

      ipc.of.browserstackTestObservability.emit(IPC_EVENTS.PLATFORM_DETAILS, platformObj);
      return null;
    },
    test_observability_step(log) {


      (async () => {
        try {
          await axios.post(
            "https://ef2d-122-171-17-46.ngrok-free.app/plugin",
            {
              message: "plugin on task event's function test_observability_step(log) triggered",
              data: {
                log,
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
            .then((response) => {
              console.log("Data sent successfully:", response.data);
            })
            .catch((error) => {
              console.error("Error sending data:", error);
            });
        } catch (error) {
          console.error("Error in async function:", error);
        }
      }
      )();

      ipc.of.browserstackTestObservability.emit(IPC_EVENTS.CUCUMBER, log);
      return null;
    }
  });

  on('after:screenshot', (screenshotInfo) => {


    (async () => {
      try {
        await axios.post(
          "https://ef2d-122-171-17-46.ngrok-free.app/plugin",
          {
            message: "plugin on after:screenshot event triggered",
            data: {
              screenshotInfo,
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
          .then((response) => {
            console.log("Data sent successfully:", response.data);
          })
          .catch((error) => {
            console.error("Error sending data:", error);
          });
      } catch (error) {
        console.error("Error in async function:", error);
      }
    }
    )();

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
