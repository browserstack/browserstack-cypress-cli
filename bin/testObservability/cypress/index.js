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
  /* the batch task is filtered too, else each dispatch refills the queue */
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

/* console.warn, not cy.task — a diagnostic must not use the mechanism it reports on */
const warnFlushFailure = (stage, err) => {
  try {
    console.warn(`BrowserStack Test Observability: suppressed ${stage} error, event(s) dropped: ${err && err.message ? err.message : err}`);
  } catch (e) { /* logging must never throw either */ }
};

/*
 * [SDK-7399] One cy.task per drain, not per event. Each round-trip costs ~0.8s on a
 * remote terminal, so a command-heavy spec spent minutes in afterEach, exceeded
 * spec_timeout and was killed — unrun tests then reported as skipped, with nothing
 * thrown. 600 events: 581s as 600 calls, 109s as one.
 * Stays on cy.task: cy.now('task') throws on Cypress 14, so it would "fix" this by
 * delivering nothing. The try/catch is only a backstop for synchronous throws — a
 * cy.task failure surfaces later, while the command queue drains.
 */

/* Remote terminal: a single cy.task payload of 768KB succeeds, 1MB fails.
 * Split well under that; drop only what cannot be sent at all. The two must stay
 * distinct — an event between them still sends on its own. */
const MAX_BATCH_CHARS = 512 * 1024;
const MAX_EVENT_CHARS = 768 * 1024;

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
        /* every push site uses { log: false }, so per-event options are not forwarded */
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
        if (size > MAX_EVENT_CHARS) {
          /* unsendable at any size; the per-event flush could not deliver it either */
          warnFlushFailure(`event too large to send for '${event.task}' (${size} chars)`,
            new Error('event skipped'));
          return;
        }
        /* oversized-but-sendable: let it travel alone */
        if (batch.length > 0 && batchChars + size > MAX_BATCH_CHARS) sendBatch();
        batch.push({ task: event.task, data: payload });
        batchChars += size;
        if (batchChars >= MAX_BATCH_CHARS) sendBatch();
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
