const chai = require("chai"),
  assert = chai.assert,
  expect = chai.expect,
  sinon = require("sinon"),
  chaiAsPromised = require("chai-as-promised"),
  rewire = require("rewire"),
  util = require("util"),
  path = require('path');

const Constants = require("../../../../bin/helpers/constants"),
  logger = require("../../../../bin/helpers/logger").winstonLogger,
  testObjects = require("../../support/fixtures/testObjects")
  utils = require("../../../../bin/helpers/utils");

const proxyquire = require("proxyquire").noCallThru();

const get_path = rewire("../../../../bin/commands/init").__get__("get_path");;

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("init", () => {
  let args = testObjects.initSampleArgs;
  let rawArgs = testObjects.initSampleRawArgs;
  var sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    configCreatedStub = sandbox.stub()
    sendUsageReportStub = sandbox.stub().callsFake(function () {
      return "end";
    });
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
  });

  describe("get_path", () => {
    it("filename passed, -path passed", () => {
      let args = {
        _: ["init", "filename.json"],
        p: '/sample-path',
        path: '/sample-path',
        $0: "browserstack-cypress",
      };

      expect(get_path(args)).to.be.eql('/sample-path/filename.json');
    });

    it("filename passed, -path not passed", () => {
      let args = {
        _: ["init", "filename.json"],
        p: false,
        path: false,
        $0: "browserstack-cypress",
      };

      let args2 = {
        _: ["init", "~/filename.json"],
        p: false,
        path: false,
        $0: "browserstack-cypress",
      };

      expect(get_path(args)).to.be.eql(path.join(process.cwd(), 'filename.json'));
      expect(get_path(args2)).to.be.eql('~/filename.json');
    });

    it("filepath passed, -path passed", () => {
      let args = {
        _: ["init", "/sample-path/filename.json"],
        p: '/sample-path2',
        path: '/sample-path2',
        "disable-usage-reporting": undefined,
        disableUsageReporting: undefined,
        $0: "browserstack-cypress",
      };

      loggerStub = sandbox.stub(logger, 'error');
      cypressConfigFileStub = sandbox.stub(utils, 'setCypressConfigFilename');
      usageStub = sandbox.stub(utils, 'sendUsageReport');

      expect(get_path(args)).to.be.undefined;
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledOnce(cypressConfigFileStub);
      sinon.assert.calledOnce(usageStub);
    });

    it("filename not passed, -path passed", () => {
      let args = {
        _: ["init"],
        p: '/sample-path',
        path: '/sample-path',
        $0: "browserstack-cypress",
      };

      expect(get_path(args)).to.be.eql('/sample-path/browserstack.json');
    });

    it("filename not passed, -path  not passed", () => {
      let args = {
        _: ["init"],
        p: false,
        path: false,
        $0: "browserstack-cypress",
      };

      expect(get_path(args)).to.be.eql(path.join(process.cwd(), 'browserstack.json'));
    });
  });


  describe("init", () => {
    it("fail if given path is not present", () => {
      dirExistsStub = sandbox.stub().yields(false);
      writeStub = sandbox.stub();
      formatStub = sandbox.stub().callsFake(function (args) {
        return args;
      });

      const init = proxyquire("../../../../bin/commands/init", {
        "../helpers/utils": {
          sendUsageReport: sendUsageReportStub,
        },
        "../helpers/fileHelpers": {
          dirExists: dirExistsStub,
          write: writeStub,
        },
        "util": {
          format: formatStub
        }
      });

      init(args, rawArgs);
      sinon.assert.calledOnce(dirExistsStub);
      sinon.assert.notCalled(writeStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, null, args, Constants.userMessages.DIR_NOT_FOUND, Constants.messageTypes.ERROR, 'path_to_init_not_found', null, rawArgs);
    });

    it("fail if browserstack.json is already present", () => {
      dirExistsStub = sandbox.stub().yields(true);
      fileExistsStub = sandbox.stub().yields(true);
      writeStub = sandbox.stub();

      const init = proxyquire("../../../../bin/commands/init", {
        "../helpers/utils": {
          sendUsageReport: sendUsageReportStub,
        },
        "../helpers/fileHelpers": {
          dirExists: dirExistsStub,
          fileExists: fileExistsStub,
          write: writeStub,
        },
      });

      init(args, rawArgs);
      sinon.assert.calledOnce(dirExistsStub);
      sinon.assert.calledOnce(fileExistsStub);
      sinon.assert.notCalled(writeStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, null, args, Constants.userMessages.CONFIG_FILE_EXISTS, Constants.messageTypes.ERROR, 'bstack_json_already_exists', null, rawArgs);
    });

    it("create browserstack.json if not already present", () => {
      dirExistsStub = sandbox.stub().yields(true);
      fileExistsStub = sandbox.stub().yields(false);
      writeStub = sandbox.stub();

      const init = proxyquire("../../../../bin/commands/init", {
        "../helpers/utils": {
          sendUsageReport: sendUsageReportStub,
          configCreated: configCreatedStub
        },
        "../helpers/fileHelpers": {
          dirExists: dirExistsStub,
          fileExists: fileExistsStub,
          write: writeStub,
        },
      });

      init(args, rawArgs);
      sinon.assert.calledOnce(dirExistsStub);
      sinon.assert.calledOnce(fileExistsStub);
      sinon.assert.calledOnce(writeStub);
    });
  });
});
