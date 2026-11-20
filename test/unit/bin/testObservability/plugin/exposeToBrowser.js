'use strict';
const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

// APS-22894: Cypress 16 removed Cypress.env() from the browser, so every value the
// support file reads must also be written to config.expose (Cypress.expose()).
describe('testObservability plugin exposes browser values', () => {
  const load = () => proxyquire('../../../../../bin/testObservability/plugin/index.js', {
    'node-ipc': { of: {} },
    './ipcClient': { connectIPCClient: sinon.stub() },
  });

  it('writes BROWSERSTACK_O11Y_LOGS to both config.env and config.expose', () => {
    const plugin = load();
    const config = { env: {} };
    plugin(sinon.stub(), config, {});
    expect(config.env.BROWSERSTACK_O11Y_LOGS).to.eql('true');
    expect(config.expose.BROWSERSTACK_O11Y_LOGS).to.eql('true');
  });

  it('creates config.expose when the project config has none', () => {
    const plugin = load();
    const config = { env: {} };
    plugin(sinon.stub(), config, {});
    expect(config.expose).to.be.an('object');
  });

  it('keeps values a customer already exposed', () => {
    const plugin = load();
    const config = { env: {}, expose: { CUSTOMER_FLAG: '1' } };
    plugin(sinon.stub(), config, {});
    expect(config.expose.CUSTOMER_FLAG).to.eql('1');
    expect(config.expose.BROWSERSTACK_O11Y_LOGS).to.eql('true');
  });
});
