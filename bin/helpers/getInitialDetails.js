const { default: axios } = require('axios');

const logger = require('./logger').winstonLogger,
      utils = require('./utils'),
      config = require("./config"),
      Constants = require('./constants');

const { setAxiosProxy } = require('./helper');
const { isAllowedBrowserstackUrl } = require('./securityValidation');

exports.getInitialDetails = (bsConfig, args, rawArgs) => {
  return new Promise(async (resolve, reject) => {
    let options = {
      url: config.getInitialDetails,
      auth: {
        username: bsConfig.auth.username,
        password: bsConfig.auth.access_key,
      },
      headers: {
        'User-Agent': utils.getUserAgent(),
      }
    };
    let responseData = {};

    const axiosConfig = {
      auth: options.auth,
      headers: options.headers,
    }
    setAxiosProxy(axiosConfig);

    try {
      const response = await axios.get(options.url, axiosConfig);
      try {
        responseData = response.data;
      } catch (e) {
        responseData = {};
      }
      if(response.status != 200) {
        logger.warn(`Warn: Get Initial Details Request failed with status code ${response.status}`);
        utils.sendUsageReport(bsConfig, args, responseData["error"], Constants.messageTypes.ERROR, 'get_initial_details_failed', null, rawArgs);
        resolve({});
      } else {
        if (!utils.isUndefined(responseData.grr) && responseData.grr.enabled && !utils.isUndefined(responseData.grr.urls)) {
          // Validate the API-supplied upload_url before trusting it: a MITM /
          // proxy could rewrite it to redirect the tests.zip upload to an
          // attacker host (APS-19011). Only accept BrowserStack hosts; otherwise
          // keep the default uploadUrl.
          const grrUploadUrl = responseData.grr.urls.upload_url;
          if (isAllowedBrowserstackUrl(grrUploadUrl)) {
            config.uploadUrl = grrUploadUrl;
          } else {
            logger.warn(`Ignoring upload_url from API response (not a BrowserStack host): ${grrUploadUrl}`);
          }
        }
        resolve(responseData);
      }
    } catch (error) {
      if(error.response && error.response.status !== 200) {
        logger.warn(`Warn: Get Initial Details Request failed with status code ${error.response.status}`);
        utils.sendUsageReport(bsConfig, args, error.response.data["error"], Constants.messageTypes.ERROR, 'get_initial_details_failed', null, rawArgs);
      }
      resolve({});
    }
  });
};
