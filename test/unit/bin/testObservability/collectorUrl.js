'use strict';
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noPreserveCache();

const API_URL_ENV = 'BROWSERSTACK_TEST_OBSERVABILITY_API_URL';
const DEFAULT_API_URL = 'https://collector-observability.browserstack.com';

// A11Y-13909: the reporter runs on the BrowserStack machine from its own install of this package,
// so the collector it posts to has to come from the environment the launching cli forwards. These
// pin the request destination itself, not just the forwarding done by setSystemEnvs.
describe('observability collector url', () => {
  let savedApiUrl;

  beforeEach(() => {
    savedApiUrl = process.env[API_URL_ENV];
    delete process.env[API_URL_ENV];
  });

  afterEach(() => {
    if (savedApiUrl === undefined) {
      delete process.env[API_URL_ENV];
    } else {
      process.env[API_URL_ENV] = savedApiUrl;
    }
  });

  const loadHelperWithAxios = () => {
    const axiosStub = sinon.stub().resolves({ status: 200, data: '{}' });
    axiosStub['@noCallThru'] = true;
    const helper = proxyquire('../../../../bin/testObservability/helper/helper', { axios: axiosStub });
    return { helper, axiosStub };
  };

  it('sends requests to the overridden collector', async () => {
    const { helper, axiosStub } = loadHelperWithAxios();
    process.env[API_URL_ENV] = 'https://collector-example.bsstag.com';

    await helper.nodeRequest('POST', 'api/v1/batch', {}, { headers: {} });

    expect(axiosStub.firstCall.args[0].url).to.equal('https://collector-example.bsstag.com/api/v1/batch');
  });

  it('sends requests to the default collector when no override is set', async () => {
    const { helper, axiosStub } = loadHelperWithAxios();

    await helper.nodeRequest('POST', 'api/v1/batch', {}, { headers: {} });

    expect(axiosStub.firstCall.args[0].url).to.equal(`${DEFAULT_API_URL}/api/v1/batch`);
  });

  // Loading this module must never throw on a bad value: every command loads it through
  // bin/helpers/utils.js, so init, info and stop would die at startup, as would the reporter.
  it('does not reject an invalid collector url until a request is made', async () => {
    process.env[API_URL_ENV] = 'http://collector-example.bsstag.com';

    const { helper } = loadHelperWithAxios();

    let thrown;
    await helper.nodeRequest('POST', 'api/v1/batch', {}, { headers: {} }).catch((err) => { thrown = err; });
    expect(String(thrown)).to.match(/must be an https:\/\/ URL/);
  });
});
