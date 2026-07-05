'use strict';
const chai = require('chai');
const expect = chai.expect;

// SDK-6463 regression guard for the accessibility Cypress plugin's afterEach hook.
//
// IMPORTANT: this is a fast, cheap guard — the authoritative proof runs REAL Cypress
// (see the repro under scripts/ / the PR description). Two things it guards:
//  1. The hook must NOT call `.catch` on a Cypress chain. Cypress `Chainable` has no
//     `.catch` (commands are not promises), so doing so throws synchronously and fails
//     the hook. The mock `chain` below intentionally has NO `.catch`, so re-introducing
//     `cy.wrap(...).then(...).catch(...)` makes invoking the hook throw -> test fails.
//  2. performScan / saveTestResults must ALWAYS settle (never hang, never reject), even
//     when the scanner never responds or the window is cross-origin — otherwise cy.wrap's
//     timeout fails the hook and Cypress skips the rest of the spec.

const PLUGIN_PATH = require.resolve('../../../../../bin/accessibility-automation/cypress/index.js');

// Cypress Chainable mock — deliberately has `then` but NO `catch` (matches real Cypress).
function chain(promise) {
  return {
    _promise: promise,
    then(onF, onR) {
      return chain(promise.then(
        (v) => { const r = onF ? onF(v) : v; return (r && r._promise) ? r._promise : r; },
        onR
      ));
    },
    // NOTE: no `catch` — real Cypress Chainable has none.
    performScan() { return this; },
    performScanSubjectQuery() { return this; },
  };
}

// mode: 'hang' (scanner never echoes), 'crossorigin' (win access throws), 'ok'
function makeWin(mode) {
  const listeners = {};
  const echo = { A11Y_SCAN: 'A11Y_SCAN_FINISHED', A11Y_SAVE_RESULTS: 'A11Y_RESULTS_SAVED' };
  const guard = () => { if (mode === 'crossorigin') throw new Error("Blocked a frame with origin from accessing a cross-origin frame."); };
  return {
    dispatched: [], // records every event type dispatched at the page (A11Y_SCAN, ...)
    get location() { guard(); return { protocol: 'http:' }; },
    get document() { guard(); return { querySelector: () => ({ id: 'accessibility-automation-element' }) }; },
    addEventListener(type, cb) { (listeners[type] = listeners[type] || []).push(cb); },
    removeEventListener(type, cb) { listeners[type] = (listeners[type] || []).filter((f) => f !== cb); },
    dispatchEvent(e) {
      this.dispatched.push(e.type);
      const done = echo[e.type];
      if (mode === 'ok' && done) (listeners[done] || []).forEach((cb) => cb({ detail: {} }));
      return true; // 'hang' echoes nothing -> relies on the internal always-settle timer
    },
  };
}

describe('accessibility-automation/cypress afterEach (SDK-6463)', () => {
  let capturedAfterEach;
  let theWin;
  const unhandled = [];
  const failHandlers = [];
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
        ACCESSIBILITY_SCAN_TIMEOUT: 60, // keep the always-settle timer fast for the test
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
      // Real cy.wrap resolves when the wrapped promise resolves; our fixed promises always resolve.
      wrap: (value) => chain((value && typeof value.then === 'function') ? value : Promise.resolve(value)),
      window: () => chain(Promise.resolve(theWin)),
      task: () => chain(Promise.resolve({ testRunUuid: 'uuid-123' })),
      // capture per-test fail listeners the hook registers (cy.on('fail', ...))
      on(evt, fn) { if (evt === 'fail') failHandlers.push(fn); },
    };

    const realAfterEach = global.afterEach, realBefore = global.before, realBeforeEach = global.beforeEach;
    global.afterEach = (fn) => { capturedAfterEach = fn; };
    global.before = () => {}; global.beforeEach = () => {};
    try {
      delete require.cache[PLUGIN_PATH];
      require(PLUGIN_PATH);
    } finally {
      global.afterEach = realAfterEach; global.before = realBefore; global.beforeEach = realBeforeEach;
    }
  });

  after(() => {
    process.removeListener('unhandledRejection', onUnhandled);
    delete global.Cypress; delete global.cy; delete global.window; delete global.CustomEvent;
  });

  function runHook(mode) {
    unhandled.length = 0;
    theWin = makeWin(mode);
    // Must NOT throw synchronously (guards against `.catch` on a cy chain being re-introduced).
    expect(() => capturedAfterEach(), 'afterEach hook threw synchronously').to.not.throw();
    return new Promise((r) => setTimeout(r, 300)).then(() => unhandled.slice());
  }

  it('captures the real afterEach hook from the plugin', () => {
    expect(capturedAfterEach).to.be.a('function');
  });

  it('does not throw or leave unhandled rejections when the scan never finishes', async () => {
    const rej = await runHook('hang');
    expect(rej, 'unhandled rejection would fail the hook').to.have.length(0);
  });

  it('does not throw or reject when the window is cross-origin (SSO redirect)', async () => {
    const rej = await runHook('crossorigin');
    expect(rej).to.have.length(0);
  });

  it('completes cleanly on the happy path', async () => {
    const rej = await runHook('ok');
    expect(rej).to.have.length(0);
  });

  // SDK-6463 hardening: any failure raised by the hook's own commands (cy.window on a
  // cross-origin page, an unregistered cy.task, ...) must be suppressed via the per-test
  // 'fail' listener so it cannot fail the user's test or abort the spec.
  it('registers a per-test fail listener that suppresses hook failures (returns false)', async () => {
    failHandlers.length = 0;
    await runHook('ok');
    expect(failHandlers.length, 'afterEach must register a cy.on("fail") guard').to.be.at.least(1);
    const result = failHandlers[0](new Error("The task 'get_test_run_uuid' was not handled"));
    expect(result, 'fail handler must return false to suppress the failure').to.equal(false);
  });

  // SDK-6463 hardening: after repeated scan/save timeouts, the circuit opens and the
  // plugin stops dispatching A11Y_SCAN entirely so later tests are not stalled.
  it('opens the circuit after repeated timeouts and stops dispatching scans', async () => {
    // happy path above reset the consecutive-timeout counter; two hang runs produce
    // 3 timeouts (scan+save, then scan) which reaches the default circuit limit of 3.
    await runHook('hang');
    await runHook('hang');
    const rej = await runHook('hang'); // circuit open: must not dispatch, must not stall
    expect(rej).to.have.length(0);
    expect(theWin.dispatched, 'no A11Y_SCAN once the circuit is open').to.not.include('A11Y_SCAN');
  });
});
