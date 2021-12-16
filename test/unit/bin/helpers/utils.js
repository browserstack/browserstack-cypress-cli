'use strict';
const path = require('path');
var sandbox = require('sinon').createSandbox();

const request = require('request');
const chai = require('chai'),
  expect = chai.expect,
  sinon = require('sinon'),
  chaiAsPromised = require('chai-as-promised'),
  glob = require('glob'),
  chalk = require('chalk'),
  os = require("os"),
  crypto = require('crypto'),
  fs = require('fs'),
  axios = require('axios');
const getmac = require('getmac').default;
const usageReporting = require('../../../../bin/helpers/usageReporting');
const utils = require('../../../../bin/helpers/utils'),
  constant = require('../../../../bin/helpers/constants'),
  logger = require('../../../../bin/helpers/logger').winstonLogger,
  config = require('../../../../bin/helpers/config'),
  fileHelpers = require('../../../../bin/helpers/fileHelpers'),
  testObjects = require('../../support/fixtures/testObjects'),
  syncLogger = require('../../../../bin/helpers/logger').syncCliLogger;
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
      expect(
        utils.getErrorCodeFromMsg(
          constant.validationMessages.INVALID_LOCAL_IDENTIFIER
        )
      ).to.eq('invalid_local_identifier');
      expect(
        utils.getErrorCodeFromMsg(
          constant.validationMessages.INVALID_CLI_LOCAL_IDENTIFIER
        )
      ).to.eq('invalid_local_identifier');
      expect(
        utils.getErrorCodeFromMsg(
          constant.validationMessages.INVALID_LOCAL_MODE
        )
      ).to.eq('invalid_local_mode');
      expect(
        utils.getErrorCodeFromMsg(
          constant.validationMessages.INVALID_LOCAL_CONFIG_FILE
        )
      ).to.eq('invalid_local_config_file');
      expect(
        utils.getErrorCodeFromMsg(
          constant.validationMessages.INVALID_LOCAL_ASYNC_ARGS
        )
      ).to.eq('invalid_local_async_args');
      expect(
        utils.getErrorCodeFromMsg('Invalid browserstack.json file.')
      ).to.eq('bstack_json_invalid');
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
      sandbox.stub(utils, 'getBrowserCombinations').returns(['a', 'b']);
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

      utils.setParallels(bsConfig, { parallels: 100 }, 100);
      expect(bsConfig['run_settings']['parallels']).to.be.eq(100);
    });

    it('should retain bsconfig parallels if args is undefined', () => {
      let bsConfig = {
        run_settings: {
          parallels: 10,
        },
      };
      utils.setParallels(bsConfig, { parallels: undefined }, 10);
      expect(bsConfig['run_settings']['parallels']).to.be.eq(10);
    });

    it('should set bsconfig parallels to browserCombinations.length if numOfSpecs is zero', () => {
      let bsConfig = {
        run_settings: {
          parallels: 10,
        },
      };
      utils.setParallels(bsConfig, { parallels: undefined }, 0);
      expect(bsConfig['run_settings']['parallels']).to.be.eq(2);
    });

    it('shouldnot set bsconfig parallels if parallels is -1', () => {
      let bsConfig = {
        run_settings: {
          parallels: -1,
        },
      };
      utils.setParallels(bsConfig, { parallels: undefined }, 2);
      expect(bsConfig['run_settings']['parallels']).to.be.eq(-1);
    });

    it('should set bsconfig parallels if parallels is greater than numOfSpecs * combinations', () => {
      let bsConfig = {
        run_settings: {
          parallels: 100,
        },
      };
      utils.setParallels(bsConfig, { parallels: undefined }, 2);
      expect(bsConfig['run_settings']['parallels']).to.be.eq(4);
    });
  });

  describe('getparallels', () =>{
    it('should return the parallels specified by the user as arguments', ()=>{
      let bsConfig = {
        run_settings: {
          parallels: 100,
        },
      };
      let args = {
        parallels: 200
      };
      expect(utils.getParallels(bsConfig, args)).to.be.eq(200);
    });

    it('should return the parallels specified by the user in bsconfig if not passed as arguments', ()=>{
      let bsConfig = {
        run_settings: {
          parallels: 100,
        },
      };
      let args = {};
      expect(utils.getParallels(bsConfig, args)).to.be.eq(100);
    });

    it('should return the undefined if no parallels specified in bsconfig and arguments', ()=>{
      let bsConfig = {
        run_settings: {},
      };
      let args = {};
      expect(utils.getParallels(bsConfig, args)).to.be.eq(undefined);
    });
  });

  describe('checkError', () => {
    it('should return error if exists', () => {
      expect(utils.checkError({error: "test error"})).to.be.eq("test error");
      expect(utils.checkError({})).to.be.eq(undefined);
    })
  })

  describe('isTrueString', () => {
    it('should return true if true string', () => {
      expect(utils.isTrueString("true")).to.be.eq(true);
      expect(utils.isTrueString(true)).to.be.eq(true);
      expect(utils.isTrueString(false)).to.be.eq(false);
      expect(utils.isTrueString("atrue")).to.be.eq(false);
      expect(utils.isTrueString("false")).to.be.eq(false);
    })
  })

  describe('generateUploadParams', () => {
    it('should generate upload params based on data', () => {
      let bsConfig = {
        auth: {
          username: "user",
          access_key: "key"
        }
      };
      let filePath = "random/path";
      let md5data = "md5data";
      let fileDetails = {
        filetype: "type",
        filename: "name"
      };
      let options = {
        url: config.uploadUrl,
        auth: {
          user: "user",
          password: "key"
        },
        formData: {
          file: "random_fs",
          filetype: "type",
          filename: "name",
          zipMd5sum: "md5data",
        },
        headers: {
          "User-Agent": "random_agent",
        }
      };
      let getUserAgentStub = sinon.stub(utils, 'getUserAgent').returns("random_agent");
      let fsStub = sinon.stub(fs, 'createReadStream').returns("random_fs");
      expect(utils.generateUploadParams(bsConfig, filePath, md5data, fileDetails)).to.deep.equal(options);
      getUserAgentStub.restore();
      fsStub.restore();
    });
  });

  describe('sortJsonKeys', () => {
    it('should return josn sorted by keys', () => {
      expect(utils.sortJsonKeys({b:1, a:2})).to.deep.equal({a:2, b:1})
    });
  });

  describe('generateUploadOptions', () => {
    it('should generate zip upload options based on data', () => {
      let md5data = {
        zipUrlPresent: true,
        zip_md5sum: "randum_md5",
        zipUrl: "bs://random_hash"
      };
      let packageData = {};
      let options = {
        archivePresent: true,
        md5ReturnKey: "zip_url",
        urlPresent: true,
        md5Data: "randum_md5",
        url: "bs://random_hash",
        propogateError: true,
        fileDetails: {
          filetype: "zip",
          filename: "tests"
        },
        messages: {
          uploading: constant.userMessages.UPLOADING_TESTS,
          uploadingSuccess: constant.userMessages.UPLOADING_TESTS_SUCCESS
        },
        cleanupMethod: fileHelpers.deleteZip,
      };
      expect(utils.generateUploadOptions('zip', md5data, packageData)).to.deep.equal(options);
    });

    it('should generate npm upload options based on data', () => {
      let md5data = {
        packageUrlPresent: true,
        npm_package_md5sum: "randum_md5",
        npmPackageUrl: "bs://random_hash"
      };
      let packageData = {
        packageArchieveCreated: true
      };
      let options = {
        archivePresent: true,
        md5ReturnKey: "npm_package_url",
        urlPresent: true,
        md5Data: "randum_md5",
        url: "bs://random_hash",
        propogateError: false,
        fileDetails: {
          filetype: "tar.gz",
          filename: "bstackPackages"
        },
        messages: {
          uploading: constant.userMessages.UPLOADING_NPM_PACKAGES,
          uploadingSuccess: constant.userMessages.UPLOADING_NPM_PACKAGES_SUCCESS
        },
        cleanupMethod: fileHelpers.deletePackageArchieve,
      };
      expect(utils.generateUploadOptions('npm', md5data, packageData)).to.deep.equal(options);
    });
  });

  describe('getErrorCodeFromErr', () => {
    it('should return bstack_json_invalid_unknown if err.Code is not present in the list', () => {
      expect(utils.getErrorCodeFromErr('random_value')).to.be.eq(
        'bstack_json_invalid_unknown'
      );
    });

    it(`should return value depending on validation messages`, () => {
      expect(utils.getErrorCodeFromErr({ code: 'SyntaxError' })).to.eq(
        'bstack_json_parse_error'
      );
      expect(utils.getErrorCodeFromErr({ code: 'EACCES' })).to.eq(
        'bstack_json_no_permission'
      );
    });
  });

  describe('getUserAgent', () => {
    it('should return string', () => {
      expect(utils.getUserAgent()).to.be.string;
    });
  });

  describe('validateBstackJson', () => {
    it('should reject with SyntaxError for empty file', () => {
      let bsConfigPath = path.join(
        process.cwd(),
        'test',
        'test_files',
        'dummy_bstack.json'
      );
      return utils.validateBstackJson(bsConfigPath).catch((error) => {
        sinon.match(error, 'Invalid browserstack.json file');
      });
    });
    it('should resolve with data for valid json', () => {
      let bsConfigPath = path.join(
        process.cwd(),
        'test',
        'test_files',
        'dummy_bstack_2.json'
      );
      expect(utils.validateBstackJson(bsConfigPath)).to.be.eventually.eql({});
    });
    it('should reject with SyntaxError for invalid json file', () => {
      let bsConfigPath = path.join(
        process.cwd(),
        'test',
        'test_files',
        'dummy_bstack_3.json'
      );
      return utils.validateBstackJson(bsConfigPath).catch((error) => {
        sinon.match(error, 'Invalid browserstack.json file');
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
      let sendUsageReportStub = sandbox
        .stub(utils, 'sendUsageReport')
        .callsFake(function () {
          return 'end';
        });
      utils.configCreated(args);
      sinon.assert.calledOnce(sendUsageReportStub);
      sandbox.restore();
      sinon.restore();
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

  describe('getFilesToIgnore', () => {
    it('no args, no exclude in runSettings', () => {
      chai
        .expect(utils.getFilesToIgnore({}, undefined))
        .to.be.eql(constant.filesToIgnoreWhileUploading);
    });

    it('args passed, no exclude in runSettings', () => {
      let excludeFiles = 'file1.js, file2.json';
      let argsToArray = utils.fixCommaSeparatedString(excludeFiles).split(',');
      chai
        .expect(utils.getFilesToIgnore({}, excludeFiles))
        .to.be.eql(constant.filesToIgnoreWhileUploading.concat(argsToArray));

      excludeFiles = 'file1.js,file2.json';
      argsToArray = utils.fixCommaSeparatedString(excludeFiles).split(',');
      chai
        .expect(utils.getFilesToIgnore({}, excludeFiles))
        .to.be.eql(constant.filesToIgnoreWhileUploading.concat(argsToArray));

      excludeFiles = ' file1.js , file2.json ';
      argsToArray = utils.fixCommaSeparatedString(excludeFiles).split(',');
      chai
        .expect(utils.getFilesToIgnore({}, excludeFiles))
        .to.be.eql(constant.filesToIgnoreWhileUploading.concat(argsToArray));
    });

    it('args passed, exclude added in runSettings', () => {
      // args preceed over config file
      let excludeFiles = 'file1.js, file2.json ';
      let argsToArray = utils.fixCommaSeparatedString(excludeFiles).split(',');

      let runSettings = { exclude: [] };
      chai
        .expect(utils.getFilesToIgnore(runSettings, excludeFiles))
        .to.be.eql(constant.filesToIgnoreWhileUploading.concat(argsToArray));

      runSettings = { exclude: ['sample1.js', 'sample2.json'] };
      chai
        .expect(utils.getFilesToIgnore(runSettings, excludeFiles))
        .to.be.eql(constant.filesToIgnoreWhileUploading.concat(argsToArray));
    });

    it('no args, exclude added in runSettings', () => {
      let runSettings = { exclude: [] };
      chai
        .expect(utils.getFilesToIgnore(runSettings, undefined))
        .to.be.eql(constant.filesToIgnoreWhileUploading);

      runSettings = { exclude: ['sample1.js', 'sample2.json'] };
      chai
        .expect(utils.getFilesToIgnore(runSettings, undefined))
        .to.be.eql(
          constant.filesToIgnoreWhileUploading.concat(runSettings.exclude)
        );
    });
  });

  describe('setTestEnvs', () => {
    it('set env only from args', () => {
      let argsEnv = 'env3=value3, env4=value4';
      let bsConfig = {
        run_settings: {},
      };
      let args = {
        env: argsEnv,
      };

      utils.setTestEnvs(bsConfig, args);
      expect(bsConfig.run_settings.env).to.be.eq('env3=value3,env4=value4');
    });

    it('set env only from browserstack.json env param', () => {
      let bsConfig = {
        run_settings: {
          env: {
            env1: 'value1',
            env2: 'value2',
          },
        },
      };
      let args = {
        env: null,
      };

      utils.setTestEnvs(bsConfig, args);
      expect(bsConfig.run_settings.env).to.be.eq('env1=value1,env2=value2');
    });

    it('merges env from args and browserstack.json env param', () => {
      let argsEnv = 'env3=value3, env4=value4';
      let bsConfig = {
        run_settings: {
          env: {
            env1: 'value1',
            env2: 'value2',
          },
        },
      };
      let args = {
        env: argsEnv,
      };

      utils.setTestEnvs(bsConfig, args);
      expect(bsConfig.run_settings.env).to.be.eq(
        'env1=value1,env2=value2,env3=value3,env4=value4'
      );
    });

    it('merges env from args and browserstack.json env param but give preceedence to args', () => {
      let argsEnv = 'env1=value0, env4=value4';
      let bsConfig = {
        run_settings: {
          env: {
            env1: 'value1',
            env2: 'value2',
          },
        },
      };
      let args = {
        env: argsEnv,
      };

      utils.setTestEnvs(bsConfig, args);
      expect(bsConfig.run_settings.env).to.be.eq(
        'env1=value0,env2=value2,env4=value4'
      );
    });

    it('handle spaces passed while specifying env', () => {
      let argsEnv = 'env3=value3 , env4=value4';
      let bsConfig = {
        run_settings: {
          env: {
            env1: 'value1',
            env2: 'value2',
          },
        },
      };
      let args = {
        env: argsEnv,
      };

      utils.setTestEnvs(bsConfig, args);
      expect(bsConfig.run_settings.env).to.be.eq(
        'env1=value1,env2=value2,env3=value3,env4=value4'
      );
    });
  });

  describe('setSystemEnvs', () => {
    it('set vars passed in system_env_vars', () => {
      process.env.ENV1 = 'env1';
      process.env.ENV2 = 'env2';
      let bsConfig = {
        run_settings: {
          env: {
            env1: 'value1',
            env2: 'value2',
          },
          system_env_vars: ['ENV1', 'ENV2'],
        },
      };

      utils.setSystemEnvs(bsConfig);
      expect(bsConfig.run_settings.system_env_vars)
        .to.be.an('array')
        .that.includes('ENV1=env1');
      expect(bsConfig.run_settings.system_env_vars)
        .to.be.an('array')
        .that.includes('ENV2=env2');
      delete process.env.ENV1;
      delete process.env.ENV2;
    });

    it('set vars defined on machine as CYPRESS_ or cypress_', () => {
      process.env.CYPRESS_TEST_1 = 'env1';
      process.env.cypress_test_2 = 'env2';
      let bsConfig = {
        run_settings: {
          env: null,
        },
      };

      utils.setSystemEnvs(bsConfig);
      expect(bsConfig.run_settings.system_env_vars)
        .to.be.an('array')
        .that.includes('CYPRESS_TEST_1=env1');
      expect(bsConfig.run_settings.system_env_vars)
        .to.be.an('array')
        .that.includes('cypress_test_2=env2');
      delete process.env.CYPRESS_TEST_1;
      delete process.env.cypress_test_2;
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
        headed: true,
      };
      let bsConfig = {
        run_settings: {},
      };

      utils.setHeaded(bsConfig, args);
      expect(bsConfig.run_settings.headless).to.be.eq(false);
    });

    it('sets the headless to false', () => {
      let args = {
        headed: false,
      };
      let bsConfig = {
        run_settings: {},
      };

      utils.setHeaded(bsConfig, args);
      expect(bsConfig.run_settings.headless).to.be.eq(undefined);
    });
  });

  describe('setNoWrap', () => {
    it('sets the no-wrap to process.env.SYNC_NO_WRAP to true', () => {
      let args = {
        noWrap: true,
      };
      let bsConfig = {
        run_settings: {},
      };

      utils.setNoWrap(bsConfig, args);
      expect(process.env.SYNC_NO_WRAP).to.be.eq('true');
    });

    it('false to not set the no-wrap to process.env.SYNC_NO_WRAP to true', () => {
      let args = {
        noWrap: false,
      };
      let bsConfig = {
        run_settings: {},
      };

      utils.setNoWrap(bsConfig, args);
      expect(process.env.SYNC_NO_WRAP).to.be.eq('false');
    });

    it('string to not set the no-wrap to process.env.SYNC_NO_WRAP to true', () => {
      let args = {
        noWrap: 'true',
      };
      let bsConfig = {
        run_settings: {},
      };

      utils.setNoWrap(bsConfig, args);
      expect(process.env.SYNC_NO_WRAP).to.be.eq('false');
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
      expect(utils.isCypressProjDirValid('/absolute/path', '/absolute/path')).to
        .be.true;

      // should be as below for windows but path.resolve thinks windows path as a filename when run on linux/mac
      // expect(utils.isCypressProjDirValid('C:\\absolute\\path', 'C:\\absolute\\path')).to.be.true;
      expect(
        utils.isCypressProjDirValid('/C/absolute/path', '/C/absolute/path')
      ).to.be.true;
    });

    it('should return true when integrationFoldDir is child directory of cypressProjDir', () => {
      expect(
        utils.isCypressProjDirValid(
          '/absolute/path',
          '/absolute/path/childpath'
        )
      ).to.be.true;

      // should be as below for windows but path.resolve thinks windows path as a filename when run on linux/mac
      // expect(utils.isCypressProjDirValid('C:\\absolute\\path', 'C:\\absolute\\path\\childpath')).to.be.true;
      expect(
        utils.isCypressProjDirValid(
          '/C/absolute/path',
          '/C/absolute/path/childpath'
        )
      ).to.be.true;
    });

    it('should return false when integrationFoldDir is not child directory of cypressProjDir', () => {
      expect(utils.isCypressProjDirValid('/absolute/path', '/absolute')).to.be
        .false;

      // should be as below for windows but path.resolve thinks windows path as a filename when run on linux/mac
      // expect(utils.isCypressProjDirValid('C:\\absolute\\path', 'C:\\absolute')).to.be.false;
      expect(utils.isCypressProjDirValid('/C/absolute/path', '/C/absolute')).to
        .be.false;
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
      expect(utils.getLocalFlag({ local: false })).to.be.false;
    });

    it('should return true if connectionSettings.local is true', () => {
      expect(utils.getLocalFlag({ local: true })).to.be.true;
    });
  });

  describe('setLocal', () => {
    afterEach(function () {
      sinon.restore();
      delete process.env.BROWSERSTACK_LOCAL;
    });

    it('bsconfig connection_settings local_inferred as true if args local-mode true', () => {
      let bsConfig = {
        connection_settings: {},
      };
      let args = {
        localMode: 'always-on',
      };
      utils.setLocal(bsConfig, args);
      expect(bsConfig.connection_settings.local_inferred).to.be.eq(true);
    });

    it('should not change local in bsConfig if process.env.BROWSERSTACK_LOCAL is undefined', () => {
      let bsConfig = {
        connection_settings: {
          local: true,
        },
      };
      let args = {};
      utils.setLocal(bsConfig, args);
      expect(bsConfig.connection_settings.local).to.be.eq(true);
    });

    it('should change local to true in bsConfig if process.env.BROWSERSTACK_LOCAL is set to true', () => {
      let bsConfig = {
        connection_settings: {
          local: false,
        },
      };
      let args = {};
      process.env.BROWSERSTACK_LOCAL = true;
      utils.setLocal(bsConfig, args);
      expect(bsConfig.connection_settings.local).to.be.eq(true);
    });

    it('should change local to false in bsConfig if process.env.BROWSERSTACK_LOCAL is set to false', () => {
      let bsConfig = {
        connection_settings: {
          local: true,
        },
      };
      let args = {};
      process.env.BROWSERSTACK_LOCAL = false;
      utils.setLocal(bsConfig, args);
      expect(bsConfig.connection_settings.local).to.be.eq(false);
    });

    it('should change local to true in bsConfig if args.local is set to true', () => {
      let bsConfig = {
        connection_settings: {
          local: false,
        },
      };
      let args = { local: true };
      utils.setLocal(bsConfig, args);
      expect(bsConfig.connection_settings.local).to.be.eq(true);
    });

    it('should set local to true in bsConfig if args is set to true & local is not set in bsConfig', () => {
      let bsConfig = {
        connection_settings: {},
      };
      let args = {
        local: true,
      };
      utils.setLocal(bsConfig, args);
      expect(bsConfig.connection_settings.local).to.be.eq(true);
    });

    it('should set local to true in bsConfig if local is passed as string in bsConfig', () => {
      let bsConfig = {
        connection_settings: {
          local: 'true',
        },
      };
      let args = {};
      utils.setLocal(bsConfig, args);
      expect(bsConfig.connection_settings.local).to.be.eq(true);
    });
  });

  describe('setLocalMode', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('if bsconfig local is true and args localMode is always-on then local_mode should be always-on', () => {
      let bsConfig = {
        connection_settings: {
          local: true,
          local_mode: 'on-demand',
        },
      };
      let args = {
        localMode: 'always-on',
      };
      utils.setLocalMode(bsConfig, args);
      expect(bsConfig['connection_settings']['local_mode']).to.be.eq(
        'always-on'
      );
    });

    it('if bsconfig local mode is not always-on then local_mode should be on-demand', () => {
      let bsConfig = {
        connection_settings: {
          local: true,
        },
      };
      let args = {};
      utils.setLocalMode(bsConfig, args);
      expect(bsConfig['connection_settings']['local_mode']).to.be.eq(
        'on-demand'
      );
    });

    it('setLocalMode should end up setting args.sync and sync_inferred as true', () => {
      let bsConfig = {
        connection_settings: {
          local: true,
        },
      };
      let args = {
        localMode: 'always-on',
      };
      utils.setLocalMode(bsConfig, args);
      expect(args.sync).to.be.eq(true);
      expect(bsConfig.connection_settings.sync_inferred).to.be.eq(true);
    });

    it('if local_mode is not provided then the bsConfig local_mode_inferred changes to local_mode', () => {
      let bsConfig = {
        connection_settings: {
          local: true,
        },
      };
      let args = {};
      let searchForOptionStub = sinon.stub(utils, 'searchForOption');
      searchForOptionStub.returns(false);
      utils.setLocalMode(bsConfig, args);
      expect(bsConfig.connection_settings.local_mode_inferred).to.be.eq(
        'on-demand'
      );
    });

    it('if local_mode is provided then the bsConfig local_mode_inferred remains unchanged', () => {
      let bsConfig = {
        connection_settings: {
          local: true,
          local_mode: 'always-on',
        },
      };
      let args = {};
      let searchForOptionStub = sinon.stub(utils, 'searchForOption');
      searchForOptionStub.returns(true);
      utils.setLocalMode(bsConfig, args);
      expect(bsConfig.connection_settings.local_mode_inferred).to.be.undefined;
    });
  });

  describe('setupLocalTesting', () => {
    beforeEach(function () {
      sinon.restore();
      sandbox.restore();
    });

    afterEach(function () {
      sinon.restore();
      sandbox.restore();
    });

    it('if local is true and localIdentifier is not running and start error is raised', () => {
      let bsConfig = {
        auth: {
          access_key: 'xyz',
        },
        connection_settings: {
          local: true,
          local_identifier: 'xyz',
        },
      };
      let args = {};
      let checkLocalIdentifierRunningStub = sinon.stub(
        utils,
        'checkLocalIdentifierRunning'
      );
      checkLocalIdentifierRunningStub.returns(Promise.resolve(false));
      let setLocalArgsStub = sinon.stub(utils, 'setLocalArgs');
      setLocalArgsStub.returns({});
      let localBinaryStartStub = sandbox
        .stub()
        .yields('Key is required to start local testing!');
      let getLocalBinaryStub = sandbox.stub(utils, 'getLocalBinary').returns({
        start: localBinaryStartStub,
      });
      let sendUsageReportStub = sandbox
        .stub(utils, 'sendUsageReport')
        .callsFake(function () {
          return 'end';
        });
      utils.setupLocalTesting(bsConfig, args).catch((error) => {
        expect(error).to.eq(constant.userMessages.LOCAL_START_FAILED);
        sinon.assert.calledOnce(sendUsageReportStub);
        sinon.assert.calledOnce(getLocalBinaryStub);
      });
    });

    it('if local is true and localIdentifier is not running and start error is not raised', () => {
      let bsConfig = {
        auth: {
          access_key: 'xyz',
        },
        connection_settings: {
          local: true,
          local_identifier: 'xyz',
        },
      };
      let args = {};
      let localArgs = {
        key: 'abc',
        localIdentifier: 'abc',
        daemon: true,
      };
      let checkLocalIdentifierRunningStub = sinon.stub(
        utils,
        'checkLocalIdentifierRunning'
      );
      checkLocalIdentifierRunningStub.returns(Promise.resolve(false));
      let setLocalArgsStub = sinon.stub(utils, 'setLocalArgs');
      setLocalArgsStub.returns(localArgs);

      let localBinaryStartStub = sandbox.stub().yields(undefined);

      let getLocalBinaryStub = sandbox.stub(utils, 'getLocalBinary').returns({
        start: localBinaryStartStub,
      });

      let sendUsageReportStub = sandbox
        .stub(utils, 'sendUsageReport')
        .callsFake(function () {
          return 'end';
        });
      utils.setupLocalTesting(bsConfig, args).catch((result) => {
        expect(result).to.eq(undefined);
        sinon.assert.calledOnce(getLocalBinaryStub);
      });
    });

    it('if bsconfig local is true then promise should return a browserstack local object', () => {
      let bsConfig = {
        auth: {
          access_key: 'xyz',
        },
        connection_settings: {
          local: true,
          local_identifier: 'xyz',
        },
      };
      let args = {};
      let checkLocalIdentifierRunningStub = sinon.stub(
        utils,
        'checkLocalIdentifierRunning'
      );
      checkLocalIdentifierRunningStub.returns(Promise.resolve(true));
      return utils.setupLocalTesting(bsConfig, args).then((result) => {
        expect(result).to.be.eq(undefined);
      });
    });
  });

  describe('setLocalArgs', () => {
    it('setting up local args and returning a local_args hash', () => {
      let bsConfig = {
        auth: {
          access_key: 'xyz',
        },
        connection_settings: {
          local: true,
          local_identifier: 'on-demand',
          local_config_file: './local.yml',
        },
      };
      let args = {};
      let cliVersionPathStub = sinon
        .stub(usageReporting, 'cli_version_and_path')
        .withArgs(bsConfig);
      cliVersionPathStub.returns('abc');
      let local_args = utils.setLocalArgs(bsConfig, args);
      expect(local_args['key']).to.be.eq(bsConfig['auth']['access_key']);
      expect(local_args['localIdentifier']).to.be.eq(
        bsConfig['connection_settings']['local_identifier']
      );
      expect(local_args['daemon']).to.be.eq(true);
      expect(local_args['enable-logging-for-api']).to.be.eq(true);
      expect(local_args['config-file']).to.be.eq(path.resolve('./local.yml'));
      sinon.restore();
    });
  });

  describe('stopLocalBinary', () => {
    afterEach(function () {
      sinon.restore();
      sandbox.restore();
    });
    it('stopLocalBinary promise gets resolve with undefined', () => {
      let bsConfig = {
        connection_settings: {
          local: true,
        },
      };
      let checkLocalIdentifierRunningStub = sinon.stub(
        utils,
        'checkLocalIdentifierRunning'
      );
      checkLocalIdentifierRunningStub.returns(Promise.resolve(false));
      let sendUsageReportStub = sandbox
        .stub(utils, 'sendUsageReport')
        .callsFake(function () {
          return 'end';
        });
      return utils.stopLocalBinary(bsConfig).then((result) => {
        expect(result).to.be.eq(undefined);
        sinon.assert.calledOnce(sendUsageReportStub);
      });
    });

    it('stopLocalBinary promise resolves with undefined if the bs_local isRunning is false', () => {
      let bsConfig = {
        connection_settings: {
          local_mode: 'on-demand',
        },
      };
      let isRunningStub = sandbox.stub().returns(false);
      let bs_local = {
        isRunning: isRunningStub,
      };
      let checkLocalIdentifierRunningStub = sinon.stub(
        utils,
        'checkLocalIdentifierRunning'
      );
      checkLocalIdentifierRunningStub.returns(Promise.resolve(true));
      return utils.stopLocalBinary(bsConfig, bs_local).then((result) => {
        expect(result).to.be.eq(undefined);
      });
    });

    it('if the bs_local isRunning is true and local_mode is always-on, then gets resolve with undefined', () => {
      let bsConfig = {
        connection_settings: {
          local_mode: 'always-on',
        },
      };
      let isRunningStub = sandbox.stub().returns(true);
      let bs_local = {
        isRunning: isRunningStub,
      };
      let checkLocalIdentifierRunningStub = sinon.stub(
        utils,
        'checkLocalIdentifierRunning'
      );
      checkLocalIdentifierRunningStub.returns(Promise.resolve(true));
      return utils.stopLocalBinary(bsConfig, bs_local).then((result) => {
        expect(result).to.be.eq(undefined);
      });
    });

    it('if the bs_local isRunning is true and local_mode is not always-on and there is no stop error, then gets resolve with undefined', () => {
      let bsConfig = {
        connection_settings: {
          local_mode: 'on-demand',
        },
      };
      let isRunningStub = sandbox.stub().returns(true);
      let stopStub = sandbox.stub().yields(undefined);
      let bs_local = {
        isRunning: isRunningStub,
        stop: stopStub,
      };
      let checkLocalIdentifierRunningStub = sinon.stub(
        utils,
        'checkLocalIdentifierRunning'
      );
      checkLocalIdentifierRunningStub.returns(Promise.resolve(true));
      return utils.stopLocalBinary(bsConfig, bs_local).then((result) => {
        expect(result).to.be.eq(undefined);
      });
    });

    it('if the bs_local isRunning is true and local_mode is not always-on and there is stop error, then gets resolve with stop error', () => {
      let bsConfig = {
        connection_settings: {
          local_mode: 'on-demand',
        },
      };
      let isRunningStub = sandbox.stub().returns(true);
      let error = new Error('Local Stop Error');
      let stopStub = sandbox.stub().yields(error);
      let checkLocalIdentifierRunningStub = sinon.stub(
        utils,
        'checkLocalIdentifierRunning'
      );
      checkLocalIdentifierRunningStub.returns(Promise.resolve(true));
      let bs_local = {
        isRunning: isRunningStub,
        stop: stopStub,
      };
      let sendUsageReportStub = sandbox
        .stub(utils, 'sendUsageReport')
        .callsFake(function () {
          return 'end';
        });
      return utils.stopLocalBinary(bsConfig, bs_local, {}).then((result) => {
        expect(result).to.be.eq(constant.userMessages.LOCAL_STOP_FAILED);
        sinon.assert.calledOnce(sendUsageReportStub);
        sinon.assert.calledOnce(stopStub);
      });
    });
  });

  describe('generateLocalIdentifier', () => {
    it('if the mode is always-on it returns getmac() as local-identifier', () => {
      expect(utils.generateLocalIdentifier('always-on')).to.be.eq(
        Buffer.from(getmac()).toString('base64')
      );
    });
    it('if the mode is not always-on it returns random uuidv4 as local-identifier', () => {
      let uuidv41 = utils.generateLocalIdentifier('abc');
      let uuidv42 = utils.generateLocalIdentifier('abc');
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
    it('should generate local_identifier if args.localIdentifier & process.env.BROWSERSTACK_LOCAL_IDENTIFIER is undefined', () => {
      let bsConfig = {
        connection_settings: {
          local: true,
        },
      };
      let args = {};
      let generateLocalIdentifierStub = sinon.stub(
        utils,
        'generateLocalIdentifier'
      );
      generateLocalIdentifierStub.returns('abc');
      utils.setLocalIdentifier(bsConfig, args);
      expect(bsConfig.connection_settings.local_identifier).to.be.eq('abc');
    });

    it('should change local identifier to local_identifier in bsConfig if process.env.BROWSERSTACK_LOCAL_IDENTIFIER is set to local_identifier', () => {
      let bsConfig = {
        connection_settings: {
          local_identifier: 'test',
        },
      };
      let args = {};
      process.env.BROWSERSTACK_LOCAL_IDENTIFIER = 'local_identifier';
      utils.setLocalIdentifier(bsConfig, args);
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
      utils.setLocalIdentifier(bsConfig, args);
      expect(bsConfig.connection_settings.local_identifier).to.be.eq(
        'local_identifier'
      );
    });

    it('if args localIdentifier is defined then it gets assigned to bsConfig connection_settings local_identifier', () => {
      let bsConfig = {
        local: true,
        connection_settings: {
          local_identifier: 'abc',
        },
      };
      let args = {
        localIdentifier: 'xyz',
      };
      utils.setLocalIdentifier(bsConfig, args);
      expect(bsConfig.connection_settings.local_identifier).to.be.eq('xyz');
      expect(bsConfig.connection_settings.local_mode).to.be.eq('always-on');
    });

    it('if localIdentifier is defined then local_mode is set to always-on', () => {
      let bsConfig = {
        connection_settings: {
          local: true,
          local_identifier: 'abc',
        },
      };
      let args = {};
      utils.setLocalIdentifier(bsConfig, args);
      expect(bsConfig.connection_settings.local_identifier).to.be.eq('abc');
      expect(bsConfig['connection_settings']['local_mode']).to.be.eq(
        'always-on'
      );
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
      utils.setUsername(bsConfig, { username: 'username' });
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
      utils.setAccessKey(bsConfig, { key: 'access_key' });
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

    afterEach(function () {
      sinon.restore();
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
      utils.setDefaults(bsConfig, { username: 'username' });
      expect(utils.isUndefined(bsConfig.auth)).to.be.false;
      expect(utils.isUndefined(bsConfig.run_settings.npm_dependencies)).to.be
        .false;
    });

    it('should set setDefaults if process.env.BROWSERSTACK_USERNAME is present and args.username is not present', () => {
      let bsConfig = { run_settings: {} };
      process.env.BROWSERSTACK_USERNAME = 'username';
      utils.setDefaults(bsConfig, {});
      expect(utils.isUndefined(bsConfig.auth)).to.be.false;
      expect(utils.isUndefined(bsConfig.run_settings.npm_dependencies)).to.be
        .false;
    });

    it('should not set setDefaults if process.env.BROWSERSTACK_USERNAME and args.username is not present', () => {
      let bsConfig = { run_settings: {} };
      utils.setDefaults(bsConfig, {});
      expect(utils.isUndefined(bsConfig.auth)).to.be.true;
      expect(utils.isUndefined(bsConfig.run_settings.npm_dependencies)).to.be
        .false;
    });

    it('should set connection_settings if bsConfig.connection_settings is undefined', () => {
      let bsConfig = { run_settings: {} };
      utils.setDefaults(bsConfig, {});
      expect(utils.isUndefined(bsConfig.connection_settings)).to.be.false;
    });

    it('should not set connection_settings if bsConfig.connection_settings is defined ', () => {
      let bsConfig = {
        run_settings: {},
        connection_settings: {
          local: 'false',
        },
      };
      utils.setDefaults(bsConfig, {});
      expect(bsConfig.connection_settings).to.deep.equal({ local: 'false' });
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

      utils.getNumberOfSpecFiles(bsConfig, {}, {});
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

      utils.getNumberOfSpecFiles(bsConfig, {}, {});

      sinon.assert.calledOnceWithExactly(
        getNumberOfSpecFilesStub,
        `cypress/integration/**/*.+(${constant.specFileTypes.join('|')})`,
        {
          cwd: 'cypressProjectDir',
          matchBase: true,
          ignore: 'exclude',
        }
      );
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

      utils.getNumberOfSpecFiles(bsConfig, {}, { integrationFolder: 'specs' });

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

  describe('warnSpecLimit', () => {
    let sendUsageReportStub, loggerStub;
    let bsConfig = { run_settings: {} },
      args = {};
    beforeEach(() => {
      sendUsageReportStub = sandbox
        .stub(utils, 'sendUsageReport')
        .callsFake(function () {
          return 'end';
        });
      loggerStub = sinon.stub(logger, 'warn');
    });

    afterEach(() => {
      sandbox.restore();
      sinon.restore();
    });

    context('limit crossing', () => {
      it('should log and send to eds for one combination, one parallel', () => {
        let specFiles = {
          length: 1,
          join: function () {
            return {
              length: constant.SPEC_TOTAL_CHAR_LIMIT,
            };
          },
        };
        sinon.stub(utils, 'getBrowserCombinations').returns(1);
        bsConfig.run_settings.parallels = 1;
        utils.warnSpecLimit(bsConfig, args, specFiles);
        sinon.assert.calledOnce(sendUsageReportStub);
        sinon.assert.calledOnce(loggerStub);
      });

      it('should log and send to eds for one combination, two parallel', () => {
        let specFiles = {
          length: 1,
          join: function () {
            return {
              length: constant.SPEC_TOTAL_CHAR_LIMIT,
            };
          },
        };
        sinon.stub(utils, 'getBrowserCombinations').returns(1);
        bsConfig.run_settings.parallels = 2;
        utils.warnSpecLimit(bsConfig, args, specFiles);
        sinon.assert.calledOnce(sendUsageReportStub);
        sinon.assert.calledOnce(loggerStub);
      });

      it('should log and send to eds for multiple combination, multiple parallel', () => {
        let specFiles = {
          length: 1,
          join: function () {
            return {
              length: constant.SPEC_TOTAL_CHAR_LIMIT,
            };
          },
        };
        sinon.stub(utils, 'getBrowserCombinations').returns(3);
        bsConfig.run_settings.parallels = 4;
        utils.warnSpecLimit(bsConfig, args, specFiles);
        sinon.assert.calledOnce(sendUsageReportStub);
        sinon.assert.calledOnce(loggerStub);
      });
    });

    context('within limit', () => {
      it('should not log for one combination, one parallel', () => {
        let specFiles = {
          length: 1,
          join: function () {
            return {
              length: 1,
            };
          },
        };
        sinon.stub(utils, 'getBrowserCombinations').returns(1);
        bsConfig.run_settings.parallels = 1;
        utils.warnSpecLimit(bsConfig, args, specFiles);
        sinon.assert.notCalled(sendUsageReportStub);
        sinon.assert.notCalled(loggerStub);
      });

      it('should not log for one combination, multiple parallel', () => {
        let specFiles = {
          length: 1,
          join: function () {
            return {
              length: 1,
            };
          },
        };
        sinon.stub(utils, 'getBrowserCombinations').returns(1);
        bsConfig.run_settings.parallels = 2;
        utils.warnSpecLimit(bsConfig, args, specFiles);
        sinon.assert.notCalled(sendUsageReportStub);
        sinon.assert.notCalled(loggerStub);
      });
    });
  });

  describe('capitalizeFirstLetter', () => {
    it('should capitalize First Letter ', () => {
      expect(utils.capitalizeFirstLetter('chrome')).to.eq('Chrome');
    });

    it('should return null if value passed is null', () => {
      expect(utils.capitalizeFirstLetter(null)).to.eq(null);
    });
  });

  describe('sanitizeSpecsPattern', () => {
    it('should wrap pattern around {} when input is csv', () => {
      expect(utils.sanitizeSpecsPattern('pattern1,pattern2')).to.eq(
        '{pattern1,pattern2}'
      );
    });

    it('should not wrap pattern around {} when input is single glob pattern', () => {
      expect(utils.sanitizeSpecsPattern('pattern3')).to.eq('pattern3');
    });

    it('should return undefined when --spec is undefined', () => {
      expect(utils.sanitizeSpecsPattern(undefined)).to.eq(undefined);
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
        ],
      };
      chai.assert.deepEqual(utils.getBrowserCombinations(bsConfig), [
        'OS X Mojave-chrome85',
      ]);
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
            versions: ['85', '84'],
          },
        ],
      };
      chai.assert.deepEqual(utils.getBrowserCombinations(bsConfig), [
        'OS X Mojave-chrome85',
        'OS X Catalina-chrome85',
        'OS X Catalina-chrome84',
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
      let dashboard_url = 'dashboard_url',
        exitCode = 2;
      let getNetworkErrorMessageStub = sinon.stub(
        utils,
        'getNetworkErrorMessage'
      );
      utils.handleSyncExit(exitCode, dashboard_url);
      sinon.assert.calledOnce(getNetworkErrorMessageStub);
      sinon.assert.calledOnceWithExactly(processStub, exitCode);
      getNetworkErrorMessageStub.restore();
    });

    it('should print dashboard link when exit code is not network error code', () => {
      let dashboard_url = 'dashboard_url',
        exitCode = 1;
      let syncCliLoggerStub = sinon.stub(syncLogger, 'info');
      utils.handleSyncExit(exitCode, dashboard_url);
      sinon.assert.calledTwice(syncCliLoggerStub);
      sinon.assert.calledOnceWithExactly(processStub, exitCode);
    });
  });

  describe('#getNetworkErrorMessage', () => {
    it('should return the error message in red color', () => {
      let dashboard_url = 'dashboard_url';
      let message =
        constant.userMessages.FATAL_NETWORK_ERROR +
        '\n' +
        constant.userMessages.RETRY_LIMIT_EXCEEDED +
        '\n' +
        constant.userMessages.CHECK_DASHBOARD_AT +
        dashboard_url;
      expect(utils.getNetworkErrorMessage(dashboard_url)).to.eq(
        chalk.red(message)
      );
    });
  });

  describe('#versionChangedMessage', () => {
    it('should return proper error message with placeholders replaced', () => {
      let preferredVersion = 'v1',
        actualVersion = 'v2',
        frameworkUpgradeMessage = 'framework_upgrade_message';
      let message = constant.userMessages.CYPRESS_VERSION_CHANGED.replace(
        '<preferredVersion>',
        preferredVersion
      ).replace('<actualVersion>', actualVersion).replace('<frameworkUpgradeMessage>', 'framework_upgrade_message');
      expect(
        utils.versionChangedMessage(preferredVersion, actualVersion, frameworkUpgradeMessage)
      ).to.eq(message);
    });
  });

  describe('#latestSyntaxToActualVersionMessage', () => {
    it('should return proper info message with placeholders replaced', () => {
      let latestSyntaxVersion = '7.latest',
        actualVersion = '7.6.0',
        frameworkUpgradeMessage = 'framework_upgrade_message';
      let message =
        constant.userMessages.LATEST_SYNTAX_TO_ACTUAL_VERSION_MESSAGE.replace(
          '<latestSyntaxVersion>',
          latestSyntaxVersion
        ).replace('<actualVersion>', actualVersion).replace('<frameworkUpgradeMessage>', 'framework_upgrade_message');
      expect(
        utils.latestSyntaxToActualVersionMessage(
          latestSyntaxVersion,
          actualVersion,
          frameworkUpgradeMessage
        )
      ).to.eq(message);
    });
  });

  describe('#isJSONInvalid', () => {
    it('JSON is valid when error is parallel misconfiguration', () => {
      let error = constant.validationMessages.INVALID_PARALLELS_CONFIGURATION;
      let args = { parallels: 4 };
      expect(utils.isJSONInvalid(error, args)).to.eq(false);
    });

    it('JSON is valid when local is not set for localhost url', () => {
      let error = constant.validationMessages.LOCAL_NOT_SET.replace(
        '<baseUrlValue>',
        'localhost:4000'
      );
      expect(utils.isJSONInvalid(error, {})).to.eq(false);
    });

    it('JSON is invalid for errors apart from Local or Prallell misconfiguration', () => {
      let error = constant.validationMessages.INCORRECT_AUTH_PARAMS;
      expect(utils.isJSONInvalid(error, {})).to.eq(true);
    });

    it('JSON is invalid if local identifier is invalid', () => {
      let error = constant.validationMessages.INVALID_CLI_LOCAL_IDENTIFIER;
      expect(utils.isJSONInvalid(error, {})).to.eq(false);
    });

    it('JSON is invalid if local mode is invalid', () => {
      let error = constant.validationMessages.INVALID_LOCAL_MODE;
      expect(utils.isJSONInvalid(error, {})).to.eq(false);
    });
  });

  describe('#deleteBaseUrlFromError', () => {
    it('Replace baseUrl in Local error string', () => {
      let error = constant.validationMessages.LOCAL_NOT_SET;
      expect(utils.deleteBaseUrlFromError(error)).to.match(
        /To test on BrowserStack/
      );
    });

    it('should not replace baseUrl in other error string', () => {
      let error = constant.validationMessages.NOT_VALID_JSON;
      expect(utils.deleteBaseUrlFromError(error)).not.to.match(
        /To test on BrowserStack/
      );
    });
  });

  describe('#checkLocalIdentifierRunning', () => {
    afterEach(() => {
      sinon.restore();
    });
    it('if the bsConfig localIdentifier is not present within the response body then function should resolve with false', () => {
      const responseObject = {
        statusCode: 200,
        headers: {
          'content-type': 'application/json',
        },
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
          },
        ],
      };
      sinon
        .stub(request, 'get')
        .yields(undefined, responseObject, JSON.stringify(responseBody));

      let bsConfig = {
        auth: {
          access_key: 'abcd',
          username: 'abcd',
        },
      };

      let localIdentifier = 'abcd';
      return utils
        .checkLocalIdentifierRunning(bsConfig, localIdentifier)
        .then((result) => {
          expect(result).to.be.eq(false);
        });
    });

    it('if the bsConfig localIdentifier if present within the response body then the function should resolve with true', () => {
      const responseObject = {
        statusCode: 200,
        headers: {
          'content-type': 'application/json',
        },
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
          },
        ],
      };
      sinon
        .stub(request, 'get')
        .yields(undefined, responseObject, JSON.stringify(responseBody));

      let bsConfig = {
        auth: {
          access_key: 'abcd',
          username: 'abcd',
        },
      };

      let localIdentifier = 'lmno';
      return utils
        .checkLocalIdentifierRunning(bsConfig, localIdentifier)
        .then((result) => {
          expect(result).to.be.eq(true);
        });
    });
  });

  describe('setLocalConfigFile', () => {
    it('the args localConfigfile should be assigned to bsconfig connection_settigs local_config_file', () => {
      let bsConfig = {
        connection_settings: {
          local_config_file: 'efgh',
        },
      };
      let args = {
        localConfigFile: 'abcd',
      };
      utils.setLocalConfigFile(bsConfig, args);
      expect(args.localConfigFile).to.be.eql(
        bsConfig.connection_settings.local_config_file
      );
    });
  });

  describe('setOtherConfigs', () => {
    it('set reporter arg in run_settings', () => {
      let bsConfig = {
        run_settings: {},
      };
      let args = {
        reporter: 'mocha',
        'reporter-options': 'random-string',
      };
      utils.setOtherConfigs(bsConfig, args);
      expect(bsConfig.run_settings.reporter).to.be.eql('mocha');
    });

    it('set reporter-options arg in run_settings', () => {
      let bsConfig = {
        run_settings: {},
      };
      let args = {
        reporterOptions: 'random-string',
      };
      utils.setOtherConfigs(bsConfig, args);
      expect(bsConfig.run_settings.reporter_options).to.be.eql('random-string');
    });
  });

  describe('getCypressJSON', () => {
    let sampleJson = {
      a: 'b',
    };

    beforeEach(() => {
      sinon.stub(fs, 'readFileSync').returns(JSON.stringify(sampleJson));
    });

    afterEach(() => {
      fs.readFileSync.restore();
    });

    it('return undefined if param not present', () => {
      let bsConfig = {
        run_settings: {},
      };
      expect(utils.getCypressJSON(bsConfig)).to.be.eql(undefined);
    });

    it('read file and return json if param present', () => {
      let bsConfig = {
        run_settings: {
          cypress_config_file: './cypress.json',
        },
      };

      expect(utils.getCypressJSON(bsConfig)).to.be.eql(sampleJson);
    });
  });

  describe('nonEmptyArray', () => {
    it('return true if non empty array', () => {
      expect(utils.nonEmptyArray([1, 2, 3])).to.be.eql(true);
      expect(utils.nonEmptyArray(['abc'])).to.be.eql(true);
    });

    it('return false if empty array', () => {
      expect(utils.nonEmptyArray([])).to.be.eql(false);
    });

    it('return false if null', () => {
      expect(utils.nonEmptyArray(null)).to.be.eql(false);
    });
  });
  describe('setConfig', () => {
    it('the args config should be assigned to bsconfig run_settings config', () => {
      let bsConfig = {
        run_settings: {},
      };
      let args = {
        config: 'pageLoadTimeout=60000',
      };
      utils.setConfig(bsConfig, args);
      expect(args.config).to.be.eql(bsConfig.run_settings.config);
    });
  });

  describe('generateUniqueHash', () => {
    beforeEach(() => {
      let interfaceList = {
        lo0: [
          {
            address: 'fe80::1',
            netmask: 'ffff:ffff:ffff:ffff::',
            family: 'IPv6',
            mac: '00:00:00:00:00:00',
            internal: true,
            cidr: 'fe80::1/64',
            scopeid: 1
          }
        ],
        en5: [
          {
            address: 'fe80::1',
            netmask: 'ffff:ffff:ffff:ffff::',
            family: 'IPv6',
            mac: '00:00:00:00:00:00',
            internal: true,
            cidr: 'fe80::1/64',
            scopeid: 1
          },
          {
            address: 'fe80::aede:48ff:fe00:1122',
            netmask: 'ffff:ffff:ffff:ffff::',
            family: 'IPv6',
            mac: 'ra:nd:om:01:23:45',
            internal: false,
            cidr: 'fe80::aede:48ff:fe00:1122/64',
            scopeid: 7
          }
        ],
        en0: [
          {
            address: '192.168.29.250',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: '00:00:00:00:00:00',
            internal: false,
            cidr: '192.168.29.250/24'
          }
        ]
      };
      sinon.stub(os, 'networkInterfaces').returns(interfaceList);
      sinon.stub(crypto, 'createHash').returns({
        update: sinon.stub().returns({
          digest: sinon.stub().returns("random_hash")
        })
      });
    });
    it('should return non zero mac address', () => {
      expect(utils.generateUniqueHash()).to.equal('random_hash');
    });
  });

  describe('setBrowsers', () => {
    it('the args browser should override the bsconfig browsers', async () => {
      let bsConfig = {
        browsers: [
          {
            browser: 'chrome',
            os: 'Windows 10',
            versions: ['latest', 'latest-1'],
          },
          {
            browser: 'chrome',
            os: 'Windows 10',
            versions: ['latest', 'latest-1'],
          },
        ],
      };
      let args = {
        browser: 'chrome@91:Windows 10,chrome:OS X Mojave',
      };
      let browserResult = [
        {
          browser: 'chrome',
          os: 'Windows 10',
          versions: ['91'],
        },
        {
          browser: 'chrome',
          os: 'OS X Mojave',
          versions: ['latest'],
        },
      ];
      await utils.setBrowsers(bsConfig, args);
      expect(bsConfig.browsers).to.be.eql(browserResult);
    });
    it('the args browser should throw an error in case of exception raised', async () => {
      let bsConfig = {
        browsers: [
          {
            browser: 'chrome',
            os: 'Windows 10',
            versions: ['latest', 'latest-1'],
          },
          {
            browser: 'chrome',
            os: 'Windows 10',
            versions: ['latest', 'latest-1'],
          },
        ],
      };
      let args = {
        browser: ':Windows 10',
      };
      try {
        await utils.setBrowsers(bsConfig, args);
      } catch (err) {
        {
          expect(err).to.be.eql(
            constant.validationMessages.INVALID_BROWSER_ARGS
          );
        }
      }
    });
  });

  describe('setCLIMode', () => {
    it('should set sync mode to false when async is set', () => {
      let args = {
        sync: true,
        async: true
      }
      let bsConfig = {}
      utils.setCLIMode(bsConfig, args);
      expect(args.sync).to.be.eql(false)
    });

    it('should set sync mode to true by default', () => {
      let args = {
        sync: true
      }
      let bsConfig = {}
      utils.setCLIMode(bsConfig, args);
      expect(args.sync).to.be.eql(true)
    });
  });

  describe('stopBrowserStackBuild', () => {
    let axiosPostStub, getUserAgentStub, sendUsageReportStub, message, messageType, errorCode;
    let bsConfig = testObjects.sampleBsConfig;
    let args = {};
    let rawArgs = {};
    let buildId = 'build_id';
    let body = testObjects.buildStopSampleBody;

    beforeEach(() => {
      axiosPostStub = sandbox.stub(axios, "post");
      getUserAgentStub = sinon.stub(utils, 'getUserAgent').returns('user-agent');
      sendUsageReportStub = sinon.stub(utils, 'sendUsageReport');
    });
    afterEach(()=>{
      axiosPostStub.restore();
      getUserAgentStub.restore();
      sendUsageReportStub.restore();
      sandbox.restore();
    })

    it('message thrown if API deprecated', async () => {
      let api_deprecated_response = {
        status: 299
      }
      message = constant.userMessages.API_DEPRECATED;
      messageType = constant.messageTypes.INFO;
      errorCode = 'api_deprecated';
      axiosPostStub.resolves(api_deprecated_response);
      await utils.stopBrowserStackBuild(bsConfig, args, buildId, rawArgs);
      sinon.assert.calledOnce(axiosPostStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
    });

    it('message thrown if build returned', async () => {
      let api_deprecated_response = {
        status: 299,
        data: body
      }
      message = body.message;
      messageType = constant.messageTypes.INFO;
      errorCode = 'api_deprecated';
      axiosPostStub.resolves(api_deprecated_response);
      await utils.stopBrowserStackBuild(bsConfig, args, buildId, rawArgs);
      sinon.assert.calledOnce(axiosPostStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
    });

    it('message thrown if statusCode != 200', async () => {
      let non_200_status_response = {
        status: 400
      }
      message = constant.userMessages.BUILD_STOP_FAILED;
      messageType = constant.messageTypes.ERROR;
      errorCode = 'api_failed_build_stop';
      axiosPostStub.resolves(non_200_status_response);
      await utils.stopBrowserStackBuild(bsConfig, args, buildId, rawArgs);
      sinon.assert.calledOnce(axiosPostStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
    });

    it('message thrown if statusCode != 200 and user unauthorized', async () => {
      let body_with_message = {
        ...body,
        message: "Unauthorized",
      };
      let non_200_status_response = {
        status: 401,
        data: body_with_message
      }

      message = `${
        constant.userMessages.BUILD_STOP_FAILED
      } with error: \n${JSON.stringify(body_with_message, null, 2)}`;
      messageType = constant.messageTypes.ERROR;
      errorCode = 'api_auth_failed';
      axiosPostStub.resolves(non_200_status_response);
      await utils.stopBrowserStackBuild(bsConfig, args, buildId, rawArgs);
      sinon.assert.calledOnce(axiosPostStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
    });

    it('message thrown if statusCode != 200 and build is present', async () => {
      let non_200_status_response = {
        status: 402,
        data: body
      }

      message = `${
        constant.userMessages.BUILD_STOP_FAILED
      } with error: \n${JSON.stringify(body, null, 2)}`;
      messageType = constant.messageTypes.ERROR;
      errorCode = 'api_failed_build_stop';
      axiosPostStub.resolves(non_200_status_response);
      await utils.stopBrowserStackBuild(bsConfig, args, buildId, rawArgs);
      sinon.assert.calledOnce(axiosPostStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
    });

    it('message thrown if API success', async () => {
      let success_response = {
        status: 200,
        data: body
      }

      message = `${JSON.stringify(body, null, 2)}`;
      messageType = constant.messageTypes.SUCCESS;
      errorCode = null;
      axiosPostStub.resolves(success_response);
      await utils.stopBrowserStackBuild(bsConfig, args, buildId, rawArgs);
      sinon.assert.calledOnce(axiosPostStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
    });
  });

  describe('setProcessHooks', () => {
    it('should handle "SIGINT" event', (done) => {
      let buildId = 'build_id';
      let bsConfig = testObjects.sampleBsConfig;
      let bsLocalStub = sinon.stub();
      let args= {}

      let warnLogSpy = sinon.spy(logger, 'warn')
      let stopBrowserStackBuildStub= sinon.stub(utils, 'stopBrowserStackBuild').returns(Promise.resolve(true));
      sinon.stub(utils, 'stopLocalBinary').returns(Promise.resolve(true));
      sinon.stub(process, 'exit').returns({});
      utils.setProcessHooks(buildId, bsConfig, bsLocalStub, args);
      process.on('SIGINT', () => {
        sinon.assert.calledWith(warnLogSpy, constant.userMessages.PROCESS_KILL_MESSAGE);
        sinon.assert.calledOnce(stopBrowserStackBuildStub);
        done();
      });
      process.emit('SIGINT');
      sinon.stub.restore();
      process.exit.restore();
    });
  });

  describe('fetchZipSize', () => {
    it('should return size in bytes if file is present', () => {
      sinon.stub(fs, 'statSync').returns({size: 123});
      expect(utils.fetchZipSize('unknown.zip')).to.be.eql(123);
      fs.statSync.restore();
    });

    it('handle file not present', () => {
      expect(utils.fetchZipSize('unknown.tar.gz')).to.be.eql(0);
    });
  });
});
