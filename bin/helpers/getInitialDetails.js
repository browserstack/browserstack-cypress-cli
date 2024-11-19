const { default: axios } = require('axios');

const logger = require('./logger').winstonLogger,
      utils = require('./utils'),
      config = require("./config"),
      Constants = require('./constants');

const { setAxiosProxy } = require('./helper');

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
          config.uploadUrl = responseData.grr.urls.upload_url;
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
