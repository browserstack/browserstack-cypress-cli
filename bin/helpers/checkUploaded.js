'use strict';
const request = require('request');

const crypto = require('crypto'),
  Constants = require('./constants'),
  hashHelper = require('./hashUtil'),
  config = require('./config'),
  path = require('path'),
  fs = require("fs"),
  utils = require('./utils');


const checkSpecsMd5 = (runSettings, excludeFiles, instrumentBlocks) => {
  return new Promise(function (resolve, reject) {
    let cypressFolderPath = path.dirname(runSettings.cypressConfigFilePath);
    let ignoreFiles = utils.getFilesToIgnore(runSettings, excludeFiles, false);
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
        let cypressJSON = JSON.parse(
          fs.readFileSync(runSettings.cypressConfigFilePath)
        );
        let cypressJSONString = JSON.stringify(cypressJSON);
        outputHash.update(cypressJSONString);
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
    if (args["force-upload"] && !utils.isTrueString(bsConfig.run_settings.local_npm_install)) {
      return resolve(obj);
    }
    
    instrumentBlocks.markBlockStart("checkAlreadyUploaded.md5Total");
    checkSpecsMd5(bsConfig.run_settings, args.exclude, instrumentBlocks).then(function (zip_md5sum) {
      instrumentBlocks.markBlockStart("checkAlreadyUploaded.md5Package");
      let npm_package_md5sum = checkPackageMd5(bsConfig.run_settings);
      instrumentBlocks.markBlockEnd("checkAlreadyUploaded.md5Package");
      instrumentBlocks.markBlockEnd("checkAlreadyUploaded.md5Total");
      let data = {};
      if (!args["force-upload"]) {
        Object.assign(data, { zip_md5sum });
        Object.assign(obj, { zip_md5sum });
      }
      if (utils.isTrueString(bsConfig.run_settings.local_npm_install)) {
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
          instrumentBlocks.markBlockEnd("checkAlreadyUploaded.railsCheck");
          resolve(obj);
        }
      });
    }).catch((err) => {
      resolve({zipUrlPresent: false, packageUrlPresent: false, error: err.stack.substring(0,100)});
    });
  });
};

exports.checkUploadedMd5 = checkUploadedMd5;
