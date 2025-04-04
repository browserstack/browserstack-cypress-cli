'use strict';
const axios = require('axios').default;

const config = require('./config'),
  capabilityHelper = require("../helpers/capabilityHelper"),
  Constants = require('../helpers/constants'),
  utils = require('../helpers/utils'),
  logger = require('../helpers/logger').winstonLogger;

const { debugOnConsole } = require('../testObservability/helper/helper');
const { setAxiosProxy } = require('./helper');

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
      if (Constants.turboScaleObj.enabled) {
        options.url = Constants.turboScaleObj.buildUrl;
      }

      const axiosConfig = {
        auth: {
          username: options.auth.user,
          password: options.auth.password
        },
        headers: options.headers
      }
      setAxiosProxy(axiosConfig);

      try {

        try{
          require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt',
            `
            Current Date and time is: ${new Date()}

            Axios Config: ${JSON.stringify(axiosConfig)}
            `
          );
          require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt',
            `
            Options: ${JSON.stringify(options)}
            `
          );
          require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt',
            `
            Data: ${JSON.stringify(data)}
            `
          );
          require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt',
            `
            URL: ${options.url}
            `
          );
          require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt',
            `
            Request Body: ${JSON.stringify(data)}
            `
          );
          require('fs').appendFileSync('/Users/shubhamgarg/Desktop/SDK_OPS/Blank_TO_Cypress 2/requestQueueHandler.txt',
            `
            Request Headers: ${JSON.stringify(options.headers)}
            `
          );
        }catch(e){
          debugOnConsole('Error in writing to file: , ${e.message}');
          debugOnConsole('Sending req to ${options.url}');
          console.log('Error in writing to file');
        }

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
