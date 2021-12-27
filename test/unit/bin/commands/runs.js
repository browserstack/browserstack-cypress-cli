const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require("sinon");

const Constants = require("../../../../bin/helpers/constants"),
  logger = require("../../../../bin/helpers/logger").winstonLogger,
  testObjects = require("../../support/fixtures/testObjects");
 
const proxyquire = require("proxyquire").noCallThru();

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("runs", () => {
  let args = testObjects.runSampleArgs;
  let rawArgs = testObjects.runSampleRawArgs;
  let bsConfig = testObjects.sampleBsConfig;

  describe("handle browserstack.json not valid", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      validateBstackJsonStub = sandbox.stub();
      getConfigPathStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      getErrorCodeFromErrStub = sandbox.stub().returns("random-error-code");
      deleteResultsStub = sandbox.stub();
      readBsConfigJSONStub = sandbox.stub().returns(null);
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("send error report", () => {
      let message = "random-error";
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = "random-error-code";

      const runs = proxyquire('../../../../bin/commands/runs', {
        '../helpers/utils': {
          validateBstackJson: validateBstackJsonStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub,
          sendUsageReport: sendUsageReportStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          getConfigPath: getConfigPathStub,
          deleteResults: deleteResultsStub,
          readBsConfigJSON: readBsConfigJSONStub
        },
      });

      validateBstackJsonStub.returns(Promise.reject({ message: "random-error" }));

      return runs(args, rawArgs)
        .then(function (_bsConfig) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(validateBstackJsonStub);
          sinon.assert.calledOnce(setUsageReportingFlagStub);
          sinon.assert.calledOnce(getErrorCodeFromErrStub);
          sinon.assert.calledOnce(deleteResultsStub);
          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            null,
            args,
            message,
            messageType,
            errorCode,
            null,
            rawArgs
          );
        });
    });
  });

  describe("handle caps not valid", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      validateBstackJsonStub = sandbox.stub();
      isJSONInvalidStub = sandbox.stub();
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      setBuildNameStub = sandbox.stub();
      setCypressConfigFilenameStub = sandbox.stub();
      setUserSpecsStub = sandbox.stub();
      setTestEnvsStub = sandbox.stub();
      setSystemEnvsStub = sandbox.stub();
      getConfigPathStub = sandbox.stub();
      setupLocalTestingStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      getErrorCodeFromMsgStub = sandbox.stub().returns("random-error-code");
      capabilityValidatorStub = sandbox.stub();
      setLocalStub = sandbox.stub();
      setLocalIdentifierStub = sandbox.stub();
      setHeadedStub = sandbox.stub();
      setNoWrapStub = sandbox.stub();
      setOtherConfigsStub = sandbox.stub();
      deleteResultsStub = sandbox.stub();
      setDefaultsStub = sandbox.stub();
      setLocalModeStub = sandbox.stub();
      setLocalConfigFileStub = sandbox.stub();
      setBrowsersStub = sandbox.stub();
      setConfigStub = sandbox.stub();
      setCLIModeStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("send error report", () => {
      let message = `random-error\n${Constants.validationMessages.NOT_VALID}`;
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = "random-error-code";

      const runs = proxyquire('../../../../bin/commands/runs', {
        '../helpers/utils': {
          validateBstackJson: validateBstackJsonStub,
          getErrorCodeFromMsg: getErrorCodeFromMsgStub,
          sendUsageReport: sendUsageReportStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          setBuildName: setBuildNameStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          setUserSpecs: setUserSpecsStub,
          setTestEnvs: setTestEnvsStub,
          getConfigPath: getConfigPathStub,
          setLocal: setLocalStub,
          setLocalIdentifier: setLocalIdentifierStub,
          setHeaded: setHeadedStub,
          setNoWrap: setNoWrapStub,
          setOtherConfigs: setOtherConfigsStub,
          deleteResults: deleteResultsStub,
          setDefaults: setDefaultsStub,
          setupLocalTesting: setupLocalTestingStub,
          isJSONInvalid: isJSONInvalidStub,
          setLocalMode: setLocalModeStub,
          setLocalConfigFile: setLocalConfigFileStub,
          setSystemEnvs: setSystemEnvsStub,
          setBrowsers: setBrowsersStub,
          setConfig: setConfigStub,
          setCLIMode: setCLIModeStub
        },
        '../helpers/capabilityHelper': {
          validate: capabilityValidatorStub
        },
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));
      setupLocalTestingStub.returns(Promise.resolve("return nothing"));
      capabilityValidatorStub.returns(Promise.reject("random-error"));

      return runs(args, rawArgs)
        .then(function (_bsConfig) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(deleteResultsStub);
          sinon.assert.calledOnce(validateBstackJsonStub);
          sinon.assert.calledOnce(setDefaultsStub);
          sinon.assert.calledOnce(setUsernameStub);
          sinon.assert.calledOnce(setAccessKeyStub);
          sinon.assert.calledOnce(setBuildNameStub);
          sinon.assert.calledOnce(setCypressConfigFilenameStub);
          sinon.assert.calledOnce(setUserSpecsStub);
          sinon.assert.calledOnce(setTestEnvsStub);
          sinon.assert.calledOnce(setSystemEnvsStub);
          sinon.assert.calledOnce(setLocalStub);
          sinon.assert.calledOnce(setLocalModeStub);
          sinon.assert.calledOnce(setLocalConfigFileStub);
          sinon.assert.calledOnce(setHeadedStub);
          sinon.assert.calledOnce(setNoWrapStub);
          sinon.assert.calledOnce(setConfigStub);
          sinon.assert.calledOnce(setCLIModeStub);
          sinon.assert.calledOnce(setOtherConfigsStub);
          sinon.assert.calledOnce(capabilityValidatorStub);
          sinon.assert.calledOnce(getErrorCodeFromMsgStub);
          sinon.assert.calledOnce(setLocalIdentifierStub);
          sinon.assert.calledOnce(setUsageReportingFlagStub);
          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            bsConfig,
            args,
            message,
            messageType,
            errorCode,
            null,
            rawArgs
          );
        });
    });
  });

  describe("handle achieve failed", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      getParallelsStub = sandbox.stub();
      setParallelsStub = sandbox.stub();
      warnSpecLimitStub = sandbox.stub();
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      getConfigPathStub = sandbox.stub();
      setBuildNameStub = sandbox.stub();
      setCypressConfigFilenameStub = sandbox.stub();
      setUserSpecsStub = sandbox.stub();
      setTestEnvsStub = sandbox.stub();
      setSystemEnvsStub = sandbox.stub();
      validateBstackJsonStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      checkUploadedStub = sandbox.stub();
      packageInstallerStub = sandbox.stub();
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      capabilityValidatorStub = sandbox.stub();
      archiverStub = sandbox.stub();
      deleteZipStub = sandbox.stub();
      deletePackageArchieveStub = sandbox.stub();
      setLocalStub = sandbox.stub();
      setLocalModeStub = sandbox.stub();
      setupLocalTestingStub = sandbox.stub();
      setLocalIdentifierStub = sandbox.stub();
      setHeadedStub = sandbox.stub();
      setNoWrapStub = sandbox.stub();
      setOtherConfigsStub = sandbox.stub();
      deleteResultsStub = sandbox.stub();
      getNumberOfSpecFilesStub = sandbox.stub().returns([]);
      setDefaultsStub = sandbox.stub();
      setLocalConfigFileStub = sandbox.stub();
      setBrowsersStub = sandbox.stub();
      setConfigStub = sandbox.stub();
      setCLIModeStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("send error report", () => {
      let message = `random-error\n${Constants.userMessages.FAILED_TO_ZIP}`;
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = "zip_creation_failed";

      const runs = proxyquire('../../../../bin/commands/runs', {
        '../helpers/utils': {
          validateBstackJson: validateBstackJsonStub,
          sendUsageReport: sendUsageReportStub,
          getParallels: getParallelsStub,
          setParallels: setParallelsStub,
          warnSpecLimit: warnSpecLimitStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          setBuildName: setBuildNameStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          setUserSpecs: setUserSpecsStub,
          setTestEnvs: setTestEnvsStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          getConfigPath: getConfigPathStub,
          setLocal: setLocalStub,
          setLocalMode: setLocalModeStub,
          setupLocalTesting: setupLocalTestingStub,
          setLocalIdentifier: setLocalIdentifierStub,
          setHeaded: setHeadedStub,
          setNoWrap: setNoWrapStub,
          setOtherConfigs: setOtherConfigsStub,
          deleteResults: deleteResultsStub,
          setDefaults: setDefaultsStub,
          getNumberOfSpecFiles: getNumberOfSpecFilesStub,
          setLocalConfigFile: setLocalConfigFileStub,
          setSystemEnvs: setSystemEnvsStub,
          setBrowsers: setBrowsersStub,
          setConfig: setConfigStub,
          setCLIMode: setCLIModeStub
        },
        '../helpers/capabilityHelper': {
          validate: capabilityValidatorStub,
        },
        '../helpers/archiver': {
          archive: archiverStub,
        },
        '../helpers/fileHelpers': {
          deleteZip: deleteZipStub,
          deletePackageArchieve: deletePackageArchieveStub
        },
        '../helpers/checkUploaded': {
          checkUploadedMd5: checkUploadedStub,
        },
        '../helpers/packageInstaller': {
          packageWrapper: packageInstallerStub,
        },
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));
      setupLocalTestingStub.returns(Promise.resolve("nothing"));
      capabilityValidatorStub.returns(Promise.resolve(Constants.validationMessages.VALIDATED));
      checkUploadedStub.returns(Promise.resolve({ zipUrlPresent: false }));
      packageInstallerStub.returns(Promise.resolve({ packageArchieveCreated: false }));
      archiverStub.returns(Promise.reject("random-error"));

      return runs(args, rawArgs)
        .then(function (_bsConfig) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(setLocalModeStub);
          sinon.assert.calledOnce(setUsernameStub);
          sinon.assert.calledOnce(setAccessKeyStub);
          sinon.assert.calledOnce(setBuildNameStub);
          sinon.assert.calledOnce(setLocalConfigFileStub);
          sinon.assert.calledOnce(setCypressConfigFilenameStub);
          sinon.assert.calledOnce(getNumberOfSpecFilesStub);
          sinon.assert.calledOnce(getParallelsStub);
          sinon.assert.calledOnce(setParallelsStub);
          sinon.assert.calledOnce(warnSpecLimitStub);
          sinon.assert.calledOnce(setLocalStub);
          sinon.assert.calledOnce(setLocalIdentifierStub);
          sinon.assert.calledOnce(setHeadedStub);
          sinon.assert.calledOnce(setNoWrapStub);
          sinon.assert.calledOnce(setCLIModeStub);
          sinon.assert.calledOnce(setOtherConfigsStub);
          sinon.assert.calledOnce(validateBstackJsonStub);
          sinon.assert.calledOnce(capabilityValidatorStub);
          sinon.assert.calledOnce(archiverStub);
          sinon.assert.calledOnce(setUsageReportingFlagStub);
          sinon.assert.calledOnce(deleteZipStub);
          sinon.assert.calledOnce(deleteResultsStub);
          sinon.assert.calledOnce(setDefaultsStub);
          sinon.assert.calledOnce(setSystemEnvsStub);
          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            bsConfig,
            args,
            message,
            messageType,
            errorCode,
            null,
            rawArgs
          );
        });
    });
  });

  describe("handle zipUpload failed", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      validateBstackJsonStub = sandbox.stub();
      getParallelsStub = sandbox.stub();
      setParallelsStub = sandbox.stub();
      warnSpecLimitStub = sandbox.stub();
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      setBuildNameStub = sandbox.stub();
      setCypressConfigFilenameStub = sandbox.stub();
      setUserSpecsStub = sandbox.stub();
      setTestEnvsStub = sandbox.stub();
      setSystemEnvsStub = sandbox.stub();
      getConfigPathStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      checkUploadedStub = sandbox.stub();
      packageInstallerStub = sandbox.stub();
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      capabilityValidatorStub = sandbox.stub();
      archiverStub = sandbox.stub();
      zipUploadStub = sandbox.stub();
      deleteZipStub = sandbox.stub();
      deletePackageArchieveStub = sandbox.stub();
      setLocalStub = sandbox.stub();
      setLocalModeStub = sandbox.stub();
      setupLocalTestingStub = sandbox.stub();
      setLocalIdentifierStub = sandbox.stub();
      setHeadedStub = sandbox.stub();
      setNoWrapStub = sandbox.stub();
      setOtherConfigsStub = sandbox.stub();
      deleteResultsStub = sandbox.stub();
      getNumberOfSpecFilesStub = sandbox.stub().returns([]);
      setDefaultsStub = sandbox.stub();
      setLocalConfigFileStub = sandbox.stub();
      setConfigStub = sandbox.stub();
      setBrowsersStub = sandbox.stub();
      setCLIModeStub = sandbox.stub();
      fetchZipSizeStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("send error report", () => {
      let message = `random-error\n${Constants.userMessages.ZIP_UPLOAD_FAILED}`;
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = "zip_upload_failed";

      const runs = proxyquire('../../../../bin/commands/runs', {
        '../helpers/utils': {
          validateBstackJson: validateBstackJsonStub,
          sendUsageReport: sendUsageReportStub,
          getParallels: getParallelsStub,
          setParallels: setParallelsStub,
          warnSpecLimit: warnSpecLimitStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          setBuildName: setBuildNameStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          setUserSpecs: setUserSpecsStub,
          setTestEnvs: setTestEnvsStub,
          setSystemEnvs: setSystemEnvsStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          getConfigPath: getConfigPathStub,
          setLocal: setLocalStub,
          setLocalMode: setLocalModeStub,
          setupLocalTesting: setupLocalTestingStub,
          setLocalIdentifier: setLocalIdentifierStub,
          setHeaded: setHeadedStub,
          setNoWrap: setNoWrapStub,
          setOtherConfigs: setOtherConfigsStub,
          deleteResults: deleteResultsStub,
          getNumberOfSpecFiles: getNumberOfSpecFilesStub,
          setDefaults: setDefaultsStub,
          setLocalConfigFile: setLocalConfigFileStub,
          setBrowsers: setBrowsersStub,
          setConfig: setConfigStub,
          setCLIMode: setCLIModeStub,
          fetchZipSize: fetchZipSizeStub,
        },
        '../helpers/capabilityHelper': {
          validate: capabilityValidatorStub,
        },
        '../helpers/archiver': {
          archive: archiverStub,
        },
        '../helpers/fileHelpers': {
          deleteZip: deleteZipStub,
          deletePackageArchieve: deletePackageArchieveStub
        },
        '../helpers/zipUpload': {
          zipUpload: zipUploadStub,
        },
        '../helpers/checkUploaded': {
          checkUploadedMd5: checkUploadedStub,
        },
        '../helpers/packageInstaller': {
          packageWrapper: packageInstallerStub,
        },
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));
      capabilityValidatorStub.returns(Promise.resolve(Constants.validationMessages.VALIDATED));
      setupLocalTestingStub.returns(Promise.resolve("nothing"));
      checkUploadedStub.returns(Promise.resolve({ zipUrlPresent: false }));
      packageInstallerStub.returns(Promise.resolve({ packageArchieveCreated: false }));
      archiverStub.returns(Promise.resolve("Zipping completed"));
      zipUploadStub.returns(Promise.reject("random-error"));
      fetchZipSizeStub.returns(123);

      return runs(args, rawArgs)
        .then(function (_bsConfig) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledTwice(fetchZipSizeStub);
          sinon.assert.calledOnce(setLocalModeStub);
          sinon.assert.calledOnce(setLocalConfigFileStub);
          sinon.assert.calledOnce(getNumberOfSpecFilesStub);
          sinon.assert.calledOnce(getParallelsStub);
          sinon.assert.calledOnce(setParallelsStub);
          sinon.assert.calledOnce(warnSpecLimitStub);
          sinon.assert.calledOnce(setLocalStub);
          sinon.assert.calledOnce(setLocalIdentifierStub);
          sinon.assert.calledOnce(setHeadedStub);
          sinon.assert.calledOnce(setNoWrapStub);
          sinon.assert.calledOnce(setCLIModeStub);
          sinon.assert.calledOnce(setOtherConfigsStub);
          sinon.assert.calledOnce(validateBstackJsonStub);
          sinon.assert.calledOnce(capabilityValidatorStub);
          sinon.assert.calledOnce(archiverStub);
          sinon.assert.calledOnce(setUsageReportingFlagStub);
          sinon.assert.calledOnce(zipUploadStub);
          sinon.assert.calledOnce(deleteResultsStub);
          sinon.assert.calledOnce(setDefaultsStub);
          sinon.assert.calledOnce(setSystemEnvsStub);
          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            bsConfig,
            args,
            message,
            messageType,
            errorCode,
            null,
            rawArgs
          );
        })
        .finally(function () {
          sinon.assert.calledOnce(deleteZipStub);
        });
    });
  });

  describe("handle createBuild failed", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      validateBstackJsonStub = sandbox.stub();
      getParallelsStub = sandbox.stub();
      setParallelsStub = sandbox.stub();
      warnSpecLimitStub = sandbox.stub();
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      setBuildNameStub = sandbox.stub();
      setCypressConfigFilenameStub = sandbox.stub();
      setUserSpecsStub = sandbox.stub();
      setTestEnvsStub = sandbox.stub();
      setSystemEnvsStub = sandbox.stub();
      getConfigPathStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      checkUploadedStub = sandbox.stub();
      packageInstallerStub = sandbox.stub();
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      capabilityValidatorStub = sandbox.stub();
      archiverStub = sandbox.stub();
      zipUploadStub = sandbox.stub();
      createBuildStub = sandbox.stub();
      deleteZipStub = sandbox.stub();
      deletePackageArchieveStub = sandbox.stub();
      setLocalStub = sandbox.stub();
      setLocalModeStub = sandbox.stub();
      setupLocalTestingStub = sandbox.stub();
      setLocalIdentifierStub = sandbox.stub();
      setHeadedStub = sandbox.stub();
      setNoWrapStub = sandbox.stub();
      setOtherConfigsStub = sandbox.stub();
      deleteResultsStub = sandbox.stub();
      getNumberOfSpecFilesStub = sandbox.stub().returns([]);
      setDefaultsStub = sandbox.stub();
      stopLocalBinaryStub = sandbox.stub();
      setLocalConfigFileStub = sandbox.stub();
      setConfigStub = sandbox.stub();
      setBrowsersStub = sandbox.stub();
      setCLIModeStub = sandbox.stub();
      fetchZipSizeStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("send error report", () => {
      let message = `random-error`;
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = "build_failed";

      const runs = proxyquire('../../../../bin/commands/runs', {
        '../helpers/utils': {
          validateBstackJson: validateBstackJsonStub,
          sendUsageReport: sendUsageReportStub,
          getParallels: getParallelsStub,
          setParallels: setParallelsStub,
          warnSpecLimit: warnSpecLimitStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          setBuildName: setBuildNameStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          setUserSpecs: setUserSpecsStub,
          setTestEnvs: setTestEnvsStub,
          setSystemEnvs: setSystemEnvsStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          getConfigPath: getConfigPathStub,
          setLocal: setLocalStub,
          setLocalMode: setLocalModeStub,
          setupLocalTesting: setupLocalTestingStub,
          setLocalIdentifier: setLocalIdentifierStub,
          setHeaded: setHeadedStub,
          setNoWrap: setNoWrapStub,
          setOtherConfigs: setOtherConfigsStub,
          deleteResults: deleteResultsStub,
          getNumberOfSpecFiles: getNumberOfSpecFilesStub,
          setDefaults: setDefaultsStub,
          stopLocalBinary: stopLocalBinaryStub,
          setLocalConfigFile: setLocalConfigFileStub,
          setBrowsers: setBrowsersStub,
          setConfig: setConfigStub,
          setCLIMode: setCLIModeStub,
          fetchZipSize: fetchZipSizeStub,
        },
        '../helpers/capabilityHelper': {
          validate: capabilityValidatorStub,
        },
        '../helpers/archiver': {
          archive: archiverStub,
        },
        '../helpers/fileHelpers': {
          deleteZip: deleteZipStub,
          deletePackageArchieve: deletePackageArchieveStub
        },
        '../helpers/zipUpload': {
          zipUpload: zipUploadStub,
        },
        '../helpers/build': {
          createBuild: createBuildStub,
        },
        '../helpers/checkUploaded': {
          checkUploadedMd5: checkUploadedStub,
        },
        '../helpers/packageInstaller': {
          packageWrapper: packageInstallerStub,
        },
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));
      setupLocalTestingStub.returns(Promise.resolve("nothing"));
      capabilityValidatorStub.returns(
        Promise.resolve(Constants.validationMessages.VALIDATED)
      );
      archiverStub.returns(Promise.resolve("Zipping completed"));
      checkUploadedStub.returns(Promise.resolve({ zipUrlPresent: false }));
      packageInstallerStub.returns(Promise.resolve({ packageArchieveCreated: false }));
      zipUploadStub.returns(Promise.resolve("zip uploaded"));
      stopLocalBinaryStub.returns(Promise.resolve("nothing"));
      createBuildStub.returns(Promise.reject("random-error"));
      fetchZipSizeStub.returns(123);

      return runs(args, rawArgs)
        .then(function (_bsConfig) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledTwice(fetchZipSizeStub);
          sinon.assert.calledOnce(setLocalConfigFileStub);
          sinon.assert.calledOnce(setLocalModeStub);
          sinon.assert.calledOnce(setupLocalTestingStub);
          sinon.assert.calledOnce(validateBstackJsonStub);
          sinon.assert.calledOnce(capabilityValidatorStub);
          sinon.assert.calledOnce(getNumberOfSpecFilesStub);
          sinon.assert.calledOnce(getParallelsStub);
          sinon.assert.calledOnce(setParallelsStub);
          sinon.assert.calledOnce(warnSpecLimitStub);
          sinon.assert.calledOnce(setLocalStub);
          sinon.assert.calledOnce(setLocalIdentifierStub);
          sinon.assert.calledOnce(setHeadedStub);
          sinon.assert.calledOnce(setNoWrapStub);
          sinon.assert.calledOnce(setCLIModeStub);
          sinon.assert.calledOnce(setOtherConfigsStub);
          sinon.assert.calledOnce(archiverStub);
          sinon.assert.calledOnce(setUsageReportingFlagStub);
          sinon.assert.calledOnce(zipUploadStub);
          sinon.assert.calledOnce(createBuildStub);

          sinon.assert.calledOnce(sendUsageReportStub);
          sinon.assert.calledOnce(deleteResultsStub);
          sinon.assert.calledOnce(setDefaultsStub);
          sinon.assert.calledOnce(setSystemEnvsStub);

          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            bsConfig,
            args,
            message,
            messageType,
            errorCode,
            null,
            rawArgs
          );
        });
    });
  });


  describe("handle createBuild success", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      validateBstackJsonStub = sandbox.stub();
      getParallelsStub = sandbox.stub();
      setParallelsStub = sandbox.stub();
      warnSpecLimitStub = sandbox.stub()
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      setBuildNameStub = sandbox.stub();
      generateUniqueHashStub =  sandbox.stub().returns('random_hash');
      setCypressConfigFilenameStub = sandbox.stub();
      setUserSpecsStub = sandbox.stub();
      setTestEnvsStub = sandbox.stub();
      setSystemEnvsStub = sandbox.stub();
      checkErrorStub = sandbox.stub();
      getConfigPathStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      checkUploadedStub = sandbox.stub();
      packageInstallerStub = sandbox.stub();
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      dashboardUrl = "dashboard-url";
      packageDirName = "package-dir";
      packageFileName = "package-file";
      fileName = "file-name";
      capabilityValidatorStub = sandbox.stub();
      archiverStub = sandbox.stub();
      zipUploadStub = sandbox.stub();
      createBuildStub = sandbox.stub();
      deleteZipStub = sandbox.stub();
      deletePackageArchieveStub = sandbox.stub();
      exportResultsStub = sandbox.stub();
      deleteResultsStub = sandbox.stub();
      setDefaultsStub = sandbox.stub();
      isUndefinedStub = sandbox.stub();
      setLocalStub = sandbox.stub();
      setLocalModeStub = sandbox.stub();
      setupLocalTestingStub = sandbox.stub();
      setLocalIdentifierStub = sandbox.stub();
      setHeadedStub = sandbox.stub();
      setNoWrapStub = sandbox.stub();
      setOtherConfigsStub = sandbox.stub();
      getNumberOfSpecFilesStub = sandbox.stub().returns([]);
      setLocalConfigFileStub = sandbox.stub();
      getTimeComponentsStub = sandbox.stub().returns({});
      initTimeComponentsStub = sandbox.stub();
      instrumentEventTimeStub = sandbox.stub();
      markBlockStartStub = sandbox.stub();
      markBlockEndStub = sandbox.stub();
      setConfigStub = sandbox.stub();
      setBrowsersStub = sandbox.stub();
      stopLocalBinaryStub = sandbox.stub();
      nonEmptyArrayStub = sandbox.stub();
      setCLIModeStub = sandbox.stub();
      setProcessHooksStub = sandbox.stub();
      fetchZipSizeStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("send error report", () => {
      let messageType = Constants.messageTypes.SUCCESS;
      let errorCode = null;
      let message = `Success! ${Constants.userMessages.BUILD_CREATED} with build id: random_build_id`;
      let dashboardLink = `${Constants.userMessages.VISIT_DASHBOARD} ${dashboardUrl}`;
      let data = { user_id: 1234, parallels: 10, time_components: {}, unique_id: 'random_hash', package_error: 'test', checkmd5_error: 'test', build_id: 'random_build_id', test_zip_size: 123, npm_zip_size: 123}

      const runs = proxyquire('../../../../bin/commands/runs', {
        '../helpers/utils': {
          validateBstackJson: validateBstackJsonStub,
          sendUsageReport: sendUsageReportStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          setBuildName: setBuildNameStub,
          setCypressConfigFilename: setCypressConfigFilenameStub,
          setUserSpecs: setUserSpecsStub,
          setTestEnvs: setTestEnvsStub,
          setSystemEnvs: setSystemEnvsStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          getParallels: getParallelsStub,
          setParallels: setParallelsStub,
          warnSpecLimit: warnSpecLimitStub,
          getConfigPath: getConfigPathStub,
          setLocal: setLocalStub,
          setLocalMode: setLocalModeStub,
          setupLocalTesting: setupLocalTestingStub,
          setLocalIdentifier: setLocalIdentifierStub,
          setHeaded: setHeadedStub,
          setNoWrap: setNoWrapStub,
          setOtherConfigs: setOtherConfigsStub,
          generateUniqueHash: generateUniqueHashStub,
          exportResults: exportResultsStub,
          deleteResults: deleteResultsStub,
          setDefaults: setDefaultsStub,
          isUndefined: isUndefinedStub,
          getNumberOfSpecFiles: getNumberOfSpecFilesStub,
          setLocalConfigFile: setLocalConfigFileStub,
          setBrowsers: setBrowsersStub,
          setConfig: setConfigStub,
          stopLocalBinary: stopLocalBinaryStub,
          nonEmptyArray: nonEmptyArrayStub,
          checkError: checkErrorStub,
          setCLIMode: setCLIModeStub,
          setProcessHooks: setProcessHooksStub,
          fetchZipSize: fetchZipSizeStub,
        },
        '../helpers/capabilityHelper': {
          validate: capabilityValidatorStub,
        },
        '../helpers/archiver': {
          archive: archiverStub,
        },
        '../helpers/fileHelpers': {
          deleteZip: deleteZipStub,
          deletePackageArchieve: deletePackageArchieveStub
        },
        '../helpers/zipUpload': {
          zipUpload: zipUploadStub,
        },
        '../helpers/build': {
          createBuild: createBuildStub,
        },
        '../helpers/config': {
          dashboardUrl: dashboardUrl,
          packageDirName: packageDirName,
          packageFileName: packageFileName,
          fileName: fileName,
        },
        '../helpers/checkUploaded': {
          checkUploadedMd5: checkUploadedStub,
        },
        '../helpers/packageInstaller': {
          packageWrapper: packageInstallerStub,
        },
        '../helpers/timeComponents': {
          initTimeComponents: initTimeComponentsStub,
          instrumentEventTime: instrumentEventTimeStub,
          getTimeComponents: getTimeComponentsStub,
          markBlockStart: markBlockStartStub,
          markBlockEnd: markBlockEndStub,
        }
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));
      setupLocalTestingStub.returns(Promise.resolve("nothing"));
      capabilityValidatorStub.returns(
        Promise.resolve(Constants.validationMessages.VALIDATED)
      );
      archiverStub.returns(Promise.resolve("Zipping completed"));
      checkUploadedStub.returns(Promise.resolve({ zipUrlPresent: false }));
      packageInstallerStub.returns(Promise.resolve({ packageArchieveCreated: false }));
      zipUploadStub.returns(Promise.resolve("zip uploaded"));
      stopLocalBinaryStub.returns(Promise.resolve("nothing"));
      nonEmptyArrayStub.returns(false);
      checkErrorStub.returns('test');
      getParallelsStub.returns(10);
      createBuildStub.returns(Promise.resolve({ message: 'Success', build_id: 'random_build_id', dashboard_url: dashboardUrl, user_id: 1234 }));
      fetchZipSizeStub.returns(123);

      return runs(args, rawArgs)
        .then(function (_bsConfig) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(getConfigPathStub);
          sinon.assert.calledOnce(validateBstackJsonStub);
          sinon.assert.calledOnce(setLocalConfigFileStub);
          sinon.assert.calledOnce(capabilityValidatorStub);
          sinon.assert.calledOnce(getNumberOfSpecFilesStub);
          sinon.assert.calledOnce(getParallelsStub);
          sinon.assert.calledOnce(setParallelsStub);
          sinon.assert.calledOnce(warnSpecLimitStub);
          sinon.assert.calledTwice(fetchZipSizeStub);
          sinon.assert.calledOnce(setLocalStub);
          sinon.assert.calledOnce(setLocalModeStub);
          sinon.assert.calledOnce(setupLocalTestingStub);
          sinon.assert.calledOnce(setLocalIdentifierStub);
          sinon.assert.calledOnce(setHeadedStub);
          sinon.assert.calledOnce(setNoWrapStub);
          sinon.assert.calledOnce(setCLIModeStub);
          sinon.assert.calledOnce(setProcessHooksStub);
          sinon.assert.calledOnce(setOtherConfigsStub);
          sinon.assert.calledOnce(generateUniqueHashStub);
          sinon.assert.calledOnce(archiverStub);
          sinon.assert.calledOnce(setUsageReportingFlagStub);
          sinon.assert.calledOnce(zipUploadStub);
          sinon.assert.calledOnce(createBuildStub);
          sinon.assert.calledOnce(exportResultsStub);
          sinon.assert.calledOnce(deleteResultsStub);
          sinon.assert.calledOnce(setDefaultsStub);
          sinon.assert.calledOnce(setSystemEnvsStub);
          sinon.assert.match(
            sendUsageReportStub.getCall(0).args,
            [
              bsConfig,
              args,
              `${message}\n${dashboardLink}`,
              messageType,
              errorCode,
              data,
              rawArgs
            ]
          );
        });
    });
  });
});
