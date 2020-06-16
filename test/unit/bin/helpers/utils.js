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

  describe("isParallelValid", () => {
    it("should return false for a float value", () => {
      expect(utils.isParallelValid(1.2)).to.be.equal(false);
      expect(utils.isParallelValid("7.3")).to.be.equal(false);
      expect(utils.isParallelValid(7.33333)).to.be.equal(false);
      expect(utils.isParallelValid("1.2.2.2")).to.be.equal(false);
      expect(utils.isParallelValid("1.456789")).to.be.equal(false);
    });
    
    it("should return false for a string which is not a number", () => {
      expect(utils.isParallelValid("cypress")).to.be.equal(false);
      expect(utils.isParallelValid("browserstack")).to.be.equal(false);
    });

    it("should return false for any negative value less than -1 or zero", () => {
      expect(utils.isParallelValid(-200)).to.be.equal(false);
      expect(utils.isParallelValid("-200")).to.be.equal(false);
      expect(utils.isParallelValid(-1000)).to.be.equal(false);
      expect(utils.isParallelValid("0")).to.be.equal(false);
      expect(utils.isParallelValid(0)).to.be.equal(false);
    });

    it("should return true for any positive value or -1", () => {
      expect(utils.isParallelValid(5)).to.be.equal(true);
      expect(utils.isParallelValid("5")).to.be.equal(true);
      expect(utils.isParallelValid(10)).to.be.equal(true);
      expect(utils.isParallelValid("-1")).to.be.equal(true);
      expect(utils.isParallelValid(-1)).to.be.equal(true);
    });

    it("should return true for undefined", () => {
      expect(utils.isParallelValid(undefined)).to.be.equal(true);
    });
  });

  describe("isFloat", () => {
    it("should return true for a float value", () => {
      expect(utils.isFloat(1.2333)).to.be.equal(true);
      expect(utils.isFloat(-1.2333567)).to.be.equal(true);
      expect(utils.isFloat(0.123456)).to.be.equal(true);
    });

    it("should return false for a non float value", () => {
      expect(utils.isFloat(100)).to.be.equal(false);
      expect(utils.isFloat(-1000)).to.be.equal(false);
      expect(utils.isFloat(333)).to.be.equal(false);
    });
  });

  describe("isUndefined", () => {
    it("should return true for a undefined value", () => {
      expect(utils.isUndefined(undefined)).to.be.equal(true);
      expect(utils.isUndefined(null)).to.be.equal(true);
    });

    it("should return false for a defined value", () => {
      expect(utils.isUndefined(1.234)).to.be.equal(false);
      expect(utils.isUndefined("1.234")).to.be.equal(false);
      expect(utils.isUndefined(100)).to.be.equal(false);
      expect(utils.isUndefined(-1)).to.be.equal(false);
    });
  });

  describe("setParallels", () => {
    it("should set bsconfig parallels equal to value provided in args", () => {
      let bsConfig = {
        "run_settings": {
          "parallels": 10,
        }
      };
      utils.setParallels(bsConfig, {parallels: 100});
      expect(bsConfig['run_settings']['parallels']).to.be.eq(100);
    });

    it("should retain bsconfig parallels if args is undefined", () => {
      let bsConfig = {
        "run_settings": {
          "parallels": 10,
        }
      };
      utils.setParallels(bsConfig, {parallels: undefined});
      expect(bsConfig['run_settings']['parallels']).to.be.eq(10);
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
