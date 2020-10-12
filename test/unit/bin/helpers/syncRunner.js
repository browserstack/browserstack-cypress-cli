const chai = require("chai"),
  sinon = require("sinon"),
  chaiAsPromised = require("chai-as-promised"),
  rewire = require("rewire");

const logger = require("../../../../bin/helpers/logger").winstonLogger,
  testObjects = require("../../support/fixtures/testObjects");

const syncRunner = rewire("../../../../bin/helpers/syncRunner");

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

logBuildDetails = syncRunner.__get__("logBuildDetails");

describe("syncRunner", () => {
  var sandbox, winstonLoggerStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    winstonLoggerStub = sinon.stub(logger, "log").callsFake(() => {});
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

      sinon.assert.calledThrice(winstonLoggerStub);
      sinon.assert.calledWithMatch(winstonLoggerStub, 'info', `Browser Combinations: ${buildDetails.combinations}`);
      sinon.assert.calledWithMatch(winstonLoggerStub, 'info', `Run in parallel: enabled (attempting to run on ${buildDetails.machines} machines)`);
      sinon.assert.calledWithMatch(winstonLoggerStub, 'info', `BrowserStack Dashboard: ${buildDetails.dashboard_url}`);
    });
    it("parallels not defined", () => {
      logBuildDetails(testObjects.sampleBsConfig, buildDetails);

      sinon.assert.calledThrice(winstonLoggerStub);
      sinon.assert.calledWithMatch(winstonLoggerStub, 'info', `Browser Combinations: ${buildDetails.combinations}`);
      sinon.assert.calledWithMatch(winstonLoggerStub, 'info', `Run in parallel: disabled`);
      sinon.assert.calledWithMatch(winstonLoggerStub, 'info', `BrowserStack Dashboard: ${buildDetails.dashboard_url}`);
    });
  });
});
