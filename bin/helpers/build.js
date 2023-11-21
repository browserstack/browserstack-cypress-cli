'use strict';
const request = require('request');

const config = require('./config'),
  capabilityHelper = require("../helpers/capabilityHelper"),
  Constants = require('../helpers/constants'),
  utils = require('../helpers/utils'),
  logger = require('../helpers/logger').winstonLogger;

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
          'Content-Type': 'application/json',
          "User-Agent": utils.getUserAgent(),
        },
        body: data
      }

      if (Constants.turboScaleObj.enabled) {
        options.url = Constants.turboScaleObj.buildUrl;
      }

      request.post(options, function (err, resp, body) {
        if (err) {
          logger.error(utils.formatRequest(err, resp, body));
          reject(err);
        } else {
          let build = null;
          try {
            build = JSON.parse(body);
          } catch (error) {
            build = null;
          }

          if (resp.statusCode == 299) {
            if (build) {
              resolve(build.message);
            } else {
              logger.error(utils.formatRequest(err, resp, body));
              reject(Constants.userMessages.API_DEPRECATED);
            }
          } else if (resp.statusCode != 201) {
            logger.error(utils.formatRequest(err, resp, body));
            if (build) {
              reject(`${Constants.userMessages.BUILD_FAILED} Error: ${build.message}`);
            } else {
              reject(Constants.userMessages.BUILD_FAILED);
            }
          } else {
            resolve(build);
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
