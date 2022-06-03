const { expect } = require("chai");
const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require('sinon'),
  rewire = require('rewire');

const fs = require('fs'),
      path = require('path'),
      request = require('request'),
      unzipper = require('unzipper');
      Constants = require("../../../../bin/helpers/constants"),
      logger = require("../../../../bin/helpers/logger").winstonLogger,
      testObjects = require("../../support/fixtures/testObjects"),
      formatRequest = require("../../../../bin/helpers/utils").formatRequest;

const proxyquire = require("proxyquire").noCallThru();

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("getReportResponse", () => {
  var sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
  });

  it("retrieve response from report url", () => {
    let requestStub = sandbox.stub(request, "get").yields(null, { statusCode: 200 }, "abc");
    let reporterHTML = proxyquire('../../../../bin/helpers/reporterHTML', {
      request: {get: requestStub}
    });
    let rewireReporterHTML = rewire('../../../../bin/helpers/reporterHTML');
    let getReportResponse = rewireReporterHTML.__get__("getReportResponse");
    let unzipFileStub = sinon.stub();
    let writerStub = sinon.stub(fs, "createWriteStream");
    let unlinkSyncStub = sinon.stub(fs, "unlinkSync");
    let pathStub = sinon.stub(path, 'join');
    unzipFileStub.returns(true);
    rewireReporterHTML.__set__('unzipFile', unzipFileStub);
    pathStub.returns("abc/efg");
    writerStub.returns(true);
    unlinkSyncStub.returns(true);
    getReportResponse("abc", "efg", "url");
    sinon.assert.calledOnce(requestStub);
  })
});

describe("calls API to generate report", () => {
  var sandbox,sendUsageReportStub,sendUsageReportStub;
  let args = testObjects.generateReportInputArgs,
      rawArgs = testObjects.generateReportInputRawArgs
      buildId = 'buildId',
      bsConfig = testObjects.sampleBsConfig;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sendUsageReportStub = sandbox.stub().callsFake(function () {
      return "end";
    });
    getUserAgentStub = sandbox.stub().returns("random user-agent");
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
  });

  it("is deprecated, i.e. 299, does not have build message", () => {
    let requestStub = sandbox.stub(request, "get").yields(null, { statusCode: 299 }, null);
    let message = Constants.userMessages.API_DEPRECATED;
    let messageType = Constants.messageTypes.INFO;
    let errorCode = "api_deprecated";

    const reporterHTML = proxyquire('../../../../bin/helpers/reporterHTML', {
      './utils': {
        sendUsageReport: sendUsageReportStub,
        getUserAgent: getUserAgentStub
      },
      request: {get: requestStub}
    });

    reporterHTML.reportGenerator(bsConfig, buildId, args, rawArgs, {});

    sinon.assert.calledOnce(requestStub);
    sinon.assert.calledOnce(getUserAgentStub);
    sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, {}, rawArgs);
  });

  it("is deprecated, i.e. 299", () => {
    let build = { buildId: buildId, message: 'API has been deprecated', rows: [] };
    let body = JSON.stringify(build);
    let requestStub = sandbox.stub(request, "get").yields(null, { statusCode: 299 }, body);
    let message = build.message;
    let messageType = Constants.messageTypes.INFO;
    let errorCode = "api_deprecated";

    const reporterHTML = proxyquire('../../../../bin/helpers/reporterHTML', {
      './utils': {
        sendUsageReport: sendUsageReportStub,
        getUserAgent: getUserAgentStub
      },
      request: {get: requestStub}
    });

    reporterHTML.reportGenerator(bsConfig, buildId, args, rawArgs, {});

    sinon.assert.calledOnce(requestStub);
    sinon.assert.calledOnce(getUserAgentStub);
    sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, {}, rawArgs);
  });

  context("non 200 response", () => {
    it("422 status, build available but running, cannot generate report", () => {
      let build = { message: 'The report cannot be generated as the build is running' };
      let body = JSON.stringify(build);
      let requestStub = sandbox.stub(request, "get").yields(null, { statusCode: 422 }, body);
      let message = build.message;
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = 'api_failed_build_generate_report';

      const reporterHTML = proxyquire('../../../../bin/helpers/reporterHTML', {
        './utils': {
          sendUsageReport: sendUsageReportStub,
          getUserAgent: getUserAgentStub,
          formatRequest
        },
        request: {get: requestStub}
      });

      reporterHTML.reportGenerator(bsConfig, buildId, args, rawArgs, {});

      sinon.assert.calledOnce(requestStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, {}, rawArgs);
    });

    it("400 status, build available, cannot generate report", () => {
      let build = { buildId: buildId, message: 'success', rows: [] };
      let body = JSON.stringify(build);
      let requestStub = sandbox.stub(request, "get").yields(null, { statusCode: 400 }, body);
      let message = `${
        Constants.userMessages.BUILD_GENERATE_REPORT_FAILED.replace('<build-id>', buildId)
      } with error: \n${JSON.stringify(build, null, 2)}`;
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = 'api_failed_build_generate_report';

      const reporterHTML = proxyquire('../../../../bin/helpers/reporterHTML', {
        './utils': {
          sendUsageReport: sendUsageReportStub,
          getUserAgent: getUserAgentStub,
          formatRequest
        },
        request: {get: requestStub}
      });

      reporterHTML.reportGenerator(bsConfig, buildId, args, rawArgs, {});

      sinon.assert.calledOnce(requestStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, {}, rawArgs);
    });

    it("user is unauthorized", () => {
      let build = { buildId: buildId, message: 'Unauthorized', rows: [] };
      let body = JSON.stringify(build);
      let requestStub = sandbox.stub(request, "get").yields(null, { statusCode: 401 }, body);
      let message = `${
        Constants.userMessages.BUILD_GENERATE_REPORT_FAILED.replace('<build-id>', buildId)
      } with error: \n${JSON.stringify(build, null, 2)}`;
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = 'api_auth_failed';

      const reporterHTML = proxyquire('../../../../bin/helpers/reporterHTML', {
        './utils': {
          sendUsageReport: sendUsageReportStub,
          getUserAgent: getUserAgentStub
        },
        request: {get: requestStub}
      });

      reporterHTML.reportGenerator(bsConfig, buildId, args, rawArgs, {});

      sinon.assert.calledOnce(requestStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, {}, rawArgs);
    });

    it("400 status, build not available, cannot generate report", () => {
      let requestStub = sandbox.stub(request, "get").yields(null, { statusCode: 400 }, null);
      let message = Constants.userMessages.BUILD_GENERATE_REPORT_FAILED.replace('<build-id>', buildId);
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = 'api_failed_build_generate_report';

      const reporterHTML = proxyquire('../../../../bin/helpers/reporterHTML', {
        './utils': {
          sendUsageReport: sendUsageReportStub,
          getUserAgent: getUserAgentStub,
          formatRequest
        },
        request: {get: requestStub}
      });

      reporterHTML.reportGenerator(bsConfig, buildId, args, rawArgs, {});

      sinon.assert.calledOnce(requestStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, {}, rawArgs);
    });
  });

  it("200 response code", () => {
    let build = { buildId: buildId, message: 'success', rows: [] };
    let body = JSON.stringify(build);
    let requestStub = sandbox.stub(request, "get").yields(null, { statusCode: 200 }, "abc");
    let message = `Report for build: ${buildId} was successfully created.`;
    let messageType = Constants.messageTypes.SUCCESS;
    let errorCode = null;
    let rewireReporterHTML = rewire('../../../../bin/helpers/reporterHTML');
    let generateCypressBuildReportStub = sinon.stub();
    generateCypressBuildReportStub.returns(true);
    rewireReporterHTML.__set__('generateCypressBuildReport', generateCypressBuildReportStub);

    const reporterHTML = proxyquire('../../../../bin/helpers/reporterHTML', {
      './utils': {
        sendUsageReport: sendUsageReportStub,
        getUserAgent: getUserAgentStub
      },
      request: {get: requestStub}
    });

    reporterHTML.reportGenerator(bsConfig, buildId, args, rawArgs, {});

    sinon.assert.calledOnce(requestStub);
    sinon.assert.calledOnce(getUserAgentStub);
    sendUsageReportStub.calledOnceWithExactly(bsConfig, args, message, messageType, errorCode, {}, rawArgs);
  });
});

describe("generateCypressBuildReport", () => {
  var sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
  });

  it("calls cypress build report with report download url", () => {
    let pathStub = sinon.stub(path, 'join');
    let fileExistStub = sinon.stub(fs, 'existsSync');
    let rewireReporterHTML = rewire('../../../../bin/helpers/reporterHTML');
    let generateCypressBuildReport = rewireReporterHTML.__get__('generateCypressBuildReport')
    let getReportResponseStub = sinon.stub();
    getReportResponseStub.calledOnceWith('abc/efg', 'report.zip', 'url');
    rewireReporterHTML.__set__('getReportResponse', getReportResponseStub);
    pathStub.returns("abc/efg");
    fileExistStub.returns(true);
    generateCypressBuildReport({report_data: 'url'})
  });
});
