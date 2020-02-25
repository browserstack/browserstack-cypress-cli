var request = require('request')
var logger = require("./logger")
var config = require('./config');
var capabilityHelper = require("../helpers/capabilityHelper");
const Constants = require('../helpers/constants');

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
          reject(err)
        } else {
          let build = null
          try {
            build = JSON.parse(body)
          } catch (error) {
            build = null
          }
          if (resp.statusCode != 201) {
            if (build) {
              logger.error(`${Constants.userMessages.BUILD_FAILED} Error: ${build.message}`);
            } else {
              logger.error(Constants.userMessages.BUILD_FAILED);
            }
          } else if(resp.statusCode == 299){
            if(build) {
              logger.log(build.message);  
            } else {
              logger.log(Constants.userMessages.API_DEPRECATED);
            }
          } else {
            logger.log(build.message)
            logger.log(`${Constants.userMessages.BUILD_CREATED} with build id: ${build.build_id}`);
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
