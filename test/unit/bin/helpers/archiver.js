const chai = require("chai"),
  rewire = require("rewire"),
  chaiAsPromised = require("chai-as-promised");

const utils = require("../../../../bin/helpers/utils"),
  Constants = require("../../../../bin/helpers/constants"),
  logger = require("../../../../bin/helpers/logger").winstonLogger;

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

const archiver = rewire("../../../../bin/helpers/archiver");

_getFilesToIgnore = archiver.__get__("getFilesToIgnore");

describe("archiver.js", () => {

  describe("getFilesToIgnore", () => {
    it("no args, no exclude in runSettings", () => {
      chai.expect(_getFilesToIgnore({}, undefined)).to.be.eql(Constants.filesToIgnoreWhileUploading);
    });

    it("args passed, no exclude in runSettings", () => {
      let excludeFiles = "file1.js, file2.json";
      let argsToArray = utils.fixCommaSeparatedString(excludeFiles).split(',');
      chai.expect(_getFilesToIgnore({}, excludeFiles)).to.be.eql(Constants.filesToIgnoreWhileUploading.concat(argsToArray));

      excludeFiles = "file1.js,file2.json";
      argsToArray = utils.fixCommaSeparatedString(excludeFiles).split(',');
      chai.expect(_getFilesToIgnore({}, excludeFiles)).to.be.eql(Constants.filesToIgnoreWhileUploading.concat(argsToArray));

      excludeFiles = " file1.js , file2.json ";
      argsToArray = utils.fixCommaSeparatedString(excludeFiles).split(',');
      chai.expect(_getFilesToIgnore({}, excludeFiles)).to.be.eql(Constants.filesToIgnoreWhileUploading.concat(argsToArray));
    });

    it("args passed, exclude added in runSettings", () => {
      // args preceed over config file
      let excludeFiles = "file1.js, file2.json ";
      let argsToArray = utils.fixCommaSeparatedString(excludeFiles).split(',');

      let runSettings = { exclude: [] };
      chai.expect(_getFilesToIgnore(runSettings, excludeFiles)).to.be.eql(Constants.filesToIgnoreWhileUploading.concat(argsToArray));

      runSettings = { exclude: ["sample1.js", "sample2.json"] };
      chai.expect(_getFilesToIgnore(runSettings, excludeFiles)).to.be.eql(Constants.filesToIgnoreWhileUploading.concat(argsToArray));
    });

    it("no args, exclude added in runSettings", () => {
      let runSettings = { exclude: [] };
      chai.expect(_getFilesToIgnore(runSettings, undefined)).to.be.eql(Constants.filesToIgnoreWhileUploading);

      runSettings = { exclude: ["sample1.js", "sample2.json"] };
      chai.expect(_getFilesToIgnore(runSettings, undefined)).to.be.eql(Constants.filesToIgnoreWhileUploading.concat(runSettings.exclude));
    });
  });
});
