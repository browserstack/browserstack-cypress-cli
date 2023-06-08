const { default: axios } = require("axios");
const { expect } = require("chai");
const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require('sinon');

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
  let sendUsageReportStub = null, axiosStub = null, formatRequestStub = null;
  let messageType = Constants.messageTypes.ERROR;
  let errorCode = 'get_initial_details_failed'

  beforeEach(() => {
    sendUsageReportStub = sinon.stub(utils, 'sendUsageReport');
    axiosStub = sinon.stub(axios, "get");
    formatRequestStub = sinon.stub(utils, "formatRequest");
  });

  afterEach(() => {
    sinon.restore();
  });

  it('sends usage report if error occurred in getInitialDetails call', () => {
    let error_message = "error occurred";
    axiosStub.resolves(error_message);
    formatRequestStub.returns({err: error_message, statusCode: null, body: null})
    sendUsageReportStub.calledOnceWithExactly(bsConfig, args, error_message, messageType, errorCode, null, rawArgs);
    getInitialDetails(bsConfig, args, rawArgs).then((result) => {
      expect(result).to.eq({});
    })
  });

  it('resolves with data if getInitialDetails call is successful', () => {
    let body = {"user_id": 1234};
    axiosStub.resolves({ status: 200 , data: body});
    formatRequestStub.notCalled;
    sendUsageReportStub.notCalled;
    getInitialDetails(bsConfig, args, rawArgs).then((result) => {
      expect(result).to.eq(body);
    })
  });

  it('send usage report if error response from getInitialDetails call', () => {
    let body = {"error": 'user not found'};
    axiosStub.resolves({ status: 422 , data: body});
    formatRequestStub.notCalled;
    sendUsageReportStub.calledOnceWithExactly(bsConfig, args, body["error"], messageType, errorCode, null, rawArgs);
    getInitialDetails(bsConfig, args, rawArgs).then((result) => {
      expect(result).to.eq(body);
    })
  });
});