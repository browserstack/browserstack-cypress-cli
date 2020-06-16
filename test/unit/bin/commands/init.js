const chai = require("chai"),
  sinon = require("sinon"),
  chaiAsPromised = require("chai-as-promised");

const Constants = require("../../../../bin/helpers/constants"),
  logger = require("../../../../bin/helpers/logger").winstonLogger,
  testObjects = require("../../support/fixtures/testObjects");

const proxyquire = require("proxyquire").noCallThru();

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("init", () => {
  let args = testObjects.initSampleArgs;
  var sandbox;

  before(() => {
    sandbox = sinon.createSandbox();
    sendUsageReportStub = sandbox.stub().callsFake(function () {
      return "end";
    });
  });

  after(() => {
    sandbox.restore();
    sinon.restore();
  });

  describe("init", () => {
    it("fail if browserstack.json is already present", () => {
      fileExistsStub = sandbox.stub().yields(true);
      writeStub = sandbox.stub();

      const init = proxyquire("../../../../bin/commands/init", {
        "../helpers/utils": {
          sendUsageReport: sendUsageReportStub,
        },
        "../helpers/fileHelpers": {
          fileExists: fileExistsStub,
          write: writeStub,
        },
      });

      init(args);
      sinon.assert.calledOnce(fileExistsStub);
      sinon.assert.notCalled(writeStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, null, args, Constants.userMessages.CONFIG_FILE_EXISTS, Constants.messageTypes.ERROR, 'bstack_json_already_exists');
    });

    it("create browserstack.json if not already present", () => {
      fileExistsStub = sandbox.stub().yields(false);
      writeStub = sandbox.stub();

      const init = proxyquire("../../../../bin/commands/init", {
        "../helpers/utils": {
          sendUsageReport: sendUsageReportStub,
        },
        "../helpers/fileHelpers": {
          fileExists: fileExistsStub,
          write: writeStub,
        },
      });

      init(args);
      sinon.assert.calledOnce(fileExistsStub);
      sinon.assert.calledOnce(writeStub);
    });
  });
});
