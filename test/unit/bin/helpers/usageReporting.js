const cp = require("child_process"),
  fs = require("fs");

const chai = require("chai"),
  expect = chai.expect,
  assert = chai.assert,
  sinon = require("sinon"),
  chaiAsPromised = require("chai-as-promised"),
  rewire = require("rewire");

const logger = require("../../../../bin/helpers/logger").winstonLogger,
  testObjects = require("../../support/fixtures/testObjects");

const usageReporting = rewire("../../../../bin/helpers/usageReporting");

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

_os = usageReporting.__get__("_os");
os_version = usageReporting.__get__("os_version");
isUsageReportingEnabled = usageReporting.__get__("isUsageReportingEnabled");
npm_version = usageReporting.__get__("npm_version");
get_version = usageReporting.__get__("get_version");
ci_environment = usageReporting.__get__("ci_environment");
local_cypress_version = usageReporting.__get__("local_cypress_version");
bstack_json_found_in_pwd = usageReporting.__get__("bstack_json_found_in_pwd");
cypress_json_found_in_pwd = usageReporting.__get__("cypress_json_found_in_pwd");
npm_global_path = usageReporting.__get__("npm_global_path");
cli_version_and_path = usageReporting.__get__("cli_version_and_path");

describe("usageReporting", () => {
  describe("_os", () => {
    it("should return string", () => {
      assert.typeOf(_os(), "string");
    });
    it("should never be null", () => {
      expect(_os()).to.not.be.null;
    });
  });

  describe("os_version", () => {
    it("should return string", () => {
      assert.typeOf(os_version(), "string");
    });
    it("should never be null", () => {
      expect(os_version()).to.not.be.null;
    });
  });

  describe("npm_version", () => {
    var sandbox;

    before(() => {
      sandbox = sinon.createSandbox();
    });

    after(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("should return string if found version", () => {
      let execSyncStub = sandbox.stub(cp, "execSync").returns("random string");

      let result = npm_version();
      sinon.assert.calledOnce(execSyncStub);
      assert.typeOf(result, "string");

      execSyncStub.restore();
    });

    it("should return null in case of error", () => {
      let execSyncStub = sandbox.stub(cp, "execSync").yields(new Error("random error"));

      let result = npm_version();
      sinon.assert.calledOnce(execSyncStub);
      expect(result).to.be.null;

      execSyncStub.restore();
    });
  });

  describe("local_cypress_version", () => {
    let bsConfig = testObjects.sampleBsConfig;
    var sandbox;

    before(() => {
      sandbox = sinon.createSandbox();
    });

    after(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("should return string if found version if bsConfig not defined", () => {
      let execSyncStub = sandbox.stub(cp, "execSync").returns("random string");

      let result = local_cypress_version(null);
      sinon.assert.calledOnce(execSyncStub);
      assert.typeOf(result, "string");

      execSyncStub.restore();
    });

    it("should return null in case of error if bsConfig not defined", () => {
      let execSyncStub = sandbox
        .stub(cp, "execSync")
        .yields(new Error("random error"));

      let result = local_cypress_version(null);
      sinon.assert.calledOnce(execSyncStub);
      expect(result).to.be.null;

      execSyncStub.restore();
    });

    it("should return string if found version if bsConfig is defined", () => {
      let execSyncStub = sandbox.stub(cp, "execSync").returns("random string");

      let result = local_cypress_version(bsConfig);
      sinon.assert.calledOnce(execSyncStub);
      assert.typeOf(result, "string");

      execSyncStub.restore();
    });

    it("should return null in case of error if bsConfig is defined", () => {
      let execSyncStub = sandbox
        .stub(cp, "execSync")
        .yields(new Error("random error"));

      let result = local_cypress_version(bsConfig);
      sinon.assert.calledTwice(execSyncStub);
      expect(result).to.be.null;

      execSyncStub.restore();
    });
  });

  describe("bstack_json_found_in_pwd", () => {
    var sandbox;

    before(() => {
      sandbox = sinon.createSandbox();
    });

    after(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("should return true file exists", () => {
      let existsSyncStub = sandbox.stub(fs, "existsSync").returns(true);

      let result = bstack_json_found_in_pwd();
      sinon.assert.calledOnce(existsSyncStub);
      assert.equal(result, true);

      existsSyncStub.restore();
    });

    it("should return false if file doesn not exist", () => {
      let existsSyncStub = sandbox.stub(fs, "existsSync").returns(false);

      let result = bstack_json_found_in_pwd();
      sinon.assert.calledOnce(existsSyncStub);
      assert.equal(result, false);

      existsSyncStub.restore();
    });

    it("should return null in case of error", () => {
      let existsSyncStub = sandbox.stub(fs, "existsSync").yields(new Error("random error"));

      let result = bstack_json_found_in_pwd();
      sinon.assert.calledOnce(existsSyncStub);
      expect(result).to.be.null;

      existsSyncStub.restore();
    });
  });

  describe("cypress_json_found_in_pwd", () => {
    var sandbox;

    before(() => {
      sandbox = sinon.createSandbox();
    });

    after(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("should return true file exists", () => {
      let existsSyncStub = sandbox.stub(fs, "existsSync").returns(true);

      let result = cypress_json_found_in_pwd();
      sinon.assert.calledOnce(existsSyncStub);
      assert.equal(result, true);

      existsSyncStub.restore();
    });

    it("should return false if file doesn not exist", () => {
      let existsSyncStub = sandbox.stub(fs, "existsSync").returns(false);

      let result = cypress_json_found_in_pwd();
      sinon.assert.calledOnce(existsSyncStub);
      assert.equal(result, false);

      existsSyncStub.restore();
    });

    it("should return null in case of error", () => {
      let existsSyncStub = sandbox
        .stub(fs, "existsSync")
        .yields(new Error("random error"));

      let result = cypress_json_found_in_pwd();
      sinon.assert.calledOnce(existsSyncStub);
      expect(result).to.be.null;

      existsSyncStub.restore();
    });
  });

  describe("npm_global_path", () => {
    var sandbox;

    before(() => {
      sandbox = sinon.createSandbox();
    });

    after(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("should return string", () => {
      let execSyncStub = sandbox.stub(cp, "execSync").returns("random string");

      let result = npm_global_path();
      sinon.assert.calledOnce(execSyncStub);
      assert.typeOf(result, "string");

      execSyncStub.restore();
    });
  });

  describe("cli_version_and_path", () => {
    let bsConfig = testObjects.sampleBsConfig;
    var sandbox;

    before(() => {
      sandbox = sinon.createSandbox();
    });

    after(() => {
      sandbox.restore();
      sinon.restore();
    });

    it("should return object if cli path and version found in local project and bsConfig is defined", () => {
      let execSyncStub = sandbox.stub(cp, "execSync").returns("random string");

      let result = cli_version_and_path(bsConfig);
      sinon.assert.calledOnce(execSyncStub);
      assert.typeOf(result, "object");
      expect(result).to.have.property("version").that.is.not.null;
      expect(result).to.have.property("path").that.is.not.null;

      execSyncStub.restore();
    });

    it("should return object if cli path and version found globally and bsConfig is defined", () => {
      let execSyncStub = sandbox.stub(cp, "execSync");
      execSyncStub.onCall(0).yields(new Error("random error"));
      execSyncStub.onCall(1).returns("random string");
      execSyncStub.onCall(2).returns("random string 2");

      let result = cli_version_and_path(bsConfig);
      sinon.assert.calledThrice(execSyncStub);
      assert.typeOf(result, "object");
      expect(result).to.have.property("version").that.is.not.null;
      expect(result).to.have.property("path").that.is.not.null;

      execSyncStub.restore();
    });

    it("should return object if cli path and version not found locally as well as globally and bsConfig is defined", () => {
      let execSyncStub = sandbox.stub(cp, "execSync");
      execSyncStub.onCall(0).yields(new Error("random error"));
      execSyncStub.onCall(1).yields(new Error("random error 2"));

      let result = cli_version_and_path(bsConfig);
      sinon.assert.calledTwice(execSyncStub);
      assert.typeOf(result, "object");
      expect(result).to.have.property("version").that.is.null;
      expect(result).to.have.property("path").that.is.null;

      execSyncStub.restore();
    });

    it("should return object if cli path and version found globally and bsConfig is not defined", () => {
      let execSyncStub = sandbox.stub(cp, "execSync").yields(new Error("random error"));

      let result = cli_version_and_path(null);
      sinon.assert.calledOnce(execSyncStub);
      assert.typeOf(result, "object");
      expect(result).to.have.property("version").that.is.null;
      expect(result).to.have.property("path").that.is.null;

      execSyncStub.restore();
    });

    it("should return object if cli path and version not found globally and bsConfig is not defined", () => {
      let execSyncStub = sandbox.stub(cp, "execSync");
      execSyncStub.onCall(0).returns("random string");
      execSyncStub.onCall(1).returns("random string 2");

      let result = cli_version_and_path(null);
      sinon.assert.calledTwice(execSyncStub);
      assert.typeOf(result, "object");
      expect(result).to.have.property("version").that.is.not.null;
      expect(result).to.have.property("path").that.is.not.null;

      execSyncStub.restore();
    });
  });

  describe("isUsageReportingEnabled", () => {
    it("should return string if env var is set", () => {
      process.env.DISABLE_USAGE_REPORTING = true;
      assert.typeOf(isUsageReportingEnabled(), "string");
      delete process.env.DISABLE_USAGE_REPORTING;
    });
    it("should return undefined if env var is not set", () => {
      expect(isUsageReportingEnabled()).to.be.undefined;
    });
  });
  
  describe("ci_environment", () => {
    afterEach(() => {
      delete process.env.JENKINS_URL;
      delete process.env.CI;
      delete process.env.CIRCLECI;
      delete process.env.TRAVIS;
      delete process.env.CI_NAME;
      delete process.env.BITBUCKET_BRANCH;
      delete process.env.BITBUCKET_COMMIT;
      delete process.env.DRONE;
      delete process.env.SEMAPHORE;
      delete process.env.GITLAB_CI;
      delete process.env.BUILDKITE;
      delete process.env.TF_BUILD;
    });
    it("handle jenkins", () => {
      process.env.JENKINS_URL = "sample jenkins url";
      expect(ci_environment()).to.equal("Jenkins");
    });
    it("handle CircleCI", () => {
      process.env.CI = true;
      process.env.CIRCLECI = true;
      expect(ci_environment()).to.equal("CircleCI");
    });
    it("handle Travis CI", () => {
      process.env.CI = true;
      process.env.TRAVIS = true;
      expect(ci_environment()).to.equal("Travis CI");
    });
    it("handle Codeship", () => {
      process.env.CI = true;
      process.env.CI_NAME = "codeship";
      expect(ci_environment()).to.equal("Codeship");
    });
    it("handle Bitbucket", () => {
      process.env.BITBUCKET_BRANCH = true;
      process.env.BITBUCKET_COMMIT = true;
      expect(ci_environment()).to.equal("Bitbucket");
    });
    it("handle Drone", () => {
      process.env.CI = true;
      process.env.DRONE = true;
      expect(ci_environment()).to.equal("Drone");
    });
    it("handle Semaphore", () => {
      process.env.CI = true;
      process.env.SEMAPHORE = true;
      expect(ci_environment()).to.equal("Semaphore");
    });
    it("handle GitLab", () => {
      process.env.CI = true;
      process.env.GITLAB_CI = true;
      expect(ci_environment()).to.equal("GitLab");
    });
    it("handle Buildkite", () => {
      process.env.CI = true;
      process.env.BUILDKITE = true;
      expect(ci_environment()).to.equal("Buildkite");
    });
    it("handle Visual Studio Team Services", () => {
      process.env.TF_BUILD = "True";
      expect(ci_environment()).to.equal("Visual Studio Team Services");
    });
    it("return null in case of no ENV var is set", () => {
      expect(ci_environment()).to.be.null;
    });
  });
});
