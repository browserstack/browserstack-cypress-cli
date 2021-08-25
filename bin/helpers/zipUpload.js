'use strict';
const config = require("./config"),
  request = require("request"),
  fs = require("fs"),
  logger = require("./logger").winstonLogger,
  Constants = require("./constants"),
  utils = require("./utils"),
  fileHelpers = require("./fileHelpers");

const uploadCypressZip = (bsConfig, filePath, md5data) => {
  return new Promise(function (resolve, reject) {
    if (md5data.zipUrlPresent) {
      return resolve({ zip_url: md5data.zipUrl });
    }
    logger.info(Constants.userMessages.UPLOADING_TESTS);
    let options = {
      url: config.uploadUrl,
      auth: {
        user: bsConfig.auth.username,
        password: bsConfig.auth.access_key
      },
      formData: {
        file: fs.createReadStream(filePath),
        filetype: 'zip',
        filename: 'tests',
        zipMd5sum: md5data.md5sum ? md5data.md5sum : '',
      },
      headers: {
        "User-Agent": utils.getUserAgent(),
      }
    }

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
          if(responseData && responseData["error"]){
            reject(responseData["error"]);
          } else {
            if(resp.statusCode == 401){
              reject(Constants.validationMessages.INVALID_DEFAULT_AUTH_PARAMS);
            } else if (resp.statusCode == 413) {
              reject(Constants.userMessages.ZIP_UPLOAD_LIMIT_EXCEEDED);
            } else {
              reject(Constants.userMessages.ZIP_UPLOADER_NOT_REACHABLE);
            }
          }
        } else {
          logger.info(`Uploaded tests successfully (${responseData.zip_url})`);
          fileHelpers.deleteZip();
          resolve(responseData);
        }
      }
    });
  });
}

exports.zipUpload = uploadCypressZip
