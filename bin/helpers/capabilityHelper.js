const logger = require("./logger").winstonLogger,
  Constants = require("./constants"),
  Utils = require("./utils"),
  fs = require('fs'),
  path = require('path');

const caps = (bsConfig, zip) => {
  return new Promise(function (resolve, reject) {
    let user = undefined;
    let password = undefined;

    if (bsConfig.auth) {
      user = bsConfig.auth.username;
      password = bsConfig.auth.access_key;
    }

    if (!user || !password) reject(Constants.validationMessages.INCORRECT_AUTH_PARAMS);

    var obj = new Object();

    // Browser list
    let osBrowserArray = [];
    let browsersList = [];
    if (bsConfig.browsers) {
      bsConfig.browsers.forEach((element) => {
        osBrowser = element.os + "-" + element.browser;
        osAndBrowser = element.os + " / " + Utils.capitalizeFirstLetter(element.browser);
        element.versions.forEach((version) => {
          osBrowserArray.push(osBrowser + version);
          browsersList.push(`${osAndBrowser} (${version})`);
        });
      });
    }
    obj.devices = osBrowserArray;
    if (obj.devices.length == 0) reject(Constants.validationMessages.EMPTY_BROWSER_LIST);
    logger.info(`Browsers list: ${browsersList.join(", ")}`);

    // Test suite
    if (zip.zip_url && zip.zip_url.split("://")[1].length !== 0) {
      obj.test_suite = zip.zip_url.split("://")[1];
    } else {
      reject("Test suite is empty");
    }

    // Local
    obj.local = false;
    if (bsConfig.connection_settings && bsConfig.connection_settings.local === true) obj.local = true;
    logger.info(`Local is set to: ${obj.local} (${obj.local ? Constants.userMessages.LOCAL_TRUE : Constants.userMessages.LOCAL_FALSE})`);

    // Local Identifier
    obj.localIdentifier = null;
    if (obj.local === true && (bsConfig.connection_settings.localIdentifier || bsConfig.connection_settings.local_identifier)) {
      obj.localIdentifier = bsConfig.connection_settings.localIdentifier || bsConfig.connection_settings.local_identifier;
      logger.log(`Local Identifier is set to: ${obj.localIdentifier}`);
    }

    // Project name
    obj.project = "project-name";
    // Build name
    obj.customBuildName = "build-name";
    //callback url
    obj.callbackURL = null;
    //projectNotifyURL
    obj.projectNotifyURL = null;

    if (bsConfig.run_settings) {
      obj.project = bsConfig.run_settings.project || bsConfig.run_settings.project_name;
      obj.customBuildName = bsConfig.run_settings.build_name || bsConfig.run_settings.customBuildName;
      obj.callbackURL = bsConfig.run_settings.callback_url;
      obj.projectNotifyURL = bsConfig.run_settings.project_notify_URL;
      obj.parallels = bsConfig.run_settings.parallels;

      if (!Utils.isUndefined(bsConfig.run_settings.cypress_config_filename)) {
        obj.cypress_config_filename = bsConfig.run_settings.cypress_config_filename;
      }

      if (!Utils.isUndefined(bsConfig.run_settings.specs)){
        obj.specs = bsConfig.run_settings.specs;
      }

      if (!Utils.isUndefined(bsConfig.run_settings.env)){
        obj.env = bsConfig.run_settings.env;
      }
    }

    if (bsConfig.cypress_version) obj.cypress_version = bsConfig.cypress_version;

    if(obj.parallels === Constants.cliMessages.RUN.DEFAULT_PARALLEL_MESSAGE) obj.parallels = undefined

    if (obj.project) logger.log(`Project name is: ${obj.project}`);

    if (obj.customBuildName) logger.log(`Build name is: ${obj.customBuildName}`);

    if (obj.callbackURL) logger.info(`callback url is : ${obj.callbackURL}`);

    if (obj.projectNotifyURL) logger.info(`Project notify URL is: ${obj.projectNotifyURL}`);

    if (obj.parallels) logger.info(`Parallels limit specified: ${obj.parallels}`);

    var data = JSON.stringify(obj);
    resolve(data);
  })
}

const validate = (bsConfig, args) => {
  return new Promise(function (resolve, reject) {
    logger.info(Constants.userMessages.VALIDATING_CONFIG);
    if (!bsConfig) reject(Constants.validationMessages.EMPTY_BROWSERSTACK_JSON);

    if (!bsConfig.auth) reject(Constants.validationMessages.INCORRECT_AUTH_PARAMS);

    if( bsConfig.auth.username == "<Your BrowserStack username>" || bsConfig.auth.access_key == "<Your BrowserStack access key>" ) reject(Constants.validationMessages.INVALID_DEFAULT_AUTH_PARAMS);

    if (!bsConfig.browsers || bsConfig.browsers.length === 0) reject(Constants.validationMessages.EMPTY_BROWSER_LIST);

    if (!bsConfig.run_settings) reject(Constants.validationMessages.EMPTY_RUN_SETTINGS);

    if (!bsConfig.run_settings.cypress_proj_dir && !bsConfig.run_settings.userProvidedCypessConfigFile) {
      reject(Constants.validationMessages.EMPTY_CYPRESS_PROJ_DIR);
    }

    // validate parallels specified in browserstack.json if parallels are not specified via arguments
    if (!Utils.isUndefined(args) && Utils.isUndefined(args.parallels) && !Utils.isParallelValid(bsConfig.run_settings.parallels)) reject(Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);

    // if parallels specified via arguments validate only arguments
    if (!Utils.isUndefined(args) && !Utils.isUndefined(args.parallels) && !Utils.isParallelValid(args.parallels)) reject(Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);

    // validate if config file provided exists or not when cypress_config_file provided
    // validate the cypressProjectDir key otherwise.
    let cypressConfigFilePath = bsConfig.run_settings.cypressConfigFilePath;
    let cypressJson = {};

    if (!fs.existsSync(cypressConfigFilePath) && bsConfig.run_settings.cypress_config_filename !== 'false') reject(Constants.validationMessages.INVALID_CYPRESS_CONFIG_FILE);

    try {
      if (bsConfig.run_settings.cypress_config_filename !== 'false') {
        let cypressJsonContent = fs.readFileSync(cypressConfigFilePath);
        cypressJson = JSON.parse(cypressJsonContent);

        // Cypress Json Base Url & Local true check
        if (!Utils.isUndefined(cypressJson.baseUrl) && cypressJson.baseUrl.includes("localhost") && !Utils.getLocalFlag(bsConfig.connection_settings)) reject(Constants.validationMessages.LOCAL_NOT_SET);

        // Detect if the user is not using the right directory structure, and throw an error
        if (!Utils.isUndefined(cypressJson.integrationFolder) && !Utils.isCypressProjDirValid(bsConfig.run_settings.cypressProjectDir,cypressJson.integrationFolder)) reject(Constants.validationMessages.INCORRECT_DIRECTORY_STRUCTURE);
      }
    } catch(error){
      reject(Constants.validationMessages.INVALID_CYPRESS_JSON)
    }
    resolve(cypressJson);
  });
}

module.exports = {
  caps,
  validate
}
