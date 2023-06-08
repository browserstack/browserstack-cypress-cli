const { default: axios } = require("axios");
const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require('sinon');

const Constants = require("../../../../bin/helpers/constants"),
  logger = require("../../../../bin/helpers/logger").winstonLogger,
  testObjects = require("../../support/fixtures/testObjects"),
  formatRequest = require('../../../../bin/helpers/utils').formatRequest;

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
      getInitialDetailsStub = sandbox.stub();
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

      let axiosStub = sandbox.stub(axios, "get").resolves({ status: 299 });

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
          setDefaults: setDefaultsStub,
          formatRequest,
        },
        '../helpers/getInitialDetails': {
          getInitialDetails: getInitialDetailsStub,
        },
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));
      getInitialDetailsStub.returns(Promise.resolve({}));

      return info(args, rawArgs)
        .then(function (_bsConfig) {
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnce(getInitialDetailsStub);
          sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, {}, rawArgs);
        }).catch((error) => {
          chai.assert.isNotOk(error,'Promise error');
        });
    });

    it("message thrown if build returned", () => {
      let message = body.message;
      let messageType = Constants.messageTypes.INFO;
      let errorCode = "api_deprecated";

      let axiosStub = sandbox
        .stub(axios, "get")
        .resolves({ status: 299, data: body });

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
          setDefaults: setDefaultsStub,
          formatRequest,
        },
        '../helpers/getInitialDetails': {
          getInitialDetails: getInitialDetailsStub,
        },
      });

      getInitialDetailsStub.returns(Promise.resolve({}));
      validateBstackJsonStub.returns(Promise.resolve(bsConfig));

      return info(args, rawArgs)
        .then(function (_bsConfig) {
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(getInitialDetailsStub);
          sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, {}, rawArgs);
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
      getInitialDetailsStub = sandbox.stub();
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

      let axiosStub = sinon
        .stub(axios, "get")
        .resolves({ status: 400 });

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
          setDefaults: setDefaultsStub,
          formatRequest,
        },
        '../helpers/getInitialDetails': {
          getInitialDetails: getInitialDetailsStub,
        },
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));
      getInitialDetailsStub.returns(Promise.resolve({}));

      return info(args, rawArgs)
        .then(function (_bsConfig) {
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(getInitialDetailsStub);
          sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, {}, rawArgs);
        })
        .catch((error) => {
          console.log(error)
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

      let axiosStub = sinon
        .stub(axios, "get")
        .resolves({ status: 401, data: body_with_message });

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
          setDefaults: setDefaultsStub,
          formatRequest,
        },
        '../helpers/getInitialDetails': {
          getInitialDetails: getInitialDetailsStub,
        },
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));
      getInitialDetailsStub.returns(Promise.resolve({}));
      return info(args, rawArgs)
        .then(function (_bsConfig) {
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(getInitialDetailsStub);
          sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, {}, rawArgs);
        })
        .catch((error) => {
          console.log(error)
          chai.assert.isNotOk(error, "Promise error");
        });
    });

    it("message thrown if statusCode != 200 and build is present", () => {
      let message = `${Constants.userMessages.BUILD_INFO_FAILED} with error: \n${JSON.stringify(body, null, 2)}`;
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = "api_failed_build_info";

      let axiosStub = sinon
        .stub(axios, "get")
        .resolves({ status: 402, data: body });

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
          setDefaults: setDefaultsStub,
          formatRequest,
        },
        '../helpers/getInitialDetails': {
          getInitialDetails: getInitialDetailsStub,
        },
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));
      getInitialDetailsStub.returns(Promise.resolve({}));

      return info(args, rawArgs)
        .then(function (_bsConfig) {
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(getInitialDetailsStub);
          sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, {}, rawArgs);
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
      getInitialDetailsStub = sandbox.stub();
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

      let axiosStub = sandbox.stub(axios, "get").resolves({ status: 200, data: body });

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
        '../helpers/getInitialDetails': {
          getInitialDetails: getInitialDetailsStub,
        },
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));
      getInitialDetailsStub.returns(Promise.resolve({}));

      return info(args, rawArgs)
        .then(function (_bsConfig) {
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(getInitialDetailsStub);
          sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, {}, rawArgs);
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
      getInitialDetailsStub = sandbox.stub();
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
        '../helpers/getInitialDetails': {
          getInitialDetails: getInitialDetailsStub,
        }
      });

      validateBstackJsonStub.returns(Promise.reject({ message: "reject error" }));
      getInitialDetailsStub.returns(Promise.reject({ message: "reject error" }));

      return info(args, rawArgs)
        .then(function (_bsConfig) {
          chai.assert.fail("Promise error");
        }).catch((error) => {
          sinon.assert.calledOnceWithExactly(sendUsageReportStub, null, args, "reject error", Constants.messageTypes.ERROR, "random-error", null, rawArgs);
        });
    });
  });
});
