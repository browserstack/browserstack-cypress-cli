var config = require('./config');
var request = require('request')
var fs = require('fs');
var logger = require("./logger")

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
      let responseData = JSON.parse(body);
      if (err || responseData["error"]) {
        reject(err || responseData["error"]);
      } else {
        logger.log(`Zip uploaded with url: ${responseData.zip_url}`)
        // Delete zip file from local storage
        fs.unlink(filePath, function (err) {
          if(err) {
            logger.log("Could not delete local file");
          } else {
            logger.log('File deleted successfully');
          }
          resolve(responseData)
        });
      }
    });
  });
}

exports.zipUpload = uploadCypressZip
