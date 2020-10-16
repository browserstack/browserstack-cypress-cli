const chai = require("chai"),
  sinon = require("sinon"),
  chaiAsPromised = require("chai-as-promised"),
  rewire = require("rewire");

const logger = require("../../../../bin/helpers/logger").syncCliLogger,
  testObjects = require("../../support/fixtures/testObjects");

const syncRunner = rewire("../../../../bin/helpers/syncRunner");

chai.use(chaiAsPromised);

logBuildDetails = syncRunner.__get__("logBuildDetails");

describe("syncRunner", () => {
  var sandbox, loggerStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    loggerStub = sinon.stub(logger, "log").callsFake(() => {});
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
  });

  describe("logBuildDetails", () => {
    let buildDetails = {
      machines: 10,
      combinations: 5,
      dashboard_url: "random_url",
    };

    it("parallels defined", () => {
      logBuildDetails(testObjects.sampleBsConfigWithParallels, buildDetails);

      sinon.assert.calledThrice(loggerStub);
      sinon.assert.calledWithMatch(loggerStub, 'info', `Browser Combinations: ${buildDetails.combinations}`);
      sinon.assert.calledWithMatch(loggerStub, 'info', `Run in parallel: enabled (attempting to run on ${buildDetails.machines} machines)`);
      sinon.assert.calledWithMatch(loggerStub, 'info', `BrowserStack Dashboard: ${buildDetails.dashboard_url}`);
    });
    it("parallels not defined", () => {
      logBuildDetails(testObjects.sampleBsConfig, buildDetails);

      sinon.assert.calledThrice(loggerStub);
      sinon.assert.calledWithMatch(loggerStub, 'info', `Browser Combinations: ${buildDetails.combinations}`);
      sinon.assert.calledWithMatch(loggerStub, 'info', `Run in parallel: disabled`);
      sinon.assert.calledWithMatch(loggerStub, 'info', `BrowserStack Dashboard: ${buildDetails.dashboard_url}`);
    });
  });
});
