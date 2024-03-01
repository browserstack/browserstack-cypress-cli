const fs = require('fs'),
  path = require('path');
const { readCypressConfigFile } = require('./readCypressConfigUtil');

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

      if (process.env.BROWSERSTACK_TEST_ACCESSIBILITY === 'true') {
        // If any of the platform has accessibility true, make it true
        bsConfig.run_settings["accessibility"] = true;
        bsConfig.run_settings["accessibilityPlatforms"] = getAccessibilityPlatforms(bsConfig);
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
const getAccessibilityPlatforms = (bsConfig) => {
  const browserList = [];
  if (bsConfig.browsers) {
    bsConfig.browsers.forEach((element) => {
      element.versions.forEach((version) => {
        browserList.push({...element, version, platform: element.os + "-" + element.browser});
      });
    });
  }
  
  const accessibilityPlatforms = Array(browserList.length).fill(false);
  let rootLevelAccessibility = false;
  if (!Utils.isUndefined(bsConfig.run_settings.accessibility)) {
    rootLevelAccessibility = bsConfig.run_settings.accessibility.toString() === 'true';
  }
  browserList.forEach((browserDetails, idx) => {
    accessibilityPlatforms[idx] = (browserDetails.accessibility === undefined) ? rootLevelAccessibility : browserDetails.accessibility;
    if (Utils.isUndefined(bsConfig.run_settings.headless) || !(String(bsConfig.run_settings.headless) === "false")) {
      logger.warn(`Accessibility Automation will not run on legacy headless mode. Switch to new headless mode or avoid using headless mode for ${browserDetails.platform}.`);
    } else if (browserDetails.browser && browserDetails.browser.toLowerCase() !== 'chrome') {
      logger.warn(`Accessibility Automation will run only on Chrome browsers for ${browserDetails.platform}.`);
    } else if (browserDetails.version && !browserDetails.version.includes('latest') && browserDetails.version <= 94) {
      logger.warn(`Accessibility Automation will run only on Chrome browser version greater than 94 for ${browserDetails.platform}.`);
    }
  });
  return accessibilityPlatforms;
}

const addCypressZipStartLocation = (runSettings) => {
  let resolvedHomeDirectoryPath = path.resolve(runSettings.home_directory);
  let resolvedCypressConfigFilePath = path.resolve(runSettings.cypressConfigFilePath);
  runSettings.cypressZipStartLocation = path.dirname(resolvedCypressConfigFilePath.split(resolvedHomeDirectoryPath)[1]);
  runSettings.cypressZipStartLocation = runSettings.cypressZipStartLocation.substring(1);
  logger.debug(`Setting cypress zip start location = ${runSettings.cypressZipStartLocation}`);
}

const validate = (bsConfig, args) => {
  return new Promise(function (resolve, reject) {
    logger.info(Constants.userMessages.VALIDATING_CONFIG);
    if (!bsConfig) reject(Constants.validationMessages.EMPTY_BROWSERSTACK_JSON);

    if (!bsConfig.auth) reject(Constants.validationMessages.INCORRECT_AUTH_PARAMS);

    if( bsConfig.auth.username == "<Your BrowserStack username>" || bsConfig.auth.access_key == "<Your BrowserStack access key>" ) reject(Constants.validationMessages.INVALID_DEFAULT_AUTH_PARAMS);

    if (!bsConfig.browsers || bsConfig.browsers.length === 0) reject(Constants.validationMessages.EMPTY_BROWSER_LIST);

    if (!bsConfig.run_settings) reject(Constants.validationMessages.EMPTY_RUN_SETTINGS);

    if (!bsConfig.run_settings.cypressConfigFilePath && !bsConfig.run_settings.userProvidedCypessConfigFile) {
      reject(Constants.validationMessages.EMPTY_CYPRESS_CONFIG_FILE);
    }

    if ( bsConfig && bsConfig.run_settings && bsConfig.run_settings.enforce_settings && bsConfig.run_settings.enforce_settings.toString() === 'true' && Utils.isUndefined(bsConfig.run_settings.specs) ) {
      reject(Constants.validationMessages.EMPTY_SPECS_IN_BROWSERSTACK_JSON);
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
    
    if (bsConfig.run_settings.userProvidedGeolocation && !bsConfig.run_settings.geolocation.match(/^[A-Z]{2}(-[A-Z0-9]{2,3})?$/g)) reject(Constants.validationMessages.INVALID_GEO_LOCATION);

    if (bsConfig["connection_settings"]["local"] && bsConfig.run_settings.userProvidedGeolocation) reject(Constants.validationMessages.NOT_ALLOWED_GEO_LOCATION_AND_LOCAL_MODE);
    
    // validate if config file provided exists or not when cypress_config_file provided
    // validate the cypressProjectDir key otherwise.
    let cypressConfigFilePath = bsConfig.run_settings.cypressConfigFilePath;
    let cypressConfigFile = {};

    logger.debug(`Checking for cypress config file at ${cypressConfigFilePath}`);
    if (!fs.existsSync(cypressConfigFilePath) && bsConfig.run_settings.cypress_config_filename !== 'false') reject(Constants.validationMessages.INVALID_CYPRESS_CONFIG_FILE);

    logger.debug(`Validating ${bsConfig.run_settings.cypress_config_filename}`);
    try {
      // Not reading cypress config file upon enforce_settings
      if (Utils.isUndefinedOrFalse(bsConfig.run_settings.enforce_settings) && bsConfig.run_settings.cypress_config_filename !== 'false') {
        if (bsConfig.run_settings.cypressTestSuiteType === Constants.CYPRESS_V10_AND_ABOVE_TYPE) {
          const completeCypressConfigFile = readCypressConfigFile(bsConfig)
          if (!Utils.isUndefined(completeCypressConfigFile)) {
            // check if cypress config was exported using export default
            cypressConfigFile = !Utils.isUndefined(completeCypressConfigFile.default) ? completeCypressConfigFile.default : completeCypressConfigFile
          }

          // TODO: add validations for cypress_config_filename
        } else {
          let cypressJsonContent = fs.readFileSync(cypressConfigFilePath);
          cypressConfigFile = JSON.parse(cypressJsonContent);
        }

        // Cypress Json Base Url & Local true check
        if (!Utils.isUndefined(cypressConfigFile.baseUrl) && cypressConfigFile.baseUrl.includes("localhost") && !Utils.getLocalFlag(bsConfig.connection_settings)) reject(Constants.validationMessages.LOCAL_NOT_SET.replace("<baseUrlValue>", cypressConfigFile.baseUrl));

        // Detect if the user is not using the right directory structure, and throw an error
        if (!Utils.isUndefined(cypressConfigFile.integrationFolder) && !Utils.isCypressProjDirValid(bsConfig.run_settings.cypressProjectDir,cypressConfigFile.integrationFolder)) reject(Constants.validationMessages.INCORRECT_DIRECTORY_STRUCTURE);
      }
      else {
        logger.debug("Validating baseurl and integrationFolder in browserstack.json");
        if (!Utils.isUndefined(bsConfig.run_settings.baseUrl) && bsConfig.run_settings.baseUrl.includes("localhost") && !Utils.getLocalFlag(bsConfig.connection_settings)) reject(Constants.validationMessages.LOCAL_NOT_SET.replace("<baseUrlValue>", bsConfig.run_settings.baseUrl));
        if (!Utils.isUndefined(bsConfig.run_settings.integrationFolder) && !Utils.isCypressProjDirValid(bsConfig.run_settings.cypressProjectDir,bsConfig.run_settings.integrationFolder)) reject(Constants.validationMessages.INCORRECT_DIRECTORY_STRUCTURE);
      }
    } catch(error){
      reject(Constants.validationMessages.INVALID_CYPRESS_JSON)
    }

    //check if home_directory is present or not in user run_settings
    if (!Utils.isUndefined(bsConfig.run_settings.home_directory)) {
      // check if home_directory exists or not
      logger.debug(`Validating home_directory at ${bsConfig.run_settings.home_directory}`);
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

    // check if Interactive Capabilities Caps passed is correct or not
    if(!Utils.isUndefined(bsConfig.run_settings.interactive_debugging) && !Utils.isUndefined(bsConfig.run_settings.interactiveDebugging)) {
      if(Utils.isConflictingBooleanValues(bsConfig.run_settings.interactive_debugging, bsConfig.run_settings.interactiveDebugging)) {
        reject(Constants.userMessages.CYPRESS_INTERACTIVE_SESSION_CONFLICT_VALUES);
      } else if(Utils.isNonBooleanValue(bsConfig.run_settings.interactive_debugging) && Utils.isNonBooleanValue(bsConfig.run_settings.interactiveDebugging)) {
        logger.warn('You have passed an invalid value to the interactive_debugging capability. Proceeding with the default value (True).');
      }
    } else if(!Utils.isUndefined(bsConfig.run_settings.interactive_debugging)) {
      if(Utils.isNonBooleanValue(bsConfig.run_settings.interactive_debugging)) {
        logger.warn('You have passed an invalid value to the interactive_debugging capability. Proceeding with the default value (True).');
      }
    } else if(!Utils.isUndefined(bsConfig.run_settings.interactiveDebugging)) {
      if(Utils.isNonBooleanValue(bsConfig.run_settings.interactiveDebugging)) {
        logger.warn('You have passed an invalid value to the interactive_debugging capability. Proceeding with the default value (True).');
      }
    }

    // check if two config files are present at the same location
    let cypressFileDirectory = path.dirname(path.resolve(bsConfig.run_settings.cypressConfigFilePath));
    let listOfFiles = fs.readdirSync(cypressFileDirectory);
    let configFilesPresent = [];
    for (const possibleCypressFileName of Constants.CYPRESS_CONFIG_FILE_NAMES) {
      if (listOfFiles.includes(possibleCypressFileName) || path.extname(possibleCypressFileName) == path.extname(bsConfig.run_settings.cypress_config_filename)) {
        configFilesPresent.push(possibleCypressFileName);
      }
    }

    if (configFilesPresent.length === 0 && bsConfig.run_settings.cypress_config_filename !== 'false') {
      reject(Constants.validationMessages.CYPRESS_CONFIG_FILE_NOT_FOUND.replace('<location>', cypressFileDirectory));
    }
    if (configFilesPresent.length > 1 && bsConfig.run_settings.cypress_config_filename !== 'false') {
      logger.warn(`We found the following cypress config files ${configFilesPresent.join(', ')} at this location: ${cypressFileDirectory}`);
      reject(Constants.validationMessages.MORE_THAN_ONE_CYPRESS_CONFIG_FILE_FOUND);
    }

    if(!Utils.isUndefined(bsConfig.run_settings.spec_timeout)) {
      if(Utils.isPositiveInteger(bsConfig.run_settings.spec_timeout.toString().trim())) {
        if(Number(bsConfig.run_settings.spec_timeout) > Constants.SPEC_TIMEOUT_LIMIT) { 
          reject(Constants.validationMessages.SPEC_TIMEOUT_LIMIT_ERROR) 
        } else {
          logger.info(Constants.userMessages.SPEC_LIMIT_SUCCESS_MESSAGE.replace("<x>", bsConfig.run_settings.spec_timeout));
        }
      } else {
        logger.warn(Constants.userMessages.SPEC_TIMEOUT_LIMIT_WARNING)
      }
    } else {
      logger.warn(Constants.validationMessages.SPEC_TIMEOUT_NOT_PASSED_ERROR);
    }

    if(!Utils.isUndefined(bsConfig.run_settings["record"]) && String(bsConfig.run_settings["record"]) == 'true') {
      if(Utils.isUndefined(bsConfig.run_settings.projectId) || bsConfig.run_settings.projectId == "" ) {
        logger.warn(Constants.validationMessages.PROJECT_ID_MISSING);
      } 
      if (Utils.isUndefined(bsConfig.run_settings["record-key"]) ||  bsConfig.run_settings["record-key"] == "" ) {
        logger.warn(Constants.validationMessages.RECORD_KEY_MISSING);
      }
    }

    if (!Utils.isUndefined(bsConfig.run_settings.nodeVersion) && typeof(bsConfig.run_settings.nodeVersion) === 'string' && !bsConfig.run_settings.nodeVersion.match(/^(\d+\.)?(\d+\.)?(\*|\d+)$/))
        logger.warn(Constants.validationMessages.NODE_VERSION_PARSING_ERROR);

    if(!Utils.isUndefined(cypressConfigFile.port)) {
      logger.warn(Constants.userMessages.CYPRESS_PORT_WARNING.replace("<x>", cypressConfigFile.port));
    }
    resolve(cypressConfigFile);
  });
}

module.exports = {
  caps,
  addCypressZipStartLocation,
  validate
}
