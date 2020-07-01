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
  let bsConfig = testObjects.sampleBsConfig;

  describe("handle browserstack.json not valid", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      validateBstackJsonStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      getErrorCodeFromErrStub = sandbox.stub().returns("random-error-code");
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("send error report", () => {
      let message = "random-error";
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = "random-error-code";

      const runs = proxyquire("../../../../bin/commands/runs", {
        "../helpers/utils": {
          validateBstackJson: validateBstackJsonStub,
          getErrorCodeFromErr: getErrorCodeFromErrStub,
          sendUsageReport: sendUsageReportStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
        },
      });

      validateBstackJsonStub.returns(Promise.reject({message: "random-error"}));

      return runs(args)
        .then(function (_bsConfig) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(validateBstackJsonStub);
          sinon.assert.calledOnce(setUsageReportingFlagStub);
          sinon.assert.calledOnce(getErrorCodeFromErrStub);
          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            null,
            args,
            message,
            messageType,
            errorCode
          );
        });
    });
  });

  describe("handle caps not valid", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      validateBstackJsonStub = sandbox.stub();
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      setBuildNameStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      getErrorCodeFromMsgStub = sandbox.stub().returns("random-error-code");
      capabilityValidatorStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("send error report", () => {
      let message = `random-error\n${Constants.validationMessages.NOT_VALID}`;
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = "random-error-code";

      const runs = proxyquire("../../../../bin/commands/runs", {
        "../helpers/utils": {
          validateBstackJson: validateBstackJsonStub,
          getErrorCodeFromMsg: getErrorCodeFromMsgStub,
          sendUsageReport: sendUsageReportStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          setBuildName: setBuildNameStub
        },
        "../helpers/capabilityHelper": {
          validate: capabilityValidatorStub,
        },
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));
      capabilityValidatorStub.returns(Promise.reject("random-error"));

      return runs(args)
        .then(function (_bsConfig) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(validateBstackJsonStub);
          sinon.assert.calledOnce(capabilityValidatorStub);
          sinon.assert.calledOnce(setUsageReportingFlagStub);
          sinon.assert.calledOnce(getErrorCodeFromMsgStub);
          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            bsConfig,
            args,
            message,
            messageType,
            errorCode
          );
        });
    });
  });

  describe("handle achieve failed", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      setParallelsStub = sandbox.stub();
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      setBuildNameStub = sandbox.stub();
      validateBstackJsonStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      capabilityValidatorStub = sandbox.stub();
      archiverStub = sandbox.stub();
      deleteZipStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("send error report", () => {
      let message = `random-error\n${Constants.userMessages.FAILED_TO_ZIP}`;
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = "zip_creation_failed";

      const runs = proxyquire("../../../../bin/commands/runs", {
        "../helpers/utils": {
          validateBstackJson: validateBstackJsonStub,
          sendUsageReport: sendUsageReportStub,
          setParallels: setParallelsStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          setBuildName: setBuildNameStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
        },
        "../helpers/capabilityHelper": {
          validate: capabilityValidatorStub,
        },
        "../helpers/archiver": {
          archive: archiverStub,
        },
        "../helpers/fileHelpers": {
          deleteZip: deleteZipStub
        }
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));
      capabilityValidatorStub.returns(Promise.resolve(Constants.validationMessages.VALIDATED));
      archiverStub.returns(Promise.reject("random-error"));

      return runs(args)
        .then(function (_bsConfig) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(setParallelsStub)
          sinon.assert.calledOnce(validateBstackJsonStub);
          sinon.assert.calledOnce(capabilityValidatorStub);
          sinon.assert.calledOnce(archiverStub);
          sinon.assert.calledOnce(setUsageReportingFlagStub);
          sinon.assert.calledOnce(deleteZipStub);
          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            bsConfig,
            args,
            message,
            messageType,
            errorCode
          );
        });
    });
  });

  describe("handle zipUpload failed", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      validateBstackJsonStub = sandbox.stub();
      setParallelsStub = sandbox.stub();
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      setBuildNameStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      capabilityValidatorStub = sandbox.stub();
      archiverStub = sandbox.stub();
      zipUploadStub = sandbox.stub();
      deleteZipStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("send error report", () => {
      let message = `random-error\n${Constants.userMessages.ZIP_UPLOAD_FAILED}`;
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = "zip_upload_failed";

      const runs = proxyquire("../../../../bin/commands/runs", {
        "../helpers/utils": {
          validateBstackJson: validateBstackJsonStub,
          sendUsageReport: sendUsageReportStub,
          setParallels: setParallelsStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          setBuildName: setBuildNameStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
        },
        "../helpers/capabilityHelper": {
          validate: capabilityValidatorStub,
        },
        "../helpers/archiver": {
          archive: archiverStub,
        },
        "../helpers/fileHelpers": {
          deleteZip: deleteZipStub,
        },
        "../helpers/zipUpload": {
          zipUpload: zipUploadStub,
        },
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));
      capabilityValidatorStub.returns(Promise.resolve(Constants.validationMessages.VALIDATED));
      archiverStub.returns(Promise.resolve("Zipping completed"));
      zipUploadStub.returns(Promise.reject("random-error"));

      return runs(args)
        .then(function (_bsConfig) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(setParallelsStub);
          sinon.assert.calledOnce(validateBstackJsonStub);
          sinon.assert.calledOnce(capabilityValidatorStub);
          sinon.assert.calledOnce(archiverStub);
          sinon.assert.calledOnce(setUsageReportingFlagStub);
          sinon.assert.calledOnce(zipUploadStub);

          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            bsConfig,
            args,
            message,
            messageType,
            errorCode
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
      setParallelsStub = sandbox.stub();
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      setBuildNameStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      capabilityValidatorStub = sandbox.stub();
      archiverStub = sandbox.stub();
      zipUploadStub = sandbox.stub();
      createBuildStub = sandbox.stub();
      deleteZipStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("send error report", () => {
      let message = `random-error`;
      let messageType = Constants.messageTypes.ERROR;
      let errorCode = "build_failed";

      const runs = proxyquire("../../../../bin/commands/runs", {
        "../helpers/utils": {
          validateBstackJson: validateBstackJsonStub,
          sendUsageReport: sendUsageReportStub,
          setParallels: setParallelsStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          setBuildName: setBuildNameStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
        },
        "../helpers/capabilityHelper": {
          validate: capabilityValidatorStub,
        },
        "../helpers/archiver": {
          archive: archiverStub,
        },
        "../helpers/fileHelpers": {
          deleteZip: deleteZipStub,
        },
        "../helpers/zipUpload": {
          zipUpload: zipUploadStub,
        },
        "../helpers/build": {
          createBuild: createBuildStub,
        },
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));
      capabilityValidatorStub.returns(
        Promise.resolve(Constants.validationMessages.VALIDATED)
      );
      archiverStub.returns(Promise.resolve("Zipping completed"));
      zipUploadStub.returns(Promise.resolve("zip uploaded"));
      createBuildStub.returns(Promise.reject("random-error"));

      return runs(args)
        .then(function (_bsConfig) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(validateBstackJsonStub);
          sinon.assert.calledOnce(capabilityValidatorStub);
          sinon.assert.calledOnce(setParallelsStub);
          sinon.assert.calledOnce(archiverStub);
          sinon.assert.calledOnce(setUsageReportingFlagStub);
          sinon.assert.calledOnce(zipUploadStub);
          sinon.assert.calledOnce(createBuildStub);

          sinon.assert.calledOnce(sendUsageReportStub);

          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            bsConfig,
            args,
            message,
            messageType,
            errorCode
          );
        })
        .finally(function () {
          sinon.assert.calledOnce(deleteZipStub);
        });
    });
  });


  describe("handle createBuild success", () => {
    var sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      validateBstackJsonStub = sandbox.stub();
      setParallelsStub = sandbox.stub();
      setUsernameStub = sandbox.stub();
      setAccessKeyStub = sandbox.stub();
      setBuildNameStub = sandbox.stub();
      setUsageReportingFlagStub = sandbox.stub().returns(undefined);
      sendUsageReportStub = sandbox.stub().callsFake(function () {
        return "end";
      });
      capabilityValidatorStub = sandbox.stub();
      archiverStub = sandbox.stub();
      zipUploadStub = sandbox.stub();
      createBuildStub = sandbox.stub();
      deleteZipStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("send error report", () => {
      let message = "build created";
      let messageType = Constants.messageTypes.SUCCESS;
      let errorCode = null;

      const runs = proxyquire("../../../../bin/commands/runs", {
        "../helpers/utils": {
          validateBstackJson: validateBstackJsonStub,
          sendUsageReport: sendUsageReportStub,
          setUsername: setUsernameStub,
          setAccessKey: setAccessKeyStub,
          setBuildName: setBuildNameStub,
          setUsageReportingFlag: setUsageReportingFlagStub,
          setParallels: setParallelsStub,
        },
        "../helpers/capabilityHelper": {
          validate: capabilityValidatorStub,
        },
        "../helpers/archiver": {
          archive: archiverStub,
        },
        "../helpers/fileHelpers": {
          deleteZip: deleteZipStub,
        },
        "../helpers/zipUpload": {
          zipUpload: zipUploadStub,
        },
        "../helpers/build": {
          createBuild: createBuildStub,
        },
      });

      validateBstackJsonStub.returns(Promise.resolve(bsConfig));
      capabilityValidatorStub.returns(
        Promise.resolve(Constants.validationMessages.VALIDATED)
      );
      archiverStub.returns(Promise.resolve("Zipping completed"));
      zipUploadStub.returns(Promise.resolve("zip uploaded"));
      createBuildStub.returns(Promise.resolve("build created"));

      return runs(args)
        .then(function (_bsConfig) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(validateBstackJsonStub);
          sinon.assert.calledOnce(capabilityValidatorStub);
          sinon.assert.calledOnce(setParallelsStub);
          sinon.assert.calledOnce(archiverStub);
          sinon.assert.calledOnce(setUsageReportingFlagStub);
          sinon.assert.calledOnce(zipUploadStub);
          sinon.assert.calledOnce(createBuildStub);

          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            bsConfig,
            args,
            message,
            messageType,
            errorCode
          );
        })
        .finally(function () {
          sinon.assert.calledOnce(deleteZipStub);
        });
    });
  });
});
