'use strict';
const request = require('request');

const crypto = require('crypto'),
  Constants = require('./constants'),
  hashHelper = require('./hashUtil'),
  config = require('./config'),
  path = require('path'),
  fs = require("fs"),
  utils = require('./utils');


const checkSpecsMd5 = (runSettings, excludeFiles) => {
  return new Promise(function (resolve, reject) {
    let cypressFolderPath = path.dirname(runSettings.cypressConfigFilePath);
    let ignoreFiles = utils.getFilesToIgnore(runSettings, excludeFiles, false);
    let options = {
      cwd: cypressFolderPath,
      ignore: ignoreFiles,
      pattern: `**/*.+(${Constants.allowedFileTypes.join("|")})`
    };
    hashHelper.hashWrapper(options).then(function (data) {
      const outputHash = crypto.createHash(Constants.hashingOptions.algo);
      outputHash.update(data);
      let packageJSON = {};

      if (typeof runSettings.package_config_options === 'object') {
        Object.assign(packageJSON, runSettings.package_config_options);
      }

      if (typeof runSettings.npm_dependencies === 'object') {
        Object.assign(packageJSON, {
          devDependencies: runSettings.npm_dependencies,
        });
      }

      if (Object.keys(packageJSON).length > 0) {
        let packageJSONString = JSON.stringify(packageJSON);
        outputHash.update(packageJSONString);
      }

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

const checkUploadedMd5 = (bsConfig, args) => {
  return new Promise(function (resolve) {
    let obj = {
      zipUrlPresent: false,
    };
    if (args["force-upload"]) {
      return resolve(obj);
    }
    checkSpecsMd5(bsConfig.run_settings, args.exclude).then(function (md5data) {
      Object.assign(obj, {md5sum: md5data});
      let data = JSON.stringify({ zip_md5sum: md5data });

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
        body: data
      };

      request.post(options, function (err, resp, body) {
        if (err) {
          resolve(obj);
        } else {
          let zipData = null;
          try {
            zipData = JSON.parse(body);
          } catch (error) {
            zipData = {};
          }
          if (resp.statusCode === 200 && !utils.isUndefined(zipData.zipUrl)) {
            Object.assign(obj, zipData, {zipUrlPresent: true});
          }
          resolve(obj);
        }
      });
    }).catch((error) => {
      resolve({zipUrlPresent: false});
    });
  });
};

exports.checkUploadedMd5 = checkUploadedMd5;
