'use strict';
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const helper = require('../../../../bin/testObservability/helper/helper');

const ENV_KEYS = [
  'BROWSERSTACK_TEST_OBSERVABILITY',
  'BS_TESTOPS_BUILD_COMPLETED',
  'BS_TESTOPS_JWT',
  'BS_TESTOPS_BUILD_HASHED_ID',
  'BROWSERSTACK_TESTHUB_UUID',
  'BROWSERSTACK_TESTHUB_JWT',
];

describe('TestHub build stop', () => {
  let savedEnv, nodeRequest;

  beforeEach(() => {
    savedEnv = {};
    ENV_KEYS.forEach((k) => { savedEnv[k] = process.env[k]; delete process.env[k]; });
    helper.buildStopped = false;
    nodeRequest = sinon.stub(helper, 'nodeRequest').resolves({ data: {} });
  });

  afterEach(() => {
    sinon.restore();
    ENV_KEYS.forEach((k) => {
      if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k];
    });
    helper.buildStopped = false;
  });

  const stopCall = () => nodeRequest.getCalls().find((c) => c.args[0] === 'PUT');

  it('stops an accessibility-only TestHub build when observability is off', async () => {
    process.env.BROWSERSTACK_TEST_OBSERVABILITY = 'false';
    process.env.BS_TESTOPS_BUILD_COMPLETED = 'false';
    process.env.BS_TESTOPS_JWT = 'null';
    process.env.BS_TESTOPS_BUILD_HASHED_ID = 'null';
    process.env.BROWSERSTACK_TESTHUB_UUID = 'th-build-uuid';
    process.env.BROWSERSTACK_TESTHUB_JWT = 'th-jwt';

    await helper.printBuildLink(true);

    const call = stopCall();
    expect(call, 'PUT stop request').to.exist;
    expect(call.args[1]).to.equal('api/v1/builds/th-build-uuid/stop');
    expect(call.args[3].headers.Authorization).to.equal('Bearer th-jwt');
  });

  it('keeps using the observability token and build id when observability launched the build', async () => {
    process.env.BROWSERSTACK_TEST_OBSERVABILITY = 'true';
    process.env.BS_TESTOPS_BUILD_COMPLETED = 'true';
    process.env.BS_TESTOPS_JWT = 'o11y-jwt';
    process.env.BS_TESTOPS_BUILD_HASHED_ID = 'o11y-build';
    process.env.BROWSERSTACK_TESTHUB_UUID = 'o11y-build';
    process.env.BROWSERSTACK_TESTHUB_JWT = 'o11y-jwt';

    await helper.printBuildLink(true);

    const call = stopCall();
    expect(call.args[1]).to.equal('api/v1/builds/o11y-build/stop');
    expect(call.args[3].headers.Authorization).to.equal('Bearer o11y-jwt');
  });

  it('sends no stop when no TestHub build was launched', async () => {
    process.env.BROWSERSTACK_TEST_OBSERVABILITY = 'false';
    process.env.BROWSERSTACK_TESTHUB_UUID = 'null';
    process.env.BROWSERSTACK_TESTHUB_JWT = 'null';

    await helper.printBuildLink(true);

    expect(stopCall()).to.be.undefined;
  });

  it('sends the stop only once across repeated calls', async () => {
    process.env.BROWSERSTACK_TEST_OBSERVABILITY = 'false';
    process.env.BROWSERSTACK_TESTHUB_UUID = 'th-build-uuid';
    process.env.BROWSERSTACK_TESTHUB_JWT = 'th-jwt';

    await helper.printBuildLink(true);
    await helper.printBuildLink(true);

    expect(nodeRequest.getCalls().filter((c) => c.args[0] === 'PUT')).to.have.length(1);
  });
});
