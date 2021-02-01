const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require('sinon');

const fs = require('fs'),
      path = require('path'),
      request = require('request'),
      Constants = require("../../../../bin/helpers/constants"),
      logger = require("../../../../bin/helpers/logger").winstonLogger,
      testObjects = require("../../support/fixtures/testObjects");

const proxyquire = require("proxyquire").noCallThru();

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("reportHTML", () => {
  var sandbox;
  let templateDir = 'templateDir',
      args = testObjects.generateReportInputArgs,
      buildId = 'buildId',
      bsConfig = testObjects.sampleBsConfig;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    validateBstackJsonStub = sandbox.stub();
    setDefaultAuthHashStub = sandbox.stub();
    setUsernameStub = sandbox.stub();
    setAccessKeyStub = sandbox.stub();
    setUsageReportingFlagStub = sandbox.stub().returns(undefined);
    setCypressConfigFilenameStub = sandbox.stub();
    sendUsageReportStub = sandbox.stub().callsFake(function () {
      return "end";
    });

    reportGeneratorSpy = sandbox.spy();
    getErrorCodeFromErrStub = sandbox.stub().returns("random-error");
    setDefaultsStub = sandbox.stub();

    getUserAgentStub = sandbox.stub().returns("random user-agent");
    // pathStub = sinon.stub(path, 'join').returns(templateDir);
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
    // pathStub.restore();
  });

  describe("calls API to generate report", () => {

    it("is deprecated, i.e. 299, does not have build message", () => {
      let requestStub = sandbox.stub(request, "get").yields(null, { statusCode: 299 }, null);
      let message = Constants.userMessages.API_DEPRECATED;
      let messageType = Constants.messageTypes.INFO;
      let errorCode = "api_deprecated";

      const reporterHTML = proxyquire('../../../../bin/helpers/reporterHTML', {
        './utils': {
          validateBstackJson: validateBstackJsonStub,
          setDefaultAuthHash: setDefaultAuthHashStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          getUserAgent: getUserAgentStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          sendUsageReport: sendUsageReportStub,
          setDefaults: setDefaultsStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub
        },
        request: {get: requestStub}
      });

      reporterHTML.reportGenerator(bsConfig, buildId, args);

      sinon.assert.calledOnce(requestStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode);
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
          validateBstackJson: validateBstackJsonStub,
          setDefaultAuthHash: setDefaultAuthHashStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          getUserAgent: getUserAgentStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          sendUsageReport: sendUsageReportStub,
          setDefaults: setDefaultsStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub
        },
        request: {get: requestStub}
      });

      reporterHTML.reportGenerator(bsConfig, buildId, args);

      sinon.assert.calledOnce(requestStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode);
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
            validateBstackJson: validateBstackJsonStub,
            setDefaultAuthHash: setDefaultAuthHashStub,
            setUsername: setUsernameStub,
            setAccessKey: setAccessKeyStub,
            getUserAgent: getUserAgentStub,
            setUsageReportingFlag: setUsageReportingFlagStub,
            setCypressConfigFilename: setCypressConfigFilenameStub,
            sendUsageReport: sendUsageReportStub,
            setDefaults: setDefaultsStub,
            getErrorCodeFromErr: getErrorCodeFromErrStub
          },
          request: {get: requestStub}
        });

        reporterHTML.reportGenerator(bsConfig, buildId, args);

        sinon.assert.calledOnce(requestStub);
        sinon.assert.calledOnce(getUserAgentStub);
        sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode);
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
            validateBstackJson: validateBstackJsonStub,
            setDefaultAuthHash: setDefaultAuthHashStub,
            setUsername: setUsernameStub,
            setAccessKey: setAccessKeyStub,
            getUserAgent: getUserAgentStub,
            setUsageReportingFlag: setUsageReportingFlagStub,
            setCypressConfigFilename: setCypressConfigFilenameStub,
            sendUsageReport: sendUsageReportStub,
            setDefaults: setDefaultsStub,
            getErrorCodeFromErr: getErrorCodeFromErrStub
          },
          request: {get: requestStub}
        });

        reporterHTML.reportGenerator(bsConfig, buildId, args);

        sinon.assert.calledOnce(requestStub);
        sinon.assert.calledOnce(getUserAgentStub);
        sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode);
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
            validateBstackJson: validateBstackJsonStub,
            setDefaultAuthHash: setDefaultAuthHashStub,
            setUsername: setUsernameStub,
            setAccessKey: setAccessKeyStub,
            getUserAgent: getUserAgentStub,
            setUsageReportingFlag: setUsageReportingFlagStub,
            setCypressConfigFilename: setCypressConfigFilenameStub,
            sendUsageReport: sendUsageReportStub,
            setDefaults: setDefaultsStub,
            getErrorCodeFromErr: getErrorCodeFromErrStub
          },
          request: {get: requestStub}
        });

        reporterHTML.reportGenerator(bsConfig, buildId, args);

        sinon.assert.calledOnce(requestStub);
        sinon.assert.calledOnce(getUserAgentStub);
        sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode);
      });

      it("400 status, build not available, cannot generate report", () => {
        let requestStub = sandbox.stub(request, "get").yields(null, { statusCode: 400 }, null);
        let message = Constants.userMessages.BUILD_GENERATE_REPORT_FAILED.replace('<build-id>', buildId);
        let messageType = Constants.messageTypes.ERROR;
        let errorCode = 'api_failed_build_generate_report';

        const reporterHTML = proxyquire('../../../../bin/helpers/reporterHTML', {
          './utils': {
            validateBstackJson: validateBstackJsonStub,
            setDefaultAuthHash: setDefaultAuthHashStub,
            setUsername: setUsernameStub,
            setAccessKey: setAccessKeyStub,
            getUserAgent: getUserAgentStub,
            setUsageReportingFlag: setUsageReportingFlagStub,
            setCypressConfigFilename: setCypressConfigFilenameStub,
            sendUsageReport: sendUsageReportStub,
            setDefaults: setDefaultsStub,
            getErrorCodeFromErr: getErrorCodeFromErrStub
          },
          request: {get: requestStub}
        });

        reporterHTML.reportGenerator(bsConfig, buildId, args);

        sinon.assert.calledOnce(requestStub);
        sinon.assert.calledOnce(getUserAgentStub);
        sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode);
      });
    });

    it("200 response code", () => {
      let build = { buildId: buildId, message: 'success', rows: [] };
      let body = JSON.stringify(build);
      let requestStub = sandbox.stub(request, "get").yields(null, { statusCode: 200 }, body);
      let message = `Report for build: ${buildId} was successfully created.`;
      let messageType = Constants.messageTypes.SUCCESS;
      let errorCode = null;

      const reporterHTML = proxyquire('../../../../bin/helpers/reporterHTML', {
        './utils': {
          validateBstackJson: validateBstackJsonStub,
          setDefaultAuthHash: setDefaultAuthHashStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          getUserAgent: getUserAgentStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          sendUsageReport: sendUsageReportStub,
          setDefaults: setDefaultsStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub
        },
        request: {get: requestStub}
      });

      reporterHTML.reportGenerator(bsConfig, buildId, args);

      sinon.assert.calledOnce(requestStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode);
    });
  });
});
