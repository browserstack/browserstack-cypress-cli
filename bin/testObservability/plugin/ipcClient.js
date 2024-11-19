const ipc = require('node-ipc');
const { IPC_EVENTS } = require('../helper/constants');

exports.connectIPCClient = (config) => {
  ipc.config.id = 'browserstackTestObservability';
  ipc.config.retry = 1500;
  ipc.config.silent = true;

  ipc.connectTo('browserstackTestObservability', () => {
    ipc.of.browserstackTestObservability.on('connect', () => {
      ipc.of.browserstackTestObservability.emit(IPC_EVENTS.CONFIG, config);
    });
    ipc.of.browserstackTestObservability.on('disconnect', () => {
    });
  });
};
