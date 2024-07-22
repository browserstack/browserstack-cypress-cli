const ipc = require('node-ipc');
const { consoleHolder } = require('../helper/constants');
const { requestQueueHandler } = require('../helper/helper');

exports.startIPCServer = (subscribeServerEvents, unsubscribeServerEvents) => {
  if (ipc.server) {
    unsubscribeServerEvents(ipc.server);
    subscribeServerEvents(ipc.server);
    return;
  }
  ipc.config.id = 'browserstackTestObservability';
  ipc.config.retry = 1500;
  ipc.config.silent = true;

  ipc.serve(() => {
    
    ipc.server.on('socket.disconnected', (socket, destroyedSocketID) => {
      ipc.log(`client ${destroyedSocketID} has disconnected!`);
    });
    
    ipc.server.on('destroy', () => {
      ipc.log('server destroyed');
    });
    
    subscribeServerEvents(ipc.server);
    
    process.on('exit', () => {
      console.log('here we goooo ' + process.pid)
      unsubscribeServerEvents(ipc.server);
      ipc.server.stop();
      console.log('shutdown sync running');
      requestQueueHandler.shutdownSync();
    });
  
  });
  
  ipc.server.start();
};
