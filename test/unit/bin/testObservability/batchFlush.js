'use strict';
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

// Regression guard for SDK-7399. The flush used to issue one cy.task per queued event,
// and each round-trip costs ~0.8s on a remote terminal, so a command-heavy spec spent
// minutes in afterEach, exceeded spec_timeout and was killed — every test that had not
// run yet was then reported as skipped. Nothing threw, so a passing spec alone cannot
// distinguish "delivered" from "silently dropped"; these tests pin the fan-out instead.
describe('SDK-7399 batched observability flush', () => {
  let emit, ipcStub, tasks, plugin;

  beforeEach(() => {
    emit = sinon.stub();
    ipcStub = { of: { browserstackTestObservability: { emit } } };
    plugin = proxyquire('../../../../bin/testObservability/plugin', {
      'node-ipc': ipcStub,
      './ipcClient': { connectIPCClient: () => {} },
    });
    tasks = null;
    const on = (name, handlers) => { if (name === 'task') tasks = handlers; };
    plugin(on, { env: {} });
  });

  afterEach(() => sinon.restore());

  it('registers the batch task alongside the per-event tasks', () => {
    expect(tasks).to.have.property('test_observability_batch');
    // per-event tasks must stay registered: an older browser bundle may still call them
    expect(tasks).to.have.property('test_observability_log');
    expect(tasks).to.have.property('test_observability_command');
    expect(tasks).to.have.property('test_observability_platform_details');
    expect(tasks).to.have.property('test_observability_step');
  });

  it('fans every queued task type out to its own IPC event, in order', () => {
    tasks.test_observability_batch([
      { task: 'test_observability_log', data: { m: 1 } },
      { task: 'test_observability_command', data: { m: 2 } },
      { task: 'test_observability_platform_details', data: { m: 3 } },
      { task: 'test_observability_step', data: { m: 4 } },
    ]);

    expect(emit.callCount).to.equal(4);
    expect(emit.getCalls().map(c => c.args[1].m)).to.deep.equal([1, 2, 3, 4]);
    // four distinct IPC events, i.e. no type collapsed onto another
    expect(new Set(emit.getCalls().map(c => c.args[0])).size).to.equal(4);
  });

  it('emits one IPC event per entry for a large batch', () => {
    const batch = [];
    for (let i = 0; i < 600; i++) {
      batch.push({ task: 'test_observability_log', data: { i } });
    }
    tasks.test_observability_batch(batch);
    expect(emit.callCount).to.equal(600);
  });

  it('skips an unknown task name but still delivers the rest of the batch', () => {
    tasks.test_observability_batch([
      { task: 'not_a_real_task', data: { m: 'x' } },
      { task: 'test_observability_log', data: { m: 'kept' } },
    ]);
    expect(emit.callCount).to.equal(1);
    expect(emit.firstCall.args[1].m).to.equal('kept');
  });

  it('never throws on malformed input', () => {
    expect(() => tasks.test_observability_batch(undefined)).to.not.throw();
    expect(() => tasks.test_observability_batch({})).to.not.throw();
    expect(() => tasks.test_observability_batch([null, undefined, 1, 'x'])).to.not.throw();
    expect(emit.callCount).to.equal(0);
  });

  it('one failing emit does not drop the remaining entries', () => {
    emit.onFirstCall().throws(new Error('ipc down'));
    tasks.test_observability_batch([
      { task: 'test_observability_log', data: { m: 1 } },
      { task: 'test_observability_log', data: { m: 2 } },
    ]);
    expect(emit.callCount).to.equal(2);
  });
});
