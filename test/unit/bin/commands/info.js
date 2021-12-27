const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require('sinon'),
  request = require('request');

const Constants = require("../../../../bin/helpers/constants"),
  logger = require("../../../../bin/helpers/logger").winstonLogger,
  testObjects = require("../../support/fixtures/testObjects");

const proxyquire = require("proxyquire").noCallThru();

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("buildInfo", () => {
  let args = testObjects.buildInfoSampleArgs;
  let rawArgs = testObjects.buildInfoSampleRawArgs;
  let body = testObjects.buildInfoSampleBody;
  let bsConfig = testObjects.sampleBsConfig;

  describe("Handle API deprecated", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      validateBstackJsonStub = sandbox.stub();
      getConfigPathStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      setCypressConfigFilenameStub = sandbox.stub().returns(undefined);
      getUserAgentStub = sandbox.stub().returns("random user-agent");
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      getErrorCodeFromErrStub = sandbox.stub().returns("random-error");
      setDefaultsStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("message thrown if API deprecated", () => {
      let message = Constants.userMessages.API_DEPRECATED;
      let messageType = Constants.messageTypes.INFO;
      let errorCode = "api_deprecated";

      let requestStub = sandbox.stub(request, "get").yields(null, { statusCode: 299 }, null);

      const info = proxyquire('../../../../bin/commands/info', {
        '../helpers/utils': {
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          validateBstackJson: validateBstackJsonStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub,
          sendUsageReport: sendUsageReportStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          getUserAgent: getUserAgentStub,
          getConfigPath: getConfigPathStub,
          setDefaults: setDefaultsStub
        },
        request: {get: requestStub},
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));

      return info(args, rawArgs)
        .then(function (_bsConfig) {
          sinon.assert.calledOnce(requestStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
        }).catch((error) => {
          chai.assert.isNotOk(error,'Promise error');
        });
    });

    it("message thrown if build returned", () => {
      let message = body.message;
      let messageType = Constants.messageTypes.INFO;
      let errorCode = "api_deprecated";

      let requestStub = sandbox
        .stub(request, "get")
        .yields(null, { statusCode: 299 }, JSON.stringify(body));

      const info = proxyquire('../../../../bin/commands/info', {
        '../helpers/utils': {
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          validateBstackJson: validateBstackJsonStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub,
          sendUsageReport: sendUsageReportStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          getUserAgent: getUserAgentStub,
          getConfigPath: getConfigPathStub,
          setDefaults: setDefaultsStub
        },
        request: {get: requestStub},
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));

      return info(args, rawArgs)
        .then(function (_bsConfig) {
          sinon.assert.calledOnce(requestStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
        })
        .catch((error) => {
          chai.assert.isNotOk(error, "Promise error");
        });
    });
  });

  describe("Handle statusCode != 200", () => {
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      validateBstackJsonStub = sandbox.stub();
      getConfigPathStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      setCypressConfigFilenameStub = sandbox.stub().returns(undefined);
      getUserAgentStub = sandbox.stub().returns("random user-agent");
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      getErrorCodeFromErrStub = sandbox.stub().returns("random-error");
      setDefaultsStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("message thrown if statusCode != 200", () => {
      let message = Constants.userMessages.BUILD_INFO_FAILED;
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = "api_failed_build_info";

      let requestStub = sinon
        .stub(request, "get")
        .yields(null, { statusCode: 400 }, null);

      const info = proxyquire('../../../../bin/commands/info', {
        '../helpers/utils': {
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          validateBstackJson: validateBstackJsonStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub,
          sendUsageReport: sendUsageReportStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          getUserAgent: getUserAgentStub,
          getConfigPath: getConfigPathStub,
          setDefaults: setDefaultsStub
        },
        request: {get: requestStub},
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));

      return info(args, rawArgs)
        .then(function (_bsConfig) {
          sinon.assert.calledOnce(requestStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
        })
        .catch((error) => {
          chai.assert.isNotOk(error, "Promise error");
        });
    });

    it("message thrown if statusCode != 200 and user unauthorized", () => {
      let body_with_message = {
        ...body,
        message: "Unauthorized",
      };

      let message = `${Constants.userMessages.BUILD_INFO_FAILED} with error: \n${JSON.stringify(body_with_message, null, 2)}`;
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = "api_auth_failed";

      let requestStub = sinon
        .stub(request, "get")
        .yields(null, { statusCode: 401 }, JSON.stringify(body_with_message));

      const info = proxyquire('../../../../bin/commands/info', {
        '../helpers/utils': {
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          validateBstackJson: validateBstackJsonStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub,
          sendUsageReport: sendUsageReportStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          getUserAgent: getUserAgentStub,
          getConfigPath: getConfigPathStub,
          setDefaults: setDefaultsStub
        },
        request: {get: requestStub},
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));

      return info(args, rawArgs)
        .then(function (_bsConfig) {
          sinon.assert.calledOnce(requestStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
        })
        .catch((error) => {
          chai.assert.isNotOk(error, "Promise error");
        });
    });

    it("message thrown if statusCode != 200 and build is present", () => {
      let message = `${Constants.userMessages.BUILD_INFO_FAILED} with error: \n${JSON.stringify(body, null, 2)}`;
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = "api_failed_build_info";

      let requestStub = sinon
        .stub(request, "get")
        .yields(null, { statusCode: 402 }, JSON.stringify(body));

      const info = proxyquire('../../../../bin/commands/info', {
        '../helpers/utils': {
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          validateBstackJson: validateBstackJsonStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub,
          sendUsageReport: sendUsageReportStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          getUserAgent: getUserAgentStub,
          getConfigPath: getConfigPathStub,
          setDefaults: setDefaultsStub
        },
        request: {get: requestStub},
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));

      return info(args, rawArgs)
        .then(function (_bsConfig) {
          sinon.assert.calledOnce(requestStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
        })
        .catch((error) => {
          chai.assert.isNotOk(error, "Promise error");
        });
    });
  });

  describe("Handle API success", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      validateBstackJsonStub = sandbox.stub();
      getConfigPathStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      setCypressConfigFilenameStub = sandbox.stub().returns(undefined);
      getUserAgentStub = sandbox.stub().returns("random user-agent");
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      getErrorCodeFromErrStub = sandbox.stub().returns("random-error");
      setDefaultsStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("message thrown if API success", () => {
      let message = `Build info for build id: \n ${JSON.stringify(body, null, 2)}`;
      let messageType = Constants.messageTypes.SUCCESS;
      let errorCode = null;

      let requestStub = sandbox.stub(request, "get").yields(null, { statusCode: 200 }, JSON.stringify(body));

      const info = proxyquire('../../../../bin/commands/info', {
        '../helpers/utils': {
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          validateBstackJson: validateBstackJsonStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub,
          sendUsageReport: sendUsageReportStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          getUserAgent: getUserAgentStub,
          getConfigPath: getConfigPathStub,
          setDefaults: setDefaultsStub
        },
        request: {get: requestStub},
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));

      return info(args, rawArgs)
        .then(function (_bsConfig) {
          sinon.assert.calledOnce(requestStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
        }).catch((error) => {
          chai.assert.isNotOk(error,'Promise error');
        });
    });
  });

  describe("catch validateBstackJson error", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      getConfigPathStub = sandbox.stub();
      validateBstackJsonStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      setCypressConfigFilenameStub = sandbox.stub().returns(undefined);
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      getErrorCodeFromErrStub = sandbox.stub().returns("random-error");
      setDefaultsStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("send usage report if validateBstackJson fails", () => {
      const info = proxyquire('../../../../bin/commands/info', {
        '../helpers/utils': {
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          validateBstackJson: validateBstackJsonStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub,
          sendUsageReport: sendUsageReportStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          getConfigPath: getConfigPathStub,
          setDefaults: setDefaultsStub
        },
      });

      validateBstackJsonStub.returns(Promise.reject({ message: "reject error" }));

      return info(args, rawArgs)
        .then(function (_bsConfig) {
          chai.assert.fail("Promise error");
        }).catch((error) => {
          sinon.assert.calledOnceWithExactly(sendUsageReportStub, null, args, "reject error", Constants.messageTypes.ERROR, "random-error", null, rawArgs);
        });
    });
  });
});
