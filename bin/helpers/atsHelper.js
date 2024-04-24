const path = require('path');
const fs = require('fs')

const request = require('request'),
      logger = require('./logger').winstonLogger,
      utils = require('./utils'),
      config = require('./config');
      Constants = require('./constants');

exports.isTurboScaleSession = (bsConfig) => {
  // env var will override config
  if (process.env.BROWSERSTACK_TURBOSCALE && process.env.BROWSERSTACK_TURBOSCALE === 'true') {
    return true;
  }

  if (utils.isNotUndefined(bsConfig) && bsConfig.run_settings && bsConfig.run_settings.turboScale) {
    return true;
  }

  return false;
};

exports.getTurboScaleOptions = (bsConfig) => {
  if (bsConfig.run_settings && bsConfig.run_settings.turboScaleOptions) {
    return bsConfig.run_settings.turboScaleOptions;
  }

  return {};
};

exports.getTurboScaleGridName = (bsConfig) => {
  // env var will override config
  if (process.env.BROWSERSTACK_TURBOSCALE_GRID_NAME) {
    return process.env.BROWSERSTACK_TURBOSCALE_GRID_NAME;
  }

  if (bsConfig.run_settings && bsConfig.run_settings.turboScaleOptions && bsConfig.run_settings.turboScaleOptions.gridName) {
    return bsConfig.run_settings.turboScaleOptions.gridName;
  }

  return 'NO_GRID_NAME_PASSED';
};

exports.getTurboScaleGridDetails = async (bsConfig, args, rawArgs) => {
  try {
    const gridName = this.getTurboScaleGridName(bsConfig);

    return new Promise((resolve, reject) => {
      let options = {
        url: `${config.turboScaleAPIUrl}/grids/${gridName}`,
        auth: {
          username: bsConfig.auth.username,
          password: bsConfig.auth.access_key,
        },
        headers: {
          'User-Agent': utils.getUserAgent(),
        }
      };
      let responseData = {};
      request.get(options, function (err, resp, data) {
        if(err) {
          logger.warn(utils.formatRequest(err, resp, data));
          utils.sendUsageReport(bsConfig, args, err, Constants.messageTypes.ERROR, 'get_ats_details_failed', null, rawArgs);
          resolve({});
        } else {
          try {
            responseData = JSON.parse(data);
          } catch (e) {
            responseData = {};
          }
          if(resp.statusCode != 200) {
            logger.warn(`Warn: Get Automate TurboScale Details Request failed with status code ${resp.statusCode}`);
            utils.sendUsageReport(bsConfig, args, responseData["error"], Constants.messageTypes.ERROR, 'get_ats_details_failed', null, rawArgs);
            resolve({});
          }
          resolve(responseData);
        }
      });
    });
  } catch (err) {
    logger.error(`Failed to find TurboScale Grid: ${err}: ${err.stack}`);
  }
};

exports.patchCypressConfigFileContent = (bsConfig) => {
  try {
    let cypressConfigFileData = fs.readFileSync(path.resolve(bsConfig.run_settings.cypress_config_file)).toString();
    const patchedConfigFileData = cypressConfigFileData + '\n\n' + `
    let originalFunction = module.exports.e2e.setupNodeEvents;

    module.exports.e2e.setupNodeEvents = (on, config) => {
      const bstackOn = require("./cypressPatch.js")(on);
      if (originalFunction !== null && originalFunction !== undefined) {
        originalFunction(bstackOn, config);
      }
      return config;
    }
    `

    let confPath = bsConfig.run_settings.cypress_config_file;
    let patchedConfPathList = confPath.split(path.sep);
    patchedConfPathList[patchedConfPathList.length - 1] = 'patched_ats_config_file.js'
    const patchedConfPath = patchedConfPathList.join(path.sep);

    bsConfig.run_settings.patched_cypress_config_file = patchedConfPath;

    fs.writeFileSync(path.resolve(bsConfig.run_settings.patched_cypress_config_file), patchedConfigFileData);
  } catch(e) {
    logger.error(`Encountered an error when trying to patch ATS Cypress Config File ${e}`);
    return {};
  }
}

exports.atsFileCleanup = (bsConfig) => {
  const filePath = path.resolve(bsConfig.run_settings.patched_cypress_config_file);
  if(fs.existsSync(filePath)){
    fs.unlinkSync(filePath);
  }
}
