/**
 * Sending all the remaining queues for synchronous manner
 */

const requestHandler = require('./requestQueueHandler');

const shutdown = async () => {
  requestHandler.queue = require(process.argv[2].trim());
  await requestHandler.shutdown();
}

shutdown();
