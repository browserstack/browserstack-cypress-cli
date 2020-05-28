'use strict';
const path = require('path');

const chai = require("chai"),
  expect = chai.expect,
  chaiAsPromised = require("chai-as-promised");

const utils = require('../../../../bin/helpers/utils'),
  constant = require('../../../../bin/helpers/constants'),
  logger = require('../../../../bin/helpers/logger').winstonLogger;

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("utils", () => {
  describe("getErrorCodeFromMsg", () => {
    it("should return null for errMsg which isn't present in the list", () => {
      expect(utils.getErrorCodeFromMsg("random_value")).to.be.null;
    });

    it(`should return value depending on validation messages`, () => {
      expect(utils.getErrorCodeFromMsg(constant.validationMessages.EMPTY_BROWSERSTACK_JSON)).to.eq("bstack_json_invalid_empty");
      expect(utils.getErrorCodeFromMsg(constant.validationMessages.INCORRECT_AUTH_PARAMS)).to.eq("bstack_json_invalid_missing_keys");
      expect(utils.getErrorCodeFromMsg(constant.validationMessages.EMPTY_BROWSER_LIST)).to.eq("bstack_json_invalid_no_browsers");
      expect(utils.getErrorCodeFromMsg(constant.validationMessages.EMPTY_RUN_SETTINGS)).to.eq("bstack_json_invalid_no_run_settings");
      expect(utils.getErrorCodeFromMsg(constant.validationMessages.EMPTY_SPEC_FILES)).to.eq("bstack_json_invalid_values");
    });
  });

  describe("getErrorCodeFromErr", () => {
    it("should return bstack_json_invalid_unknown if err.Code is not present in the list", () => {
      expect(utils.getErrorCodeFromErr("random_value")).to.be.eq("bstack_json_invalid_unknown");
    });

    it(`should return value depending on validation messages`, () => {
      expect(utils.getErrorCodeFromErr({"code": "SyntaxError"})).to.eq("bstack_json_parse_error");
      expect(utils.getErrorCodeFromErr({"code": "EACCES"})).to.eq("bstack_json_no_permission");
    });
  });

  describe("getUserAgent", () => {
    it("should return string", () => {
      expect(utils.getUserAgent()).to.be.string;
    });
  });

  describe("validateBstackJson", () => {
    it("should reject with SyntaxError for empty file", () => {
      let bsConfigPath = path.join(process.cwd(),'test', 'test_files', 'dummy_bstack.json');
      expect(utils.validateBstackJson(bsConfigPath)).to.be.rejectedWith(SyntaxError);
    });
    it("should resolve with data for valid json", () => {
      let bsConfigPath = path.join(process.cwd(),'test', 'test_files', 'dummy_bstack_2.json');
      expect(utils.validateBstackJson(bsConfigPath)).to.be.eventually.eql({});
    });
    it("should reject with SyntaxError for invalid json file", () => {
      let bsConfigPath = path.join(process.cwd(),'test', 'test_files', 'dummy_bstack_3.json');
      expect(utils.validateBstackJson(bsConfigPath)).to.be.rejectedWith(SyntaxError);
    });
  });

  describe("setUsageReportingFlag", () => {
    beforeEach(function () {
      delete process.env.DISABLE_USAGE_REPORTING;
    });

    afterEach(function () {
      delete process.env.DISABLE_USAGE_REPORTING;
    });

    it("should set env variable if no args are defined", () => {
      utils.setUsageReportingFlag(undefined, undefined);
      expect(process.env.DISABLE_USAGE_REPORTING).to.be.eq("undefined");
    });

    it("should set DISABLE_USAGE_REPORTING=true when disableUsageReporting=true", () => {
      utils.setUsageReportingFlag(undefined, true);
      expect(process.env.DISABLE_USAGE_REPORTING).to.be.eq("true");
    });

    it("should set DISABLE_USAGE_REPORTING=false when disableUsageReporting=false", () => {
      utils.setUsageReportingFlag(undefined, false);
      expect(process.env.DISABLE_USAGE_REPORTING).to.be.eq("false");
    });

    it("should set DISABLE_USAGE_REPORTING=true if defined in bsConfig", () => {
      let bsConfig = {
        "disable_usage_reporting": true,
      };
      utils.setUsageReportingFlag(bsConfig, undefined);
      expect(process.env.DISABLE_USAGE_REPORTING).to.be.eq("true");
    });

    it("should set DISABLE_USAGE_REPORTING=false if defined in bsConfig", () => {
      let bsConfig = {
        "disable_usage_reporting": false,
      };
      utils.setUsageReportingFlag(bsConfig, undefined);
      expect(process.env.DISABLE_USAGE_REPORTING).to.be.eq("false");
    });

    it("should give priority to disableUsageReporting arg", () => {
      let bsConfig = {
        "disable_usage_reporting": true,
      };
      utils.setUsageReportingFlag(bsConfig, false);
      expect(process.env.DISABLE_USAGE_REPORTING).to.be.eq("false");
    });

    it("should handle both bsConfig and disableUsageReporting arg", () => {
      let bsConfig = {
        "disable_usage_reporting": true,
      };
      utils.setUsageReportingFlag(bsConfig, true);
      expect(process.env.DISABLE_USAGE_REPORTING).to.be.eq("true");
    });
  });
});
