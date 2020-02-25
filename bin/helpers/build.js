var request = require('request')
var logger = require("./logger")
var config = require('./config');
var capabilityHelper = require("../helpers/capabilityHelper");

const createBuild = (bsConfig, zip) => {
  return new Promise(function (resolve, reject) {
    capabilityHelper.caps(bsConfig, zip).then(function(data){
      let options = {
        url: config.buildUrl,
        auth: {
          user: bsConfig.auth.username,
          password: bsConfig.auth.access_key
        },
        headers: {
          'Content-Type': 'application/json'
        },
        body: data
      }
  
      request.post(options, function (err, resp, body) {
        if (err) {
          logger.log("Failed to create the build");
          reject(err)
        } else {
          build = JSON.parse(body)
          if (resp.statusCode != 201) {
            logger.log(`Build creation failed with build error: ${build.message}`);
          } else {
            logger.log(`Build created with build id: ${build.build_id}`);
          }
          resolve(build);
        }
      })
    }).catch(function(err){
      reject(err);
    });
  });
}

exports.createBuild = createBuild
