'use strict';
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noPreserveCache();

const CONSTANTS_PATH = require.resolve('../../../../bin/testObservability/helper/constants');
const API_URL_ENV = 'BROWSERSTACK_TEST_OBSERVABILITY_API_URL';
const DEFAULT_API_URL = 'https://collector-observability.browserstack.com';

// A11Y-13909: the reporter runs on the BrowserStack machine from its own install of this package,
// so the collector it posts to has to come from the environment the launching cli forwards. These
// pin the request destination itself, not just the forwarding done by setSystemEnvs.
describe('observability collector url', () => {
  let savedApiUrl, cachedConstants;

  beforeEach(() => {
    savedApiUrl = process.env[API_URL_ENV];
    delete process.env[API_URL_ENV];
    // constants.js reads the override at load, so it must be re-evaluated per case.
    cachedConstants = require.cache[CONSTANTS_PATH];
    delete require.cache[CONSTANTS_PATH];
  });

  afterEach(() => {
    if (savedApiUrl === undefined) {
      delete process.env[API_URL_ENV];
    } else {
      process.env[API_URL_ENV] = savedApiUrl;
    }
    delete require.cache[CONSTANTS_PATH];
    if (cachedConstants) {
      require.cache[CONSTANTS_PATH] = cachedConstants;
    }
  });

  const loadHelperWithAxios = () => {
    const axiosStub = sinon.stub().resolves({ status: 200, data: '{}' });
    axiosStub['@noCallThru'] = true;
    const helper = proxyquire('../../../../bin/testObservability/helper/helper', { axios: axiosStub });
    return { helper, axiosStub };
  };

  it('sends requests to the overridden collector', async () => {
    process.env[API_URL_ENV] = 'https://collector-example.bsstag.com';
    const { helper, axiosStub } = loadHelperWithAxios();

    await helper.nodeRequest('POST', 'api/v1/batch', {}, { headers: {} });

    expect(axiosStub.firstCall.args[0].url).to.equal('https://collector-example.bsstag.com/api/v1/batch');
  });

  it('sends requests to the default collector when no override is set', async () => {
    const { helper, axiosStub } = loadHelperWithAxios();

    await helper.nodeRequest('POST', 'api/v1/batch', {}, { headers: {} });

    expect(axiosStub.firstCall.args[0].url).to.equal(`${DEFAULT_API_URL}/api/v1/batch`);
  });
});
