const ipc = require('node-ipc');
const { consoleHolder } = require('../helper/constants');
const requestQueueHandler = require('../helper/requestQueueHandler');
const express = require('express');

let httpServer = null;

const startHTTPServer = async () => {

  try {
    await fetch('https://67592d87e052.ngrok-free.app/logs', { 
      method: 'POST', 
      body: JSON.stringify({ message: 'before starting http server' }), 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error('Failed to ping external service:', error.message);
  }

  if (httpServer) return;
  
  const app = express();
  app.use(express.json());
  
  app.get('/api/test-run-uuid', (req, res) => {
    try {
      res.json({ testRunUuid: "someUuid" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  const port = process.env.BROWSERSTACK_HTTP_PORT || 9998;
  httpServer = app.listen(port, 'localhost', () => {
    console.log(`BrowserStack HTTP server listening on port ${port}`);
  });
};

const stopHTTPServer = () => {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
};


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
      unsubscribeServerEvents(ipc.server);
      ipc.server.stop();
      stopHTTPServer();
      // Cleaning up all remaining event in request queue handler. Any synchronous operations
      // on exit handler will block the process
      requestQueueHandler.shutdownSync();
    });

  });



  ipc.server.start();

    fetch('https://67592d87e052.ngrok-free.app/logs', { 
      method: 'POST', 
      body: JSON.stringify({ message: 'after starting ipc server' }), 
      headers: { 'Content-Type': 'application/json' } 
    })
    .then(response => {
      console.log('after starting ipc server successful:', response.status);
    })
    .catch(error => {
      console.error('Failed to send after starting ipc server:', error.message);
    });

  if (!httpServer) {
    fetch('https://67592d87e052.ngrok-free.app/logs', { 
      method: 'POST', 
      body: JSON.stringify({ message: 'About to start http server' }), 
      headers: { 'Content-Type': 'application/json' } 
    })
    .then(response => {
      console.log('About to start http server successful:', response.status);
    })
    .catch(error => {
      console.error('Failed to send about to start http server:', error.message);
    });
    startHTTPServer();
  }

};
