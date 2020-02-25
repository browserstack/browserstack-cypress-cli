var config = require('./config');
var request = require('request')
var fs = require('fs');
var logger = require("./logger")
const Constants = require("./constants")

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
      }
    }

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
          logger.log(`Zip uploaded with url: ${responseData.zip_url}`);
          resolve(responseData);
        }
      }
    });
  });
}

exports.zipUpload = uploadCypressZip
