const { expect } = require('chai');
describe('o11y collector URL', () => {
  afterEach(() => { delete process.env.BSTACK_ENV; delete require.cache[require.resolve('../../../../bin/testObservability/helper/constants')]; });
  it('defaults to prod', () => {
    const c = require('../../../../bin/testObservability/helper/constants');
    expect(c.API_URL).to.equal('https://collector-observability.browserstack.com');
  });
  it('expands for lower env', () => {
    process.env.BSTACK_ENV = 'k8s';
    const c = require('../../../../bin/testObservability/helper/constants');
    expect(c.API_URL).to.equal('https://collector-observability-k8s.bsstag.com');
  });
});
