const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require("sinon"),
  request = require("request");

const Constants = require("../../../../bin/helpers/constants"),
  logger = require("../../../../bin/helpers/logger").winstonLogger,
  testObjects = require("../../support/fixtures/testObjects");

const proxyquire = require("proxyquire").noCallThru();

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("buildStop", () => {
  let args = testObjects.buildStopSampleArgs;
  let rawArgs =  testObjects.buildStopSampleRawArgs;
  let body = testObjects.buildStopSampleBody;
  let bsConfig = testObjects.sampleBsConfig;

  describe("Handle API success", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      validateBstackJsonStub = sandbox.stub();
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      getConfigPathStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      setCypressConfigFilenameStub = sandbox.stub().returns(undefined);
      getUserAgentStub = sandbox.stub().returns("random user-agent");
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      getErrorCodeFromErrStub = sandbox.stub().returns("random-error");
      setDefaultsStub = sandbox.stub();
      stopBrowserStackBuildStub = sandbox.stub().returns(Promise.reject(true));
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("should call stopBrowserStackBuild method", () => {
      const stop = proxyquire('../../../../bin/commands/stop', {
        '../helpers/utils': {
          validateBstackJson: validateBstackJsonStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub,
          sendUsageReport: sendUsageReportStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          getConfigPath: getConfigPathStub,
          setDefaults: setDefaultsStub,
          stopBrowserStackBuild: stopBrowserStackBuildStub
        }
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));

      return stop(args, rawArgs)
        .then(function (_bsConfig) {
          sinon.assert.calledOnce(stopBrowserStackBuildStub);
        })
    });
  });

  describe("catch validateBstackJson error", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      validateBstackJsonStub = sandbox.stub();
      getConfigPathStub = sandbox.stub();
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
      const stop = proxyquire('../../../../bin/commands/stop', {
        '../helpers/utils': {
          validateBstackJson: validateBstackJsonStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub,
          sendUsageReport: sendUsageReportStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          getConfigPath: getConfigPathStub,
          setDefaults: setDefaultsStub
        },
      });

      validateBstackJsonStub.returns(
        Promise.reject({ message: "reject error" })
      );

      return stop(args, rawArgs)
        .then(function (_bsConfig) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            null,
            args,
            "reject error",
            Constants.messageTypes.ERROR,
            "random-error",
            null,
            rawArgs
          );
        });
    });
  });
});
