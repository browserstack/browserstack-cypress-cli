/* Event listeners + custom commands for Cypress */

/* Used to detect Gherkin steps */

const browserStackLog = (message) => {
  if (!Cypress.env('BROWSERSTACK_LOGS')) return;
  cy.task('browserstack_log', message);
}

const shouldSkipCommand = (command) => {
  return command.attributes.name == 'log' || (command.attributes.name == 'task' && (['test_observability_platform_details', 'test_observability_step', 'test_observability_command', 'browserstack_log'].some(event => command.attributes.args.includes(event))));
}

Cypress.on('log:added', (log) => {
  return () => {
    return cy.task('test_observability_step', {
      log
    }, { log: false })
  }
});

Cypress.on('command:start', (command) => {
  if (!command || !command.attributes) return;
  if (shouldSkipCommand(command)) {
    return;
  }
  /* Send command details */
  cy.task('test_observability_command', {
    type: 'COMMAND_START',
    command: {
      attributes: {
        id: command.attributes.id,
        name: command.attributes.name,
        args: command.attributes.args
      },
      state: 'pending'
    }
  }, { log: false });

  /* Send platform details */
  cy.task('test_observability_platform_details', {
    testTitle: Cypress.currentRunnable?.title || '',
    browser: Cypress.browser,
    platform: Cypress.platform,
    cypressVersion: Cypress.version
  }, { log: false });
});

Cypress.on('command:retry', (command) => {
  if (!command || !command.attributes) return;
  if (shouldSkipCommand(command)) {
    return;
  }
  cy.task('test_observability_command', {
    type: 'COMMAND_RETRY',
    command: {
      _log: command._log,
      error: {
        message: command && command.error ? command.error.message : null,
        isDefaultAssertionErr: command && command.error ? command.error.isDefaultAssertionErr : null
      }
    }
  }, { log: false });
});

Cypress.on('command:end', (command) => {
  if (!command || !command.attributes) return;
  if (shouldSkipCommand(command)) {
    return;
  }
  cy.task('test_observability_command', {
    'type': 'COMMAND_END',
    'command': {
      'attributes': {
        'id': command.attributes.id,
        'name': command.attributes.name,
        'args': command.attributes.args
      },
      'state': command.state
    }
  }, { log: false });
});

Cypress.Commands.overwrite('log', (originalFn, ...args) => {
  if (args.includes('test_observability_log') || args.includes('test_observability_command')) return;
  const message = args.reduce((result, logItem) => {
    if (typeof logItem === 'object') {
      return [result, JSON.stringify(logItem)].join(' ');
    }

    return [result, logItem ? logItem.toString() : ''].join(' ');
  }, '');
  cy.task('test_observability_log', {
    'level': 'info',
    message,
  }, { log: false });
  originalFn(...args);
});

Cypress.Commands.add('trace', (message, file) => {
  cy.task('test_observability_log', {
    level: 'trace',
    message,
    file,
  });
});

Cypress.Commands.add('logDebug', (message, file) => {
  cy.task('test_observability_log', {
    level: 'debug',
    message,
    file,
  });
});

Cypress.Commands.add('info', (message, file) => {
  cy.task('test_observability_log', {
    level: 'info',
    message,
    file,
  });
});

Cypress.Commands.add('warn', (message, file) => {
  cy.task('test_observability_log', {
    level: 'warn',
    message,
    file,
  });
});

Cypress.Commands.add('error', (message, file) => {
  cy.task('test_observability_log', {
    level: 'error',
    message,
    file,
  });
});

Cypress.Commands.add('fatal', (message, file) => {
  cy.task('test_observability_log', {
    level: 'fatal',
    message,
    file,
  });
});
