'use strict';
const request = require('request');

const crypto = require('crypto'),
  Constants = require('./constants'),
  hashHelper = require('./hashUtil'),
  config = require('./config'),
  path = require('path'),
  fs = require("fs"),
  utils = require('./utils'),
  logger = require('./logger').winstonLogger;


const checkSpecsMd5 = (runSettings, args, instrumentBlocks) => {
  return new Promise(function (resolve, reject) {
    let cypressFolderPath = undefined;
    if (runSettings.home_directory) {
      cypressFolderPath = runSettings.home_directory;
    } else {
      cypressFolderPath = path.dirname(runSettings.cypressConfigFilePath);
    }
    let ignoreFiles = utils.getFilesToIgnore(runSettings, args.exclude, false);
    let options = {
      cwd: cypressFolderPath,
      ignore: ignoreFiles,
      pattern: `**/*.+(${Constants.allowedFileTypes.join("|")})`
    };
    hashHelper.hashWrapper(options, instrumentBlocks).then(function (data) {
      const outputHash = crypto.createHash(Constants.hashingOptions.algo);
      outputHash.update(data);
      outputHash.update(checkPackageMd5(runSettings));

      if (
        runSettings.cypress_config_file &&
        runSettings.cypress_config_filename !== 'false'
      ) {
        let cypressConfigFileString = "";
        if (runSettings.cypressTestSuiteType === Constants.CYPRESS_V10_AND_ABOVE_TYPE) {
          cypressConfigFileString = fs.readFileSync(runSettings.cypressConfigFilePath).toString();
        } else {
          let cypressJSON = JSON.parse(fs.readFileSync(runSettings.cypressConfigFilePath));
          cypressConfigFileString = JSON.stringify(cypressJSON);
        }
        outputHash.update(cypressConfigFileString);
      }
      resolve(outputHash.digest(Constants.hashingOptions.encoding));
    }).catch(function (error) {
      reject(error);
    });
  });
};

const checkPackageMd5 = (runSettings) => {
  const outputHash = crypto.createHash(Constants.hashingOptions.algo);
  let packageJSON = {};
  if (typeof runSettings.package_config_options === 'object') {
    Object.assign(packageJSON, utils.sortJsonKeys(runSettings.package_config_options));
  }

  if (typeof runSettings.npm_dependencies === 'object') {
    Object.assign(packageJSON, {
      devDependencies: utils.sortJsonKeys(runSettings.npm_dependencies),
    });
  }

  if (Object.keys(packageJSON).length > 0) {
    let packageJSONString = JSON.stringify(packageJSON);
    outputHash.update(packageJSONString);
  }
  let cypressFolderPath = path.dirname(runSettings.cypressConfigFilePath);
  let sourceNpmrc = path.join(cypressFolderPath, ".npmrc");
  if (fs.existsSync(sourceNpmrc)) {
    const npmrc = fs.readFileSync(sourceNpmrc, {encoding:'utf8', flag:'r'});
    outputHash.update(npmrc);
  }

  return outputHash.digest(Constants.hashingOptions.encoding)
};

const checkUploadedMd5 = (bsConfig, args, instrumentBlocks) => {
  return new Promise(function (resolve) {
    let obj = {
      zipUrlPresent: false,
      packageUrlPresent: false,
    };

    if (args["force-upload"]) {
      logger.debug("force-upload set to true. Uploading tests and npm packages.");
      return resolve(obj);
    }
    
    instrumentBlocks.markBlockStart("checkAlreadyUploaded.md5Total");
    checkSpecsMd5(bsConfig.run_settings, args, instrumentBlocks).then(function (zip_md5sum) {
      instrumentBlocks.markBlockStart("checkAlreadyUploaded.md5Package");
      let npm_package_md5sum = checkPackageMd5(bsConfig.run_settings);
      instrumentBlocks.markBlockEnd("checkAlreadyUploaded.md5Package");
      instrumentBlocks.markBlockEnd("checkAlreadyUploaded.md5Total");
      let data = {};
      if (!args["force-upload"]) {
        Object.assign(data, { zip_md5sum });
        Object.assign(obj, { zip_md5sum });
      }
      if (utils.isTrueString(bsConfig.run_settings.cache_dependencies)) {
        Object.assign(data, { npm_package_md5sum });
        Object.assign(obj, { npm_package_md5sum });
      }

      let options = {
        url: config.checkMd5sum,
        auth: {
          user: bsConfig.auth.username,
          password: bsConfig.auth.access_key
        },
        headers: {
          'Content-Type': 'application/json',
          "User-Agent": utils.getUserAgent(),
        },
        body: JSON.stringify(data)
      };

      if (Constants.turboScaleObj.enabled) {
        options.url = config.turboScaleMd5Sum;
      }

      instrumentBlocks.markBlockStart("checkAlreadyUploaded.railsCheck");
      request.post(options, function (err, resp, body) {
        if (err) {
          instrumentBlocks.markBlockEnd("checkAlreadyUploaded.railsCheck");
          resolve(obj);
        } else {
          let zipData = null;
          try {
            zipData = JSON.parse(body);
          } catch (error) {
            zipData = {};
          }
          if (resp.statusCode === 200) {
            if (!utils.isUndefined(zipData.zipUrl)) {
              Object.assign(obj, zipData, {zipUrlPresent: true});
            }
            if (!utils.isUndefined(zipData.npmPackageUrl)) {
              Object.assign(obj, zipData, {packageUrlPresent: true});
            }
          }
          if (utils.isTrueString(zipData.disableNpmSuiteCache)) {
            bsConfig.run_settings.cache_dependencies = false;
            Object.assign(obj, {packageUrlPresent: false});
            delete obj.npm_package_md5sum;
          }
          if (utils.isTrueString(zipData.disableTestSuiteCache)) {
            args["force-upload"] = true;
            Object.assign(obj, {zipUrlPresent: false});
            delete obj.zip_md5sum;
          }
          instrumentBlocks.markBlockEnd("checkAlreadyUploaded.railsCheck");
          resolve(obj);
        }
      });
    }).catch((err) => {
      let errString = err.stack ? err.stack.toString().substring(0,100) : err.toString().substring(0,100);
      resolve({zipUrlPresent: false, packageUrlPresent: false, error: errString});
    });
  });
};

module.exports = {
  checkSpecsMd5,
  checkPackageMd5,
  checkUploadedMd5
};
