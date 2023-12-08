"use strict";
const chai = require("chai"),
  expect = chai.expect,
  rewire = require("rewire"),
  chaiAsPromised = require("chai-as-promised"),
  chalk = require('chalk'),
  request = require("request");

const sinon = require("sinon");

chai.use(chaiAsPromised);

var syncSpecsLogs = rewire("../../../../../bin/helpers/sync/syncSpecsLogs.js");
var logger = require("../../../../../bin/helpers/logger").syncCliLogger;
var Constants = require("../../../../../bin/helpers/constants.js");
var config = require("../../../../../bin/helpers/config.js");
var utils = require("../../../../../bin/helpers/utils");

describe("syncSpecsLogs", () => {
  var sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sinon.stub(utils, 'sendUsageReport');
  });

  afterEach(() => {
    sandbox.restore();
    utils.sendUsageReport.restore();
  });

  context("getCombinationName", () => {
    const get_path = syncSpecsLogs.__get__("getCombinationName");;
    let spec = {
      "os": "Windows",
      "osVersion": "10",
      "browser": "chrome",
      "browserVersion": "86"
    }
    it("returns combination name", () => {
      let expectedCombination = `Chrome 86 (Windows 10)`;
      expect(get_path(spec)).to.equal(expectedCombination);
    });
  });

  context("getStatus", () => {
    const getStatus = syncSpecsLogs.__get__("getStatus");;

    it("returns return ✔ in green when status is passes", () => {
      expect(getStatus("passed")).to.equal(chalk.green("✔"));
    });

    it("returns return ✘ in red when status is failed", () => {
      expect(getStatus("failed")).to.equal(chalk.red("✘"));
    });

    it("returns return [status] in yellow when status is skipped or ignored (anything else from pass/fail)", () => {
      expect(getStatus("skipped")).to.equal(chalk.blue("[skipped]"));
      expect(getStatus("ignored")).to.equal(chalk.blue("[ignored]"));
    });
  });

  context("printInitialLog", () => {
    const printInitialLog = syncSpecsLogs.__get__("printInitialLog");

    it("should print inital logs for specs in sync", () => {

      printInitialLog()

      expect(syncSpecsLogs.__get__("n")).to.equal(Constants.syncCLI.INITIAL_DELAY_MULTIPLIER);
      expect(syncSpecsLogs.__get__("startTime")).to.not.be.null;

    });
  });

  context("getOptions", () => {
    const getOptions = syncSpecsLogs.__get__("getOptions");
    let auth = {username: "cypress", access_key: "abcd"}
    let build_id = "build1"

    it('should return proper request option for polling', () => {
      let options = getOptions(auth, build_id);
      expect(options.url).to.equal(`${config.buildUrlV2}${build_id}`);
      expect(options.auth.user).to.equal(auth.username);
      expect(options.auth.password).to.equal(auth.access_key);
      expect(options.headers["Content-Type"]).to.equal("application/json");
    });
  });

  context("addCustomErrorToPrint", () => {
    const addCustomErrorToPrint = syncSpecsLogs.__get__("addCustomErrorToPrint");
    let specSummary = {
      "buildError": null,
      "specs": [],
      "duration": null,
      "parallels": null,
      "cliDuration": null,
      "customErrorsToPrint": [
        { id: "custom_error_1", type: "custom_errors_to_print", level: "warn", should_be_unique: true, message: "custom error message" }
      ]
    }
    const uniqueError = { id: "custom_error_1", type: "custom_errors_to_print", level: "warn", should_be_unique: true, message: "custom error message" };
    const notUniqueError = { id: "custom_error_2", type: "custom_errors_to_print", level: "warn", should_be_unique: false, message: "custom error message" };

    it('should add a new Error if its meant to be unique and not added to the error list', () => {
      addCustomErrorToPrint(uniqueError);
      expect(JSON.stringify(syncSpecsLogs.__get__("specSummary"))).to.equal(JSON.stringify(specSummary));
    });

    it('should not add a new Error if its meant to be unique and already added to the error list', () => {
      addCustomErrorToPrint(uniqueError);
      expect(JSON.stringify(syncSpecsLogs.__get__("specSummary"))).to.equal(JSON.stringify(specSummary));
    });

    it('should add a new Error if its not meant to be unique and not added to the error list', () => {
      addCustomErrorToPrint(notUniqueError);
      specSummary.customErrorsToPrint.push(notUniqueError);
      expect(JSON.stringify(syncSpecsLogs.__get__("specSummary"))).to.equal(JSON.stringify(specSummary));
    });

    it('should not add a new Error if its not meant to not be unique and already added to the error list', () => {
      addCustomErrorToPrint(notUniqueError);
      specSummary.customErrorsToPrint.push(notUniqueError);
      expect(JSON.stringify(syncSpecsLogs.__get__("specSummary"))).to.equal(JSON.stringify(specSummary));
    });
  });

  context("getTableConfig", () => {
    const getTableConfig = syncSpecsLogs.__get__("getTableConfig");

    it('should return proper table config option for spec table', () => {
      var getBorderConfigStub = sandbox.stub();
      syncSpecsLogs.__set__('getBorderConfig', getBorderConfigStub);

      const columns = 10
      // process.stdout.columns is giving `undefined` value in unit test job.
      // Hardcoding the columns value to 10 and not using process.stdout.columns
      let options = getTableConfig((columns) * 0.9);
      expect(options.columnDefault.width).to.equal(Math.floor(((columns) * 0.9) * 0.2));
      expect(options.columns[1].alignment).to.equal('center');
      expect(options.columns[2].alignment).to.equal('left');
      expect(options.columns[1].width).to.equal(Math.ceil(((columns) * 0.9) * 0.01));
      expect(options.columns[2].width).to.equal(Math.floor(((columns) * 0.9) * 0.75));
      expect(options.columnCount).to.equal(3);
      expect(getBorderConfigStub.calledOnce).to.be.true;
    });

    it('should return proper table config option for spec table if process.stdout.columns is not defined', () => {
      var getBorderConfigStub = sandbox.stub();
      syncSpecsLogs.__set__('getBorderConfig', getBorderConfigStub);

      let options = getTableConfig(NaN);
      expect(options.columnDefault.width).to.equal(30);
      expect(options.columns[1].alignment).to.equal('center');
      expect(options.columns[2].alignment).to.equal('left');
      expect(options.columns[1].width).to.equal(1);
      expect(options.columns[2].width).to.equal(100);
      expect(options.columnCount).to.equal(3);
      expect(getBorderConfigStub.calledOnce).to.be.true;
    });
  });

  context("getBorderConfig", () => {
    const getBorderConfig = syncSpecsLogs.__get__("getBorderConfig");

    it('should return proper border option for spec table', () => {
      let options = getBorderConfig();
      expect(options.topBody).to.equal("");
      expect(options.bottomBody).to.equal("");
    });
  });

  context("writeToTable", () => {
    const writeToTable = syncSpecsLogs.__get__("writeToTable");

    it('should print spec details to the table', () => {
      const stream = sandbox.stub();
      stream.write = sandbox.stub();
      syncSpecsLogs.__set__('stream', stream);
      let combination = "Windows 10", path = "path", status = "passed", statusMark = "passed";
      writeToTable(combination, path, status, statusMark);
      sinon.assert.calledOnceWithExactly(stream.write, [combination , ":", `${path} ${statusMark} [${status}]`]);
    });
  });

  context("addSpecToSummary", () => {
    const addSpecToSummary = syncSpecsLogs.__get__("addSpecToSummary");

    it('should add spec details to specSummary', () => {
      let specSummary = { specs: [] }
      syncSpecsLogs.__set__('specSummary', specSummary);
      let specName = "spec", status = "status", combination = "combo", session_id = "id";
      addSpecToSummary(specName, status, combination, session_id);
      expect(specSummary.specs).deep.to.equal([{"specName": specName, "status": status, "combination": combination, "sessionId": session_id}])
    });
  });

  context("printSpecData", () => {
    const printSpecData = syncSpecsLogs.__get__("printSpecData");

    it('Should print combination and status to the spec table and add spec details to spec array', () => {
      let data = { spec: { status: "passed" }, path: "path", session_id: "id" }
      var getCombinationName = sandbox.stub();
      syncSpecsLogs.__set__('getCombinationName', getCombinationName);
      var getStatus = sandbox.stub();
      syncSpecsLogs.__set__('getStatus', getStatus);
      var writeToTable = sandbox.stub();
      syncSpecsLogs.__set__('writeToTable', writeToTable);
      var addSpecToSummary = sandbox.stub();
      syncSpecsLogs.__set__('addSpecToSummary', addSpecToSummary);


      printSpecData(data);
      sinon.assert.calledOnceWithExactly(getCombinationName, data["spec"]);
      sinon.assert.calledOnceWithExactly(getStatus, data["spec"]["status"]);
      sinon.assert.calledOnce(writeToTable);
      sinon.assert.calledOnce(addSpecToSummary);
    });
  });


  context("showSpecsStatus", () => {
    const showSpecsStatus = syncSpecsLogs.__get__("showSpecsStatus");
    const buildCreatedStatusCode = 202
    const buildRunningStatusCode = 204
    const buildCompletedStatusCode = 200

    it('should not print initial log for running specs when it is the 1st polling response', () => {
      let data = JSON.stringify({ "specData": ["created"], "buildData": {"duration": "NA", "parallels": "NA"}})
      var printInitialLog = sandbox.stub();
      syncSpecsLogs.__set__('printInitialLog', printInitialLog);

      showSpecsStatus(data, buildCreatedStatusCode);

      expect(printInitialLog.calledOnce).to.be.false;
    });

    it('should print spec details when spec related data is sent in polling response', () => {
      let specResult = JSON.stringify({"path": "path"})
      let data = JSON.stringify({ "specData": [specResult], "buildData": {"duration": "NA", "parallels": "NA"}})
      var printSpecData = sandbox.stub();
      syncSpecsLogs.__set__('printSpecData', printSpecData);
      showSpecsStatus(data, buildRunningStatusCode);
      expect(printSpecData.calledOnce).to.be.true;
    });

    it('should print initial and spec details when spec related data is sent in polling response', () => {
      let specResult = JSON.stringify({"path": "path"})
      syncSpecsLogs.__set__('buildStarted', false)
      let data = JSON.stringify({ "specData": [specResult], "buildData": {"duration": "NA", "parallels": "NA"}})
      var printSpecData = sandbox.stub();
      syncSpecsLogs.__set__('printSpecData', printSpecData);
      var printInitialLog = sandbox.stub();
      syncSpecsLogs.__set__('printInitialLog', printInitialLog);
      showSpecsStatus(data, buildCreatedStatusCode);
      expect(printSpecData.calledOnce).to.be.true;
      expect(printInitialLog.calledOnce).to.be.true;
    });

    it('should add custom error, print initial and spec details when spec related data is sent in polling response', () => {
      let specResult = JSON.stringify({"path": "path"})
      let customError = { id: "custom_error_1", type: "custom_errors_to_print", level: "warn", should_be_unique: true, message: "custom error message" }
      syncSpecsLogs.__set__('buildStarted', false)
      let data = JSON.stringify({ "specData": ["created", specResult, customError], "buildData": {"duration": "NA", "parallels": "NA"}})
      var printSpecData = sandbox.stub();
      syncSpecsLogs.__set__('printSpecData', printSpecData);
      var printInitialLog = sandbox.stub();
      syncSpecsLogs.__set__('printInitialLog', printInitialLog);
      var addCustomErrorToPrint = sandbox.stub();
      syncSpecsLogs.__set__('addCustomErrorToPrint', addCustomErrorToPrint);
      showSpecsStatus(data, buildRunningStatusCode);
      expect(printSpecData.calledOnce).to.be.true;
      expect(printInitialLog.calledOnce).to.be.true;
      expect(addCustomErrorToPrint.calledOnce).to.be.true;
    });
  });

  context("printSpecsStatus", () => {
    const printSpecsStatus = syncSpecsLogs.__get__("printSpecsStatus");
    let startTime = Date.now(), endTime = Date.now() + 10, counter = 0;
    let specSummary = { specs: [] }, getOptions, getTableConfig, tableStream, whileProcess;

    beforeEach(() => {
      counter = 0;

      getOptions = sandbox.stub();
      syncSpecsLogs.__set__('getOptions', getOptions);

      getTableConfig = sandbox.stub();
      syncSpecsLogs.__set__('getTableConfig', getTableConfig);

      tableStream = sandbox.stub();
      syncSpecsLogs.__set__('tableStream', tableStream);

      whileProcess = sandbox.stub().callsFake(function (whilstCallback) {
        counter++
        if(counter >= 3) {
          syncSpecsLogs.__set__('whileLoop', false);
          whilstCallback(new Error("ggg"), {});
        } else {whileProcess(whilstCallback, 10, null)}
      });

      syncSpecsLogs.__set__('whileProcess', whileProcess);
    });

    it('Should not loop when whileLoop is false and set duration correctly', () => {
      syncSpecsLogs.__set__('whileLoop', false);
      syncSpecsLogs.__set__('startTime', startTime);
      syncSpecsLogs.__set__('endTime', endTime);
      syncSpecsLogs.__set__('specSummary', specSummary);

      return printSpecsStatus({}, {}).then((specSummary) => {
        expect(getOptions.calledOnce).to.be.true;
        expect(getTableConfig.calledOnce).to.be.true;
        expect(tableStream.calledOnce).to.be.true;
        expect(whileProcess.calledOnce).to.be.false;
        expect(specSummary.specs).deep.to.equal([])
        expect(specSummary.cliDuration).to.eql(endTime - startTime);
      });
    });

    it('Should loop when whileLoop is true until it becomes false', () => {
      syncSpecsLogs.__set__('whileLoop', true);
      syncSpecsLogs.__set__('startTime', startTime);
      syncSpecsLogs.__set__('endTime', endTime);
      syncSpecsLogs.__set__('specSummary', specSummary);

      return printSpecsStatus({}, {}).then((specSummary) => {
        expect(getOptions.calledOnce).to.be.true;
        expect(getTableConfig.calledOnce).to.be.true;
        expect(tableStream.calledOnce).to.be.true;
        expect(whileProcess.callCount).to.eql(3);
        expect(specSummary.cliDuration).to.eql(endTime - startTime);
      });
    });
  });

  context("whileProcess", () => {
    const whileProcess = syncSpecsLogs.__get__("whileProcess");

    it('Should retry when request fails with error', () => {
      let delayed_n = 2, timeout = 3000, n = 1;
      let error = new Error("error");

      let requestStub = sandbox.stub();

      let postStub = sandbox
        .stub(request, "post")
        .yields(error, { statusCode: 502 }, JSON.stringify({}));

      requestStub.post = postStub;

      let setTimeout = sandbox.stub();
      syncSpecsLogs.__set__('setTimeout', setTimeout);
      syncSpecsLogs.__set__('n', n);
      syncSpecsLogs.__set__('timeout', timeout);
      syncSpecsLogs.__set__('request', requestStub);
      syncSpecsLogs.__set__('whileTries', 5);

      let whilstCallback = sandbox.stub();
      whileProcess(whilstCallback);

      sinon.assert.calledWith(setTimeout, whilstCallback, timeout * delayed_n, null);
      expect(syncSpecsLogs.__get__("whileTries")).to.equal(4);
    });

    it('Should exit after defined number of retries in case of error', () => {
      let error = new Error("error"), requestStub = sandbox.stub();

      let postStub = sandbox
        .stub(request, "post")
        .yields(error, { statusCode: 502 }, JSON.stringify({}));

      requestStub.post = postStub;

      syncSpecsLogs.__set__('request', requestStub);
      syncSpecsLogs.__set__('whileTries', 1);
      syncSpecsLogs.__set__('specSummary', {});
      syncSpecsLogs.__set__('whileLoop', true);

      let whilstCallback = sandbox.stub();
      whileProcess(whilstCallback);

      sinon.assert.calledWith(whilstCallback, { status: 504, message: "Tries limit reached" });
      expect(syncSpecsLogs.__get__("whileTries")).to.equal(0);
      expect(syncSpecsLogs.__get__("whileLoop")).to.equal(false);
      expect(syncSpecsLogs.__get__("specSummary.exitCode")).to.equal(2);
    });

    it('Should print spec details when data is returned from server', () => {
      let error = null, body={}, status = 202, n = 1, delayed_n = 2, timeout = 3000;
      let requestStub = sandbox.stub();
      let postStub = sandbox
        .stub(request, "post")
        .yields(error, { statusCode: status }, JSON.stringify(body));
      requestStub.post = postStub;
      syncSpecsLogs.__set__('request', requestStub);

      let showSpecsStatus = sandbox.stub();
      syncSpecsLogs.__set__('showSpecsStatus', showSpecsStatus);

      let setTimeout = sandbox.stub();
      syncSpecsLogs.__set__('setTimeout', setTimeout);
      syncSpecsLogs.__set__('n', n);
      syncSpecsLogs.__set__('timeout', timeout);

      let whilstCallback = sandbox.stub();
      whileProcess(whilstCallback);

      expect(syncSpecsLogs.__get__("n")).to.equal(delayed_n);
      sinon.assert.calledWith(setTimeout, whilstCallback, timeout * delayed_n, null);
      sinon.assert.calledWith(showSpecsStatus, JSON.stringify(body));
    });

    it('Should poll for data when server responds with no data available', () => {
      let error = null, body={}, status = 204, n = 1, delayed_n = 1, timeout = 3000;
      let requestStub = sandbox.stub();
      let postStub = sandbox
        .stub(request, "post")
        .yields(error, { statusCode: status }, JSON.stringify(body));
      requestStub.post = postStub;
      syncSpecsLogs.__set__('request', requestStub);

      let showSpecsStatus = sandbox.stub();
      syncSpecsLogs.__set__('showSpecsStatus', showSpecsStatus);

      let setTimeout = sandbox.stub();
      syncSpecsLogs.__set__('setTimeout', setTimeout);
      syncSpecsLogs.__set__('n', n);
      syncSpecsLogs.__set__('timeout', timeout);

      let whilstCallback = sandbox.stub();
      whileProcess(whilstCallback);

      expect(syncSpecsLogs.__get__("n")).to.equal(delayed_n);
      sinon.assert.calledWith(setTimeout, whilstCallback, timeout * delayed_n, null);
    });

    it('Should stop polling for data when server responds build is completed', () => {
      let error = null, body={}, status = 200, n = 1, timeout = 3000;
      let requestStub = sandbox.stub();
      let postStub = sandbox.stub(request, "post").yields(error, { statusCode: status }, JSON.stringify(body));
      requestStub.post = postStub;
      syncSpecsLogs.__set__('request', requestStub);

      let showSpecsStatus = sandbox.stub();
      syncSpecsLogs.__set__('showSpecsStatus', showSpecsStatus);

      syncSpecsLogs.__set__('whileLoop', true);
      syncSpecsLogs.__set__('n', n);
      syncSpecsLogs.__set__('timeout', timeout);

      let whilstCallback = sandbox.stub();
      whileProcess(whilstCallback);

      expect(syncSpecsLogs.__get__("whileLoop")).to.be.false;
      sinon.assert.calledWith(whilstCallback, null, JSON.stringify(body));
      sinon.assert.calledWith(showSpecsStatus, JSON.stringify(body));
    });

    it('Should stop polling for data when server responds with error ', () => {
      let error = null, body={}, status = 404, n = 1, timeout = 3000;
      let requestStub = sandbox.stub();
      let postStub = sandbox.stub(request, "post").yields(error, { statusCode: status }, JSON.stringify(body));
      requestStub.post = postStub;
      syncSpecsLogs.__set__('request', requestStub);

      let showSpecsStatus = sandbox.stub();
      syncSpecsLogs.__set__('showSpecsStatus', showSpecsStatus);

      syncSpecsLogs.__set__('whileLoop', true);
      syncSpecsLogs.__set__('n', n);
      syncSpecsLogs.__set__('timeout', timeout);

      let whilstCallback = sandbox.stub();
      whileProcess(whilstCallback);

      expect(syncSpecsLogs.__get__("whileLoop")).to.be.false;
      sinon.assert.calledWith(whilstCallback, {message: JSON.stringify(body), status: status});
    });
  });
});
