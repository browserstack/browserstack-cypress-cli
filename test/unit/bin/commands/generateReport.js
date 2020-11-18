const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require('sinon');

const Constants = require("../../../../bin/helpers/constants"),
      logger = require("../../../../bin/helpers/logger").winstonLogger,
      testObjects = require("../../support/fixtures/testObjects");

const proxyquire = require("proxyquire").noCallThru();

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("generateReport", () => {
  let args = testObjects.generateReportInputArgs;
  let body = testObjects.buildInfoSampleBody;
  let bsConfig = testObjects.sampleBsConfig;

  describe("Calling the report generator", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();

      getConfigPathStub = sandbox.stub();
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
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("calls the reportGenerator", () => {
      const generateReport = proxyquire('../../../../bin/commands/generateReport', {
        '../helpers/utils': {
          getConfigPath: getConfigPathStub,
          validateBstackJson: validateBstackJsonStub,
          setDefaultAuthHash: setDefaultAuthHashStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          sendUsageReport: sendUsageReportStub,
          setDefaults: setDefaultsStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub
        },
        '../helpers/reporterHTML': {
          reportGenerator: reportGeneratorSpy
        }
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));

      generateReport(args)
      .then(function (_bsConfig) {
        sinon.assert.calledWith(reportGeneratorSpy, bsConfig, args);
        sinon.assert.calledOnce(getConfigPathStub);
        sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, 'generate-report called', Constants.messageTypes.INFO, null);
      })
      .catch((error) => {
        chai.assert.isNotOk(error, 'Promise error');
      });
    });

    it("logs and send usage report on rejection", () => {
      const generateReport = proxyquire('../../../../bin/commands/generateReport', {
        '../helpers/utils': {
          getConfigPath: getConfigPathStub,
          validateBstackJson: validateBstackJsonStub,
          setDefaultAuthHash: setDefaultAuthHashStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          sendUsageReport: sendUsageReportStub,
          setDefaults: setDefaultsStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub
        },
        '../helpers/reporterHTML': {
          reportGenerator: reportGeneratorSpy
        }
      });

      let err = { message: "Promise error" };

      validateBstackJsonStub.returns(Promise.reject(err));

      generateReport(args)
      .then(function (_bsConfig) {
        sinon.assert.notCalled(reportGeneratorSpy);
        sinon.assert.notCalled(getConfigPathStub);
      })
      .catch((_error) => {
        sinon.assert.calledWith(setUsageReportingFlagStub, null, args.disableUsageReporting);
        sinon.assert.calledWith(sendUsageReportStub, null, args, err.message, Constants.messageTypes.ERROR, "random-error");
      });
    });
  });
});
