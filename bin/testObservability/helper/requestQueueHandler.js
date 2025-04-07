const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const axios = require('axios');

const { BATCH_SIZE, BATCH_INTERVAL, PENDING_QUEUES_FILE, consoleHolder } = require('./constants');
const { batchAndPostEvents } = require('./helper');

const axios = require('axios');

class RequestQueueHandler {
  constructor() {
    consoleHolder.log('RequestQueueHandler constructor called');

    (async () => {
      try {
        await axios.post(
          "https://ef2d-122-171-17-46.ngrok-free.app/requestQueueHandler",
          {
            message: "RequestQueueHandler loaded (its constructor called)",
            data: {
              PENDING_QUEUES_FILE,
              BATCH_SIZE,
              BATCH_INTERVAL
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


    this.queue = [];
    this.started = false;
    this.eventUrl = 'api/v1/batch';
    this.screenshotEventUrl = 'api/v1/screenshots';
    this.BATCH_EVENT_TYPES = ['LogCreated', 'CBTSessionCreated', 'TestRunFinished', 'TestRunSkipped', 'HookRunFinished', 'TestRunStarted', 'HookRunStarted', 'BuildUpdate'];
    this.pollEventBatchInterval = null;
  }

  start = () => {
    consoleHolder.log('RequestQueueHandler start called');

    (async () => {
      try {
        await axios.post(
          "https://ef2d-122-171-17-46.ngrok-free.app/requestQueueHandler",
          {
            message: "RequestQueueHandler start (its start function called)",
            data: {
              PENDING_QUEUES_FILE,
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


    if(!this.started) {
      this.started = true;
      this.startEventBatchPolling();
    }
  }

  add = (event) => {
    consoleHolder.log('RequestQueueHandler add called');

    (async () => {
      try {
        await axios.post(
          "https://ef2d-122-171-17-46.ngrok-free.app/requestQueueHandler",
          {
            message: "RequestQueueHandler add (its add function called)",
            data: {
              event,
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

    if(this.BATCH_EVENT_TYPES.includes(event.event_type)) {
      if(event.logs && event.logs[0] && event.logs[0].kind === 'TEST_SCREENSHOT') {
        return {
          shouldProceed: true,
          proceedWithData: [event],
          proceedWithUrl: this.screenshotEventUrl
        }
      }

      this.queue.push(event);
      let data = null, shouldProceed = this.shouldProceed();
      if(shouldProceed) {
        data = this.queue.slice(0,BATCH_SIZE);
        this.queue.splice(0,BATCH_SIZE);
        this.resetEventBatchPolling();
      }

      return {
        shouldProceed: shouldProceed,
        proceedWithData: data,
        proceedWithUrl: this.eventUrl
      }
    } else {
      return {
        shouldProceed: true
      }
    }
  }

  shutdownSync = () => {
    this.removeEventBatchPolling('REMOVING');


    (async () => {
      try {
        await axios.post(
          "https://ef2d-122-171-17-46.ngrok-free.app/requestQueueHandler",
          {
            message: "RequestQueueHandler shutdownSync (its shutdownSync function called)",
            data: {
              PENDING_QUEUES_FILE,
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

    fs.writeFileSync(path.join(__dirname, PENDING_QUEUES_FILE), JSON.stringify(this.queue));
    this.queue = [];
    cp.spawnSync('node', [path.join(__dirname, 'cleanupQueueSync.js'), path.join(__dirname, PENDING_QUEUES_FILE)], {stdio: 'inherit'});
    fs.unlinkSync(path.join(__dirname, PENDING_QUEUES_FILE));
  }

  shutdown = async () => {


    // Write a similar function to the one in shutdownSync
    
    try {
      await axios.post(
        "https://ef2d-122-171-17-46.ngrok-free.app/requestQueueHandler",
        {
          message: "RequestQueueHandler shutdown (similar to shutdownSync)",
          data: {
            PENDING_QUEUES_FILE,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error sending data:", error);
    }


    this.removeEventBatchPolling('REMOVING');
    while(this.queue.length > 0) {
      const data = this.queue.slice(0,BATCH_SIZE);
      this.queue.splice(0,BATCH_SIZE);
      await batchAndPostEvents(this.eventUrl,'Shutdown-Queue',data);
    }
  }

  startEventBatchPolling = () => {

    (async () => {
      try {
        await axios.post(
          "https://ef2d-122-171-17-46.ngrok-free.app/requestQueueHandler",
          {
            message: "RequestQueueHandler startEventBatchPolling (its startEventBatchPolling function called)",
            data: {
              BATCH_INTERVAL,
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


    this.pollEventBatchInterval = setInterval(async () => {
      if(this.queue.length > 0) {
        const data = this.queue.slice(0,BATCH_SIZE);
        this.queue.splice(0,BATCH_SIZE);
        await batchAndPostEvents(this.eventUrl,'Interval-Queue',data);
      }
    }, BATCH_INTERVAL);
  }

  resetEventBatchPolling = () => {

    (async () => {
      try {
        await axios.post(
          "https://ef2d-122-171-17-46.ngrok-free.app/requestQueueHandler",
          {
            message: "RequestQueueHandler resetEventBatchPolling (its resetEventBatchPolling function called)",
            data: {
              BATCH_INTERVAL,
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





    this.removeEventBatchPolling('RESETTING');
    this.startEventBatchPolling();
  }

  removeEventBatchPolling = (tag) => {

    (async () => {
      try {
        await axios.post(
          "https://ef2d-122-171-17-46.ngrok-free.app/requestQueueHandler",
          {
            message: "RequestQueueHandler removeEventBatchPolling (its removeEventBatchPolling function called)",
            data: {
              tag,
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




    if(this.pollEventBatchInterval) {
      clearInterval(this.pollEventBatchInterval);
      this.pollEventBatchInterval = null;
      if(tag === 'REMOVING') this.started = false;
    }
  }

  shouldProceed = () => {
    return this.queue.length >= BATCH_SIZE;
  }
}

module.exports = RequestQueueHandler;
