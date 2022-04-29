'use strict';
const chai = require("chai"),
  sinon = require("sinon"),
  expect = chai.expect,
  chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
var logger = require("../../../../../bin/helpers/logger").syncCliLogger;
var winstonLogger = require("../../../../../bin/helpers/logger").winstonLogger;
var specSummary = require('../../../../../bin/helpers/sync/specsSummary');

describe("printSpecsRunSummary", () => {
  context("data is empty", () => {
    let data = { specs: [], duration: 6000, exitCode: 0}, machines = 2;
    it('returns passed specs data', () => {
      return specSummary.printSpecsRunSummary(data, machines).then((specsData) => {
        expect(data.exitCode).to.equal(specsData);
      });
    });
  });

  context("request failure", () => {
    let data = { specs: [], duration: 6000, exitCode: 2}, machines = 2;
    it('returns passed specs data with proper exit code', () => {
      return specSummary.printSpecsRunSummary(data, machines).then((specsData) => {
        expect(data.exitCode).to.equal(specsData);
      });
    });
  });

  context("with data", () => {
    let time = 6000,
        machines = 2,
        specs = [
          {specName: 'spec2.name.js', status: 'Failed', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'},
          {specName: 'spec2.name.js', status: 'Skipped', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'},
          {specName: 'spec2.name.js', status: 'Failed', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'},
          {specName: 'spec2.name.js', status: 'Passed', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'}
        ],
        data = {
          specs: specs,
          duration: time,
          exitCode: 0
        };

    it('returns passed specs data', () => {
      var loggerInfoSpy = sinon.spy(logger, 'info');

      specSummary.printSpecsRunSummary(data, machines);
      sinon.assert.calledWith(loggerInfoSpy, 'Total tests: 4, passed: 1, failed: 2, skipped: 1, passed_with_skipped: 0, pending: 0');
      sinon.assert.calledWith(loggerInfoSpy, `Done in ${time / 1000} seconds using ${machines} machines\n`);

      loggerInfoSpy.restore();
    });
  });

  context("with custom error data", () => {
    let time = 6000,
        machines = 2,
        specs = [
          {specName: 'spec2.name.js', status: 'Failed', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'},
          {specName: 'spec2.name.js', status: 'Skipped', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'},
          {specName: 'spec2.name.js', status: 'Failed', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'},
          {specName: 'spec2.name.js', status: 'Passed', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'}
        ],
        data = {
          specs: specs,
          duration: time,
          exitCode: 0
        },
        customErrorsToPrint = [
          { id: "custom_error", type: "custom_errors_to_print", level: "warn", should_be_unique: true, message: "custom error message" }
        ];

    it('prints the custom error message along with build details', () => {
      var loggerInfoSpy = sinon.spy(logger, 'info');
      var loggerWarnSpy = sinon.spy(winstonLogger, 'warn');

      specSummary.printSpecsRunSummary(data, machines, customErrorsToPrint);
      sinon.assert.calledWith(loggerInfoSpy, 'Total tests: 4, passed: 1, failed: 2, skipped: 1');
      sinon.assert.calledWith(loggerInfoSpy, `Done in ${time / 1000} seconds using ${machines} machines\n`);
      sinon.assert.calledWith(loggerWarnSpy, `custom error message`);

      loggerInfoSpy.restore();
      loggerWarnSpy.restore();
    });
  });
});
