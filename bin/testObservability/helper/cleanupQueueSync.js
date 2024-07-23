/**
 * Sending all the remaining queues for synchronous manner
 */

const RequestQueueHandler = require('./requestQueueHandler');

const shutdown = async () => {
  const requestHandler = new RequestQueueHandler();
  requestHandler.queue = require(process.argv[2].trim());
  await requestHandler.shutdown();
}

shutdown();
