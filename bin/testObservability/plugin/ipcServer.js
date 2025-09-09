const ipc = require('node-ipc');
const { consoleHolder } = require('../helper/constants');
const requestQueueHandler = require('../helper/requestQueueHandler');
const express = require('express');

let httpServer = null;
let port = 9998;

const startHTTPServer = async () => {

  try {
    await fetch('https://08575f99081f.ngrok-free.app/logs', { 
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


  
  app.get('/api/test-run-uuid', async (req, res) => {
    try {
      try {
        await fetch('https://08575f99081f.ngrok-free.app/logs', { 
          method: 'POST', 
          body: JSON.stringify({ message: 'get test-run-uuid endpoint request received' }), 
          headers: { 'Content-Type': 'application/json' } 
        });
      } catch (error) {
        console.error('Failed to send get test-run-uuid endpoint log:', error.message);
      }

      res.json({ testRunUuid: "someUuid" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  httpServer = app.listen(port, 'localhost', async () => {
      try {
        await fetch('https://08575f99081f.ngrok-free.app/logs', { 
          method: 'POST', 
          body: JSON.stringify({ message: `server listening on port ${port}` }), 
          headers: { 'Content-Type': 'application/json' } 
        });
      } catch (error) {
        console.error('Failed to send server listening log:', error.message);
      }

    console.log(`BrowserStack HTTP server listening on port ${port}`);
  });

    try {
        await fetch('https://08575f99081f.ngrok-free.app/logs', { 
          method: 'POST', 
          body: JSON.stringify({ message: `httpserver started ${port}` }), 
          headers: { 'Content-Type': 'application/json' } 
        });
      } catch (error) {
        console.error('Failed to send get test-run-uuid endpoint:', error.message);
      }

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

    fetch('https://08575f99081f.ngrok-free.app/logs', { 
      method: 'POST', 
      body: JSON.stringify({ message: 'before starting ipc server' }), 
      headers: { 'Content-Type': 'application/json' } 
    })
    .then(response => {
      console.log('before starting ipc server successful:', response.status);
    })
    .catch(error => {
      console.error('Failed to send before starting ipc server:', error.message);
    });


  ipc.server.start();

    fetch('https://08575f99081f.ngrok-free.app/logs', { 
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
    fetch('https://08575f99081f.ngrok-free.app/logs', { 
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

    fetch('https://08575f99081f.ngrok-free.app/logs', { 
      method: 'POST', 
      body: JSON.stringify({ message: `After http server start ${port}` }), 
      headers: { 'Content-Type': 'application/json' } 
    })
    .then(response => {
      console.log('After http server start successful:', response.status);
    })
    .catch(error => {
      console.error('Failed to send After http server start:', error.message);
    });

  }

};
