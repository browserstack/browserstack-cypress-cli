/* Event listeners + custom commands for Cypress */

/* Used to detect Gherkin steps */
Cypress.on('log:added', (log) => {
  return () => {
    return cy.now('task', 'test_observability_step', {
              log
            }, {log: false})
  }
});

Cypress.on('test:before:run', (attributes, runnable) => {

  console.log("env ACCESSIBILITY_EXTENSION_PATH ", process.env.ACCESSIBILITY_EXTENSION_PATH)
  // window.eval(`console.log('test:before:run!!!!!!!!! ${process.env.ACCESSIBILITY_EXTENSION_PATH}')`);
  // window.eval("console.log(`test:before:run!!!!!!!!!, ${JSON.stringify(attributes)}`)");
  console.log(`test:before:run!!!!!!!!!, JSON.stringify(attributes)}`, JSON.stringify(attributes))

  window.eval("console.log('test:before:run!!!!!!!!!')");
  window.eval("console.log('test:before:run!!!!!!!!!')");
  window.eval("console.log('test:before:run!!!!!!!!!')");
  window.eval("console.log('test:before:run!!!!!!!!!')");
  const dataForExtension = {
    "saveResults": true,
    "testDetails": {
      "name": 'BStackDemo',
      "testRunId": '5058',
      "filePath": 'cypress-test-file-path',
      "scopeList": [
        'path',
        'name'
      ]
    },
    "platform": {
      "os_name": 'OS X',
      "os_version": 'Big Sur',
      "browser_name": 'chrome',
      "browser_version": '117.0.5938.62'
    }
  };

  // window.eval(`
  // const e = new CustomEvent('A11Y_TEST_END', {detail: ${dataForExtension}});
  //  window.parent.dispatchEvent(e);
  //  console.log('test:before:run A11Y END !!!!!!')`);

  // window.eval(`
  //     const e = new CustomEvent('A11Y_TEST_END', {detail: {
  //       "saveResults": true,
  //       "testDetails": {
  //         "name": 'BStackDemo',
  //         "testRunId": '5164',
  //         "filePath": 'cypress-test-file-path',
  //         "scopeList": [
  //           'path',
  //           'name'
  //         ]
  //       },
  //       "platform": {
  //         "os_name": 'OS X',
  //         "os_version": 'Big Sur',
  //         "browser_name": 'chrome',
  //         "browser_version": '117.0.5938.62'
  //       }
  //     }});
  //      window.parent.dispatchEvent(e);
  //      console.log('test:before:run A11Y END !!!!!!')`);


  // window.eval("console.log('test:before:run!!!!!!!!!')");
  // window.eval(`console.log('test:before:run!!!!!!!!!', ${attributes})`);


})
// Cypress.on('test:before:run', (command) => {

//   // console.log("command", command)
//   // console.log("process variables BS_A11Y_JWT", process.env.ACCESSIBILITY);
//   // window.eval(`console.log("command", ${command})`);
//   // window.eval(`console.log("BS_A11Y_JWT", ${process.env.BS_A11Y_JWT})`);
//   window.eval("console.log('test:before:run!!!!!!!!!')")

//   window.eval("window.name='A11Y_TEST_BEFORE_RUN_CHECK'")
//   // cy.now('task', 'a11y_command', {
//   //   type: 'a11y'
//   // });

//   // cy.log("testing!!!!!!!")
//   // cy.get('body').type('{command}', {release: false});
//   // cy.get('body').type('{alt}', {release: false});
//   // cy.get('body').type('J');
//   // cy.get('body').type('{alt}{command}');

// });



Cypress.on('test:after:run', (attributes, runnable) => {
  window.eval("console.log('test:after:run!!!!!!!!!')");
  window.eval("console.log('test:after:run!!!!!!!!!')");

  const dataForExtension = {
    "saveResults": true,
    "testDetails": {
      "name": 'BStackDemo',
      "testRunId": '5164',
      "filePath": 'cypress-test-file-path',
      "scopeList": [
        'path',
        'name'
      ]
    },
    "platform": {
      "os_name": 'OS X',
      "os_version": 'Big Sur',
      "browser_name": 'chrome',
      "browser_version": '117.0.5938.62'
    }
  };
  // window.eval(` console.log('A11Y_TEST_END in test:after:run !!!!!!!!!')
  // const e = new CustomEvent('A11Y_TEST_END', {detail: ${JSON.stringify(dataForExtension)}}); window.parent.dispatchEvent(e);`);

  window.eval(`

  const e = new CustomEvent('A11Y_TEST_END', {detail: ${dataForExtension}});
   window.parent.dispatchEvent(e);`);

    // window.eval(`
    //   const e = new CustomEvent('A11Y_TEST_END', {detail: {
    //     "saveResults": true,
    //     "testDetails": {
    //       "name": 'BStackDemo',
    //       "testRunId": '5164',
    //       "filePath": 'cypress-test-file-path',
    //       "scopeList": [
    //         'path',
    //         'name'
    //       ]
    //     },
    //     "platform": {
    //       "os_name": 'OS X',
    //       "os_version": 'Big Sur',
    //       "browser_name": 'chrome',
    //       "browser_version": '117.0.5938.62'
    //     }
    //   }}); window.dispatchEvent(e);`);

  window.eval("console.log('test:after:run!!!!!!!!!')");
  window.eval("console.log('test:after:run!!!!!!!!!')");
  window.eval("console.log('test:after:run!!!!!!!!!')");

    // window.eval(`console.log('test:after:run!!!!!!!!!', ${attributes})`);


  // window.eval(`const e = new CustomEvent('A11Y_TEST_END', {detail: ${dataForExtension}});
  // window.dispatchEvent(e);`);
  
  // window.eval("1+1");window.eval("1+1");window.eval("1+1");window.eval("1+1");window.eval("1+1");window.eval("1+1");window.eval("1+1");window.eval("1+1");window.eval("1+1");window.eval("1+1");window.eval("1+1");window.eval("1+1");window.eval("1+1");

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


