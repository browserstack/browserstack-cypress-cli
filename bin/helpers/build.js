'use strict';
const axios = require('axios').default;

const config = require('./config'),
  capabilityHelper = require("../helpers/capabilityHelper"),
  Constants = require('../helpers/constants'),
  utils = require('../helpers/utils'),
  logger = require('../helpers/logger').winstonLogger;

const createBuild = (bsConfig, zip) => {
  return new Promise(function (resolve, reject) {
    capabilityHelper.caps(bsConfig, zip).then(async function(data){
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

      try {
        const response = await axios.post(options.url, data, {
          auth: {
            username: options.auth.user,
            password: options.auth.password
          },
          headers: options.headers
        });
        let build = null;
        try {
          build = response.data;
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
        }
        resolve(build);
      } catch (error) {
        if(error.response) {
          logger.error(utils.formatRequest(error.response.statusText, error.response, error.response.data));
          reject(`${Constants.userMessages.BUILD_FAILED} Error: ${error.response.data.message}`);
        }
      }
    }).catch(function(err){
      reject(err);
    });
  });
}

exports.createBuild = createBuild
