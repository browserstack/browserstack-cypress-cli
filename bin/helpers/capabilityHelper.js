const fs = require('fs'),
  path = require('path');

const logger = require("./logger").winstonLogger,
  Constants = require("./constants"),
  Utils = require("./utils");

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
        osAndBrowser = (element.os) ? element.os : "Any OS" + " / " + Utils.capitalizeFirstLetter(element.browser);
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

    // Npm package
    if (zip.npm_package_url && zip.npm_package_url.split("://")[1].length !== 0) {
      obj.npm_package_suite = zip.npm_package_url.split("://")[1];
    }
    obj.cache_dependencies = bsConfig.run_settings.cache_dependencies;

    // Inferred settings
    if(bsConfig.connection_settings){
      if (bsConfig.connection_settings.local_mode_inferred) {
        obj.local_mode_inferred = bsConfig.connection_settings.local_mode_inferred;
      }

      if (bsConfig.connection_settings.local_inferred) {
        obj.local_inferred = bsConfig.connection_settings.local_inferred;
      }

      if (bsConfig.connection_settings.sync_inferred) {
        obj.sync_inferred = bsConfig.connection_settings.sync_inferred;
        logger.info('Setting "sync" mode to enable Local testing.');
      }
    }

    // Local
    obj.local = false;
    if (bsConfig.connection_settings && bsConfig.connection_settings.local === true) {
      obj.local = true;
    }

    // binary was spawned locally
    if(obj.local === true) {
      if (!Utils.isUndefined(process.env.BSTACK_CYPRESS_LOCAL_BINARY_RUNNING) && process.env.BSTACK_CYPRESS_LOCAL_BINARY_RUNNING == "true") {
        obj.localMode = null;

        // Local Mode
        if (bsConfig.connection_settings.local_mode) {
          obj.localMode = bsConfig.connection_settings.local_mode;
          if (bsConfig.connection_settings.user_defined_local_mode_warning) {
            logger.warn(Constants.userMessages.INVALID_LOCAL_MODE_WARNING);
          }
          logger.info(`Local testing set up in ${obj.localMode} mode.`);
        }

        // Local Identifier
        obj.localIdentifier = null;
        if (bsConfig.connection_settings.localIdentifier || bsConfig.connection_settings.local_identifier) {
          obj.localIdentifier = bsConfig.connection_settings.localIdentifier || bsConfig.connection_settings.local_identifier;
          logger.info(`Local testing identifier: ${obj.localIdentifier}`);
        }
      }
    }

    if (!Utils.isUndefined(process.env.BSTACK_CYPRESS_LOCAL_BINARY_ALREADY_RUNNING) && process.env.BSTACK_CYPRESS_LOCAL_BINARY_ALREADY_RUNNING == "true") {
      logger.info(Constants.userMessages.LOCAL_BINARY_ALREADY_RUNNING);
    }

    logger.info(`Local is set to: ${obj.local} (${obj.local ? Constants.userMessages.LOCAL_TRUE : Constants.userMessages.LOCAL_FALSE})`);

    // Project name
    obj.project = "project-name";
    // Build name
    obj.customBuildName = "build-name";
    //callback url
    obj.callbackURL = null;
    //projectNotifyURL
    obj.projectNotifyURL = null;

    if (bsConfig.run_settings) {
      obj.project = bsConfig.run_settings.project || bsConfig.run_settings.project_name || obj.project;
      obj.customBuildName = bsConfig.run_settings.build_name || bsConfig.run_settings.customBuildName || obj.customBuildName;
      obj.callbackURL = bsConfig.run_settings.callback_url;
      obj.projectNotifyURL = bsConfig.run_settings.project_notify_URL;
      obj.parallels = bsConfig.run_settings.parallels;

      if (!(!Utils.isUndefined(bsConfig.run_settings.headless) && String(bsConfig.run_settings.headless) === "false")) {
        logger.info(`Running your tests in headless mode. Use --headed arg to run in headful mode.`);
      }

      // send run_settings as is for other capabilities
      obj.run_settings = JSON.stringify(bsConfig.run_settings);
    }

    if(obj.parallels === Constants.cliMessages.RUN.DEFAULT_PARALLEL_MESSAGE) obj.parallels = undefined

    if (obj.project) logger.info(`Project name is: ${obj.project}`);

    if (obj.customBuildName) logger.info(`Build name is: ${obj.customBuildName}`);

    if (obj.callbackURL) logger.info(`callback url is : ${obj.callbackURL}`);

    if (obj.projectNotifyURL) logger.info(`Project notify URL is: ${obj.projectNotifyURL}`);

    if (obj.parallels) logger.info(`Parallels limit specified: ${obj.parallels}`);

    var data = JSON.stringify(obj);
    resolve(data);
  })
}

const addCypressZipStartLocation = (runSettings) => {
  let resolvedHomeDirectoryPath = path.resolve(runSettings.home_directory);
  let resolvedCypressConfigFilePath = path.resolve(runSettings.cypressConfigFilePath);
  runSettings.cypressZipStartLocation = path.dirname(resolvedCypressConfigFilePath.split(resolvedHomeDirectoryPath)[1]);
  runSettings.cypressZipStartLocation = runSettings.cypressZipStartLocation.substring(1);
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

    // validate local args i.e --local-mode and --local-identifier

    if( Utils.searchForOption('--local-identifier') && (Utils.isUndefined(args.localIdentifier) || (!Utils.isUndefined(args.localIdentifier) && !args.localIdentifier.trim()))) reject(Constants.validationMessages.INVALID_CLI_LOCAL_IDENTIFIER);

    if( Utils.searchForOption('--local-mode') && ( Utils.isUndefined(args.localMode) || (!Utils.isUndefined(args.localMode) && !["always-on","on-demand"].includes(args.localMode)))) reject(Constants.validationMessages.INVALID_LOCAL_MODE);

    if( Utils.searchForOption('--local-config-file') && ( Utils.isUndefined(args.localConfigFile) || (!Utils.isUndefined(args.localConfigFile) && !fs.existsSync(args.localConfigFile)))) reject(Constants.validationMessages.INVALID_LOCAL_CONFIG_FILE);

    if( Utils.searchForOption('--async') && ( !Utils.isUndefined(args.async) && bsConfig["connection_settings"]["local"])) reject(Constants.validationMessages.INVALID_LOCAL_ASYNC_ARGS);
    
    if (bsConfig.run_settings.userProvidedGeolocation && !bsConfig.run_settings.geolocation.match(/^[A-Z]{2}$/g)) reject(Constants.validationMessages.INVALID_GEO_LOCATION);

    if (bsConfig["connection_settings"]["local"] && bsConfig.run_settings.userProvidedGeolocation) reject(Constants.validationMessages.NOT_ALLOWED_GEO_LOCATION_AND_LOCAL_MODE);
    
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
        if (!Utils.isUndefined(cypressJson.baseUrl) && cypressJson.baseUrl.includes("localhost") && !Utils.getLocalFlag(bsConfig.connection_settings)) reject(Constants.validationMessages.LOCAL_NOT_SET.replace("<baseUrlValue>", cypressJson.baseUrl));

        // Detect if the user is not using the right directory structure, and throw an error
        if (!Utils.isUndefined(cypressJson.integrationFolder) && !Utils.isCypressProjDirValid(bsConfig.run_settings.cypressProjectDir,cypressJson.integrationFolder)) reject(Constants.validationMessages.INCORRECT_DIRECTORY_STRUCTURE);
      }
    } catch(error){
      reject(Constants.validationMessages.INVALID_CYPRESS_JSON)
    }

    //check if home_directory is present or not in user run_settings
    if (!Utils.isUndefined(bsConfig.run_settings.home_directory)) {
      // check if home_directory exists or not
      if (!fs.existsSync(bsConfig.run_settings.home_directory)) {
        reject(Constants.validationMessages.HOME_DIRECTORY_NOT_FOUND);
      }

      // check if home_directory is a directory or not
      if (!fs.statSync(bsConfig.run_settings.home_directory).isDirectory()) {
        reject(Constants.validationMessages.HOME_DIRECTORY_NOT_A_DIRECTORY);
      }

      // check if cypress config file (cypress.json) is a part of home_directory or not
      if (!path.resolve(bsConfig.run_settings.cypressConfigFilePath).includes(path.resolve(bsConfig.run_settings.home_directory))) {
        reject(Constants.validationMessages.CYPRESS_CONFIG_FILE_NOT_PART_OF_HOME_DIRECTORY);
      }

      addCypressZipStartLocation(bsConfig.run_settings);
    }

    resolve(cypressJson);
  });
}

module.exports = {
  caps,
  addCypressZipStartLocation,
  validate
}
