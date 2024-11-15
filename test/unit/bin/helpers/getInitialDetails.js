const { expect } = require("chai");
const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require('sinon'),
  request = require('request');

const Constants = require("../../../../bin/helpers/constants"),
logger = require("../../../../bin/helpers/logger").winstonLogger,
testObjects = require("../../support/fixtures/testObjects"),
utils = require('../../../../bin/helpers/utils'),
getInitialDetails = require('../../../../bin/helpers/getInitialDetails').getInitialDetails;

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe('#getInitialDetails', () => {
  let args = testObjects.buildInfoSampleArgs;
  let rawArgs = testObjects.buildInfoSampleRawArgs;
  let bsConfig = testObjects.sampleBsConfig;
  let sendUsageReportStub = null, requestStub = null, formatRequestStub = null;
  let messageType = Constants.messageTypes.ERROR;
  let errorCode = 'get_initial_details_failed'

  beforeEach(() => {
    sendUsageReportStub = sinon.stub(utils, 'sendUsageReport');
    requestStub = sinon.stub(request, "get");
    formatRequestStub = sinon.stub(utils, "formatRequest");
  });

  afterEach(() => {
    sinon.restore();
  });

  it('sends usage report if error occurred in getInitialDetails call', () => {
    let error_message = "error occurred";
    requestStub.yields(error_message, null, null);
    formatRequestStub.returns({err: error_message, statusCode: null, body: null})
    sendUsageReportStub.calledOnceWithExactly(bsConfig, args, error_message, messageType, errorCode, null, rawArgs);
    getInitialDetails(bsConfig, args, rawArgs).then((result) => {
      expect(result).to.eq({});
    })
  });

  it('resolves with data if getInitialDetails call is successful', () => {
    let body = {"user_id": 1234};
    requestStub.yields(null, { statusCode: 200 }, body);
    formatRequestStub.notCalled;
    sendUsageReportStub.notCalled;
    getInitialDetails(bsConfig, args, rawArgs).then((result) => {
      expect(result).to.eq(body);
    })
  });

  it('send usage report if error response from getInitialDetails call', () => {
    let body = {"error": 'user not found'};
    requestStub.yields(null, { statusCode: 422 }, body);
    formatRequestStub.notCalled;
    sendUsageReportStub.calledOnceWithExactly(bsConfig, args, body["error"], messageType, errorCode, null, rawArgs);
    getInitialDetails(bsConfig, args, rawArgs).then((result) => {
      expect(result).to.eq(body);
    })
  });
});