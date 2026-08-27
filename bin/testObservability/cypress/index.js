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
  /* test_observability_batch must be filtered here too, or each batch dispatch would
   * itself be captured as a command event and refill the queue. [SDK-7399] */
  return command.attributes.name == 'log' || (command.attributes.name == 'task' && (['test_observability_platform_details', 'test_observability_step', 'test_observability_command', 'test_observability_batch', 'browserstack_log', 'test_observability_log'].some(event => command.attributes.args.includes(event))));
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

/* console.warn, not browserStackLog/cy.task — routing a diagnostic through another
 * Cypress command would reintroduce the failure this boundary contains. [SDK-7399] */
const warnFlushFailure = (stage, err) => {
  try {
    console.warn(`BrowserStack Test Observability: suppressed ${stage} error, event(s) dropped: ${err && err.message ? err.message : err}`);
  } catch (e) { /* logging must never throw either */ }
};

/*
 * [SDK-7399] Send the whole drain as ONE cy.task instead of one cy.task per event.
 *
 * Each cy.task round-trip costs roughly 0.8s on a remote terminal. Measured there, with
 * N events queued per afterEach: N=10 -> 114s, N=100 -> 581s, N=1000 -> the session was
 * killed. A command-heavy test queues hundreds of events, so the old per-event flush ran
 * for minutes inside the hook, the spec exceeded spec_timeout, and every test that had not
 * run yet was reported as SKIPPED. Nothing throws in that failure — build-info on a
 * reproducing build shows failed:0 with the sessions killed at the timeout. Locally the
 * same dispatch is effectively free, which is why local runs never reproduced it.
 *
 * Batching is what fixes it: the same 600 events sent as one call took 109s versus 581s.
 *
 * Dispatch deliberately stays on cy.task. cy.now('task', ...) throws on Cypress 14 in
 * every context — test body, hook and listener — so using it stops the skipping only by
 * never delivering anything, which silently empties the dashboard.
 *
 * The try/catch here is a backstop for anything raised synchronously while building or
 * enqueuing. It cannot catch a cy.task failure, which surfaces later while the command
 * queue drains — hence fixing the cost rather than trying to contain the symptom.
 */

/* Split each batch under the ~1MB per-cy.task ceiling measured on a remote terminal
 * (768KB succeeds, 1MB fails), so a large flush is split rather than lost. */
const MAX_BATCH_CHARS = 512 * 1024;

const flushEventsQueue = () => {
  try {
    const queued = eventsQueue;
    eventsQueue = []; /* cleared before dispatch so a throw cannot replay these events */
    if (queued.length === 0) return;

    let batch = [];
    let batchChars = 0;

    const sendBatch = () => {
      if (batch.length === 0) return;
      const toSend = batch;
      batch = [];
      batchChars = 0;
      try {
        cy.task('test_observability_batch', toSend, { log: false });
      } catch (e) {
        warnFlushFailure(`batch dispatch of ${toSend.length} event(s)`, e);
      }
    };

    queued.forEach(event => {
      try {
        const payload = sanitizeForTask(event.data);
        if (payload === null) {
          warnFlushFailure(`unserializable payload for '${event.task}'`,
            new Error('event skipped'));
          return;
        }
        const size = JSON.stringify(payload).length;
        if (size > MAX_BATCH_CHARS) {
          /* A single event this large cannot be sent under the ~1MB per-cy.task ceiling
           * measured on a remote terminal (768KB passes, 1MB fails). Dropping it is not a
           * fidelity regression: before batching it was dispatched alone and would have
           * failed the command anyway. Nothing smaller is altered or truncated. */
          warnFlushFailure(`event too large to send for '${event.task}' (${size} chars)`,
            new Error('event skipped'));
          return;
        }
        if (batchChars + size > MAX_BATCH_CHARS) sendBatch();
        batch.push({ task: event.task, data: payload });
        batchChars += size;
      } catch (e) {
        warnFlushFailure(`preparing '${event.task}'`, e); /* skip one event, not the rest */
      }
    });

    sendBatch();
  } catch (e) {
    warnFlushFailure('queue flush', e);
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
