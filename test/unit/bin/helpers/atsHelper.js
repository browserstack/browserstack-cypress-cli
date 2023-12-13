const { expect } = require("chai");
const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require('sinon'),
  request = require('request');

const logger = require("../../../../bin/helpers/logger").winstonLogger,
  testObjects = require("../../support/fixtures/testObjects"),
  utils = require('../../../../bin/helpers/utils'),
  atsHelper = require('../../../../bin/helpers/atsHelper');

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe('#atsHelper', () => {
  let bsConfig = testObjects.sampleBsConfig;
  let sendUsageReportStub = null, requestStub = null;

  beforeEach(() => {
    sendUsageReportStub = sinon.stub(utils, 'sendUsageReport');
    requestStub = sinon.stub(request, "get");
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#isTurboScaleSession', () => {
    it('return true if env var set to true', () => {
      process.env.BROWSERSTACK_TURBOSCALE = "true";
      expect(atsHelper.isTurboScaleSession(bsConfig)).to.be.true;
      delete BROWSERSTACK_TURBOSCALE;
    });

    it('return false if env var set to incorrect value', () => {
      process.env.BROWSERSTACK_TURBOSCALE = "false";
      expect(atsHelper.isTurboScaleSession(bsConfig)).to.be.false;
      delete BROWSERSTACK_TURBOSCALE;
    });

    it('return true if set in config', () => {
      expect(atsHelper.isTurboScaleSession(testObjects.sampleATSBsConfig)).to.be.true;
    });

    it('return false if not set in config as well as env var', () => {
      expect(atsHelper.isTurboScaleSession(bsConfig)).to.be.false;
    });
  });

  describe('#getTurboScaleOptions', () => {
    it('return empty object if not set', () => {
      expect(atsHelper.getTurboScaleOptions(testObjects.sampleATSBsConfig)).to.deep.include({});
    });

    it('return obj if set in config', () => {
      expect(atsHelper.getTurboScaleOptions(testObjects.sampleATSBsConfigWithOptions)).to.deep.include({ gridName: 'abc' });
    });
  });

  describe('#getTurboScaleGridName', () => {
    it('return value set by env var', () => {
      process.env.BROWSERSTACK_TURBOSCALE_GRID_NAME = "my-grid";
      expect(atsHelper.getTurboScaleGridName(testObjects.sampleATSBsConfigWithOptions)).to.eq('my-grid');
      delete process.env.BROWSERSTACK_TURBOSCALE_GRID_NAME;
    });

    it('return value set in config', () => {
      expect(atsHelper.getTurboScaleGridName(testObjects.sampleATSBsConfigWithOptions)).to.eq('abc');
    });

    it('return NO_GRID_NAME_PASSED if value not set in config as well as env var', () => {
      expect(atsHelper.getTurboScaleGridName(bsConfig)).to.eq('NO_GRID_NAME_PASSED');
    });
  });

  describe('#getTurboScaleGridDetails', () => {
    it('resolve with body', () => {
      const body = {
        id: '123',
        name: 'grid-name',
        url: 'https://abc.com/wd/hub',
        playwrightUrl: 'wss://abc.com/playwright',
        cypressUrl: 'https://abc.com/cypress',
        isTrialGrid: false,
        customRepeaters: ''
      };

      requestStub.yields(null, { statusCode: 200 }, body);
      sendUsageReportStub.notCalled;
      atsHelper.getTurboScaleGridDetails(testObjects.sampleATSBsConfigWithOptions, {}, {}).then((result) => {
        expect(result).to.eq(body);
      })
    });

    it('reject with empty object', () => {
      const body = {
        id: '123',
        name: 'grid-name',
        url: 'https://abc.com/wd/hub',
        playwrightUrl: 'wss://abc.com/playwright',
        cypressUrl: 'https://abc.com/cypress',
        isTrialGrid: false,
        customRepeaters: ''
      };

      requestStub.yields(null, { statusCode: 422 }, body);
      atsHelper.getTurboScaleGridDetails(testObjects.sampleATSBsConfigWithOptions, {}, {}).then((result) => {
        expect(result).to.eq({});
        expect(sendUsageReportStub.calledOnce).to.be.true;
      })
    });
  });
});
