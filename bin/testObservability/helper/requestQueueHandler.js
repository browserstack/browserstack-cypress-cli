const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const { BATCH_SIZE, BATCH_INTERVAL, PENDING_QUEUES_FILE } = require('./constants');
const { batchAndPostEvents, debugOnConsole } = require('./helper');

class RequestQueueHandler {
  constructor() {

    try{
    require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt',
      `
      Current Date and time is: ${new Date()}
      Request Queue Handler Constructor
      `
    );
  } catch(e) {
    debugOnConsole(`Inside Request Queue Handler Constructor: `)
    debugOnConsole(`Error in writing to file ${e}`);

    console.log(`Inside Request Queue Handler Constructor: `)
    console.log(`Error in writing to file ${e}`);
  }

    this.queue = [];
    this.started = false;
    this.eventUrl = 'api/v1/batch';
    this.screenshotEventUrl = 'api/v1/screenshots';
    this.BATCH_EVENT_TYPES = ['LogCreated', 'CBTSessionCreated', 'TestRunFinished', 'TestRunSkipped', 'HookRunFinished', 'TestRunStarted', 'HookRunStarted', 'BuildUpdate'];
    this.pollEventBatchInterval = null;
  }

  start = () => {
    require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt', 

      `
      Starting Request Queue Handler
      `
    
    );
    if(!this.started) {
      this.started = true;
      this.startEventBatchPolling();
    }
  }

  add = (event) => {

    require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt', 

      `
      Current Date and time is: ${new Date()}

      Adding event to queue: ${event.event_type}
     
      `
    
    );

    try{
      require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt',
        `
        Event: ${JSON.stringify(event)}
        `
      );
    } catch(e) {
      require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt',
        `
        The event is being added to queue but could not be stringified.
        `
      );
    }

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


    require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt',
      `
      Shutting down Request Queue Handler using shutdownSync
      `
    );

    this.removeEventBatchPolling('REMOVING');

    fs.writeFileSync(path.join(__dirname, PENDING_QUEUES_FILE), JSON.stringify(this.queue));
    this.queue = [];
    cp.spawnSync('node', [path.join(__dirname, 'cleanupQueueSync.js'), path.join(__dirname, PENDING_QUEUES_FILE)], {stdio: 'inherit'});
    fs.unlinkSync(path.join(__dirname, PENDING_QUEUES_FILE));
  }

  shutdown = async () => {

    require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt',
      `
      Shutting down Request Queue Handler using shutdown = async
      `
    );
    this.removeEventBatchPolling('REMOVING');
    while(this.queue.length > 0) {
      const data = this.queue.slice(0,BATCH_SIZE);
      this.queue.splice(0,BATCH_SIZE);
      await batchAndPostEvents(this.eventUrl,'Shutdown-Queue',data);
    }
  }

  startEventBatchPolling = () => {

    require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt',
      `
      Starting Event Batch Polling
      `
    );

    this.pollEventBatchInterval = setInterval(async () => {
      if(this.queue.length > 0) {
        const data = this.queue.slice(0,BATCH_SIZE);
        this.queue.splice(0,BATCH_SIZE);
        await batchAndPostEvents(this.eventUrl,'Interval-Queue',data);
      }
    }, BATCH_INTERVAL);
  }

  resetEventBatchPolling = () => {

    require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt',
      `
      Resetting Event Batch Polling
      `
    );

    this.removeEventBatchPolling('RESETTING');
    this.startEventBatchPolling();
  }

  removeEventBatchPolling = (tag) => {

    require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt',
      `
      Removing Event Batch Polling via tag: ${tag}
      `
    );

    if(this.pollEventBatchInterval) {
      clearInterval(this.pollEventBatchInterval);
      this.pollEventBatchInterval = null;
      if(tag === 'REMOVING') this.started = false;
    }
  }

  shouldProceed = () => {

    require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt',
      `
      Checking if should proceed
      Returning: ${this.queue.length >= BATCH_SIZE}
      this.queue.length: ${this.queue.length}
      BATCH_SIZE: ${BATCH_SIZE}
      `
    );

    return this.queue.length >= BATCH_SIZE;
  }
}

module.exports = RequestQueueHandler;
