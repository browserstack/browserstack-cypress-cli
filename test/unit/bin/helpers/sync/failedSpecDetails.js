'use strict';
const chai = require("chai"),
  expect = chai.expect,
  chaiAsPromised = require("chai-as-promised");

const sinon = require("sinon");
chai.use(chaiAsPromised);
const specDetails = require('../../../../../bin/helpers/sync/failedSpecsDetails');
var logger = require("../../../../../bin/helpers/logger").syncCliLogger;

describe("failedSpecsDetails", () => {
  var sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(logger, 'info');
  });

  afterEach(() => {
    sandbox.restore();
  });

  context("data is empty", () => {
    let data = {
      specs: [],
      exitCode: 0
    };

    it('returns 0 exit code', () => {
      return specDetails.failedSpecsDetails(data).then((result) => {
        expect(result).to.equal(data);
      });
    });
  });

  context("data does not have failed specs", () => {
    let data = {
      specs: [{specName: 'spec2.name.js', status: 'Skipped', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'}],
      exitCode: 0
    };

    it("returns 0 exit code", () => {
      return specDetails.failedSpecsDetails(data).then((result) => {
        expect(result).to.equal(data);
      });
    });
  });

  context("data has failed specs", () => {
    let data = {
      specs: [ {specName: 'spec2.name.js', status: 'Failed', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'},
      {specName: 'spec2.name.js', status: 'Passed', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'}],
      exitCode: 1
    };

    it("returns 1 exit code", () => {
      return specDetails.failedSpecsDetails(data).then((result) => {
        expect(result).to.equal(data);
      });
    });
  });
});
