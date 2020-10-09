'use strict';
const chai = require("chai"),
  expect = chai.expect,
  chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
const specDetails = require('../../../../../bin/helpers/sync/failedSpecsDetails');

describe("failedSpecsDetails", () => {
  context("data is empty", () => {
    let data = [];
    it('returns 0 exit code', () => {
      return specDetails.failedSpecsDetails(data).then((status) => {
        expect(status).to.equal(0);
      });
    });
  });

  context("data does not have failed specs", () => {
    let data = [
      {specName: 'spec2.name.js', status: 'Skipped', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'}
    ];

    it("returns 0 exit code", () => {
      return specDetails.failedSpecsDetails(data).then((status) => {
        expect(status).to.equal(0);
      });
    });
  });

  context("data has failed specs", () => {
    let data = [
      {specName: 'spec2.name.js', status: 'Failed', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'}
    ];

    it("returns 1 exit code", () => {
      return specDetails.failedSpecsDetails(data)
        .then((status) => {
          chai.assert.equal(status, 1);
          expect(status).to.equal(1);
        }).catch((status) => {
          expect(status).to.equal(1);
      });
    });
  });
});
