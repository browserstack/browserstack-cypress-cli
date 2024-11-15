/* Event listeners + custom commands for Cypress */

/* Used to detect Gherkin steps */
Cypress.on('log:added', (log) => {
  return () => {
    return cy.now('task', 'test_observability_step', {
              log
            }, {log: false})
  }
});

Cypress.on('command:start', (command) => {
  if(!command || !command.attributes) return;
  if(command.attributes.name == 'log' || (command.attributes.name == 'task' && (command.attributes.args.includes('test_observability_command') || command.attributes.args.includes('test_observability_log')))) {
    return;
  }
  /* Send command details */
  cy.now('task', 'test_observability_command', {
    type: 'COMMAND_START',
    command: {
      attributes: {
        id: command.attributes.id,
        name: command.attributes.name,
        args: command.attributes.args
      },
      state: 'pending'
    }
  }, {log: false}).then((res) => {
  }).catch((err) => {
  });

  /* Send platform details */
  cy.now('task', 'test_observability_platform_details', {
    testTitle: Cypress.currentTest.title,
    browser: Cypress.browser,
    platform: Cypress.platform,
    cypressVersion: Cypress.version
  }, {log: false}).then((res) => {
  }).catch((err) => {
  });
});

Cypress.on('command:retry', (command) => {
  if(!command || !command.attributes) return;
  if(command.attributes.name == 'log' || (command.attributes.name == 'task' && (command.attributes.args.includes('test_observability_command') || command.attributes.args.includes('test_observability_log')))) {
    return;
  }
  cy.now('task', 'test_observability_command', {
    type: 'COMMAND_RETRY',
    command: {
      _log: command._log,
      error: {
        message: command && command.error ? command.error.message : null,
        isDefaultAssertionErr: command && command.error ? command.error.isDefaultAssertionErr : null
      }
    }
  }, {log: false}).then((res) => {
  }).catch((err) => {
  });
});

Cypress.on('command:end', (command) => {
  if(!command || !command.attributes) return;
  if(command.attributes.name == 'log' || (command.attributes.name == 'task' && (command.attributes.args.includes('test_observability_command') || command.attributes.args.includes('test_observability_log')))) {
    return;
  }
  cy.now('task', 'test_observability_command', {
    'type': 'COMMAND_END',
    'command': {
      'attributes': {
        'id': command.attributes.id,
        'name': command.attributes.name,
        'args': command.attributes.args
      },
      'state': command.state
    }
  }, {log: false}).then((res) => {
  }).catch((err) => {
  });
});

Cypress.Commands.overwrite('log', (originalFn, ...args) => {
  if(args.includes('test_observability_log') || args.includes('test_observability_command')) return;
  const message = args.reduce((result, logItem) => {
    if (typeof logItem === 'object') {
      return [result, JSON.stringify(logItem)].join(' ');
    }

    return [result, logItem ? logItem.toString() : ''].join(' ');
  }, '');
  cy.now('task', 'test_observability_log', {
    'level': 'info',
    message,
  }, {log: false}).then((res) => {
  }).catch((err) => {
  });
  originalFn(...args);
});

Cypress.Commands.add('trace', (message, file) => {
  cy.now('task', 'test_observability_log', {
    level: 'trace',
    message,
    file,
  }).then((res) => {
  }).catch((err) => {
  });
});

Cypress.Commands.add('logDebug', (message, file) => {
  cy.now('task', 'test_observability_log', {
    level: 'debug',
    message,
    file,
  }).then((res) => {
  }).catch((err) => {
  });
});

Cypress.Commands.add('info', (message, file) => {
  cy.now('task', 'test_observability_log', {
    level: 'info',
    message,
    file,
  }).then((res) => {
  }).catch((err) => {
  });
});

Cypress.Commands.add('warn', (message, file) => {
  cy.now('task', 'test_observability_log', {
    level: 'warn',
    message,
    file,
  }).then((res) => {
  }).catch((err) => {
  });
});

Cypress.Commands.add('error', (message, file) => {
  cy.now('task', 'test_observability_log', {
    level: 'error',
    message,
    file,
  }).then((res) => {
  }).catch((err) => {
  });
});

Cypress.Commands.add('fatal', (message, file) => {
  cy.now('task', 'test_observability_log', {
    level: 'fatal',
    message,
    file,
  }).then((res) => {
  }).catch((err) => {
  });
});
