'use strict';
const path = require('path');
const { stub } = require('sinon');
var sandbox = require('sinon').createSandbox();

const request = require('request');
const chai = require('chai'),
  expect = chai.expect,
  sinon = require('sinon'),
  chaiAsPromised = require('chai-as-promised'),
  glob = require('glob'),
  chalk = require('chalk'),
  fs = require('fs');
const getmac = require('getmac').default;
const usageReporting = require('../../../../bin/helpers/usageReporting');
const utils = require('../../../../bin/helpers/utils'),
  constant = require('../../../../bin/helpers/constants'),
  logger = require('../../../../bin/helpers/logger').winstonLogger,
  testObjects = require('../../support/fixtures/testObjects'),
  syncLogger = require("../../../../bin/helpers/logger").syncCliLogger;
const browserstack = require('browserstack-local');
chai.use(chaiAsPromised);
logger.transports['console.info'].silent = true;

describe('utils', () => {
  describe('getErrorCodeFromMsg', () => {
    it("should return null for errMsg which isn't present in the list", () => {
      expect(utils.getErrorCodeFromMsg('random_value')).to.be.null;
    });

    it(`should return value depending on validation messages`, () => {
      expect(
        utils.getErrorCodeFromMsg(
          constant.validationMessages.EMPTY_BROWSERSTACK_JSON
        )
      ).to.eq('bstack_json_invalid_empty');
      expect(
        utils.getErrorCodeFromMsg(
          constant.validationMessages.INCORRECT_AUTH_PARAMS
        )
      ).to.eq('bstack_json_invalid_missing_keys');
      expect(
        utils.getErrorCodeFromMsg(
          constant.validationMessages.EMPTY_BROWSER_LIST
        )
      ).to.eq('bstack_json_invalid_no_browsers');
      expect(
        utils.getErrorCodeFromMsg(
          constant.validationMessages.EMPTY_RUN_SETTINGS
        )
      ).to.eq('bstack_json_invalid_no_run_settings');
      expect(
        utils.getErrorCodeFromMsg(
          constant.validationMessages.EMPTY_CYPRESS_PROJ_DIR
        )
      ).to.eq('bstack_json_invalid_no_cypress_proj_dir');
      expect(
        utils.getErrorCodeFromMsg(
          constant.validationMessages.INVALID_DEFAULT_AUTH_PARAMS
        )
      ).to.eq('bstack_json_default_auth_keys');
      expect(
        utils.getErrorCodeFromMsg(
          constant.validationMessages.INVALID_PARALLELS_CONFIGURATION
        )
      ).to.eq('invalid_parallels_specified');
      expect(
        utils.getErrorCodeFromMsg(constant.validationMessages.LOCAL_NOT_SET)
      ).to.eq('cypress_json_base_url_no_local');
      expect(
        utils.getErrorCodeFromMsg(
          constant.validationMessages.INCORRECT_DIRECTORY_STRUCTURE
        )
      ).to.eq('invalid_directory_structure');
      expect(
        utils.getErrorCodeFromMsg(
          'Please use --config-file <path to browserstack.json>.'
        )
      ).to.eq('bstack_json_path_invalid');
    });
  });

  describe('isParallelValid', () => {
    it('should return false for a float value', () => {
      expect(utils.isParallelValid(1.2)).to.be.equal(false);
      expect(utils.isParallelValid('7.3')).to.be.equal(false);
      expect(utils.isParallelValid(7.33333)).to.be.equal(false);
      expect(utils.isParallelValid('1.2.2.2')).to.be.equal(false);
      expect(utils.isParallelValid('1.456789')).to.be.equal(false);
    });

    it('should return false for a string which is not a number', () => {
      expect(utils.isParallelValid('cypress')).to.be.equal(false);
      expect(utils.isParallelValid('browserstack')).to.be.equal(false);
    });

    it('should return false for any negative value less than -1 or zero', () => {
      expect(utils.isParallelValid(-200)).to.be.equal(false);
      expect(utils.isParallelValid('-200')).to.be.equal(false);
      expect(utils.isParallelValid(-1000)).to.be.equal(false);
      expect(utils.isParallelValid('0')).to.be.equal(false);
      expect(utils.isParallelValid(0)).to.be.equal(false);
    });

    it('should return true for any positive value or -1', () => {
      expect(utils.isParallelValid(5)).to.be.equal(true);
      expect(utils.isParallelValid('5')).to.be.equal(true);
      expect(utils.isParallelValid(10)).to.be.equal(true);
      expect(utils.isParallelValid('-1')).to.be.equal(true);
      expect(utils.isParallelValid(-1)).to.be.equal(true);
    });

    it('should return true for undefined', () => {
      expect(utils.isParallelValid(undefined)).to.be.equal(true);
    });
  });

  describe('isFloat', () => {
    it('should return true for a float value', () => {
      expect(utils.isFloat(1.2333)).to.be.equal(true);
      expect(utils.isFloat(-1.2333567)).to.be.equal(true);
      expect(utils.isFloat(0.123456)).to.be.equal(true);
    });

    it('should return false for a non float value', () => {
      expect(utils.isFloat(100)).to.be.equal(false);
      expect(utils.isFloat(-1000)).to.be.equal(false);
      expect(utils.isFloat(333)).to.be.equal(false);
    });
  });

  describe('isUndefined', () => {
    it('should return true for a undefined value', () => {
      expect(utils.isUndefined(undefined)).to.be.equal(true);
      expect(utils.isUndefined(null)).to.be.equal(true);
    });

    it('should return false for a defined value', () => {
      expect(utils.isUndefined(1.234)).to.be.equal(false);
      expect(utils.isUndefined('1.234')).to.be.equal(false);
      expect(utils.isUndefined(100)).to.be.equal(false);
      expect(utils.isUndefined(-1)).to.be.equal(false);
    });
  });

  describe('setParallels', () => {
    var sandbox;
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(utils,'getBrowserCombinations').returns(['a','b']);
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    it('should set bsconfig parallels equal to value provided in args', () => {
      let bsConfig = {
        run_settings: {
          parallels: 10,
        },
      };

      utils.setParallels(bsConfig, {parallels: 100}, 100);
      expect(bsConfig['run_settings']['parallels']).to.be.eq(100);
    });

    it('should retain bsconfig parallels if args is undefined', () => {
      let bsConfig = {
        run_settings: {
          parallels: 10,
        },
      };
      utils.setParallels(bsConfig, {parallels: undefined}, 10);
      expect(bsConfig['run_settings']['parallels']).to.be.eq(10);
    });

    it('should set bsconfig parallels to browserCombinations.length if numOfSpecs is zero', () => {
      let bsConfig = {
        run_settings: {
          parallels: 10,
        },
      };
      utils.setParallels(bsConfig, {parallels: undefined}, 0);
      expect(bsConfig['run_settings']['parallels']).to.be.eq(2);
    });

    it('shouldnot set bsconfig parallels if parallels is -1', () => {
      let bsConfig = {
        run_settings: {
          parallels: -1,
        },
      };
      utils.setParallels(bsConfig, {parallels: undefined}, 2);
      expect(bsConfig['run_settings']['parallels']).to.be.eq(-1);
    });

    it('should set bsconfig parallels if parallels is greater than numOfSpecs * combinations', () => {
      let bsConfig = {
        run_settings: {
          parallels: 100,
        },
      };
      utils.setParallels(bsConfig, {parallels: undefined}, 2);
      expect(bsConfig['run_settings']['parallels']).to.be.eq(4);
    });

  });

  describe('getErrorCodeFromErr', () => {
    it('should return bstack_json_invalid_unknown if err.Code is not present in the list', () => {
      expect(utils.getErrorCodeFromErr('random_value')).to.be.eq(
        'bstack_json_invalid_unknown'
      );
    });

    it(`should return value depending on validation messages`, () => {
      expect(utils.getErrorCodeFromErr({code: 'SyntaxError'})).to.eq(
        'bstack_json_parse_error'
      );
      expect(utils.getErrorCodeFromErr({code: 'EACCES'})).to.eq(
        'bstack_json_no_permission'
      );
    });
  });

  describe('getUserAgent', () => {
    it('should return string', () => {
      expect(utils.getUserAgent()).to.be.string;
    });
  });

  describe("validateBstackJson", () => {
    it("should reject with SyntaxError for empty file", () => {
      let bsConfigPath = path.join(process.cwd(), 'test', 'test_files', 'dummy_bstack.json');
      return utils.validateBstackJson(bsConfigPath).catch((error)=>{
        sinon.match(error, "Invalid browserstack.json file")
      });
    });
    it("should resolve with data for valid json", () => {
      let bsConfigPath = path.join(process.cwd(), 'test', 'test_files', 'dummy_bstack_2.json');
      expect(utils.validateBstackJson(bsConfigPath)).to.be.eventually.eql({});
    });
    it("should reject with SyntaxError for invalid json file", () => {
      let bsConfigPath = path.join(process.cwd(), 'test', 'test_files', 'dummy_bstack_3.json');
      return utils.validateBstackJson(bsConfigPath).catch((error) => {
        sinon.match(error, "Invalid browserstack.json file")
      });
    });
  });

  describe('setUsageReportingFlag', () => {
    beforeEach(function () {
      delete process.env.DISABLE_USAGE_REPORTING;
    });

    afterEach(function () {
      delete process.env.DISABLE_USAGE_REPORTING;
    });

    it('should set env variable if no args are defined', () => {
      utils.setUsageReportingFlag(undefined, undefined);
      expect(process.env.DISABLE_USAGE_REPORTING).to.be.eq('undefined');
    });

    it('should set DISABLE_USAGE_REPORTING=true when disableUsageReporting=true', () => {
      utils.setUsageReportingFlag(undefined, true);
      expect(process.env.DISABLE_USAGE_REPORTING).to.be.eq('true');
    });

    it('should set DISABLE_USAGE_REPORTING=false when disableUsageReporting=false', () => {
      utils.setUsageReportingFlag(undefined, false);
      expect(process.env.DISABLE_USAGE_REPORTING).to.be.eq('false');
    });

    it('should set DISABLE_USAGE_REPORTING=true if defined in bsConfig', () => {
      let bsConfig = {
        disable_usage_reporting: true,
      };
      utils.setUsageReportingFlag(bsConfig, undefined);
      expect(process.env.DISABLE_USAGE_REPORTING).to.be.eq('true');
    });

    it('should set DISABLE_USAGE_REPORTING=false if defined in bsConfig', () => {
      let bsConfig = {
        disable_usage_reporting: false,
      };
      utils.setUsageReportingFlag(bsConfig, undefined);
      expect(process.env.DISABLE_USAGE_REPORTING).to.be.eq('false');
    });

    it('should give priority to disableUsageReporting arg', () => {
      let bsConfig = {
        disable_usage_reporting: true,
      };
      utils.setUsageReportingFlag(bsConfig, false);
      expect(process.env.DISABLE_USAGE_REPORTING).to.be.eq('false');
    });

    it('should handle both bsConfig and disableUsageReporting arg', () => {
      let bsConfig = {
        disable_usage_reporting: true,
      };
      utils.setUsageReportingFlag(bsConfig, true);
      expect(process.env.DISABLE_USAGE_REPORTING).to.be.eq('true');
    });
  });

  describe('isAbsolute', () => {
    it('should return true when path is absolute', () => {
      expect(utils.isAbsolute('/Absolute/Path')).to.be.true;
    });

    it('should return false when path is relative', () => {
      expect(utils.isAbsolute('../Relative/Path')).to.be.false;
    });
  });

  describe('getConfigPath', () => {
    it('should return given path, when path is absolute', () => {
      expect(utils.getConfigPath('/Absolute/Path')).to.be.eq('/Absolute/Path');
    });

    it('should return path joined with current dir path, when path is relative', () => {
      let configPath = '../Relative/Path';
      expect(utils.getConfigPath(configPath)).to.be.eq(
        path.join(process.cwd(), configPath)
      );
    });
  });

  describe('configCreated', () => {
    let args = testObjects.initSampleArgs;

    it('should call sendUsageReport', () => {
      let sandbox = sinon.createSandbox();
      sendUsageReportStub = sandbox
        .stub(utils, 'sendUsageReport')
        .callsFake(function () {
          return 'end';
        });
      utils.configCreated(args);
      sinon.assert.calledOnce(sendUsageReportStub);
    });
  });

  describe('setBuildName', () => {
    it('sets the build name from args list', () => {
      let argBuildName = 'argBuildName';
      let bsConfig = {
        run_settings: {
          build_name: 'build_name',
        },
      };
      let args = {
        'build-name': argBuildName,
      };

      utils.setBuildName(bsConfig, args);
      expect(bsConfig.run_settings.build_name).to.be.eq(argBuildName);
    });
  });

  describe('setUsername', () => {
    it('sets the username from args list', () => {
      let argUserName = 'argUserName';
      let bsConfig = {
        auth: {
          username: 'username',
        },
      };
      let args = {
        username: argUserName,
      };

      utils.setUsername(bsConfig, args);
      expect(bsConfig.auth.username).to.be.eq(argUserName);
    });
  });

  describe('setAccessKey', () => {
    it('sets the access key from args list', () => {
      let argAccessKey = 'argAccessKey';
      let bsConfig = {
        auth: {
          access_key: 'access_key',
        },
      };
      let args = {
        key: argAccessKey,
      };

      utils.setAccessKey(bsConfig, args);
      expect(bsConfig.auth.access_key).to.be.eq(argAccessKey);
    });
  });

  describe('setUserSpecs', () => {
    it('sets the specs from args list without space after comma with single space in given list', () => {
      let argsSpecs = 'spec3, spec4';
      let bsConfig = {
        run_settings: {
          specs: 'spec1, spec2',
        },
      };
      let args = {
        specs: argsSpecs,
      };

      utils.setUserSpecs(bsConfig, args);
      expect(bsConfig.run_settings.specs).to.be.eq('spec3,spec4');
    });

    it('sets the specs from args list without space after comma with spaces in given list', () => {
      let argsSpecs = 'spec3 , spec4';
      let bsConfig = {
        run_settings: {
          specs: 'spec1, spec2',
        },
      };
      let args = {
        specs: argsSpecs,
      };

      utils.setUserSpecs(bsConfig, args);
      expect(bsConfig.run_settings.specs).to.be.eq('spec3,spec4');
    });

    it('sets the specs list from specs key without space after comma with once space after comma in given list', () => {
      let bsConfig = {
        run_settings: {
          specs: 'spec1, spec2',
        },
      };
      let args = {
        specs: null,
      };

      utils.setUserSpecs(bsConfig, args);
      expect(bsConfig.run_settings.specs).to.be.eq('spec1,spec2');
    });

    it('sets the specs list from specs key without space after comma with extra space in given list', () => {
      let bsConfig = {
        run_settings: {
          specs: 'spec1 , spec2',
        },
      };
      let args = {
        specs: null,
      };

      utils.setUserSpecs(bsConfig, args);
      expect(bsConfig.run_settings.specs).to.be.eq('spec1,spec2');
    });

    it('sets the specs list from specs key array without space with comma', () => {
      let bsConfig = {
        run_settings: {
          specs: ['spec1', 'spec2'],
        },
      };
      let args = {
        specs: null,
      };

      utils.setUserSpecs(bsConfig, args);
      expect(bsConfig.run_settings.specs).to.be.eq('spec1,spec2');
    });

    it('does not set the specs list if no specs key specified', () => {
      let bsConfig = {
        run_settings: {},
      };
      let args = {
        specs: null,
      };

      utils.setUserSpecs(bsConfig, args);
      expect(bsConfig.run_settings.specs).to.be.eq(null);
    });
  });

  describe('setTestEnvs', () => {
    it('sets env only from args', () => {
      let argsEnv = 'env3=value3, env4=value4';
      let bsConfig = {
        run_settings: {
          env: 'env1=value1, env2=value2',
        },
      };
      let args = {
        env: argsEnv,
      };

      utils.setTestEnvs(bsConfig, args);
      expect(bsConfig.run_settings.env).to.be.eq('env3=value3,env4=value4');
    });

    it('sets env from args without spaces in it', () => {
      let argsEnv = 'env3=value3 , env4=value4';
      let bsConfig = {
        run_settings: {
          env: 'env1=value1 , env2=value2',
        },
      };
      let args = {
        env: argsEnv,
      };

      utils.setTestEnvs(bsConfig, args);
      expect(bsConfig.run_settings.env).to.be.eq('env3=value3,env4=value4');
    });

    it('does not set env if not specified in args', () => {
      let argsEnv = 'env3=value3 , env4=value4';
      let bsConfig = {
        run_settings: {
          env: 'env1=value1 , env2=value2',
        },
      };
      let args = {
        env: null,
      };

      utils.setTestEnvs(bsConfig, args);
      expect(bsConfig.run_settings.env).to.be.eq(null);
    });
  });

  describe('fixCommaSeparatedString', () => {
    it('string with spaces after comma', () => {
      let commaString = 'string1, string2';
      let result = utils.fixCommaSeparatedString(commaString);
      expect(result).to.be.eq('string1,string2');
    });

    it('string with spaces around comma', () => {
      let commaString = 'string1 , string2';
      let result = utils.fixCommaSeparatedString(commaString);
      expect(result).to.be.eq('string1,string2');
    });

    it('string with 2 spaces around comma', () => {
      let commaString = 'string1  ,  string2';
      let result = utils.fixCommaSeparatedString(commaString);
      expect(result).to.be.eq('string1,string2');
    });
  });

  describe('setHeaded', () => {
    it('sets the headless to false', () => {
      let args = {
        headed: true
      };
      let bsConfig = {
        run_settings: {}
      };

      utils.setHeaded(bsConfig, args);
      expect(bsConfig.run_settings.headless).to.be.eq(false);
    });

    it('sets the headless to false', () => {
      let args = {
        headed: false
      };
      let bsConfig = {
        run_settings: {}
      };

      utils.setHeaded(bsConfig, args);
      expect(bsConfig.run_settings.headless).to.be.eq(undefined);
    });
  });

  describe('exportResults', () => {
    it('should export results to log/build_results.txt', () => {
      sinon.stub(fs, 'writeFileSync').returns(true);
      utils.exportResults('build_id', 'build_url');
      fs.writeFileSync.restore();
    });

    it('should log warning if write to log/build_results.txt fails', () => {
      let writeFileSyncStub = sinon.stub(fs, 'writeFileSync');
      let loggerWarnStub = sinon.stub(logger, 'warn');
      writeFileSyncStub.yields(new Error('Write Failed'));
      utils.exportResults('build_id', 'build_url');
      sinon.assert.calledOnce(writeFileSyncStub);
      sinon.assert.calledTwice(loggerWarnStub);
      fs.writeFileSync.restore();
    });
  });

  describe('deleteResults', () => {
    it('should delete log/build_results.txt', () => {
      sinon.stub(fs, 'unlink').returns(true);
      utils.deleteResults();
      fs.unlink.restore();
    });
  });

  describe('isCypressProjDirValid', () => {
    it('should return true when cypressProjDir and integrationFoldDir is same', () => {
      expect(utils.isCypressProjDirValid('/absolute/path', '/absolute/path')).to.be.true;

      // should be as below for windows but path.resolve thinks windows path as a filename when run on linux/mac
      // expect(utils.isCypressProjDirValid('C:\\absolute\\path', 'C:\\absolute\\path')).to.be.true;
      expect(utils.isCypressProjDirValid('/C/absolute/path', '/C/absolute/path')).to.be.true;
    });

    it('should return true when integrationFoldDir is child directory of cypressProjDir', () => {
      expect(utils.isCypressProjDirValid('/absolute/path', '/absolute/path/childpath')).to.be.true;

      // should be as below for windows but path.resolve thinks windows path as a filename when run on linux/mac
      // expect(utils.isCypressProjDirValid('C:\\absolute\\path', 'C:\\absolute\\path\\childpath')).to.be.true;
      expect(utils.isCypressProjDirValid('/C/absolute/path', '/C/absolute/path/childpath')).to.be.true;
    });

    it('should return false when integrationFoldDir is not child directory of cypressProjDir', () => {
      expect(utils.isCypressProjDirValid('/absolute/path', '/absolute')).to.be.false;

      // should be as below for windows but path.resolve thinks windows path as a filename when run on linux/mac
      // expect(utils.isCypressProjDirValid('C:\\absolute\\path', 'C:\\absolute')).to.be.false;
      expect(utils.isCypressProjDirValid('/C/absolute/path', '/C/absolute')).to.be.false;
    });
  });

  describe('getLocalFlag', () => {
    it('should return false if connectionSettings is undefined', () => {
      expect(utils.getLocalFlag(undefined)).to.be.false;
    });

    it('should return false if connectionSettings.local is undefined', () => {
      expect(utils.getLocalFlag({})).to.be.false;
    });

    it('should return false if connectionSettings.local is false', () => {
      expect(utils.getLocalFlag({local: false})).to.be.false;
    });

    it('should return true if connectionSettings.local is true', () => {
      expect(utils.getLocalFlag({local: true})).to.be.true;
    });
  });

  describe('setLocal', () => {
    beforeEach(function () {
      delete process.env.BROWSERSTACK_LOCAL;
    });

    afterEach(function () {
      delete process.env.BROWSERSTACK_LOCAL;
    });

    it('should not change local in bsConfig if process.env.BROWSERSTACK_LOCAL is undefined', () => {
      let bsConfig = {
        connection_settings: {
          local: true,
        },
      };
      let args = {
        local: true
      };
      utils.setLocal(bsConfig,args);
      expect(bsConfig.connection_settings.local).to.be.eq(true);
    });

    it('should change local to false in bsConfig if process.env.BROWSERSTACK_LOCAL is set to false', () => {
      let bsConfig = {
        connection_settings: {
          local: true,
        },
      };
      let args = {
        local: false
      };
      process.env.BROWSERSTACK_LOCAL = false;
      utils.setLocal(bsConfig,args);
      expect(bsConfig.connection_settings.local).to.be.eq(false);
    });

    it('should change local to true in bsConfig if process.env.BROWSERSTACK_LOCAL is set to true', () => {
      let bsConfig = {
        connection_settings: {
          local: false,
        },
      };
      let args = {
        local: true
      };
      process.env.BROWSERSTACK_LOCAL = true;
      utils.setLocal(bsConfig,args);
      expect(bsConfig.connection_settings.local).to.be.eq(true);
    });

    it('should set local to true in bsConfig if process.env.BROWSERSTACK_LOCAL is set to true & local is not set in bsConfig', () => {
      let bsConfig = {
        connection_settings: {},
      };
      let args = {
        local: true
      }
      process.env.BROWSERSTACK_LOCAL = true;
      utils.setLocal(bsConfig,args);
      expect(bsConfig.connection_settings.local).to.be.eq(true);
    });
  });

  describe('setLocalMode', () => {
    it('if bsconfig local is true and args local is always-on then local_mode should be always-on' , () => {
      let bsConfig = {
        connection_settings: {
          local: true,
          local_mode: "xyz"
        },
      };
      let args = {
        localMode: "always-on"
      };
      utils.setLocalMode(bsConfig,args);
      expect(bsConfig['connection_settings']['local_mode']).to.be.eq("always-on");
    });

    it('if the bsconfig local mode is always-on then local_mode should also be always-on', () => {
      let bsConfig = {
        connection_settings: {
          local: true,
          local_mode: "always-on"
        },
      };
      let args = {
        localMode: "xyz"
      };
      utils.setLocalMode(bsConfig,args);
      expect(bsConfig['connection_settings']['local_mode']).to.be.eq("always-on");
    });

    it('if bsconfig local mode is not always-on then local_mode should be on-demand', () => {
      let bsConfig = {
        connection_settings: {
          local: true,
          local_mode: "xyz"
        },
      };
      let args = {
      localMode: "xyz"
      };
      utils.setLocalMode(bsConfig,args);
      expect(bsConfig['connection_settings']['local_mode']).to.be.eq("on-demand");
    });

    it('setLocalMode should end up setting args.sync as true', () => {
      let bsConfig = {
        connection_settings: {
          local: true,
          local_mode: "xyz"
        },
      };
      let args = {
        localMode: "xyz"
      }
      utils.setLocalMode(bsConfig,args);
      expect(args.sync).to.be.eq(true);
    });
  });

  describe('setupLocalTesting' ,() => {
    afterEach(function () {
      sinon.restore();
    });
    it('if bsconfig local is false then promise should resolve with undefined', () => {
      let bsConfig = {
        auth: {
          access_key: "xyz"
        },
        connection_settings: {
          local: true,
          local_identifier: "xyz"
        },
      };
      let args = {};
      let checkLocalIdentifierRunningStub = sinon.stub(utils, "checkLocalIdentifierRunning");
      checkLocalIdentifierRunningStub.returns(Promise.resolve(false));
      let setLocalArgsStub = sinon.stub(utils,"setLocalArgs");
      setLocalArgsStub.returns({});
      return utils.setupLocalTesting(bsConfig,args).then((result) => {
        expect(result.constructor.name).to.be.eq("Local");
      });
    });

    it('if bsconfig local is true then promise should return a browserstack local object', () => {
      let bsConfig = {
        auth: {
          access_key: "xyz"
        },
        connection_settings: {
          local: true,
          local_identifier: "xyz"
        },
      };
      let args = {};
      let checkLocalIdentifierRunningStub = sinon.stub(utils, "checkLocalIdentifierRunning");
      checkLocalIdentifierRunningStub.returns(Promise.resolve(true));
      return utils.setupLocalTesting(bsConfig,args).then((result) => {
        expect(result).to.be.eq(undefined);
      });
    });
  });

  describe('setLocalArgs', () => {
    it('setting up local args and returning a local_args hash', () => {
      let bsConfig = {
        auth: {
          access_key: "xyz"
        },
        connection_settings: {
          local: true,
          local_identifier: "xyz"
        },
      };
      let args = {};
      let cliVersionPathStub = sinon.stub(usageReporting, "cli_version_and_path").withArgs(bsConfig);
      cliVersionPathStub.returns("abc");
      let local_args = utils.setLocalArgs(bsConfig, args);
      expect(local_args["key"]).to.be.eq(bsConfig['auth']['access_key']);
      expect(local_args["localIdentifier"]).to.be.eq(bsConfig["connection_settings"]["local_identifier"]);
      expect(local_args["daemon"]).to.be.eq(true);
      expect(local_args["enable-logging-for-api"]).to.be.eq(true);
    });
  });

  describe('stopLocalBinary' , () => {
    it('stopLocalBinary promise gets resolve with undefined' ,() => {
      let bsConfig = {
        connection_settings: {
          local_mode: true
        }
      };
      return utils.stopLocalBinary(bsConfig).then((result) => {
        expect(result).to.be.eq(undefined);
      });
    });

    it('stopLocalBinary promise reolves with undefined if the bs_local isRunning is false' ,() => {
      let bsConfig = {
        connection_settings: {
          local_mode: true
        }
      };
      let bs_local = new browserstack.Local();
      let isRunningStub = sinon.stub(bs_local,"isRunning");
      isRunningStub.returns(false);
      return utils.stopLocalBinary(bsConfig, bs_local).then((result) => {
        expect(result).to.be.eq(undefined);
      });
    });

    it('if the bs_local isRunning is true and local_mode is not always-on, then gets resolve with undefined' ,() => {
      let bsConfig = {
        connection_settings: {
          local_mode: "not-always-on"
        }
      };
      let bs_local = new browserstack.Local();
      let isRunningStub = sinon.stub(bs_local,"isRunning");
      isRunningStub.returns(true);
      return utils.stopLocalBinary(bsConfig, bs_local).then((result) => {
        expect(result).to.be.eq(undefined);
        expect(bs_local.isProcessRunning).to.be.eq(false);
      });
    });
  });

  describe('generateLocalIdentifier', () => {

    it('function never returns the undefined', () => {
      expect(utils.generateLocalIdentifier("always-on")).to.not.eq(undefined);
      expect(utils.generateLocalIdentifier("abc")).to.not.eq(undefined);
    });

    it('if the mode is always-on it returns getmac() as local-identifier', () => {
      expect(utils.generateLocalIdentifier("always-on")).to.be.eq(Buffer.from(getmac()).toString("base64"));
    });
    it('if the mode is not always-on it returns random uuidv4 as local-identifier', () => {
      let uuidv41 = utils.generateLocalIdentifier("abc");
      let uuidv42 = utils.generateLocalIdentifier("abc");
      expect(uuidv41 != uuidv42).to.be.eq(true);
    });
  });

  describe('setLocalIdentifier', () => {
    beforeEach(function () {
      delete process.env.BROWSERSTACK_LOCAL_IDENTIFIER;
    });

    afterEach(function () {
      delete process.env.BROWSERSTACK_LOCAL_IDENTIFIER;
    });
    it('should not change local identifier in bsConfig if process.env.BROWSERSTACK_LOCAL_IDENTIFIER is undefined', () => {
      let bsConfig = {
        connection_settings: {
          local: true
        },
      };
      let args = {};
      let generateLocalIdentifierStub = sinon.stub(utils,"generateLocalIdentifier");
      generateLocalIdentifierStub.returns("abc");
      utils.setLocalIdentifier(bsConfig,args);
      expect(bsConfig.connection_settings.local_identifier).to.be.eq(
        "abc"
      );
    });

    it('should change local identifier to local_identifier in bsConfig if process.env.BROWSERSTACK_LOCAL_IDENTIFIER is set to local_identifier', () => {
      let bsConfig = {
        connection_settings: {
          local_identifier: 'test',
        },
      };
      let args = {};
      process.env.BROWSERSTACK_LOCAL_IDENTIFIER = 'local_identifier';
      utils.setLocalIdentifier(bsConfig,args);
      expect(bsConfig.connection_settings.local_identifier).to.be.eq(
        'local_identifier'
      );
    });

    it('should set local identifier in connection_settings in bsConfig if process.env.BROWSERSTACK_LOCAL_IDENTIFIER is present & not set in bsConfig', () => {
      let bsConfig = {
        connection_settings: {},
      };
      let args = {};
      process.env.BROWSERSTACK_LOCAL_IDENTIFIER = 'local_identifier';
      utils.setLocalIdentifier(bsConfig,args);
      expect(bsConfig.connection_settings.local_identifier).to.be.eq(
        'local_identifier'
      );
    });

    it('if args local_identifier is defined then it gets assigned to bsConfig connection_settings local_identifier' , () => {
      let bsConfig = {
        local: true,
        connection_settings: {
          local_identifier: "abc"
        }
      };
      let args = {
        local_identifier: "xyz"
      };
      utils.setLocalIdentifier(bsConfig, args);
      expect(bsConfig.connection_settings.local_identifier).to.be.eq(args.local_identifier);
    });
  });

  describe('setUsername', () => {
    beforeEach(function () {
      delete process.env.BROWSERSTACK_USERNAME;
    });

    afterEach(function () {
      delete process.env.BROWSERSTACK_USERNAME;
    });

    it('should set username if args.username is present', () => {
      let bsConfig = {
        auth: {
          username: 'test',
        },
      };
      utils.setUsername(bsConfig, {username: 'username'});
      expect(bsConfig.auth.username).to.be.eq('username');
    });

    it('should set username if process.env.BROWSERSTACK_USERNAME is present and args.username is not present', () => {
      let bsConfig = {
        auth: {
          username: 'test',
        },
      };
      process.env.BROWSERSTACK_USERNAME = 'username';
      utils.setUsername(bsConfig, {});
      expect(bsConfig.auth.username).to.be.eq('username');
    });

    it('should set username to default if process.env.BROWSERSTACK_USERNAME and args.username is not present', () => {
      let bsConfig = {
        auth: {
          username: 'test',
        },
      };
      utils.setUsername(bsConfig, {});
      expect(bsConfig.auth.username).to.be.eq('test');
    });
  });

  describe('setAccessKey', () => {
    beforeEach(function () {
      delete process.env.BROWSERSTACK_ACCESS_KEY;
    });

    afterEach(function () {
      delete process.env.BROWSERSTACK_ACCESS_KEY;
    });

    it('should set access_key if args.key is present', () => {
      let bsConfig = {
        auth: {
          access_key: 'test',
        },
      };
      utils.setAccessKey(bsConfig, {key: 'access_key'});
      expect(bsConfig.auth.access_key).to.be.eq('access_key');
    });

    it('should set access_key if process.env.BROWSERSTACK_ACCESS_KEY is present and args.access_key is not present', () => {
      let bsConfig = {
        auth: {
          access_key: 'test',
        },
      };
      process.env.BROWSERSTACK_ACCESS_KEY = 'access_key';
      utils.setAccessKey(bsConfig, {});
      expect(bsConfig.auth.access_key).to.be.eq('access_key');
    });

    it('should set access_key to default if process.env.BROWSERSTACK_ACCESS_KEY and args.access_key is not present', () => {
      let bsConfig = {
        auth: {
          access_key: 'test',
        },
      };
      utils.setAccessKey(bsConfig, {});
      expect(bsConfig.auth.access_key).to.be.eq('test');
    });
  });

  describe('verifyCypressConfigFileOption', () => {
    let utilsearchForOptionCypressConfigFileStub, userOption, testOption;

    beforeEach(function () {
      utilsearchForOptionCypressConfigFileStub = sinon
        .stub(utils, 'searchForOption')
        .callsFake((...userOption) => {
          return userOption == testOption;
        });
    });

    afterEach(function () {
      utilsearchForOptionCypressConfigFileStub.restore();
    });

    it('-ccf user option', () => {
      testOption = '-ccf';
      expect(utils.verifyCypressConfigFileOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionCypressConfigFileStub,
        testOption
      );
    });

    it('--ccf user option', () => {
      testOption = '--ccf';
      expect(utils.verifyCypressConfigFileOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionCypressConfigFileStub,
        testOption
      );
    });

    it('-cypress-config-file user option', () => {
      testOption = '-cypress-config-file';
      expect(utils.verifyCypressConfigFileOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionCypressConfigFileStub,
        testOption
      );
    });

    it('--cypress-config-file user option', () => {
      testOption = '--cypress-config-file';
      expect(utils.verifyCypressConfigFileOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionCypressConfigFileStub,
        testOption
      );
    });

    it('-cypressConfigFile user option', () => {
      testOption = '-cypressConfigFile';
      expect(utils.verifyCypressConfigFileOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionCypressConfigFileStub,
        testOption
      );
    });

    it('--cypressConfigFile user option', () => {
      testOption = '--cypressConfigFile';
      expect(utils.verifyCypressConfigFileOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionCypressConfigFileStub,
        testOption
      );
    });
  });

  describe('setCypressConfigFilename', () => {
    let verifyCypressConfigFileOptionStub,
      ccfBool,
      args,
      bsConfig,
      cypress_config_file;

    beforeEach(function () {
      verifyCypressConfigFileOptionStub = sinon
        .stub(utils, 'verifyCypressConfigFileOption')
        .callsFake(() => ccfBool);

      args = {
        cypressConfigFile: 'args_cypress_config_file',
      };
    });

    it('has user provided ccf flag', () => {
      ccfBool = true;

      bsConfig = {
        run_settings: {
          cypress_config_file: 'run_settings_cypress_config_file',
        },
      };

      utils.setCypressConfigFilename(bsConfig, args);

      expect(bsConfig.run_settings.cypress_config_file).to.be.eq(
        args.cypressConfigFile
      );
      expect(bsConfig.run_settings.cypress_config_filename).to.be.eq(
        path.basename(args.cypressConfigFile)
      );
      expect(bsConfig.run_settings.userProvidedCypessConfigFile).to.be.true;
      expect(bsConfig.run_settings.cypressConfigFilePath).to.be.eq(
        bsConfig.run_settings.cypress_config_file
      );
    });

    it('does not have user provided ccf flag, sets the value from cypress_proj_dir', () => {
      ccfBool = false;

      bsConfig = {
        run_settings: {
          cypress_proj_dir: 'cypress_proj_dir',
        },
      };

      utils.setCypressConfigFilename(bsConfig, args);

      expect(bsConfig.run_settings.cypress_config_file).to.be.eq(
        args.cypressConfigFile
      );
      expect(bsConfig.run_settings.cypress_config_filename).to.be.eq(
        path.basename(args.cypressConfigFile)
      );
      expect(bsConfig.run_settings.userProvidedCypessConfigFile).to.be.false;
      expect(bsConfig.run_settings.cypressConfigFilePath).to.be.eq(
        path.join(bsConfig.run_settings.cypress_proj_dir, 'cypress.json')
      );
    });

    it('does not have user provided ccf flag, sets from config file', () => {
      cypress_config_file = 'run_settings_cypress_config_file';
      ccfBool = false;
      bsConfig = {
        run_settings: {
          cypress_config_file: cypress_config_file,
        },
      };

      utils.setCypressConfigFilename(bsConfig, args);

      expect(bsConfig.run_settings.cypress_config_file).to.be.eq(
        cypress_config_file
      );
      expect(bsConfig.run_settings.cypress_config_filename).to.be.eq(
        path.basename(cypress_config_file)
      );
      expect(bsConfig.run_settings.userProvidedCypessConfigFile).to.be.true;
      expect(bsConfig.run_settings.cypressConfigFilePath).to.be.eq(
        bsConfig.run_settings.cypress_config_file
      );
    });

    afterEach(function () {
      verifyCypressConfigFileOptionStub.restore();
    });
  });

  describe('setDefaults', () => {
    beforeEach(function () {
      delete process.env.BROWSERSTACK_USERNAME;
    });

    afterEach(function () {
      delete process.env.BROWSERSTACK_USERNAME;
    });

    it('should set setDefaults if args.username is present', () => {
      let bsConfig = { run_settings: {} };
      utils.setDefaults(bsConfig, {username: 'username'});
      expect(utils.isUndefined(bsConfig.auth)).to.be.false;
      expect(utils.isUndefined(bsConfig.run_settings.npm_dependencies)).to.be.false;
    });

    it('should set setDefaults if process.env.BROWSERSTACK_USERNAME is present and args.username is not present', () => {
      let bsConfig = { run_settings: {} };
      process.env.BROWSERSTACK_USERNAME = 'username';
      utils.setDefaults(bsConfig, {});
      expect(utils.isUndefined(bsConfig.auth)).to.be.false;
      expect(utils.isUndefined(bsConfig.run_settings.npm_dependencies)).to.be.false;
    });

    it('should not set setDefaults if process.env.BROWSERSTACK_USERNAME and args.username is not present', () => {
      let bsConfig = { run_settings: {} };
      utils.setDefaults(bsConfig, {});
      expect(utils.isUndefined(bsConfig.auth)).to.be.true;
      expect(utils.isUndefined(bsConfig.run_settings.npm_dependencies)).to.be.false;
    });
  });

  describe('getNumberOfSpecFiles', () => {

    it('glob search pattern should be equal to bsConfig.run_settings.specs', () => {
      let getNumberOfSpecFilesStub = sinon.stub(glob, 'sync');
      let bsConfig = {
        run_settings: {
          specs: 'specs',
          cypressProjectDir: 'cypressProjectDir',
          exclude: 'exclude',
        },
      };

      utils.getNumberOfSpecFiles(bsConfig,{},{});
      sinon.assert.calledOnce(getNumberOfSpecFilesStub);
      sinon.assert.calledOnceWithExactly(getNumberOfSpecFilesStub, 'specs', {
        cwd: 'cypressProjectDir',
        matchBase: true,
        ignore: 'exclude',
      });
      glob.sync.restore();
    });

    it('glob search pattern should be equal to default', () => {
      let getNumberOfSpecFilesStub = sinon.stub(glob, 'sync');
      let bsConfig = {
        run_settings: {
          cypressProjectDir: 'cypressProjectDir',
          exclude: 'exclude',
        },
      };

      utils.getNumberOfSpecFiles(bsConfig,{},{});

      sinon.assert.calledOnceWithExactly(getNumberOfSpecFilesStub, `cypress/integration/**/*.+(${constant.specFileTypes.join("|")})`, {
        cwd: 'cypressProjectDir',
        matchBase: true,
        ignore: 'exclude',
      });
      glob.sync.restore();
    });

    it('glob search pattern should be equal to default with integrationFolder', () => {
      let getNumberOfSpecFilesStub = sinon.stub(glob, 'sync');
      let bsConfig = {
        run_settings: {
          cypressProjectDir: 'cypressProjectDir',
          exclude: 'exclude',
        },
      };

      utils.getNumberOfSpecFiles(bsConfig, {}, { "integrationFolder": "specs"});

      sinon.assert.calledOnceWithExactly(
        getNumberOfSpecFilesStub,
        `specs/**/*.+(${constant.specFileTypes.join('|')})`,
        {
          cwd: 'cypressProjectDir',
          matchBase: true,
          ignore: 'exclude',
        }
      );
      glob.sync.restore();
    });
  });

  describe('capitalizeFirstLetter', () => {

    it('should capitalize First Letter ', () => {
      expect(utils.capitalizeFirstLetter("chrome")).to.eq("Chrome");
    });

    it('should return null if value passed is null', () => {
      expect(utils.capitalizeFirstLetter(null)).to.eq(null);
    });

  });

  describe('getBrowserCombinations', () => {

    it('returns correct number of browserCombinations for one combination', () => {
      let bsConfig = {
        browsers: [
          {
            browser: 'chrome',
            os: 'OS X Mojave',
            versions: ['85'],
          },
        ]
      };
      chai.assert.deepEqual(utils.getBrowserCombinations(bsConfig), ['OS X Mojave-chrome85']);
    });

    it('returns correct number of browserCombinations for multiple combinations', () => {
      let bsConfig = {
        browsers: [
          {
            browser: 'chrome',
            os: 'OS X Mojave',
            versions: ['85'],
          },
          {
            browser: 'chrome',
            os: 'OS X Catalina',
            versions: ['85','84'],
          },
        ],
      };
      chai.assert.deepEqual(utils.getBrowserCombinations(bsConfig), [
        'OS X Mojave-chrome85',
        'OS X Catalina-chrome85',
        'OS X Catalina-chrome84'
      ]);
    });

  });

  describe('#handleSyncExit', () => {
    let processStub;
    beforeEach(function () {
      processStub = sinon.stub(process, 'exit');
    });

    afterEach(function () {
      processStub.restore();
    });
    it('should print network error message when exit code is set to network error code', () => {
      let dashboard_url = "dashboard_url", exitCode = 2;
      let getNetworkErrorMessageStub = sinon.stub(utils, 'getNetworkErrorMessage');
      utils.handleSyncExit(exitCode, dashboard_url);
      sinon.assert.calledOnce(getNetworkErrorMessageStub);
      sinon.assert.calledOnceWithExactly(processStub, exitCode);
      getNetworkErrorMessageStub.restore();
    });

    it('should print dashboard link when exit code is not network error code', () => {
      let dashboard_url = "dashboard_url", exitCode = 1;
      let syncCliLoggerStub = sinon.stub(syncLogger, 'info');
      utils.handleSyncExit(exitCode, dashboard_url);
      sinon.assert.calledTwice(syncCliLoggerStub);
      sinon.assert.calledOnceWithExactly(processStub, exitCode);
    });
  });

  describe('#getNetworkErrorMessage', () => {
    it('should return the error message in red color', () => {
      let dashboard_url = "dashboard_url";
      let message  =  constant.userMessages.FATAL_NETWORK_ERROR + '\n'
                  + constant.userMessages.RETRY_LIMIT_EXCEEDED + '\n'
                  + constant.userMessages.CHECK_DASHBOARD_AT  + dashboard_url
      expect(utils.getNetworkErrorMessage(dashboard_url)).to.eq(chalk.red(message))
    });
  });

  describe('#versionChangedMessage', () => {
    it('should return proper error message with placeholders replaced', () => {
      let preferredVersion = "v1", actualVersion = "v2";
      let message = constant.userMessages.CYPRESS_VERSION_CHANGED.replace("<preferredVersion>", preferredVersion).replace("<actualVersion>", actualVersion);
      expect(utils.versionChangedMessage(preferredVersion, actualVersion)).to.eq(message)
    });
  })

  describe('#isJSONInvalid', () => {
    it('JSON is valid when error is parallel misconfiguration', () => {
      let error = constant.validationMessages.INVALID_PARALLELS_CONFIGURATION;
      let args = {"parallels": 4}
      expect(utils.isJSONInvalid(error, args)).to.eq(false)
    });

    it('JSON is valid when local is not set for localhost url', () => {
      let error = constant.validationMessages.LOCAL_NOT_SET.replace("<baseUrlValue>", "localhost:4000");
      expect(utils.isJSONInvalid(error, {})).to.eq(false)
    });

    it('JSON is invalid for errors apart from Local or Prallell misconfiguration', () => {
      let error = constant.validationMessages.INCORRECT_AUTH_PARAMS;
      expect(utils.isJSONInvalid(error, {})).to.eq(true)
    });
  })

  describe('#deleteBaseUrlFromError', () => {
    it('Replace baseUrl in Local error string', () => {
      let error = constant.validationMessages.LOCAL_NOT_SET;
      expect(utils.deleteBaseUrlFromError(error)).to.match(/To test on BrowserStack/)
    });

    it('should not replace baseUrl in other error string', () => {
      let error = constant.validationMessages.NOT_VALID_JSON;
      expect(utils.deleteBaseUrlFromError(error)).not.to.match(/To test on BrowserStack/)
    });
  });

  describe('checkLocalIdentifierRunning', () => {
    afterEach(() =>{
      sinon.restore();
    });
    it('if the bsConfig localIdentifier is not present within the response body then function should resolve with false' , () => {
      const responseObject = {
        statusCode: 200,
        headers: {
          'content-type': 'application/json'
        }
      };
      const responseBody = {
        status: 'success',
        instances: [
          {
            localIdentifier: 'abcdef',
          },
          {
            localIdentifier: 'ghij',
          },
          {
            localIdentifier: 'lmno',
          }
        ]
      };
      sinon.stub(request, 'get')
          .yields(false, responseObject, JSON.stringify(responseBody));

      let bsConfig = {
        auth: {
        access_key: "abcd",
        username: "abcd"
        }
      };

      let localIdentifier = "abcd";
      return utils.checkLocalIdentifierRunning(bsConfig, localIdentifier).then((result) => {
        expect(result).to.be.eq(false);
      });
    });

    it('if the bsConfig localIdentifier if present within the response body then the function should resolve with true' , () => {
      const responseObject = {
        statusCode: 200,
        headers: {
          'content-type': 'application/json'
        }
      };
      const responseBody = {
        status: 'success',
        instances: [
          {
            localIdentifier: 'abcdef',
          },
          {
            localIdentifier: 'ghij',
          },
          {
            localIdentifier: 'lmno',
          }
        ]
      };
      sinon.stub(request, 'get')
          .yields(false, responseObject, JSON.stringify(responseBody));

      let bsConfig = {
        auth: {
        access_key: "abcd",
        username: "abcd"
        }
      };

      let localIdentifier = "lmno";
      return utils.checkLocalIdentifierRunning(bsConfig, localIdentifier).then((result) => {
        expect(result).to.be.eq(true);
      });
    });
  });

});
