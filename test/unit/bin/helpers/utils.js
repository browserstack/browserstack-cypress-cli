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
  fs = require('fs');
const getmac = require('getmac').default;
const usageReporting = require('../../../../bin/helpers/usageReporting');
const utils = require('../../../../bin/helpers/utils'),
  constant = require('../../../../bin/helpers/constants'),
  logger = require('../../../../bin/helpers/logger').winstonLogger,
  config = require('../../../../bin/helpers/config'),
  fileHelpers = require('../../../../bin/helpers/fileHelpers'),
  testObjects = require('../../support/fixtures/testObjects'),
  syncLogger = require('../../../../bin/helpers/logger').syncCliLogger,
  Contants = require('../../../../bin/helpers/constants');
const browserstack = require('browserstack-local');
const { CYPRESS_V10_AND_ABOVE_TYPE, CYPRESS_V9_AND_OLDER_TYPE } = require('../../../../bin/helpers/constants');
const { winstonLogger, syncCliLogger } = require('../../../../bin/helpers/logger');
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
        utils.getErrorCodeFromMsg(
          constant.validationMessages.HOME_DIRECTORY_NOT_FOUND
        )
      ).to.eq('home_directory_not_found');
      expect(
        utils.getErrorCodeFromMsg(
          constant.validationMessages.HOME_DIRECTORY_NOT_A_DIRECTORY
        )
      ).to.eq('home_directory_not_a_directory');
      expect(
        utils.getErrorCodeFromMsg(
          constant.validationMessages.CYPRESS_CONFIG_FILE_NOT_PART_OF_HOME_DIRECTORY
        )
      ).to.eq('cypress_config_file_not_part_of_home_directory');
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

  describe('isNotUndefined', () => {
    it('should return false for a undefined value', () => {
      expect(utils.isNotUndefined(undefined)).to.be.equal(false);
      expect(utils.isNotUndefined(null)).to.be.equal(false);
    });

    it('should return true for a defined value', () => {
      expect(utils.isNotUndefined(1.234)).to.be.equal(true);
      expect(utils.isNotUndefined('1.234')).to.be.equal(true);
      expect(utils.isNotUndefined(100)).to.be.equal(true);
      expect(utils.isNotUndefined(-1)).to.be.equal(true);
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

  describe('getDirectorySize', () => {
    it('should return size of directory', async() => {
      expect(await utils.fetchFolderSize('/absolute/path')).to
        .be.equal(0);
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

    it('if local is true and localBinary is not running and start error is raised', () => {
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
      let checkLocalBinaryRunningStub = sinon.stub(
        utils,
        'checkLocalBinaryRunning'
      );
      checkLocalBinaryRunningStub.returns(Promise.resolve({"should_spawn_binary": true}));
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

    it('if local is true and localBinary is not running and start error is not raised', () => {
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
      let checkLocalBinaryRunningStub = sinon.stub(
        utils,
        'checkLocalBinaryRunning'
      );
      checkLocalBinaryRunningStub.returns(Promise.resolve({"should_spawn_binary": true}));
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
      let checkLocalBinaryRunningStub = sinon.stub(
        utils,
        'checkLocalBinaryRunning'
      );
      checkLocalBinaryRunningStub.returns(Promise.resolve({"should_spawn_binary": false}));
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
      let checkLocalBinaryRunningStub = sinon.stub(
        utils,
        'checkLocalBinaryRunning'
      );
      checkLocalBinaryRunningStub.returns(Promise.resolve({"should_spawn_binary": true}));
      let sendUsageReportStub = sandbox
        .stub(utils, 'sendUsageReport')
        .callsFake(function () {
          return 'end';
        });
      return utils.stopLocalBinary(bsConfig, null, null, null).then((result) => {
        expect(result).to.be.eq(undefined);
        sinon.assert.notCalled(sendUsageReportStub);
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
      let checkLocalBinaryRunningStub = sinon.stub(
        utils,
        'checkLocalBinaryRunning'
      );
      checkLocalBinaryRunningStub.returns(Promise.resolve({"should_spawn_binary": false}));
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
      let checkLocalBinaryRunningStub = sinon.stub(
        utils,
        'checkLocalBinaryRunning'
      );
      checkLocalBinaryRunningStub.returns(Promise.resolve({"should_spawn_binary": false}));
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
      let checkLocalBinaryRunningStub = sinon.stub(
        utils,
        'checkLocalBinaryRunning'
      );
      checkLocalBinaryRunningStub.returns(Promise.resolve({"should_spawn_binary": false}));
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
      let checkLocalBinaryRunningStub = sinon.stub(
        utils,
        'checkLocalBinaryRunning'
      );
      checkLocalBinaryRunningStub.returns(Promise.resolve({"should_spawn_binary": false}));
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
    it('should not generate local_identifier if args.localIdentifier & process.env.BROWSERSTACK_LOCAL_IDENTIFIER is undefined', () => {
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
      sinon.assert.notCalled(generateLocalIdentifierStub);
      expect(bsConfig.connection_settings.local_identifier).to.be.eq(undefined);
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

      args = {};

      sinon.stub(fs, 'existsSync').returns(true);

      utils.setCypressConfigFilename(bsConfig, args);

      expect(bsConfig.run_settings.cypress_config_file).to.be.eq(
        path.join(bsConfig.run_settings.cypress_proj_dir, 'cypress.json')
      );
      expect(bsConfig.run_settings.cypress_config_filename).to.be.eq(
        path.basename(path.join(bsConfig.run_settings.cypress_proj_dir, 'cypress.json'))
      );
      expect(bsConfig.run_settings.userProvidedCypessConfigFile).to.be.false;
      expect(bsConfig.run_settings.cypressConfigFilePath).to.be.eq(
        path.join(bsConfig.run_settings.cypress_proj_dir, 'cypress.json')
      );

      fs.existsSync.restore();
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

  describe('setCypressTestSuiteType', () => {

    it('sets correct cypressTestSuiteType when cypress.json is the cypress config file ', () => {
      let bsConfig = {
        run_settings: {
          cypressConfigFilePath: 'cypress.json',
        },
      };

      utils.setCypressTestSuiteType(bsConfig);

      expect(bsConfig.run_settings.cypressTestSuiteType).to.be.eq(Contants.CYPRESS_V9_AND_OLDER_TYPE);
    });

    it('sets correct cypressTestSuiteType when cypress.config.js|.ts|.cjs|.mjs is the cypress config file ', () => {
      let bsConfig = {
        run_settings: {
          cypressConfigFilePath: 'cypress.config.js',
        },
      };
      utils.setCypressTestSuiteType(bsConfig);
      expect(bsConfig.run_settings.cypressTestSuiteType).to.be.eq(Contants.CYPRESS_V10_AND_ABOVE_TYPE);

      bsConfig = {
        run_settings: {
          cypressConfigFilePath: 'cypress.config.ts',
        },
      };
      utils.setCypressTestSuiteType(bsConfig);
      expect(bsConfig.run_settings.cypressTestSuiteType).to.be.eq(Contants.CYPRESS_V10_AND_ABOVE_TYPE);

      bsConfig = {
        run_settings: {
          cypressConfigFilePath: 'cypress.config.cjs',
        },
      };
      utils.setCypressTestSuiteType(bsConfig);
      expect(bsConfig.run_settings.cypressTestSuiteType).to.be.eq(Contants.CYPRESS_V10_AND_ABOVE_TYPE);

      bsConfig = {
        run_settings: {
          cypressConfigFilePath: 'cypress.config.mjs',
        },
      };
      utils.setCypressTestSuiteType(bsConfig);
      expect(bsConfig.run_settings.cypressTestSuiteType).to.be.eq(Contants.CYPRESS_V10_AND_ABOVE_TYPE);
    });

    it('by default assumes that CYPRESS_V9_AND_OLDER_TYPE is the test suite type', () => {
      let bsConfig = {
        run_settings: {},
      };
      utils.setCypressTestSuiteType(bsConfig);
      expect(bsConfig.run_settings.cypressTestSuiteType).to.be.eq(Contants.CYPRESS_V9_AND_OLDER_TYPE);
    });
  });

  describe('verifyGeolocationOption', () => {
    let utilsearchForOptionGeolocationStub, userOption, testOption;

    beforeEach(function () {
      utilsearchForOptionGeolocationStub = sinon
        .stub(utils, 'searchForOption')
        .callsFake((...userOption) => {
          return userOption == testOption;
        });
    });

    afterEach(function () {
      utilsearchForOptionGeolocationStub.restore();
    });

    it('-gl user option', () => {
      testOption = '-gl';
      expect(utils.verifyGeolocationOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionGeolocationStub,
        testOption
      );
    });

    it('--gl user option', () => {
      testOption = '--gl';
      expect(utils.verifyGeolocationOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionGeolocationStub,
        testOption
      );
    });

    it('-geo-location user option', () => {
      testOption = '-geo-location';
      expect(utils.verifyGeolocationOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionGeolocationStub,
        testOption
      );
    });

    it('--geo-location user option', () => {
      testOption = '--geo-location';
      expect(utils.verifyGeolocationOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionGeolocationStub,
        testOption
      );
    });

    it('-geolocation user option', () => {
      testOption = '-geolocation';
      expect(utils.verifyGeolocationOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionGeolocationStub,
        testOption
      );
    });

    it('--geolocation user option', () => {
      testOption = '--geolocation';
      expect(utils.verifyGeolocationOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionGeolocationStub,
        testOption
      );
    });
  });

  describe('setGeolocation', () => {
    let verifyGeolocationOptionStub,
      glBool,
      args,
      bsConfig,
      geolocation;

    beforeEach(function () {
      verifyGeolocationOptionStub = sinon
        .stub(utils, 'verifyGeolocationOption')
        .callsFake(() => glBool);

      args = {
        geolocation: 'IN',
      };
    });

    afterEach(function () {
      sinon.restore();
    });

    it('has user provided gl flag', () => {
      glBool = true;

      bsConfig = {
        run_settings: {
          geolocation: 'IN',
        },
      };

      utils.setGeolocation(bsConfig, args);

      expect(bsConfig.run_settings.geolocation).to.be.eq(
        args.geolocation
      );
      expect(bsConfig.run_settings.userProvidedGeolocation).to.be.true;
    });

    it('does not have user provided gl flag, sets the value from bsConfig', () => {
      glBool = false;
      args = {
        geolocation: null
      };
      bsConfig = {
        run_settings: {
          geolocation: 'IN',
        },
      };

      utils.setGeolocation(bsConfig, args);

      expect(bsConfig.run_settings.geolocation).to.not.be.eq(
        args.geolocation
      );
      expect(bsConfig.run_settings.geolocation).to.be.eq('IN');
      expect(bsConfig.run_settings.userProvidedGeolocation).to.be.true;
    });

    it('does not have user provided gl flag and config value, sets geolocation to be null', () => {
      geolocation = 'run_settings_geolocation';
      glBool = false;
      args = {
        geolocation: null
      };
      bsConfig = {
        run_settings: {
          geolocation: null,
        },
      };

      utils.setGeolocation(bsConfig, args);

      expect(bsConfig.run_settings.geolocation).to.be.eq(null);
      expect(bsConfig.run_settings.userProvidedGeolocation).to.be.false;
    });

    afterEach(function () {
      verifyGeolocationOptionStub.restore();
    });
  });

  describe('verifyNodeVersionOption', () => {
    let utilsearchForOptionNodeVersionStub, userOption, testOption;

    beforeEach(function () {
      utilsearchForOptionNodeVersionStub = sinon
        .stub(utils, 'searchForOption')
        .callsFake((...userOption) => {
          return userOption == testOption;
        });
    });

    afterEach(function () {
      utilsearchForOptionNodeVersionStub.restore();
    });

    it('-nv user option', () => {
      testOption = '-nv';
      expect(utils.verifyNodeVersionOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionNodeVersionStub,
        testOption
      );
    });

    it('--nv user option', () => {
      testOption = '--nv';
      expect(utils.verifyNodeVersionOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionNodeVersionStub,
        testOption
      );
    });

    it('-node-version user option', () => {
      testOption = '-node-version';
      expect(utils.verifyNodeVersionOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionNodeVersionStub,
        testOption
      );
    });

    it('--node-version user option', () => {
      testOption = '--node-version';
      expect(utils.verifyNodeVersionOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionNodeVersionStub,
        testOption
      );
    });

    it('-nodeVersion user option', () => {
      testOption = '-nodeVersion';
      expect(utils.verifyNodeVersionOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionNodeVersionStub,
        testOption
      );
    });

    it('--nodeVersion user option', () => {
      testOption = '--nodeVersion';
      expect(utils.verifyNodeVersionOption()).to.be.true;
      sinon.assert.calledWithExactly(
        utilsearchForOptionNodeVersionStub,
        testOption
      );
    });
  });

  describe('setNodeVersion', () => {
    let verifyNodeVersionOptionStub,
      nvBool,
      args,
      bsConfig,
      nodeVersion,
      get_versionStub;
    let userNodeVersion = 'z.z.z';

    beforeEach(function () {
      verifyNodeVersionOptionStub = sinon
        .stub(utils, 'verifyNodeVersionOption')
        .callsFake(() => nvBool);

        get_versionStub = sinon
          .stub(usageReporting, 'get_version')
          .callsFake(() => userNodeVersion);

      args = {
        nodeVersion: 'x.x.x',
      };
    });

    afterEach(function () {
      sinon.restore();
    });

    it('has user provided nv flag', () => {
      nvBool = true;

      bsConfig = {
        run_settings: {
          nodeVersion: 'y.y.y',
        },
      };

      utils.setNodeVersion(bsConfig, args);

      expect(bsConfig.run_settings.nodeVersion).to.be.eq(
        args.nodeVersion
      );
      expect(bsConfig.run_settings.userProvidedNodeVersion).to.be.true;
    });

    it('does not have user provided nv flag, sets the value from bsConfig', () => {
      nvBool = false;
      args = {
        nodeVersion: null
      };
      bsConfig = {
        run_settings: {
          nodeVersion: 'x.x.x',
        },
      };

      utils.setNodeVersion(bsConfig, args);

      expect(bsConfig.run_settings.nodeVersion).to.not.be.eq(
        args.nodeVersion
      );
      expect(bsConfig.run_settings.nodeVersion).to.be.eq('x.x.x');
      expect(bsConfig.run_settings.userProvidedNodeVersion).to.be.true;
    });

    it('does not have user provided nv flag and config value, sets nodeVersion to the value of the user\'s nodeVersion that was used to trigger the build', () => {
      nvBool = false;
      args = {
        nodeVersion: null
      };
      bsConfig = {
        run_settings: {
          nodeVersion: null,
        },
      };

      utils.setNodeVersion(bsConfig, args);

      expect(bsConfig.run_settings.nodeVersion).to.be.eq(userNodeVersion);
      expect(bsConfig.run_settings.userProvidedNodeVersion).to.be.false;
    });

    afterEach(function () {
      verifyNodeVersionOptionStub.restore();
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
    it('should return files matching with run_settings.specs and under default folder if cypress v <= 9 and no integration/testFiles patterm provided', () => {
      let globStub = sinon.stub(glob, 'sync')
      globStub.withArgs('cypress/integration/foo*.js')
        .returns(['cypress/integration/foo_1.js']);
      globStub.withArgs(`cypress/integration/**/*.+(${constant.specFileTypes.join('|')})`)
        .returns([
          'cypress/integration/foo_1.js',
          'cypress/integration/foo_2.js',
          'cypress/integration/bar_1.js'
        ]);
      let bsConfig = {
        run_settings: {
          cypressTestSuiteType: 'CYPRESS_V9_AND_OLDER_TYPE',
          specs: 'cypress/integration/foo*.js',
          cypressProjectDir: 'cypressProjectDir',
          exclude: 'exclude',
        },
      };

      const result =  utils.getNumberOfSpecFiles(bsConfig, {}, {});
      expect(result.length).to.eql(1);
      expect(result[0].endsWith('cypress/integration/foo_1.js')).to.eql(true);
      sinon.assert.calledTwice(globStub)
      sinon.assert.callOrder(
        globStub.withArgs(`cypress/integration/**/*.+(${constant.specFileTypes.join('|')})`, {
          cwd: 'cypressProjectDir',
          matchBase: true,
          ignore: 'exclude',
        }), 
        globStub.withArgs('cypress/integration/foo*.js', {
          cwd: 'cypressProjectDir',
          matchBase: true,
          ignore: 'exclude',
        })
      );
      glob.sync.restore();
    });

    it('should return files matching with run_settings.specs and under default folder if cypress v <= 9 and testFiles pattern string provided', () => {
      let globStub = sinon.stub(glob, 'sync')
      globStub.withArgs('cypress/integration/foo*.js')
        .returns(['cypress/integration/foo_1.js']);
      globStub.withArgs('cypress/integration/**.js')
        .returns([
          'cypress/integration/foo_1.js',
          'cypress/integration/foo_2.js',
          'cypress/integration/bar_1.js'
        ]);
      let bsConfig = {
        run_settings: {
          cypressTestSuiteType: 'CYPRESS_V9_AND_OLDER_TYPE',
          specs: 'cypress/integration/foo*.js',
          cypressProjectDir: 'cypressProjectDir',
          exclude: 'exclude',
        },
      };

      const result =  utils.getNumberOfSpecFiles(bsConfig, {}, { 
        integrationFolder: 'cypress/integration',
        testFiles: '**.js'
      });
      expect(result.length).to.eql(1);
      expect(result[0].endsWith('cypress/integration/foo_1.js')).to.eql(true);
      sinon.assert.calledTwice(globStub)
      sinon.assert.callOrder(
        globStub.withArgs('cypress/integration/**.js', {
          cwd: 'cypressProjectDir',
          matchBase: true,
          ignore: 'exclude',
        }), 
        globStub.withArgs('cypress/integration/foo*.js', {
          cwd: 'cypressProjectDir',
          matchBase: true,
          ignore: 'exclude',
        })
      );
      glob.sync.restore();
    });

    it('should return files matching with run_settings.specs and under default folder if cypress v <= 9 and testFiles pattern array provided', () => {
      let globStub = sinon.stub(glob, 'sync')
      globStub.withArgs('cypress/integration/foo*.js')
        .returns(['cypress/integration/foo_1.js']);
      globStub.withArgs('cypress/integration/**.js')
        .returns([
          'cypress/integration/foo_1.js',
          'cypress/integration/foo_2.js',
          'cypress/integration/bar_1.js'
        ]);
      let bsConfig = {
        run_settings: {
          cypressTestSuiteType: 'CYPRESS_V9_AND_OLDER_TYPE',
          specs: 'cypress/integration/foo*.js',
          cypressProjectDir: 'cypressProjectDir',
          exclude: 'exclude',
        },
      };

      const result =  utils.getNumberOfSpecFiles(bsConfig, {}, { 
        integrationFolder: 'cypress/integration',
        testFiles: ['**.js']
      });
      expect(result.length).to.eql(1);
      expect(result[0].endsWith('cypress/integration/foo_1.js')).to.eql(true);
      sinon.assert.calledTwice(globStub)
      sinon.assert.callOrder(
        globStub.withArgs('cypress/integration/**.js', {
          cwd: 'cypressProjectDir',
          matchBase: true,
          ignore: 'exclude',
        }),
        globStub.withArgs('cypress/integration/foo*.js', {
          cwd: 'cypressProjectDir',
          matchBase: true,
          ignore: 'exclude',
        })
      );
      glob.sync.restore();
    });

    it('should return files matching with run_settings.specs and under default folder if cypress v >= 10 and no specPattern provided', () => {
      let globStub = sinon.stub(glob, 'sync')
      globStub.withArgs('cypress/e2e/foo*.js')
        .returns(['cypress/e2e/foo_1.js']);
      globStub.withArgs(`cypress/e2e/**/*.+(${constant.specFileTypes.join('|')})`)
        .returns([
          'cypress/e2e/foo_1.js',
          'cypress/e2e/foo_2.js',
          'cypress/e2e/bar_1.js'
        ]);
      let bsConfig = {
        run_settings: {
          cypressTestSuiteType: 'CYPRESS_V10_AND_ABOVE_TYPE',
          specs: 'cypress/e2e/foo*.js',
          cypressProjectDir: 'cypressProjectDir',
          exclude: 'exclude',
        },
      };

      const result =  utils.getNumberOfSpecFiles(bsConfig, {}, { e2e: {}});
      expect(result.length).to.eql(1);
      expect(result[0].endsWith('cypress/e2e/foo_1.js')).to.eql(true);
      sinon.assert.calledTwice(globStub)
      sinon.assert.callOrder(
        globStub.withArgs(`cypress/e2e/**/*.+(${constant.specFileTypes.join('|')})`, {
          cwd: 'cypressProjectDir',
          matchBase: true,
          ignore: 'exclude',
        }),
        globStub.withArgs('cypress/e2e/foo*.js', {
          cwd: 'cypressProjectDir',
          matchBase: true,
          ignore: 'exclude',
        })
      );
      glob.sync.restore();
    });

    it('should return files matching with run_settings.specs and under default folder if cypress v >= 10 and specPattern pattern string provided', () => {
      let globStub = sinon.stub(glob, 'sync')
      globStub.withArgs('cypress/e2e/foo*.js')
        .returns(['cypress/e2e/foo_1.js']);
      globStub.withArgs('cypress/e2e/**.js')
        .returns([
          'cypress/e2e/foo_1.js',
          'cypress/e2e/foo_2.js',
          'cypress/e2e/bar_1.js'
        ]);
      let bsConfig = {
        run_settings: {
          cypressTestSuiteType: 'CYPRESS_V10_AND_ABOVE_TYPE',
          specs: 'cypress/e2e/foo*.js',
          cypressProjectDir: 'cypressProjectDir',
          exclude: 'exclude',
        },
      };

      const result =  utils.getNumberOfSpecFiles(bsConfig, {}, { 
        e2e: {
          specPattern: 'cypress/e2e/**.js'
        }
      });
      expect(result.length).to.eql(1);
      expect(result[0].endsWith('cypress/e2e/foo_1.js')).to.eql(true);
      sinon.assert.calledTwice(globStub)
      sinon.assert.callOrder(
        globStub.withArgs('cypress/e2e/**.js', {
          cwd: 'cypressProjectDir',
          matchBase: true,
          ignore: 'exclude',
        }), 
        globStub.withArgs('cypress/e2e/foo*.js', {
          cwd: 'cypressProjectDir',
          matchBase: true,
          ignore: 'exclude',
        })
      );
      glob.sync.restore();
    });

    it('should return files matching with run_settings.specs and under default folder if cypress v >= 10 and specPattern pattern array provided', () => {
      let globStub = sinon.stub(glob, 'sync')
      globStub.withArgs('cypress/e2e/foo*.js')
        .returns(['cypress/e2e/foo_1.js']);
      globStub.withArgs('cypress/e2e/**.js')
        .returns([
          'cypress/e2e/foo_1.js',
          'cypress/e2e/foo_2.js',
          'cypress/e2e/bar_1.js'
        ]);
      let bsConfig = {
        run_settings: {
          cypressTestSuiteType: 'CYPRESS_V10_AND_ABOVE_TYPE',
          specs: 'cypress/e2e/foo*.js',
          cypressProjectDir: 'cypressProjectDir',
          exclude: 'exclude',
        },
      };

      const result =  utils.getNumberOfSpecFiles(bsConfig, {}, { 
        e2e: {
          specPattern: ['cypress/e2e/**.js']
        }
      });
      expect(result.length).to.eql(1);
      expect(result[0].endsWith('cypress/e2e/foo_1.js')).to.eql(true);
      sinon.assert.calledTwice(globStub)
      sinon.assert.callOrder(
        globStub.withArgs('cypress/e2e/**.js', {
          cwd: 'cypressProjectDir',
          matchBase: true,
          ignore: 'exclude',
        }), 
        globStub.withArgs('cypress/e2e/foo*.js', {
          cwd: 'cypressProjectDir',
          matchBase: true,
          ignore: 'exclude',
        })
      );
      glob.sync.restore();
    });

    it('should return files matching with run_settings.specs if cypress v >= 10 and error while reading config file', () => {
      let globStub = sinon.stub(glob, 'sync')
      globStub.withArgs('cypress/e2e/foo*.js')
        .returns(['cypress/e2e/foo_1.js']);
      let bsConfig = {
        run_settings: {
          cypressTestSuiteType: 'CYPRESS_V10_AND_ABOVE_TYPE',
          specs: 'cypress/e2e/foo*.js',
          cypressProjectDir: 'cypressProjectDir',
          exclude: 'exclude',
        },
      };

      const result =  utils.getNumberOfSpecFiles(bsConfig, {}, null);
      expect(result.length).to.eql(1);
      expect(result[0].endsWith('cypress/e2e/foo_1.js')).to.eql(true);
      sinon.assert.alwaysCalledWithExactly(globStub, 'cypress/e2e/foo*.js', {
        cwd: 'cypressProjectDir',
        matchBase: true,
        ignore: 'exclude',
      })
      glob.sync.restore();
    });

    it('should return files under default e2e folder if cypress v >= 10 and error while reading config file', () => {
      let globStub = sinon.stub(glob, 'sync')
      globStub.withArgs(`cypress/e2e/**/*.+(${constant.specFileTypes.join('|')})`)
        .returns([
          'cypress/e2e/foo_1.js',
          'cypress/e2e/foo_2.js',
          'cypress/e2e/bar_1.js'
        ]);
      let bsConfig = {
        run_settings: {
          cypressTestSuiteType: 'CYPRESS_V10_AND_ABOVE_TYPE',
          cypressProjectDir: 'cypressProjectDir',
          exclude: 'exclude',
        },
      };

      const result =  utils.getNumberOfSpecFiles(bsConfig, {}, null);
      expect(result.length).to.eql(3);
      expect(result[0].endsWith('cypress/e2e/foo_1.js')).to.eql(true);
      sinon.assert.calledWithExactly(globStub, `cypress/e2e/**/*.+(${constant.specFileTypes.join('|')})`, {
        cwd: 'cypressProjectDir',
        matchBase: true,
        ignore: 'exclude',
      })
      glob.sync.restore();
    });

    it('should return files under integration folder if cypress v >= 10, no spec arg in bstack.json and error while reading config file and no files under cypress/e2e', () => {
      let globStub = sinon.stub(glob, 'sync')
      globStub.withArgs(`cypress/e2e/**/*.+(${constant.specFileTypes.join('|')})`)
        .returns([]);
      globStub.withArgs(`cypress/integration/**/*.+(${constant.specFileTypes.join('|')})`)
        .returns([
          'cypress/integration/foo_1.js',
          'cypress/integration/foo_2.js',
          'cypress/integration/bar_1.js'
        ]);
      let bsConfig = {
        run_settings: {
          cypressTestSuiteType: 'CYPRESS_V10_AND_ABOVE_TYPE',
          cypressProjectDir: 'cypressProjectDir',
          exclude: 'exclude',
        },
      };

      const result =  utils.getNumberOfSpecFiles(bsConfig, {}, null);
      expect(result.length).to.eql(3);
      expect(result[0].endsWith('cypress/integration/foo_1.js')).to.eql(true);
      expect(result[1].endsWith('cypress/integration/foo_2.js')).to.eql(true);
      expect(result[2].endsWith('cypress/integration/bar_1.js')).to.eql(true);
      sinon.assert.calledWithExactly(globStub, `cypress/e2e/**/*.+(${constant.specFileTypes.join('|')})`, {
        cwd: 'cypressProjectDir',
        matchBase: true,
        ignore: 'exclude',
      })
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

  describe('#checkLocalBinaryRunning', () => {
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
        "should_spawn_binary": true
      };
      sinon
        .stub(request, 'post')
        .yields(undefined, responseObject, JSON.stringify(responseBody));

      let bsConfig = {
        auth: {
          access_key: 'abcd',
          username: 'abcd',
        },
      };

      let localIdentifier = 'abcd';
      return utils
        .checkLocalBinaryRunning(bsConfig, localIdentifier)
        .then((result) => {
          chai.assert.deepEqual(result, {"should_spawn_binary": true});
        });
    });

    it('if the bsConfig localIdentifier is present within the response body', () => {
      const responseObject = {
        statusCode: 200,
        headers: {
          'content-type': 'application/json',
        },
      };
      const responseBody = { "should_spawn_binary": false };
      sinon
        .stub(request, 'post')
        .yields(undefined, responseObject, JSON.stringify(responseBody));

      let bsConfig = {
        auth: {
          access_key: 'abcd',
          username: 'abcd',
        },
      };

      let localIdentifier = 'lmno';
      return utils
        .checkLocalBinaryRunning(bsConfig, localIdentifier)
        .then((result) => {
          chai.assert.deepEqual(result, {"should_spawn_binary": false})
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

  describe('getCypressConfigFile', () => {
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
      expect(utils.getCypressConfigFile(bsConfig)).to.be.eql(undefined);
    });

    it('read file and return json if param present', () => {
      let bsConfig = {
        run_settings: {
          cypress_config_file: './cypress.json',
        },
      };

      expect(utils.getCypressConfigFile(bsConfig)).to.be.eql(sampleJson);
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

  describe('setEnforceSettingsConfig', () => {
    it('the video config should be assigned to bsconfig run_settings config', () => {
      let bsConfig = {
        run_settings: { video_config: { video:true, videoUploadOnPasses:true} },
      };
      let args = {
        config: 'video=true,videoUploadOnPasses=true'
      }
      utils.setEnforceSettingsConfig(bsConfig);
      expect(args.config).to.be.eql(bsConfig.run_settings.config);
    });
    it('the specPattern config should be assigned to bsconfig run_settings config', () => {
      let bsConfig = {
        run_settings: { specs: 'somerandomspecs', cypressTestSuiteType: 'CYPRESS_V10_AND_ABOVE_TYPE' },
      };
      let args = {
        config: "video=false,videoUploadOnPasses=false,specPattern='somerandomspecs'"
      }
      utils.setEnforceSettingsConfig(bsConfig);
      expect(args.config).to.be.eql(bsConfig.run_settings.config);
    });
    it('the testFiles config should be assigned to bsconfig run_settings config', () => {
      let bsConfig = {
        run_settings: { specs: 'somerandomspecs', cypressTestSuiteType: 'CYPRESS_V9_AND_OLDER_TYPE' },
      };
      let args = {
        config: "video=false,videoUploadOnPasses=false,testFiles='somerandomspecs'"
      }
      utils.setEnforceSettingsConfig(bsConfig);
      expect(args.config).to.be.eql(bsConfig.run_settings.config);
    });
    it('the baseUrl config should be assigned to bsconfig run_settings config', () => {
      let bsConfig = {
        run_settings: { baseUrl: 'http://localhost:8080' },
      };
      let args = {
        config: 'video=false,videoUploadOnPasses=false,baseUrl=http://localhost:8080'
      }
      utils.setEnforceSettingsConfig(bsConfig);
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
    it('the args browser should not return exception if os is empty string', async () => {
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
      let browserResult = [
        {
          browser: 'chrome',
          os: '',
          versions: ['latest-1'],
        }
      ];
      let args = {
        browser: 'chrome@latest-1:',
      };
      await utils.setBrowsers(bsConfig, args)
      expect(bsConfig.browsers).to.be.eql(browserResult);
    });
    it('the args browser should not return exception if os is nil', async () => {
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
      let browserResult = [
        {
          browser: 'chrome',
          versions: ['latest-1'],
        }
      ];
      let args = {
        browser: 'chrome@latest-1',
      };
      await utils.setBrowsers(bsConfig, args)
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
    let getUserAgentStub, sendUsageReportStub, message, messageType, errorCode;
    let bsConfig = testObjects.sampleBsConfig;
    let args = {};
    let rawArgs = {};
    let buildId = 'build_id';
    let body = testObjects.buildStopSampleBody;

    beforeEach(() => {
      getUserAgentStub = sinon.stub(utils, 'getUserAgent').returns('user-agent');
      sendUsageReportStub = sinon.stub(utils, 'sendUsageReport');
    });
    afterEach(()=>{
      getUserAgentStub.restore();
      sendUsageReportStub.restore();
      sandbox.restore();
    })

    it('message thrown if API deprecated', async () => {
      let api_deprecated_response = {
        statusCode: 299
      }
      message = constant.userMessages.API_DEPRECATED;
      messageType = constant.messageTypes.INFO;
      errorCode = 'api_deprecated';
      let requestStub = sinon.stub(request, 'post').yields(undefined, api_deprecated_response, null);
      await utils.stopBrowserStackBuild(bsConfig, args, buildId, rawArgs);
      sinon.assert.calledOnce(requestStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
      requestStub.restore();
    });

    it('message thrown if build returned', async () => {
      let api_deprecated_response = {
        statusCode: 299,
      }
      message = body.message;
      messageType = constant.messageTypes.INFO;
      errorCode = 'api_deprecated';
      let requestStub = sinon.stub(request, 'post').yields(undefined, api_deprecated_response, JSON.stringify(body));
      await utils.stopBrowserStackBuild(bsConfig, args, buildId, rawArgs);
      sinon.assert.calledOnce(requestStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
      requestStub.restore();
    });

    it('message thrown if statusCode != 200', async () => {
      let non_200_status_response = {
        statusCode: 400
      }
      message = constant.userMessages.BUILD_STOP_FAILED;
      messageType = constant.messageTypes.ERROR;
      errorCode = 'api_failed_build_stop';
      let requestStub = sinon.stub(request, 'post').yields(undefined, non_200_status_response, null);
      await utils.stopBrowserStackBuild(bsConfig, args, buildId, rawArgs);
      sinon.assert.calledOnce(requestStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
      requestStub.restore();
    });

    it('message thrown if statusCode != 200 and user unauthorized', async () => {
      let body_with_message = {
        ...body,
        "message": "Unauthorized",
      };
      let non_200_status_response = {
        statusCode: 401,
        data: body_with_message
      }

      message = `${
        constant.userMessages.BUILD_STOP_FAILED
      } with error: \n${JSON.stringify(body_with_message, null, 2)}`;
      messageType = constant.messageTypes.ERROR;
      errorCode = 'api_auth_failed';
      let requestStub = sinon.stub(request, 'post').yields(undefined, non_200_status_response, JSON.stringify(body_with_message));
      await utils.stopBrowserStackBuild(bsConfig, args, buildId, rawArgs);
      sinon.assert.calledOnce(requestStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
      requestStub.restore();
    });

    it('message thrown if statusCode != 200 and build is present', async () => {
      let non_200_status_response = {
        statusCode: 402,
      }

      message = `${
        constant.userMessages.BUILD_STOP_FAILED
      } with error: \n${JSON.stringify(body, null, 2)}`;
      messageType = constant.messageTypes.ERROR;
      errorCode = 'api_failed_build_stop';
      let requestStub = sinon.stub(request, 'post').yields(undefined, non_200_status_response, JSON.stringify(body));
      await utils.stopBrowserStackBuild(bsConfig, args, buildId, rawArgs);
      sinon.assert.calledOnce(requestStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
      requestStub.restore();
    });

    it('message thrown if API success', async () => {
      let success_response = {
        statusCode: 200,
      }

      message = `${JSON.stringify(body, null, 2)}`;
      messageType = constant.messageTypes.SUCCESS;
      errorCode = null;
      let requestStub = sinon.stub(request, 'post').yields(undefined, success_response, JSON.stringify(body));
      await utils.stopBrowserStackBuild(bsConfig, args, buildId, rawArgs);
      sinon.assert.calledOnce(requestStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sinon.assert.calledOnceWithExactly(sendUsageReportStub, bsConfig, args, message, messageType, errorCode, null, rawArgs);
      requestStub.restore();
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

  describe('getVideoConfig', () => {
    it('should return default hash if no config is passed by the user', () => {
      expect(utils.getVideoConfig({})).to.be.eql({video: true, videoUploadOnPasses: true});
      expect(utils.getVideoConfig({reporter: "mochawesome"})).to.be.eql({video: true, videoUploadOnPasses: true});
    });

    it('should replace video config as passed by the user', () => {
      expect(utils.getVideoConfig({video: false})).to.be.eql({video: false, videoUploadOnPasses: true});
      expect(utils.getVideoConfig({videoUploadOnPasses: false})).to.be.eql({video: true, videoUploadOnPasses: false});
      expect(utils.getVideoConfig({video: false, videoUploadOnPasses: false})).to.be.eql({video: false, videoUploadOnPasses: false});
    });

    it('should return default hash and ignore video config in cypress config if enforce_settings is passed by the user', () => {
      expect(utils.getVideoConfig({video: false}, {run_settings: {enforce_settings: true}})).to.be.eql({video: true, videoUploadOnPasses: true});
      expect(utils.getVideoConfig({videoUploadOnPasses: false}, {run_settings: {enforce_settings: true}})).to.be.eql({video: true, videoUploadOnPasses: true});
      expect(utils.getVideoConfig({video: false, videoUploadOnPasses: false}, {run_settings: {enforce_settings: true}})).to.be.eql({video: true, videoUploadOnPasses: true});
    });

    it('should return bsconfig value and ignore video config in cypress config if enforce_settings is passed by the user', () => {
      expect(utils.getVideoConfig({video: true}, {run_settings: {enforce_settings: true, video: false }})).to.be.eql({video: false, videoUploadOnPasses: true});
      expect(utils.getVideoConfig({videoUploadOnPasses: true}, {run_settings: {enforce_settings: true, videoUploadOnPasses: false}})).to.be.eql({video: true, videoUploadOnPasses: false});
      expect(utils.getVideoConfig({video: true, videoUploadOnPasses: true}, {run_settings: {enforce_settings: true, video: false, videoUploadOnPasses: false}})).to.be.eql({video: false, videoUploadOnPasses: false});
      expect(utils.getVideoConfig({video: false}, {run_settings: {enforce_settings: true, video: true }})).to.be.eql({video: true, videoUploadOnPasses: true});
      expect(utils.getVideoConfig({videoUploadOnPasses: false}, {run_settings: {enforce_settings: true, videoUploadOnPasses: true}})).to.be.eql({video: true, videoUploadOnPasses: true});
      expect(utils.getVideoConfig({video: false, videoUploadOnPasses: false}, {run_settings: {enforce_settings: true, video: true, videoUploadOnPasses: true}})).to.be.eql({video: true, videoUploadOnPasses: true});
    });

  });

  describe('setNetworkLogs', () => {
    it('should return true if networkLogs is passed as boolean true', () => {
      let bsConfig = {
        run_settings: { networkLogs: true }
      };
      let expectResult = {
        run_settings: { networkLogs: 'true' }
      }
      utils.setNetworkLogs(bsConfig);
      expect(bsConfig).to.be.eql(expectResult);
    });

    it('should return true if networkLogs is passed as string true', () => {
      let bsConfig = {
        run_settings: { networkLogs: "true" }
      };
      let expectResult = {
        run_settings: { networkLogs: "true" }
      }
      utils.setNetworkLogs(bsConfig);
      expect(bsConfig).to.be.eql(expectResult);
    });

    it('should return false if networkLogs is passed as any other non true value', () => {
      let bsConfig = {
        run_settings: { networkLogs: "abc" }
      };
      let expectResult = {
        run_settings: { networkLogs: "false" }
      }
      utils.setNetworkLogs(bsConfig);
      expect(bsConfig).to.be.eql(expectResult);
    });

    it('should return false if networkLogs is not passed', () => {
      let bsConfig = {
        run_settings: { }
      };
      let expectResult = {
        run_settings: { networkLogs: "false" }
      }
      utils.setNetworkLogs(bsConfig);
      expect(bsConfig).to.be.eql(expectResult);
    });
  });

  describe('isSpecTimeoutArgPassed', () => {
    let searchForOptionStub;
    beforeEach(() => {
      searchForOptionStub = sinon.stub(utils, 'searchForOption').withArgs('--spec-timeout');
    })
    afterEach(() => {
      sinon.restore();
    })
    it('returns true if --spec-timeout flag is passed', () => {
      searchForOptionStub.withArgs('--spec-timeout').returns(true);
      expect(utils.isSpecTimeoutArgPassed()).to.eq(true);
    });

    it('returns true if -t flag is passed', () => {
      searchForOptionStub.withArgs('--spec-timeout').returns(true);
      searchForOptionStub.withArgs('-t').returns(true);
      // stub2.returns(true);
      expect(utils.isSpecTimeoutArgPassed()).to.eq(true);
    });

    it('returns false if no flag is passed', () => {
      searchForOptionStub.withArgs('--spec-timeout').returns(false);
      searchForOptionStub.withArgs('-t').returns(false);
      expect(utils.isSpecTimeoutArgPassed()).to.eq(false);
    });
  });


  describe("#setRecordKeyFlag", () => {
    it("the value of args record-key is given preference", () => {
      let bsConfig = {
        run_settings: {
          "record-key": "abc"
        }
      }
      let args = {
        "record-key": "def"
      }
      process.env.CYPRESS_RECORD_KEY = "ghi"
      expect(utils.setRecordKeyFlag(bsConfig, args)).to.eq("def")
      delete process.env.CYPRESS_RECORD_KEY;
    });

    it("prioritizes env vars over bsconfig", () => {
      let bsConfig = { 
        run_settings: {
          "record-key": "abc"
        } 
      };
      let args = {}
      process.env.CYPRESS_RECORD_KEY = "ghi"
      expect(utils.setRecordKeyFlag(bsConfig, args)).to.eq("ghi")
      delete process.env.CYPRESS_RECORD_KEY;
    });

    it("set bsconfig values if env is not set and args flag is not passed", () => {
      let bsConfig = {
        run_settings: {
          "record-key": "abc"
        }
      }
      let args = {}
      expect(utils.setRecordKeyFlag(bsConfig, args)).to.eq("abc")
    });

    it("returns undefined is nothing is specified", () => {
      let bsConfig = { run_settings: {} };
      let args = {};
      expect(utils.setRecordKeyFlag(bsConfig, args)).to.eq(undefined)
    });
  });

  describe("#setRecordFlag", () => {
    it("returns true if record set in args", () => {
      let bsConfig = {
        run_settings: {}
      };
      let args = {
        record: true
      };
      expect(utils.setRecordFlag(bsConfig, args)).to.eq(true);
    });

    it("returns true if not passed in args but set in bsConfig", () => {
      let bsConfig = {
        run_settings: {
          record: true
        }
      };
      let args = {};
      expect(utils.setRecordFlag(bsConfig, args)).to.eq(true);
    });

    it("returns undefined when not set in args and the bsConfig", () => {
      let bsConfig = {
        run_settings: {}
      };
      let args = {};
      expect(utils.setRecordFlag(bsConfig, args)).to.eq(undefined);
    });
  });

  describe("#setProjectId", () => {
    let getCypressConfigFileStub;
    beforeEach(() => {
      getCypressConfigFileStub = sinon.stub(utils, 'getCypressConfigFile');
    });

    afterEach(() => {
      getCypressConfigFileStub.restore();
    });

    it("prioritizes projectId passed in the args", () => {
      let bsConfig = {
        run_settings: {
          projectId: "abc"
        }
      }
      let args = {
        projectId: "def"
      }
      process.env.CYPRESS_PROJECT_ID = "jkl"
      getCypressConfigFileStub.returns({ projectId: "ghi" })
      expect(utils.setProjectId(bsConfig, args)).to.eq("def")
      delete process.env.CYPRESS_PROJECT_ID;
    });

    it("prioritizes env var if args not passed", () => {
      let bsConfig = {
        run_settings: {
          projectId: "abc"
        }
      }
      let args = {};
      process.env.CYPRESS_PROJECT_ID = "jkl"
      getCypressConfigFileStub.returns({ projectId: "ghi" })
      expect(utils.setProjectId(bsConfig, args)).to.eq("jkl")
      delete process.env.CYPRESS_PROJECT_ID;
    });

    it("prioritizes projectId passed in the bsConfig if args and env var not passed", () => {
      let bsConfig = {
        run_settings: {
          projectId: "abc"
        }
      }
      let args = {};
      expect(utils.setProjectId(bsConfig, args, { projectId: "ghi" })).to.eq("abc")
    });

    it("prioritizes projectId passed in cypress json when no args, env var and bsConfig is passed", () => {
      let bsConfig = {
        run_settings: {}
      }
      let args = {}
      expect(utils.setProjectId(bsConfig, args, { projectId: "ghi" })).to.eq("ghi")
    });

    it("returns undefined when nothing is passed", () => {
      let bsConfig = {
        run_settings: {}
      }
      let args = {}
      expect(utils.setProjectId(bsConfig, args, {})).to.eq(undefined)
    });
  });

  describe("#setRecordCaps", () => {
    let setRecordFlagStub, setRecordKeyFlagStub, setProjectIdStub;
    beforeEach(() => {
      setRecordFlagStub = sinon.stub(utils, 'setRecordFlag');
      setRecordKeyFlagStub = sinon.stub(utils, 'setRecordKeyFlag');
      setProjectIdStub = sinon.stub(utils, 'setProjectId');
    });

    afterEach(() => {
      setRecordFlagStub.restore();
      setRecordKeyFlagStub.restore();
      setProjectIdStub.restore();
    });

    it("sets the bsConfig runsetting params to values passed by the setRecordFlag, setRecordKeyFlag and setProjectId", () => {
      setRecordFlagStub.returns(true);
      setRecordKeyFlagStub.returns("def");
      setProjectIdStub.returns("ghi");
      let bsConfig = {
        run_settings: {}
      };
      let args = {};
      let expectedRespone = {
        "record": true,
        "record-key": "def",
        "projectId": "ghi"
      };
      utils.setRecordCaps(bsConfig, args);
      expect(JSON.stringify(bsConfig.run_settings)).to.eq(JSON.stringify(expectedRespone));
    })
  })

  describe("setSpecTimeout", () => {
    let isSpecTimeoutArgPassedStub;
    beforeEach(() => {
      isSpecTimeoutArgPassedStub = sinon.stub(utils, 'isSpecTimeoutArgPassed');
    });

    afterEach(() => {
      isSpecTimeoutArgPassedStub.restore();
    });
    it('sets spec_timeout defined value passed in args', () => {
      let bsConfig = {
        run_settings: {
          spec_timeout: "abc"
        }
      }
      let args = {
        specTimeout: 20
      };
      isSpecTimeoutArgPassedStub.returns(true);
      utils.setSpecTimeout(bsConfig, args);
      expect(bsConfig.run_settings.spec_timeout).to.eq(20);
    });

    it('sets spec_timeout undefined if no value passed in args', () => {
      let bsConfig = {
        run_settings: {
          spec_timeout: "abc"
        }
      }
      let args = {};
      isSpecTimeoutArgPassedStub.returns(true);
      utils.setSpecTimeout(bsConfig, args);
      expect(bsConfig.run_settings.spec_timeout).to.eq('undefined');
    });

    it('sets spec_timeout to value passed in bsConfig is not in args', () => {
      let bsConfig = {
        run_settings: {
          spec_timeout: 20
        }
      }
      let args = {};
      isSpecTimeoutArgPassedStub.returns(false);
      utils.setSpecTimeout(bsConfig, args);
      expect(bsConfig.run_settings.spec_timeout).to.eq(20);
    });

    it('sets spec_timeout to null if no value passed in args or bsConfig', () => {
      let bsConfig = {
        run_settings: {}
      }
      let args = {};
      isSpecTimeoutArgPassedStub.returns(false);
      utils.setSpecTimeout(bsConfig, args);
      expect(bsConfig.run_settings.spec_timeout).to.eq(null);
    });
  });

  describe("setTimezone", () => {
    let processStub;
    let loggerStub;
    let syncCliLoggerStub;
    beforeEach(() => {
      processStub = sinon.stub(process, 'exit');
      loggerStub = sinon.stub(winstonLogger, 'error');
      syncCliLoggerStub = sinon.stub(syncCliLogger, 'info');
    });

    afterEach(() => {
      processStub.restore();
      loggerStub.restore();
      syncCliLoggerStub.restore();
    });
    it('sets timezone value passed in args', () => {
      let bsConfig = {
        run_settings: {
          timezone: "London"
        }
      }
      let args = {
        timezone: "New_York"
      };
      utils.setTimezone(bsConfig, args);
      expect(bsConfig.run_settings.timezone).to.eq("New_York");
    });

    it('sets timezone to null if no value passed in args', () => {
      let bsConfig = {
        run_settings: {
          timezone: "abc"
        }
      }
      let args = {};
      utils.setTimezone(bsConfig, args);
      expect(bsConfig.run_settings.timezone).to.eq(undefined);
    });

    it('sets timezone to null if invalid value passed in args', () => {
      let bsConfig = {
        run_settings: {
          timezone: "abc"
        }
      }
      let args = {
        timezone: "xyz"
      };
      utils.setTimezone(bsConfig, args);
      expect(bsConfig.run_settings.timezone).to.eq(undefined);
      sinon.assert.calledOnceWithExactly(loggerStub, "Invalid timezone = xyz");
      sinon.assert.calledOnce(syncCliLoggerStub);
      sinon.assert.calledOnceWithExactly(processStub, 1);
    });

    it('sets timezone to null if invalid value passed in bsConfig', () => {
      let bsConfig = {
        run_settings: {
          timezone: "abc"
        }
      }
      let args = {};
      utils.setTimezone(bsConfig, args);
      expect(bsConfig.run_settings.timezone).to.eq(undefined);
      sinon.assert.calledOnceWithExactly(loggerStub, "Invalid timezone = abc");
      sinon.assert.calledOnce(syncCliLoggerStub);
      sinon.assert.calledOnceWithExactly(processStub, 1);
    });

    it('sets timezone to value in bsConfig and not in args', () => {
      let bsConfig = {
        run_settings: {
          timezone: "London"
        }
      }
      let args = {};
      utils.setTimezone(bsConfig, args);
      expect(bsConfig.run_settings.timezone).to.eq("London");
    });

    it('sets timezone to null if no value passed in args or bsConfig', () => {
      let bsConfig = {
        run_settings: {}
      }
      let args = {};
      utils.setTimezone(bsConfig, args);
      expect(bsConfig.run_settings.timezone).to.eq(undefined);
    });
  });


  describe('#isInteger', () => {
    it('returns true if positive integer', () => {
      expect(utils.isInteger(123)).to.eq(true);
    });

    it('returns true if negative integer', () => {
      expect(utils.isInteger(-123)).to.eq(true);
    });

    it('returns false if string', () => {
      expect(utils.isInteger("123")).to.eq(false);
    });
  });

  describe('#isPositiveInteger', () => {
    it('returns true if string positive integer', () => {
      expect(utils.isPositiveInteger("123")).to.eq(true);
    });

    it('returns false if string negative integer', () => {
      expect(utils.isPositiveInteger("-123")).to.eq(false);
    });

    it('returns false if complex string without integer', () => {
      expect(utils.isPositiveInteger("abc qskbd wie")).to.eq(false);
    });

    it('returns false if complex string with integer', () => {
      expect(utils.isPositiveInteger("123 2138 a1bc qs3kbd wie")).to.eq(false);
    });
  });

  describe('formatRequest', () => {
    it('should return correct JSON', () => {
      expect(utils.formatRequest('Something went wrong.', undefined, undefined)).to.be.eql({err: 'Something went wrong.', status: null, body: null});
      const body = {message: "Something went wrong"};
      expect(utils.formatRequest(null, {statusCode: 400}, body)).to.be.eql({err: null, status: 400, body: JSON.stringify(body)});
      const cricularBody = {message: "Something went wrong"};
      cricularBody.body = cricularBody;
      expect(utils.formatRequest(null, {statusCode: 500}, cricularBody)).to.be.eql({err: null, status: 500, body: '[Circular]'});
    });
  });

  describe('setBuildTags', () => {
    it('should give preference to args', () => {
      let bsConfig = {
        run_settings: {
          build_tag: "abc"
        }
      }

      let args = {
        "build-tag": "def"
      }
      utils.setBuildTags(bsConfig, args);
      expect(bsConfig.run_settings.build_tag).to.be.eq("def");
    });

    it('should honour bstack json if args not passed', () => {
      let bsConfig = {
        run_settings: {
          build_tag: "abc"
        }
      }

      let args = {}
      utils.setBuildTags(bsConfig, args);
      expect(bsConfig.run_settings.build_tag).to.be.eq("abc");
    });

    it('should convert values to string', () => {
      let bsConfig = {
        run_settings: {
          build_tag: 1234
        }
      }

      let args = {}
      utils.setBuildTags(bsConfig, args);
      expect(bsConfig.run_settings.build_tag).to.be.eq("1234");
    });

    it('should set undefined if args and bstack json caps not passed', () => {
      let bsConfig = {
        run_settings: {}
      }

      let args = {}
      utils.setBuildTags(bsConfig, args);
      expect(bsConfig.run_settings.build_tag).to.be.eq(undefined);
    });
  });

  describe('getMajorVersion', () => {
    it('should return null if undefined version is sent', () => {
      expect(utils.getMajorVersion()).to.be.eql(null);
    });

    it('should return null if null version is sent', () => {
      expect(utils.getMajorVersion(null)).to.be.eql(null);
    });

    it('should return null if improper version is sent', () => {
      expect(utils.getMajorVersion('test')).to.be.eql(null);
      expect(utils.getMajorVersion('a1.1.1')).to.be.eql(null);
      expect(utils.getMajorVersion('1a.1.1')).to.be.eql(null);
      expect(utils.getMajorVersion('1.a1.1')).to.be.eql(null);
      expect(utils.getMajorVersion('1.1a.1')).to.be.eql(null);
      expect(utils.getMajorVersion('1.1.a1')).to.be.eql(null);
      expect(utils.getMajorVersion('1.1.1a')).to.be.eql(null);
      expect(utils.getMajorVersion('.1.1.1')).to.be.eql(null);
      expect(utils.getMajorVersion('1.')).to.be.eql(null);
      expect(utils.getMajorVersion('$')).to.be.eql(null);
    });

    it('should return proper major version if proper version is sent', () => {
      expect(utils.getMajorVersion('1.1.1')).to.be.eql('1');
      expect(utils.getMajorVersion('2.1')).to.be.eql('2');
      expect(utils.getMajorVersion('3')).to.be.eql('3');
      expect(utils.getMajorVersion('4.1')).to.be.eql('4');
    });
  });

  describe('#isNonBooleanValue' , () => {
    it('return true if value passed in empty string', () => {
      expect(utils.isNonBooleanValue('')).to.be.eql(true);
    });

    it('return true if value passed is abc(non boolean)', () => {
      expect(utils.isNonBooleanValue("abc")).to.be.eql(true);
    });

    it('return false if value passed is false(boolean)', () => {
      expect(utils.isNonBooleanValue("false")).to.be.eql(false);
    });

    it('return false if value passed is true(boolean)', () => {
      expect(utils.isNonBooleanValue(true)).to.be.eql(false);
    });
  });

  describe('#isConflictingBooleanValues' , () => {
    it('return false if value passed is true and true', () => {
      expect(utils.isConflictingBooleanValues(true, true)).to.be.eql(false);
    });

    it('return false if value passed is false and "false"', () => {
      expect(utils.isConflictingBooleanValues(false, "false")).to.be.eql(false);
    });

    it('return true if value passed is "true" and "false"', () => {
      expect(utils.isConflictingBooleanValues("true", "false")).to.be.eql(true);
    });

    it('return true if value passed is true and "false"', () => {
      expect(utils.isConflictingBooleanValues(true, "false")).to.be.eql(true);
    });

    it('return false if value passed is false and "true"', () => {
      expect(utils.isConflictingBooleanValues(false, "true")).to.be.eql(true);
    });

    it('return false if value passed is false and "false"', () => {
      expect(utils.isConflictingBooleanValues(false, "false")).to.be.eql(false);
    });
  });

  describe('#setInteractiveCapability' , () => {
    it('should set true if interactive caps is not passed', () => {
      let bsConfig = {
        run_settings: {}
      }
      let expectedResult = {
        run_settings: {
          interactiveDebugging: "true"
        }
      }
      utils.setInteractiveCapability(bsConfig);
      expect(bsConfig).to.be.eql(expectedResult);
    });

    it('should set true if interactiveDebugging caps passed is true', () => {
      let bsConfig = {
        run_settings: {
          interactiveDebugging: true
        }
      }
      let expectedResult = {
        run_settings: {
          interactiveDebugging: true
        }
      }
      utils.setInteractiveCapability(bsConfig);
      expect(bsConfig).to.be.eql(expectedResult);
    });

    it('should set true if interactive_debugging caps passed is true', () => {
      let bsConfig = {
        run_settings: {
          interactive_debugging: true
        }
      }
      let expectedResult = {
        run_settings: {
          interactive_debugging: true,
          interactiveDebugging: true
        }
      }
      utils.setInteractiveCapability(bsConfig);
      expect(bsConfig).to.be.eql(expectedResult);
    });

    it('should set false if interactive_debugging caps passed is false', () => {
      let bsConfig = {
        run_settings: {
          interactive_debugging: false
        }
      }
      let expectedResult = {
        run_settings: {
          interactive_debugging: false,
          interactiveDebugging: false
        }
      }
      utils.setInteractiveCapability(bsConfig);
      expect(bsConfig).to.be.eql(expectedResult);
    });

    it('should set false if interactiveDebugging caps passed is false', () => {
      let bsConfig = {
        run_settings: {
          interactiveDebugging: false
        }
      }
      let expectedResult = {
        run_settings: {
          interactiveDebugging: false
        }
      }
      utils.setInteractiveCapability(bsConfig);
      expect(bsConfig).to.be.eql(expectedResult);
    });
  });

  describe('#setCypressNpmDependency', () => {
    
    it('should set cypress as latest for cypress 10 test suite if cypress_version missing', () => {
      let bsConfig = {
        run_settings: {
          cypressConfigFilePath: 'cypress.json',
          npm_dependencies: {
            "dummy": "verison"
          },
          cypressTestSuiteType: CYPRESS_V10_AND_ABOVE_TYPE
        },        
      };
      utils.setCypressNpmDependency(bsConfig);
      chai.assert.equal(bsConfig.run_settings.npm_dependencies.cypress, "latest");
    });

    it('should set cypress as ^10 if cypress version added', () => {
      let bsConfig = {
        run_settings: {
          cypress_version: "10.latest",
          cypressConfigFilePath: 'cypress.json',
          npm_dependencies: {
            "dummy": "verison"
          },
          cypressTestSuiteType: CYPRESS_V10_AND_ABOVE_TYPE
        },        
      };
      utils.setCypressNpmDependency(bsConfig);
      chai.assert.equal(bsConfig.run_settings.npm_dependencies.cypress, "^10");
    });

    it('should set cypress as ^10 if cypress version added', () => {
      let bsConfig = {
        run_settings: {
          cypress_version: "10.latest",
          cypressConfigFilePath: 'cypress.json',
          npm_dependencies: {
            "dummy": "verison"
          },
          cypressTestSuiteType: CYPRESS_V10_AND_ABOVE_TYPE
        },        
      };
      utils.setCypressNpmDependency(bsConfig);
      chai.assert.equal(bsConfig.run_settings.npm_dependencies.cypress, "^10");
    });

    it('should set cypress as 10.0.0 if cypress version added', () => {
      let bsConfig = {
        run_settings: {
          cypress_version: "10.0.0",
          cypressConfigFilePath: 'cypress.json',
          npm_dependencies: {
            "dummy": "verison"
          },
          cypressTestSuiteType: CYPRESS_V10_AND_ABOVE_TYPE
        },        
      };
      utils.setCypressNpmDependency(bsConfig);
      chai.assert.equal(bsConfig.run_settings.npm_dependencies.cypress, "^10");
    });

    it('should not set cypress for < 9 cypress version if cypress_version missing', () => {
      let bsConfig = {
        run_settings: {
          cypressConfigFilePath: 'cypress.json',
          npm_dependencies: {
            "dummy": "verison"
          },
          cypressTestSuiteType: CYPRESS_V9_AND_OLDER_TYPE
        },        
      };
      utils.setCypressNpmDependency(bsConfig);
      chai.assert.equal(bsConfig.run_settings.npm_dependencies.cypress, undefined);
    });
  });

    
});
