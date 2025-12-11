'use strict';
const axios = require('axios').default;

const config = require('./config'),
  capabilityHelper = require("../helpers/capabilityHelper"),
  Constants = require('../helpers/constants'),
  utils = require('../helpers/utils'),
  logger = require('../helpers/logger').winstonLogger;

const { setAxiosProxy } = require('./helper');

const createBuild = (bsConfig, zip) => {
  return new Promise(function (resolve, reject) {
    capabilityHelper.caps(bsConfig, zip).then(async function(data){
      let options = {
        url: config.buildUrl,
        auth: {
          user: 'anonymousbrowser_0s1DIn',
          password: 'zQvb7xpLdjhZBayGYxUT'
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

      const axiosConfig = {
        auth: {
          username: options.auth.user,
          password: options.auth.password
        },
        headers: options.headers,
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false  // Allow self-signed certificates
        })
      }
      setAxiosProxy(axiosConfig);

      try {
        logger.info(`data being sent to create build: ${JSON.stringify(data)}`);
        logger.info(`URL: ${options.url}`);
        
        const response = await axios.post(options.url, data, axiosConfig);
        let build = null;
        try {
          build = response.data;
        } catch (error) {
          build = null;
        }
        if (response.status == 299) {
          if (build) {
            resolve(build.message);
          } else {
            logger.error(utils.formatRequest(response.statusText, response, response.data));
            reject(Constants.userMessages.API_DEPRECATED);
          }
        } else if (response.status != 201) {
          logger.info('Build creation failed');
          //logger.info(`Response object: ${JSON.stringify(response.data)}`);
          logger.error(utils.formatRequest(response.statusText, response, response.data));
          if (build) {
            reject(`${Constants.userMessages.BUILD_FAILED} Error: ${build.message}`);
          } else {
            reject(Constants.userMessages.BUILD_FAILED);
          }
        }
        resolve(build);
      } catch (error) {
        if(error.response) {
           logger.info(`Response object: ${JSON.stringify(error.response.data)}`);
          logger.error(utils.formatRequest(error.response.statusText, error.response, error.response.data));
          reject(`${Constants.userMessages.BUILD_FAILED} Error: ${error.response.data.message}`);
        } else {
          reject(error);
        }
      }
    }).catch(function(err){
      reject(err);
    });
  });
}

exports.createBuild = createBuild
