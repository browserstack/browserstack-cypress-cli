'use strict';
const config = require("./config"),
  request = require("request"),
  logger = require("./logger").winstonLogger,
  Constants = require("./constants"),
  utils = require("./utils");

const uploadSuits = (bsConfig, filePath, opts) => {
  return new Promise(function (resolve, reject) {
    if (opts.urlPresent) {
      return resolve({ [opts.md5ReturnKey]: opts.url });
    }
    if (!opts.archivePresent) {
      return resolve({});
    }

    logger.info(opts.messages.uploading);

    let options = utils.generateUploadParams(bsConfig, filePath, opts.md5Data, opts.fileDetails)
    let responseData = null;
    request.post(options, function (err, resp, body) {
      if (err) {
        reject(err);
      } else {
        try {
          responseData = JSON.parse(body);
        } catch (e) {
          responseData = null
        }
        if (resp.statusCode != 200) {
          if (resp.statusCode == 401) {
            if (responseData && responseData["error"]) {
              return reject(responseData["error"]);
            } else {
              return reject(Constants.validationMessages.INVALID_DEFAULT_AUTH_PARAMS);
            } 
          }
          if (!opts.propogateError){
            return resolve({});
          }
          if(responseData && responseData["error"]){
            reject(responseData["error"]);
          } else {
            if (resp.statusCode == 413) {
              reject(Constants.userMessages.ZIP_UPLOAD_LIMIT_EXCEEDED);
            } else {
              reject(Constants.userMessages.ZIP_UPLOADER_NOT_REACHABLE);
            }
          }
        } else {
          logger.info(`${opts.messages.uploadingSuccess} (${responseData[opts.md5ReturnKey]})`);
          opts.cleanupMethod();
          resolve(responseData);
        }
      }
    });
  });
}


const uploadCypressZip = (bsConfig, md5data, packageData) => {
  return new Promise(function (resolve, reject) {
    let obj = {}
    const zipOptions = utils.generateUploadOptions('zip', md5data, packageData);
    const npmOptions = utils.generateUploadOptions('npm', md5data, packageData);
    let zipUpload = uploadSuits(bsConfig, config.fileName, zipOptions);
    let npmPackageUpload = uploadSuits(bsConfig, config.packageFileName, npmOptions);
    Promise.all([zipUpload, npmPackageUpload]).then(function (uploads) {
      uploads.forEach(upload => Object.assign(obj, upload))
      return resolve(obj);
    }).catch((error) => {
      return reject(error);
    })
  })
}

exports.zipUpload = uploadCypressZip
