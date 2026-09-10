'use strict';
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

// Guards the threshold arithmetic in bin/testObservability/cypress/index.js.
// SDK-7399 review finding: the batch-split figure (512KB) had been reused as the
// single-event drop ceiling, so events in the 512-768KB band — which a single cy.task
// was measured to carry — were silently discarded. These cases pin the split, the
// oversized-but-sendable path, and the drop boundary.
describe('SDK-7399 flush thresholds', () => {
  const KB = 1024;
  let taskSpy, afterEachCb, commandStartCb;

  // The browser-side file registers listeners and hooks at require time, so the Cypress
  // globals have to exist first. Capture the pieces the flush needs.
  const loadBrowserSide = () => {
    const listeners = {};
    taskSpy = sinon.stub().returns(undefined);

    global.cy = { task: taskSpy, now: sinon.stub() };
    global.Cypress = {
      on: (evt, cb) => { listeners[evt] = cb; },
      env: (k) => (k === 'BROWSERSTACK_O11Y_LOGS' ? 'true' : undefined),
      Commands: { add: () => {}, overwrite: () => {} },
      browser: { name: 'chrome', majorVersion: '136' },
      platform: 'win32',
      version: '14.3.3',
      mocha: { getRunner: () => ({ suite: { ctx: { currentTest: { title: 't' } } } }) },
    };
    global.beforeEach = () => {};
    global.afterEach = (cb) => { afterEachCb = cb; };

    delete require.cache[require.resolve('../../../../bin/testObservability/cypress')];
    require('../../../../bin/testObservability/cypress');
    commandStartCb = listeners['command:start'];
  };

  // One queued event whose serialized payload is ~sizeKB, via a command arg.
  const queueEventOfSize = (sizeKB) => {
    commandStartCb({ attributes: { id: 'c1', name: 'type', args: ['x'.repeat(sizeKB * KB)] } });
  };

  beforeEach(loadBrowserSide);

  afterEach(() => {
    sinon.restore();
    delete global.cy; delete global.Cypress;
    delete global.beforeEach; delete global.afterEach;
  });

  const batchesSent = () =>
    taskSpy.getCalls()
      .filter(c => c.args[0] === 'test_observability_batch')
      .map(c => c.args[1]);

  it('sends small events together in a single batch', () => {
    queueEventOfSize(1);
    queueEventOfSize(1);
    afterEachCb();

    const batches = batchesSent();
    expect(batches.length).to.equal(1);
    expect(batches[0].length).to.be.greaterThan(1);
  });

  it('dispatches a 600KB event alone rather than dropping it (the regression)', () => {
    // command:start queues two events: the command itself, plus small platform details —
    // so the big one is expected in a batch of its own, with the small one following.
    queueEventOfSize(600);
    afterEachCb();

    const batches = batchesSent();
    const carrying = batches.filter(b =>
      b.some(e => JSON.stringify(e.data).length > 512 * KB));
    expect(carrying.length, 'the 512-768KB band must still be delivered').to.equal(1);
    expect(carrying[0].length, 'oversized-but-sendable event travels alone').to.equal(1);
  });

  it('keeps a 600KB event out of the batch holding the small ones', () => {
    queueEventOfSize(1);
    queueEventOfSize(600);
    afterEachCb();

    const batches = batchesSent();
    expect(batches.length).to.be.greaterThan(1);
    batches.forEach(b => {
      const chars = b.reduce((n, e) => n + JSON.stringify(e.data).length, 0);
      // a multi-event batch stays under the split figure; a lone event may exceed it
      if (b.length > 1) expect(chars).to.be.at.most(512 * KB);
    });
  });

  it('skips an event past the largest measured-safe size', () => {
    queueEventOfSize(900);
    afterEachCb();

    batchesSent().forEach(b => {
      b.forEach(e => {
        expect(JSON.stringify(e.data).length).to.be.at.most(768 * KB);
      });
    });
  });

  it('never assembles a multi-event batch beyond the split figure', () => {
    for (let i = 0; i < 12; i++) queueEventOfSize(64);
    afterEachCb();

    batchesSent().forEach(b => {
      if (b.length > 1) {
        const chars = b.reduce((n, e) => n + JSON.stringify(e.data).length, 0);
        expect(chars).to.be.at.most(512 * KB);
      }
    });
  });

  it('sends nothing when the queue is empty', () => {
    afterEachCb();
    expect(batchesSent().length).to.equal(0);
  });
});
