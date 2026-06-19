'use strict';
const chai = require('chai');
const expect = chai.expect;

// SDK-6463 regression test for the accessibility Cypress plugin's afterEach hook.
// A hung/slow accessibility scan or results-save must NOT fail the afterEach hook,
// because a failing afterEach makes Cypress skip all remaining tests in the spec
// (they surface as "skipped"). The two cy.wrap(..., {timeout: 30000}) chains must
// tolerate a timeout (catch + log) instead of letting it bubble up.

const PLUGIN_PATH = require.resolve('../../../../../bin/accessibility-automation/cypress/index.js');
const WRAP_TIMEOUT_SIM_MS = 20; // stand-in for the real 30000ms so the test runs fast

// chainable that mimics Cypress command chaining (.then unwraps nested chainables)
function chain(promise) {
  return {
    _promise: promise,
    then(onF, onR) {
      return chain(promise.then(
        (v) => { const r = onF ? onF(v) : v; return (r && r._promise) ? r._promise : r; },
        onR
      ));
    },
    catch(onR) { return chain(promise.catch(onR)); },
    performScan() { return this; },
    performScanSubjectQuery() { return this; },
  };
}

// fake window. mode: 'hang' (scan never finishes), 'scanOnly' (scan ok, save hangs), 'ok'
function makeWin(mode) {
  const listeners = {};
  const echo = { A11Y_SCAN: 'A11Y_SCAN_FINISHED', A11Y_SAVE_RESULTS: 'A11Y_RESULTS_SAVED' };
  return {
    location: { protocol: 'http:' },
    document: { querySelector: () => ({ id: 'accessibility-automation-element' }) },
    addEventListener(type, cb) { (listeners[type] = listeners[type] || []).push(cb); },
    removeEventListener(type, cb) { listeners[type] = (listeners[type] || []).filter((f) => f !== cb); },
    dispatchEvent(e) {
      const done = echo[e.type];
      const shouldEcho = mode === 'ok' || (mode === 'scanOnly' && e.type === 'A11Y_SCAN');
      if (shouldEcho && done) (listeners[done] || []).forEach((cb) => cb({ detail: {} }));
      return true;
    },
  };
}

describe('accessibility-automation/cypress afterEach (SDK-6463)', () => {
  let capturedAfterEach;
  let theWin;
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason && reason.message ? reason.message : String(reason));

  before(() => {
    process.on('unhandledRejection', onUnhandled);

    global.CustomEvent = class CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
    global.window = { location: { protocol: 'http:' } };
    global.Cypress = {
      env: (k) => ({
        BROWSERSTACK_LOGS: false,
        IS_ACCESSIBILITY_EXTENSION_LOADED: 'true',
        ACCESSIBILITY_EXTENSION_PATH: '/some/ext/path',
        OS: 'win',
      })[k],
      browser: { isHeaded: true },
      platform: 'linux',
      Commands: { add() {}, overwrite() {}, addQuery() {} },
      on() {},
      mocha: { getRunner: () => ({ suite: { ctx: { currentTest: { title: 'TC landing', invocationDetails: { relativeFile: 'src/e2e/landing.cy.ts' } } } } }) },
    };
    global.cy = {
      state: () => null,
      wrap: (value, opts) => {
        if (value && typeof value.then === 'function') {
          const realTimeout = (opts && opts.timeout) || 0;
          const waitMs = realTimeout ? Math.min(realTimeout, WRAP_TIMEOUT_SIM_MS) : WRAP_TIMEOUT_SIM_MS;
          const timed = new Promise((resolve, reject) => {
            let done = false;
            value.then((v) => { if (!done) { done = true; resolve(v); } }, (e) => { if (!done) { done = true; reject(e); } });
            setTimeout(() => { if (!done) { done = true; reject(new Error(`cy.wrap() timed out waiting ${realTimeout}ms to complete.`)); } }, waitMs);
          });
          return chain(timed);
        }
        return chain(Promise.resolve(value));
      },
      window: () => chain(Promise.resolve(theWin)),
      task: () => chain(Promise.resolve({ testRunUuid: 'uuid-123' })),
      on() {},
    };

    // Temporarily capture the plugin's global afterEach registration without
    // registering it as a real mocha hook, then restore mocha's own globals.
    const realAfterEach = global.afterEach;
    const realBefore = global.before;
    const realBeforeEach = global.beforeEach;
    global.afterEach = (fn) => { capturedAfterEach = fn; };
    global.before = () => {};
    global.beforeEach = () => {};
    try {
      delete require.cache[PLUGIN_PATH];
      require(PLUGIN_PATH);
    } finally {
      global.afterEach = realAfterEach;
      global.before = realBefore;
      global.beforeEach = realBeforeEach;
    }
  });

  after(() => {
    process.removeListener('unhandledRejection', onUnhandled);
    delete global.Cypress; delete global.cy; delete global.window; delete global.CustomEvent;
  });

  function runHook(mode) {
    unhandled.length = 0;
    theWin = makeWin(mode);
    capturedAfterEach(); // invoke the real hook callback (fire-and-forget, as Cypress does)
    return new Promise((r) => setTimeout(r, WRAP_TIMEOUT_SIM_MS + 100)).then(() =>
      unhandled.filter((m) => /cy\.wrap\(\) timed out/.test(m)));
  }

  it('captures the real afterEach hook from the plugin', () => {
    expect(capturedAfterEach).to.be.a('function');
  });

  it('does not fail the hook when the accessibility scan never finishes', async () => {
    const timeouts = await runHook('hang');
    expect(timeouts, 'an uncaught cy.wrap timeout would fail the hook and skip remaining tests').to.have.length(0);
  });

  it('does not fail the hook when saving results never finishes', async () => {
    const timeouts = await runHook('scanOnly');
    expect(timeouts).to.have.length(0);
  });

  it('completes normally on the happy path', async () => {
    const timeouts = await runHook('ok');
    expect(timeouts).to.have.length(0);
  });
});
