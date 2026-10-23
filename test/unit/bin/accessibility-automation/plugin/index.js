'use strict';
const { expect } = require('chai');
const sinon = require('sinon');

// APS-22894: Cypress 16 removed Cypress.env() from the browser, so every value the
// accessibility support file reads must also be written to config.expose.
describe('accessibility plugin exposes browser values', () => {
  const KEYS = [
    'ACCESSIBILITY_EXTENSION_PATH', 'OS_VERSION', 'OS', 'BROWSERSTACK_TESTHUB_UUID',
    'BROWSERSTACK_TESTHUB_JWT', 'BROWSERSTACK_TESTHUB_API_PORT', 'REPORTER_API_PORT_NO',
    'IS_ACCESSIBILITY_EXTENSION_LOADED', 'INCLUDE_TAGS_FOR_ACCESSIBILITY', 'EXCLUDE_TAGS_FOR_ACCESSIBILITY',
  ];
  const saved = {};
  const ENV = {
    ACCESSIBILITY_EXTENSION_PATH: '/tmp/a11y-ext', OS_VERSION: '11', OS: 'Windows',
    BROWSERSTACK_TESTHUB_UUID: 'uuid-1', BROWSERSTACK_TESTHUB_JWT: 'jwt-1',
    BROWSERSTACK_TESTHUB_API_PORT: '4567', REPORTER_API_PORT_NO: '4568',
    ACCESSIBILITY_INCLUDETAGSINTESTINGSCOPE: 'a;b', ACCESSIBILITY_EXCLUDETAGSINTESTINGSCOPE: 'c',
    BROWSERSTACK_ACCESSIBILITY_DEBUG: 'true',
  };

  beforeEach(() => {
    Object.keys(ENV).forEach((k) => { saved[k] = process.env[k]; process.env[k] = ENV[k]; });
  });
  afterEach(() => {
    Object.keys(ENV).forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
  });

  const run = (config) => {
    const plugin = require('../../../../../bin/accessibility-automation/plugin/index.js');
    return plugin(sinon.stub(), config);
  };

  it('mirrors every browser-read value into config.expose', () => {
    const config = run({ env: {} });
    KEYS.forEach((key) => {
      expect(config.env, key).to.have.property(key);
      expect(config.expose[key], key).to.eql(config.env[key]);
    });
    expect(config.expose.ACCESSIBILITY_EXTENSION_PATH).to.eql('/tmp/a11y-ext');
    expect(config.expose.INCLUDE_TAGS_FOR_ACCESSIBILITY).to.eql('a;b');
    expect(config.expose.IS_ACCESSIBILITY_EXTENSION_LOADED).to.eql('true');
  });

  it('exposes BROWSERSTACK_LOGS when accessibility debug is on', () => {
    const config = run({ env: {} });
    expect(config.env.BROWSERSTACK_LOGS).to.eql('true');
    expect(config.expose.BROWSERSTACK_LOGS).to.eql('true');
  });
});
