const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require('sinon');
const { downloadBuildArtifacts } = require("../../../../bin/helpers/buildArtifacts");
const constants = require("../../../../bin/helpers/constants");

const Constants = require("../../../../bin/helpers/constants"),
      logger = require("../../../../bin/helpers/logger").winstonLogger,
      testObjects = require("../../support/fixtures/testObjects");

const proxyquire = require("proxyquire").noCallThru();

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("generateDownloads", () => {
  let args = testObjects.generateDownloadsInputArgs;
  let body = testObjects.buildInfoSampleBody;
  let bsConfig = testObjects.sampleBsConfig;

  describe("Calling downloadBuildArtifacts", () => {
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

      downloadBuildArtifactsSpy = sandbox.spy();
      getErrorCodeFromErrStub = sandbox.stub().returns("random-error");
      setDefaultsStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("calls downloadBuildArtifacts", () => {
      const generateReport = proxyquire('../../../../bin/commands/generateDownloads', {
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
        '../helpers/buildArtifacts': {
          downloadBuildArtifacts: downloadBuildArtifactsSpy
        }
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));

      generateReport(args)
      .then(function (_bsConfig) {
        sinon.assert.calledWith(downloadBuildArtifactsSpy, bsConfig, args._[1], args);
        sinon.assert.calledOnce(getConfigPathStub);
        sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, constants.usageReportingConstants.GENERATE_DOWNLOADS, Constants.messageTypes.INFO, null);
      })
      .catch((error) => {
        chai.assert.isNotOk(error, 'Promise error');
      });
    });

    it("logs and send usage report on rejection", () => {
      const generateReport = proxyquire('../../../../bin/commands/generateDownloads', {
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
        '../helpers/buildArtifacts': {
          downloadBuildArtifacts: downloadBuildArtifactsSpy
        }
      });

      let err = { message: "Promise error" };

      validateBstackJsonStub.returns(Promise.reject(err));

      generateReport(args)
      .then(function (_bsConfig) {
        sinon.assert.notCalled(downloadBuildArtifactsSpy);
        sinon.assert.notCalled(getConfigPathStub);
      })
      .catch((_error) => {
        sinon.assert.calledWith(setUsageReportingFlagStub, null, args.disableUsageReporting);
        sinon.assert.calledWith(sendUsageReportStub, null, args, err.message, Constants.messageTypes.ERROR, "random-error");
      });
    });
  });
});
