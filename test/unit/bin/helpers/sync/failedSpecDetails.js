'use strict';
const chai = require("chai"),
  expect = chai.expect,
  sinon = require('sinon'),
  chaiAsPromised = require("chai-as-promised"),
  fs = require('fs');

const specDetails = require('../../../../../bin/helpers/sync/failedSpecsDetails');

describe("failedSpecsDetails", () => {
  context("data is empty", () => {
    let data = [];
    it('returns 0 exit code', () => {
      specDetails.failedSpecsDetails(data).then((status) => {
        chai.assert.equal(data, 0);
      });
    });
  });

  context("data does not have failed specs", () => {
    let data = [
      {specName: 'spec2.name.js', status: 'Skipped', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'}
    ];

    it("returns 0 exit code", () => {
      specDetails.failedSpecsDetails(data).then((status) => {
        chai.assert.equal(data, 0);
      });
    });
  });
});
