const { BATCH_SIZE, BATCH_INTERVAL, consoleHolder } = require('./constants');
const { debug, batchAndPostEvents } = require('./helper');

class RequestQueueHandler {
  constructor() {
    this.queue = [];
    this.started = false;
    this.eventUrl = 'api/v1/batch';
    this.screenshotEventUrl = 'api/v1/screenshots';
    this.BATCH_EVENT_TYPES = ['LogCreated', 'CBTSessionCreated', 'TestRunFinished', 'TestRunSkipped', 'HookRunFinished', 'TestRunStarted', 'HookRunStarted', 'BuildUpdate'];
    this.pollEventBatchInterval = null;
  }

  start = () => {
    if(!this.started) {
      this.started = true;
      this.startEventBatchPolling();
    }
  }

  add = (event) => {
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

  shutdown = async () => {
    this.removeEventBatchPolling('REMOVING');
    while(this.queue.length > 0) {
      const data = this.queue.slice(0,BATCH_SIZE);
      this.queue.splice(0,BATCH_SIZE);
      await batchAndPostEvents(this.eventUrl,'Shutdown-Queue',data);
    }
  }

  startEventBatchPolling = () => {
    this.pollEventBatchInterval = setInterval(async () => {
      if(this.queue.length > 0) {
        const data = this.queue.slice(0,BATCH_SIZE);
        this.queue.splice(0,BATCH_SIZE);
        await batchAndPostEvents(this.eventUrl,'Interval-Queue',data);
      }
    }, BATCH_INTERVAL);
  }

  resetEventBatchPolling = () => {
    this.removeEventBatchPolling('RESETTING');
    this.startEventBatchPolling();
  }

  removeEventBatchPolling = (tag) => {
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
