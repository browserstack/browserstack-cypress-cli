'use strict';
const config = require("./config"),
  request = require("request"),
  fs = require("fs"),
  logger = require("./logger").winstonLogger,
  Constants = require("./constants"),
  utils = require("./utils");

const uploadCypressZip = (bsConfig, filePath) => {
  return new Promise(function (resolve, reject) {
    let options = {
      url: config.uploadUrl,
      auth: {
        user: bsConfig.auth.username,
        password: bsConfig.auth.access_key
      },
      formData: {
        file: fs.createReadStream(filePath),
        filetype: 'zip',
        filename: 'tests'
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
          if (responseData && responseData["error"]) {
            reject(responseData["error"]);
          } else {
            reject(Constants.userMessages.ZIP_UPLOADER_NOT_REACHABLE);
          }
        } else {
          logger.info(`Zip uploaded with url: ${responseData.zip_url}`);
          resolve(responseData);
        }
      }
    });
  });
}

exports.zipUpload = uploadCypressZip
