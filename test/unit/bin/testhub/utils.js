const chai = require("chai"),
  sinon = require("sinon");

const testhubUtils = require("../../../../bin/testhub/utils"),
  logger = require("../../../../bin/helpers/logger").winstonLogger;

describe("testhub/utils.js", () => {
  const OBSERVABILITY_ENV = [
    "BROWSERSTACK_TEST_OBSERVABILITY",
    "BROWSERSTACK_TESTHUB_UUID",
    "BROWSERSTACK_TESTHUB_JWT",
    "BS_TESTOPS_BUILD_COMPLETED",
    "BS_TESTOPS_JWT",
    "BS_TESTOPS_BUILD_HASHED_ID",
    "BS_TESTOPS_ALLOW_SCREENSHOTS",
    "BROWSERSTACK_TEST_ACCESSIBILITY",
    "BROWSERSTACK_AUTOMATION",
  ];
  let saved;

  beforeEach(() => {
    saved = {};
    OBSERVABILITY_ENV.forEach((k) => { saved[k] = process.env[k]; });
  });

  afterEach(() => {
    OBSERVABILITY_ENV.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  describe("getProductMap", () => {
    it("reports observability false when the flag is not set to true", () => {
      process.env.BROWSERSTACK_TEST_OBSERVABILITY = "false";
      process.env.BROWSERSTACK_TEST_ACCESSIBILITY = "false";
      process.env.BROWSERSTACK_AUTOMATION = "true";

      chai.assert.deepEqual(testhubUtils.getProductMap({}), {
        observability: false,
        accessibility: false,
        percy: false,
        automate: true,
        app_automate: false,
      });
    });

    it("reports observability true only while the flag says so", () => {
      process.env.BROWSERSTACK_TEST_OBSERVABILITY = "true";
      process.env.BROWSERSTACK_TEST_ACCESSIBILITY = "false";
      process.env.BROWSERSTACK_AUTOMATION = "true";

      chai.assert.isTrue(testhubUtils.getProductMap({}).observability);
    });
  });

  describe("handleErrorForObservability", () => {
    let errorStub;

    beforeEach(() => { errorStub = sinon.stub(logger, "error"); });
    afterEach(() => { errorStub.restore(); });

    it("turns observability off in the product map when build start fails", () => {
      process.env.BROWSERSTACK_TEST_OBSERVABILITY = "true";
      process.env.BROWSERSTACK_TEST_ACCESSIBILITY = "false";
      process.env.BROWSERSTACK_AUTOMATION = "true";
      chai.assert.isTrue(testhubUtils.getProductMap({}).observability, "precondition");

      testhubUtils.handleErrorForObservability();

      chai.assert.equal(process.env.BROWSERSTACK_TEST_OBSERVABILITY, "false");
      chai.assert.isFalse(testhubUtils.getProductMap({}).observability);
    });

    it("leaves the uuid as the null sentinel and marks the build not completed", () => {
      process.env.BROWSERSTACK_TESTHUB_UUID = "some-uuid";
      process.env.BS_TESTOPS_BUILD_COMPLETED = "true";

      testhubUtils.handleErrorForObservability();

      chai.assert.equal(process.env.BROWSERSTACK_TESTHUB_UUID, "null");
      chai.assert.equal(process.env.BS_TESTOPS_BUILD_COMPLETED, "false");
    });

    it("does not report observability as still enabled to shouldProcessEventForTesthub", () => {
      process.env.BROWSERSTACK_TEST_OBSERVABILITY = "true";
      process.env.BROWSERSTACK_TEST_ACCESSIBILITY = "false";

      testhubUtils.handleErrorForObservability();

      chai.assert.isFalse(testhubUtils.shouldProcessEventForTesthub());
    });
  });

  describe("logBuildError", () => {
    let errorStub;

    beforeEach(() => { errorStub = sinon.stub(logger, "error"); });
    afterEach(() => { errorStub.restore(); });

    it("logs a readable message when there is no error object at all", () => {
      testhubUtils.logBuildError(undefined, "observability");
      sinon.assert.calledWith(errorStub, "OBSERVABILITY Build creation failed");
    });

    it("treats a null error the same as a missing one", () => {
      testhubUtils.logBuildError(null, "observability");
      sinon.assert.calledWith(errorStub, "OBSERVABILITY Build creation failed");
    });
  });
});
