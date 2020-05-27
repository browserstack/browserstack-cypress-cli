"use strict";
const path = require("path");

const chai = require("chai"),
  expect = chai.expect,
  chaiAsPromised = require("chai-as-promised");

const fileHelpers = require("../../../../bin/helpers/fileHelpers"),
  constant = require("../../../../bin/helpers/constants"),
  logger = require("../../../../bin/helpers/logger").winstonLogger;

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("fileHelpers", () => {
  // describe("isEmpty", () => {
  //   beforeEach(function() {
      
  //   });

  //   it("return true if directory is empty", () => {
  //     expect(fileHelpers.isEmpty()).to.be.eql(true);
  //   });
  // });

  // describe("isDirectory", () => {
  //   beforeEach(function () {});

  //   it("return true if path is directory", () => {
  //     expect(fileHelpers.isDirectory(path.join(process.cwd(), 'test', 'test_files'))).to.be.eql(true);
  //   });

  //   it("return false if path is not a directory", () => {
  //     expect(fileHelpers.isDirectory(path.join(process.cwd(), 'test', 'test_files', 'dummy_bstack.json'))).to.be.eql(false);
  //   });
  // });

  // describe("fileExists", () => {
  //   beforeEach(function () {});

  //   it("return true if directory is empty", () => {
  //     expect(fileHelpers.fileExists(path.join(process.cwd(), 'test', 'test_files', 'dummy_bstack.json'), function() {})).to.be.eql(true);
  //   });
  // });
});
