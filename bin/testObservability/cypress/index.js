/* Event listeners + custom commands for Cypress */

/* Used to detect Gherkin steps */
const STEP_KEYWORDS = ['given', 'when', 'then', 'and', 'but', '*'];

let eventsQueue = [];
let testRunStarted = false;

/*
 * Command args (command.attributes.args) and cy.log items are captured raw and can hold
 * circular Cypress runtime objects (e.g. a config-like object whose `renderOptions.host`
 * points back to itself). cy.task() JSON-serializes its payload to ship it from the browser
 * to the Node plugin process, so a circular arg makes Cypress throw
 * "Converting circular structure to JSON" and aborts the run. Decycle the payload before
 * handing it to cy.task so o11y instrumentation can never break the customer's tests. [SDK-6016]
 */
const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  };
};

/*
 * Returns a decycled, JSON-safe plain object, or `null` if the payload still cannot be
 * serialized for a non-circular reason (BigInt, a throwing toJSON, a Proxy trap, etc.).
 * `null` is a "skip this event" sentinel — callers must NOT forward it to cy.task, because
 * the Node o11y handler expects a structured event payload, not an error stub. Skipping keeps
 * graceful degradation total: no crash, and no malformed event reaches the collector.
 */
const sanitizeForTask = (data) => {
  try {
    return JSON.parse(JSON.stringify(data, getCircularReplacer()));
  } catch (e) {
    return null;
  }
};

const browserStackLog = (message) => {

  if (!Cypress.env('BROWSERSTACK_LOGS')) return;
  cy.task('browserstack_log', message);
}

const shouldSkipCommand = (command) => {
  if (!Cypress.env('BROWSERSTACK_O11Y_LOGS')) {
    return true;
  }
  return command.attributes.name == 'log' || (command.attributes.name == 'task' && (['test_observability_platform_details', 'test_observability_step', 'test_observability_command', 'browserstack_log', 'test_observability_log'].some(event => command.attributes.args.includes(event))));
}

Cypress.on('log:changed', (attrs) => {
  if (!Cypress.env('BROWSERSTACK_O11Y_LOGS')) return;
  if (!attrs) return;
  if (!attrs.createdAtTimestamp || !attrs.updatedAtTimestamp) return;
  if (attrs.state !== 'passed' && attrs.state !== 'failed') return;

  if (attrs.name === 'assert') {
    const assertMessage = (attrs.message || '')
    const actualLocation = (attrs.testId === attrs.hookId) ? 'test' : 'hook';

    eventsQueue.push({
      task: 'test_observability_command',
      data: {
        type: 'COMMAND_START',
        command: {
          attributes: {
            id: attrs.id,
            name: 'assert',
            testId: attrs.testId,
            hookId: attrs.hookId,
            args: [assertMessage]
          },
          state: 'pending',
          started_at: new Date(attrs.createdAtTimestamp).toISOString(),
          location: actualLocation
        }
      },
      options: { log: false }
    });

    eventsQueue.push({
      task: 'test_observability_command',
      data: {
        type: 'COMMAND_END',
        command: {
          attributes: {
            id: attrs.id,
            name: 'assert',
            testId: attrs.testId,
            hookId: attrs.hookId,
            args: [assertMessage]
          },
          state: attrs.state,
          finished_at: new Date(attrs.updatedAtTimestamp).toISOString(),
          location: actualLocation
        }
      },
      options: { log: false }
    });
  }

  const keyword = (attrs.displayName || attrs.name || '').trim();

  if (STEP_KEYWORDS.includes(keyword.toLowerCase())) {
    const text = (attrs.message || '')

    eventsQueue.push({
      task: 'test_observability_step',
      data: {
        log: {
          name: 'step',
          chainerId: attrs.chainerId,
          consoleProps: { step: { keyword, text } }
        },
        started_at: new Date(attrs.createdAtTimestamp).toISOString(),
        finished_at: new Date(attrs.updatedAtTimestamp).toISOString()
      },
      options: { log: false }
    });

    if (attrs.state === 'failed') {
      eventsQueue.push({
        task: 'test_observability_step',
        data: {
          log: {
            name: 'then',
            type: 'child',
            chainerId: attrs.chainerId,
            state: attrs.state,
            err: attrs.err
          },
          finished_at: new Date(attrs.updatedAtTimestamp).toISOString()
        },
        options: { log: false }
      });
    }
  }
});

Cypress.on('command:start', (command) => {

  if (!command || !command.attributes) return;
  if (shouldSkipCommand(command)) {
    return;
  }

  /* Send command details */
  eventsQueue.push({
    task: 'test_observability_command',
    data: {
      type: 'COMMAND_START',
      command: {
        attributes: {
          id: command.attributes.id,
          name: command.attributes.name,
          args: command.attributes.args
        },
        state: 'pending',
        started_at: new Date().toISOString(),
        location: testRunStarted ? 'test' : 'hook'
      }
    },
    options: { log: false }
  });
  /* Send platform details */
  let testTitle = '';
  try {
    const runner = Cypress.mocha.getRunner();
    const ctx = runner.suite.ctx;
    testTitle = ctx.currentTest.title || ctx._runnable.title;
  } catch (error) {
    // Silently handle if any property is undefined
  }

  eventsQueue.push({
    task: 'test_observability_platform_details',
    data: {
      testTitle,
      browser: Cypress.browser,
      platform: Cypress.platform,
      cypressVersion: Cypress.version
    },
    options: { log: false }
  });
});

Cypress.on('command:retry', (command) => {
  if (!command || !command.attributes) return;
  if (shouldSkipCommand(command)) {
    return;
  }
  eventsQueue.push({
    task: 'test_observability_command',
    data: {
      type: 'COMMAND_RETRY',
      command: {
        _log: command._log,
        error: {
          message: command && command.error ? command.error.message : null,
          isDefaultAssertionErr: command && command.error ? command.error.isDefaultAssertionErr : null
        },
        location: testRunStarted ? 'test' : 'hook'
      }
    },
    options: { log: false }
  });
});

Cypress.on('command:end', (command) => {
  if (!command || !command.attributes) return;
  if (shouldSkipCommand(command)) {
    return;
  }
  eventsQueue.push({
    task: 'test_observability_command',
    data: {
      'type': 'COMMAND_END',
      'command': {
        'attributes': {
          'id': command.attributes.id,
          'name': command.attributes.name,
          'args': command.attributes.args
        },
        'state': command.state,
        finished_at: new Date().toISOString(),
        location: testRunStarted ? 'test' : 'hook'
      }
    },
    options: { log: false }
  });
});

Cypress.on('command:enqueued', (attrs) => {
  if (!Cypress.env('BROWSERSTACK_O11Y_LOGS')) return;
  if (!attrs || attrs.name !== 'log') return;
  const args = attrs.args || [];
  if (args.includes('test_observability_log') || args.includes('test_observability_command')) return;
  const message = args.reduce((result, logItem) => {
    if (typeof logItem === 'object') {
      /* Route through sanitizeForTask so a non-circular serialization failure can never
       * throw out of the command:enqueued handler (same graceful-degradation contract as
       * the flush sites). sanitizeForTask returns a decycled plain object (safe to stringify)
       * or null; on null, contribute nothing for this item rather than crash. */
      const safeLog = sanitizeForTask(logItem);
      return [result, safeLog === null ? '' : JSON.stringify(safeLog)].join(' ');
    }
    return [result, logItem ? logItem.toString() : ''].join(' ');
  }, '');
  eventsQueue.push({
    task: 'test_observability_log',
    data: {
      level: 'info',
      message,
      timestamp: new Date().toISOString()
    },
    options: { log: false }
  });
});

Cypress.Commands.overwrite('log', (originalFn, ...args) => {
  if (args.includes('test_observability_log') || args.includes('test_observability_command')) return;
  originalFn(...args);
});

Cypress.Commands.add('trace', (message, file) => {
  eventsQueue.push({
    task: 'test_observability_log',
    data: {
      level: 'trace',
      message,
      file,
    },
    options: { log: false }
  });
});

Cypress.Commands.add('logDebug', (message, file) => {
  eventsQueue.push({
    task: 'test_observability_log',
    data: {
      level: 'debug',
      message,
      file,
    },
    options: { log: false }
  });
});

Cypress.Commands.add('info', (message, file) => {
  eventsQueue.push({
    task: 'test_observability_log',
    data: {
      level: 'info',
      message,
      file,
    },
    options: { log: false }
  });
});

Cypress.Commands.add('warn', (message, file) => {
  eventsQueue.push({
    task: 'test_observability_log',
    data: {
      level: 'warn',
      message,
      file,
    },
    options: { log: false }
  });
});

Cypress.Commands.add('error', (message, file) => {
  eventsQueue.push({
    task: 'test_observability_log',
    data: {
      level: 'error',
      message,
      file,
    },
    options: { log: false }
  });
});

Cypress.Commands.add('fatal', (message, file) => {
  eventsQueue.push({
    task: 'test_observability_log',
    data: {
      level: 'fatal',
      message,
      file,
    },
    options: { log: false }
  });
});

/*
 * [SDK-7399] Drain eventsQueue without ever being able to fail the customer's suite.
 *
 * These flush sites run inside mocha `beforeEach`/`afterEach`. Up to v1.32.8 the same
 * events were dispatched from `Cypress.on(...)` listeners — i.e. OUTSIDE any mocha hook —
 * and every dispatch was additionally wrapped in `.catch()`, so an instrumentation
 * failure could not affect the run. v1.33.0 moved the dispatch INTO these hooks and
 * dropped all error handling, which makes instrumentation errors fatal to the customer:
 * a throw inside a hook fails that hook, and mocha then SKIPS EVERY REMAINING TEST in
 * the suite. That is the reported symptom — tests reported as skipped that the customer
 * never skipped.
 *
 * Two independent guards are required, because both failure modes were observed:
 *   1. SYNCHRONOUS throw — `cy.task`/`cy.now` can throw straight out of the call
 *      (`TypeError: Cannot read properties of null (reading 'get')` raised inside
 *      Cypress' own `runPrivilegedCommand`). A promise `.catch()` never runs for this,
 *      so a real try/catch is needed.
 *   2. ASYNCHRONOUS rejection — handled by the promise `.catch()`.
 *
 * `cy.now('task', ...)` is used rather than `cy.task(...)`: `cy.task` enqueues a Cypress
 * command, so a failure surfaces later while the queue drains and fails the hook no
 * matter what guard wraps the enqueue call. `cy.now` executes immediately and returns a
 * promise, which is exactly what v1.32.8 did and is therefore containable here.
 */
const flushEventsQueue = () => {
  try {
    const queued = eventsQueue;
    eventsQueue = [];
    queued.forEach(event => {
      try {
        const payload = sanitizeForTask(event.data);
        if (payload === null) return;
        const result = cy.now('task', event.task, payload, event.options);
        if (result && typeof result.catch === 'function') result.catch(() => {});
      } catch (e) {
        /* one bad event must not stop the remaining events, and must not fail the hook */
      }
    });
  } catch (e) {
    /* instrumentation must never break the customer's test run */
    eventsQueue = [];
  }
};

beforeEach(() => {
  /* browserstack internal helper hook */

  if (!Cypress.env('BROWSERSTACK_O11Y_LOGS')) {
    return;
  }

  flushEventsQueue();
  testRunStarted = true;
});

afterEach(function() {
  /* browserstack internal helper hook */
  if (!Cypress.env('BROWSERSTACK_O11Y_LOGS')) {
    return;
  }

  flushEventsQueue();
  testRunStarted = false;
});
