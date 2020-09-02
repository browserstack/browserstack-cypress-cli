'use strict';
const path = require('path');

const chai = require("chai"),
  expect = chai.expect,
  sinon = require('sinon'),
  chaiAsPromised = require("chai-as-promised");

const utils = require('../../../../bin/helpers/utils'),
  constant = require('../../../../bin/helpers/constants'),
  logger = require('../../../../bin/helpers/logger').winstonLogger,
  testObjects = require("../../support/fixtures/testObjects");

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
      expect(utils.getErrorCodeFromMsg(constant.validationMessages.EMPTY_CYPRESS_PROJ_DIR)).to.eq("bstack_json_invalid_no_cypress_proj_dir");
      expect(utils.getErrorCodeFromMsg(constant.validationMessages.INVALID_DEFAULT_AUTH_PARAMS)).to.eq("bstack_json_default_auth_keys");
      expect(utils.getErrorCodeFromMsg(constant.validationMessages.INVALID_PARALLELS_CONFIGURATION)).to.eq("invalid_parallels_specified");
      expect(utils.getErrorCodeFromMsg(constant.validationMessages.LOCAL_NOT_SET)).to.eq("cypress_json_base_url_no_local");
      expect(utils.getErrorCodeFromMsg(constant.validationMessages.INCORRECT_DIRECTORY_STRUCTURE)).to.eq("invalid_directory_structure");
      expect(utils.getErrorCodeFromMsg("Please use --config-file <path to browserstack.json>.")).to.eq("bstack_json_path_invalid");
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

  describe("isAbsolute", () => {
    it("should return true when path is absolute", () => {
      expect(utils.isAbsolute("/Absolute/Path")).to.be.true;
    });

    it("should return false when path is relative", () => {
      expect(utils.isAbsolute("../Relative/Path")).to.be.false;
    });
  });

  describe("getConfigPath", () => {
    it("should return given path, when path is absolute", () => {
      expect(utils.getConfigPath("/Absolute/Path")).to.be.eq("/Absolute/Path");
    });

    it("should return path joined with current dir path, when path is relative", () => {
      let configPath = "../Relative/Path"
      expect(utils.getConfigPath(configPath)).to.be.eq(path.join(process.cwd(), configPath));
    });
  });

  describe("configCreated", () => {
    let args = testObjects.initSampleArgs;

    it("should call sendUsageReport", () => {
      sandbox = sinon.createSandbox();
      sendUsageReportStub = sandbox.stub(utils, "sendUsageReport").callsFake(function () {
        return "end";
      });
      utils.configCreated(args);
      sinon.assert.calledOnce(sendUsageReportStub);
    });
  });

  describe("setBuildName", () => {
    it("sets the build name from args list", () => {
      let argBuildName = "argBuildName";
      let bsConfig = {
        run_settings: {
          build_name: "build_name"
        }
      };
      let args = {
        'build-name': argBuildName
      };

      utils.setBuildName(bsConfig, args);
      expect(bsConfig.run_settings.build_name).to.be.eq(argBuildName);
    });
  });

  describe("setUsername", () => {
    it("sets the username from args list", () => {
      let argUserName = "argUserName";
      let bsConfig = {
        auth: {
          username: "username"
        }
      };
      let args = {
        username: argUserName
      };

      utils.setUsername(bsConfig, args);
      expect(bsConfig.auth.username).to.be.eq(argUserName);
    });
  });

  describe("setAccessKey", () => {
    it("sets the access key from args list", () => {
      let argAccessKey = "argAccessKey";
      let bsConfig = {
        auth: {
          access_key: "access_key"
        }
      };
      let args = {
        key: argAccessKey
      };

      utils.setAccessKey(bsConfig, args);
      expect(bsConfig.auth.access_key).to.be.eq(argAccessKey);
    });
  });

  describe("setUserSpecs", () => {
    it("sets the specs from args list without space after comma with single space in given list", () => {
      let argsSpecs = "spec3, spec4";
      let bsConfig = {
        run_settings: {
          specs: "spec1, spec2"
        }
      };
      let args = {
        specs: argsSpecs
      };

      utils.setUserSpecs(bsConfig, args);
      expect(bsConfig.run_settings.specs).to.be.eq('spec3,spec4');
    });

    it("sets the specs from args list without space after comma with spaces in given list", () => {
      let argsSpecs = "spec3 , spec4";
      let bsConfig = {
        run_settings: {
          specs: "spec1, spec2"
        }
      };
      let args = {
        specs: argsSpecs
      };

      utils.setUserSpecs(bsConfig, args);
      expect(bsConfig.run_settings.specs).to.be.eq('spec3,spec4');
    });

    it("sets the specs list from specs key without space after comma with once space after comma in given list", () => {
      let bsConfig = {
        run_settings: {
          specs: "spec1, spec2"
        }
      };
      let args = {
        specs: null
      };

      utils.setUserSpecs(bsConfig, args);
      expect(bsConfig.run_settings.specs).to.be.eq('spec1,spec2');
    });

    it("sets the specs list from specs key without space after comma with extra space in given list", () => {
      let bsConfig = {
        run_settings: {
          specs: "spec1 , spec2"
        }
      };
      let args = {
        specs: null
      };

      utils.setUserSpecs(bsConfig, args);
      expect(bsConfig.run_settings.specs).to.be.eq('spec1,spec2');
    });

    it("sets the specs list from specs key array without space with comma", () => {
      let bsConfig = {
        run_settings: {
          specs: ["spec1", "spec2"]
        }
      };
      let args = {
        specs: null
      };

      utils.setUserSpecs(bsConfig, args);
      expect(bsConfig.run_settings.specs).to.be.eq('spec1,spec2');
    });

    it("does not set the specs list if no specs key specified", () => {
      let bsConfig = {
        run_settings: {
        }
      };
      let args = {
        specs: null
      };

      utils.setUserSpecs(bsConfig, args);
      expect(bsConfig.run_settings.specs).to.be.eq(null);
    });
  });

  describe("setTestEnvs", () => {
    it("sets env only from args", () => {
      let argsEnv = "env3=value3, env4=value4";
      let bsConfig = {
        run_settings: {
          env: "env1=value1, env2=value2"
        }
      };
      let args = {
        env: argsEnv
      };

      utils.setTestEnvs(bsConfig, args);
      expect(bsConfig.run_settings.env).to.be.eq('env3=value3,env4=value4');
    });

    it("sets env from args without spaces in it", () => {
      let argsEnv = "env3=value3 , env4=value4";
      let bsConfig = {
        run_settings: {
          env: "env1=value1 , env2=value2"
        }
      };
      let args = {
        env: argsEnv
      };

      utils.setTestEnvs(bsConfig, args);
      expect(bsConfig.run_settings.env).to.be.eq('env3=value3,env4=value4');
    });

    it("does not set env if not specified in args", () => {
      let argsEnv = "env3=value3 , env4=value4";
      let bsConfig = {
        run_settings: {
          env: "env1=value1 , env2=value2"
        }
      };
      let args = {
        env: null
      };

      utils.setTestEnvs(bsConfig, args);
      expect(bsConfig.run_settings.env).to.be.eq(null);
    });
  });

  describe("fixCommaSeparatedString", () => {
    it("string with spaces after comma", () => {
      let commaString = "string1, string2";
      let result = utils.fixCommaSeparatedString(commaString);
      expect(result).to.be.eq('string1,string2');
    });

    it("string with spaces around comma", () => {
      let commaString = "string1 , string2";
      let result = utils.fixCommaSeparatedString(commaString);
      expect(result).to.be.eq('string1,string2');
    });

    it("string with 2 spaces around comma", () => {
      let commaString = "string1  ,  string2";
      let result = utils.fixCommaSeparatedString(commaString);
      expect(result).to.be.eq('string1,string2');
    });
  });

  describe("isCypressProjDirValid", () => {
    it("should return true when cypressDir and cypressProjDir is same", () =>{
      expect(utils.isCypressProjDirValid("/absolute/path","/absolute/path")).to.be.true;
    });

    it("should return true when cypressProjDir is child directory of cypressDir", () =>{
      expect(utils.isCypressProjDirValid("/absolute/path","/absolute/path/childpath")).to.be.true;
    });

    it("should return false when cypressProjDir is not child directory of cypressDir", () =>{
      expect(utils.isCypressProjDirValid("/absolute/path","/absolute")).to.be.false;
    });
  });

  describe("getLocalFlag", () => {
    it("should return false if connectionSettings is undefined", () => {
      expect(utils.getLocalFlag(undefined)).to.be.false;
    });

    it("should return false if connectionSettings.local is undefined", () => {
      expect(utils.getLocalFlag({})).to.be.false;
    });

    it("should return false if connectionSettings.local is false", () => {
      expect(utils.getLocalFlag({"local": false})).to.be.false;
    });

    it("should return true if connectionSettings.local is true", () => {
      expect(utils.getLocalFlag({"local": true})).to.be.true;
    });
  });
});
