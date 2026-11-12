const { expect } = require('chai');

const { getEnvironment, getEnvironmentUrl } = require('../../../../bin/helpers/environmentUrl');

describe('environmentUrl (BROWSERSTACK_ENV)', () => {
  const original = process.env.BROWSERSTACK_ENV;
  afterEach(() => {
    if (original === undefined) delete process.env.BROWSERSTACK_ENV;
    else process.env.BROWSERSTACK_ENV = original;
  });

  it('leaves every url unchanged when unset', () => {
    delete process.env.BROWSERSTACK_ENV;
    expect(getEnvironment()).to.equal(undefined);
    expect(getEnvironmentUrl('https://api.browserstack.com')).to.equal('https://api.browserstack.com');
  });

  it('leaves urls unchanged for an unknown value', () => {
    process.env.BROWSERSTACK_ENV = 'production';
    expect(getEnvironment()).to.equal(undefined);
    expect(getEnvironmentUrl('https://accessibility.browserstack.com/api')).to.equal('https://accessibility.browserstack.com/api');
  });

  it('maps every preprod host the cli uses, keeping paths', () => {
    process.env.BROWSERSTACK_ENV = 'Preprod';
    expect(getEnvironmentUrl('https://api.browserstack.com')).to.equal('https://api-preprod.bsstag.com');
    expect(getEnvironmentUrl('https://api-cloud.browserstack.com/automate-frameworks/cypress/upload'))
      .to.equal('https://api-cloud-preprod.bsstag.com/automate-frameworks/cypress/upload');
    expect(getEnvironmentUrl('https://automate.browserstack.com/dashboard/v2/builds/'))
      .to.equal('https://automate-preprod.bsstag.com/dashboard/v2/builds/');
    expect(getEnvironmentUrl('https://automation.browserstack.com')).to.equal('https://automation-preprod.bsstag.com');
    expect(getEnvironmentUrl('https://collector-observability.browserstack.com'))
      .to.equal('https://collector-observability-preprod.bsstag.com');
    expect(getEnvironmentUrl('https://accessibility.browserstack.com/api')).to.equal('https://accessibility-preprod.bsstag.com/api');
  });

  it('accepts pre-prod and maps staging', () => {
    process.env.BROWSERSTACK_ENV = 'pre-prod';
    expect(getEnvironment()).to.equal('preprod');
    process.env.BROWSERSTACK_ENV = 'stag';
    expect(getEnvironmentUrl('https://api.browserstack.com')).to.equal('https://apidevtestops.bsstag.com');
  });

  it('matches whole hosts only', () => {
    process.env.BROWSERSTACK_ENV = 'preprod';
    expect(getEnvironmentUrl('https://app-automate.browserstack.com/x')).to.equal('https://app-automate.browserstack.com/x');
    expect(getEnvironmentUrl('https://eds.browserstack.com:443/send_event_cy_internal'))
      .to.equal('https://eds.browserstack.com:443/send_event_cy_internal');
    expect(getEnvironmentUrl('not a url')).to.equal('not a url');
  });

  it('feeds the observability collector default, while an explicit override still wins', () => {
    const { apiUrl } = require('../../../../bin/testObservability/helper/constants');
    const savedOverride = process.env.BROWSERSTACK_TEST_OBSERVABILITY_API_URL;
    delete process.env.BROWSERSTACK_TEST_OBSERVABILITY_API_URL;
    try {
      process.env.BROWSERSTACK_ENV = 'preprod';
      expect(apiUrl()).to.equal('https://collector-observability-preprod.bsstag.com');
      process.env.BROWSERSTACK_TEST_OBSERVABILITY_API_URL = 'https://collector.example.test';
      expect(apiUrl()).to.equal('https://collector.example.test');
    } finally {
      if (savedOverride === undefined) delete process.env.BROWSERSTACK_TEST_OBSERVABILITY_API_URL;
      else process.env.BROWSERSTACK_TEST_OBSERVABILITY_API_URL = savedOverride;
    }
  });
});
