const logger = require("../helpers/logger").winstonLogger;
const { API_URL } = require('./constants');
const utils = require('../helpers/utils');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os');
const glob = require('glob');
const helper = require('../helpers/helper');
const { CYPRESS_V10_AND_ABOVE_CONFIG_FILE_EXTENSIONS } = require('../helpers/constants');
const { consoleHolder } = require("../testObservability/helper/constants");
const scripts = require('./scripts');
const supportFileContentMap = {}
const HttpsProxyAgent = require('https-proxy-agent');

// Function to log A11Y debugging info to remote server

exports.checkAccessibilityPlatform = (user_config) => {
  let accessibility = false;
  try {
    user_config.browsers.forEach(browser => {
      if (browser.accessibility) {
        accessibility = true;
      }
    })
  } catch {}
  
  return accessibility;
}

exports.setAccessibilityCypressCapabilities = async (user_config, accessibilityResponse) => {
  if (utils.isUndefined(user_config.run_settings.accessibilityOptions)) {
    user_config.run_settings.accessibilityOptions = {}
  }
  user_config.run_settings.accessibilityOptions["authToken"] = accessibilityResponse.data.accessibilityToken;
  user_config.run_settings.accessibilityOptions["auth"] = accessibilityResponse.data.accessibilityToken;
  user_config.run_settings.accessibilityOptions["scannerVersion"] = accessibilityResponse.data.scannerVersion;
  user_config.run_settings.system_env_vars.push(`ACCESSIBILITY_AUTH=${accessibilityResponse.data.accessibilityToken}`)
  user_config.run_settings.system_env_vars.push(`ACCESSIBILITY_SCANNERVERSION=${accessibilityResponse.data.scannerVersion}`)
}

exports.isAccessibilitySupportedCypressVersion = (cypress_config_filename) => {
  const extension = cypress_config_filename.split('.').pop();
  return CYPRESS_V10_AND_ABOVE_CONFIG_FILE_EXTENSIONS.includes(extension);
}

exports.createAccessibilityTestRun = async (user_config, framework) => {

  try {
    if (!this.isAccessibilitySupportedCypressVersion(user_config.run_settings.cypress_config_file) ){
      logger.warn(`Accessibility Testing is not supported on Cypress version 9 and below.`)
      process.env.BROWSERSTACK_TEST_ACCESSIBILITY = 'false';
      user_config.run_settings.accessibility = false;
      return;
    }
    const userName = user_config["auth"]["username"];
    const accessKey = user_config["auth"]["access_key"];
    let settings = utils.isUndefined(user_config.run_settings.accessibilityOptions) ? {} : user_config.run_settings.accessibilityOptions

    const {
      buildName,
      projectName,
      buildDescription
    } = helper.getBuildDetails(user_config);

    const data = {
      'projectName': projectName,
      'buildName': buildName,
      'startTime': (new Date()).toISOString(),
      'description': buildDescription,
      'source': {
        frameworkName: "Cypress",
        frameworkVersion: helper.getPackageVersion('cypress', user_config),
        sdkVersion: helper.getAgentVersion(),
        language: 'javascript',
        testFramework: 'cypress',
        testFrameworkVersion: helper.getPackageVersion('cypress', user_config)
      },
      'settings': settings,
      'versionControl': await helper.getGitMetaData(),
      'ciInfo':  helper.getCiInfo(),
      'hostInfo': {
        hostname: os.hostname(),
        platform: os.platform(),
        type: os.type(),
        version: os.version(),
        arch: os.arch()
      },
      'browserstackAutomation': process.env.BROWSERSTACK_AUTOMATION === 'true'
    };

    const config = {
      auth: {
        username: userName,
        password: accessKey
      },
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await nodeRequest(
      'POST', 'v2/test_runs', data, config, API_URL
    );
    if(!utils.isUndefined(response.data)) {
      process.env.BS_A11Y_JWT = response.data.data.accessibilityToken;
      process.env.BS_A11Y_TEST_RUN_ID = response.data.data.id;
    }
    if (process.env.BS_A11Y_JWT) {
      process.env.BROWSERSTACK_TEST_ACCESSIBILITY = 'true';
    }
    logger.debug(`BrowserStack Accessibility Automation Test Run ID: ${response.data.data.id}`);

    this.setAccessibilityCypressCapabilities(user_config, response.data);
    if(user_config.run_settings.auto_import_dev_dependencies != true) helper.setBrowserstackCypressCliDependency(user_config);

  } catch (error) {
    if (error.response) {
      logger.error("Incorrect Cred");
      logger.error(
        `Exception while creating test run for BrowserStack Accessibility Automation: ${
          error.response.status
        } ${error.response.statusText} ${JSON.stringify(error.response.data)}
        `
      );
    } else if (error.message === 'Invalid configuration passed.') {
      logger.error("Invalid configuration passed.");
      logger.error(
        `Exception while creating test run for BrowserStack Accessibility Automation: ${
          error.message || error.stack
        }`
      );
      for (const errorkey of error.errors) {
        logger.error(errorkey.message);
      }
    } else {
      logger.error(
        `Exception while creating test run for BrowserStack Accessibility Automation: ${
          error.message || error.stack
        }`
      );
    }
    // since create accessibility session failed
    process.env.BROWSERSTACK_TEST_ACCESSIBILITY = 'false';
    user_config.run_settings.accessibility = false; 
  }
}

const nodeRequest = (type, url, data, config) => {
  return new Promise(async (resolve, reject) => {
    const options = {
      ...config,
      method: type,
      url: `${API_URL}/${url}`,
      data: data
    };

    if(process.env.HTTP_PROXY){
      options.proxy = false
      options.httpsAgent = new HttpsProxyAgent(process.env.HTTP_PROXY);

    } else if (process.env.HTTPS_PROXY){
      options.proxy = false
      options.httpsAgent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
    }

    axios(options).then(response => {
      if(!(response.status == 201 || response.status == 200)) {
          logger.info("response.status in nodeRequest", response.status);
          reject(response && response.data ? response.data : `Received response from BrowserStack Server with status : ${response.status}`);
      } else {
          try {
              if(typeof(response.data) !== 'object') body = JSON.parse(response.data);
          } catch(e) {
              if(!url.includes('/stop')) {
                reject('Not a JSON response from BrowserStack Server');
              }
          }
          resolve({
              data: response.data
          });
      }
    }).catch(error => {

        logger.info("error in nodeRequest", error);
        reject(error);
    })
  });
}

exports.supportFileCleanup = () => {
  logger.debug("Cleaning up support file changes added for accessibility.")
  Object.keys(supportFileContentMap).forEach(file => {
    try {
      if(typeof supportFileContentMap[file] === 'object') {
        let fileOrDirpath = file;
        if(supportFileContentMap[file].deleteSupportDir) {
          fileOrDirpath = path.join(process.cwd(), 'cypress', 'support');
        }
        helper.deleteSupportFileOrDir(fileOrDirpath);
      } else {
        fs.writeFileSync(file, supportFileContentMap[file], {encoding: 'utf-8'});
      }
    } catch(e) {
      logger.debug(`Error while replacing file content for ${file} with it's original content with error : ${e}`, true, e);
    }
  });
}

const getAccessibilityCypressCommandEventListener = (extName) => {
  return extName == 'js' ? (
    `require('browserstack-cypress-cli/bin/accessibility-automation/cypress');`
  ) : (
    `import 'browserstack-cypress-cli/bin/accessibility-automation/cypress'`
  )
}

exports.setAccessibilityEventListeners = (bsConfig) => {
  try {

    const supportFilesData = helper.getSupportFiles(bsConfig, true);
    if(!supportFilesData.supportFile) return;
    
    const isPattern = glob.hasMagic(supportFilesData.supportFile);
    if(!isPattern) {
      logger.debug(`Using user defined support file: ${supportFilesData.supportFile}`);
      let file;
      try {
            file = process.cwd() + supportFilesData.supportFile;
            const defaultFileContent = fs.readFileSync(file, {encoding: 'utf-8'});
            let cypressCommandEventListener = getAccessibilityCypressCommandEventListener(path.extname(file));
            const alreadyIncludes = defaultFileContent.includes(cypressCommandEventListener);
            if(!alreadyIncludes) {
              let newFileContent = defaultFileContent + 
                                  '\n' +
                                  cypressCommandEventListener +
                                  '\n';
              fs.writeFileSync(file, newFileContent, {encoding: 'utf-8'});
              supportFileContentMap[file] = supportFilesData.cleanupParams ? supportFilesData.cleanupParams : defaultFileContent;
            }
          } catch(e) {
              logger.debug(`Unable to modify file contents for ${file} to set event listeners with error ${e}`, true, e);
            }
      return;      
    }
    
    const globPattern = process.cwd() + supportFilesData.supportFile;
    glob(globPattern, {}, (err, files) => {
      if(err) {
        logger.debug('EXCEPTION IN BUILD START EVENT : Unable to parse cypress support files');
        return;
      }
      
      files.forEach(file => {
        try {
          const fileName = path.basename(file);
          if(['e2e.js', 'e2e.ts', 'component.ts', 'component.js'].includes(fileName) && !file.includes('node_modules')) {
        
            const defaultFileContent = fs.readFileSync(file, {encoding: 'utf-8'});
            let cypressCommandEventListener = getAccessibilityCypressCommandEventListener(path.extname(file));
            if(!defaultFileContent.includes(cypressCommandEventListener)) {
              let newFileContent = defaultFileContent + 
                                  '\n' +
                                  cypressCommandEventListener +
                                  '\n';
              fs.writeFileSync(file, newFileContent, {encoding: 'utf-8'});
              supportFileContentMap[file] = supportFilesData.cleanupParams ? supportFilesData.cleanupParams : defaultFileContent;
            }
          }
        } catch(e) {
          logger.debug(`Unable to modify file contents for ${file} to set event listeners with error ${e}`, true, e);
        }
      });
    });
  } catch(e) {
    logger.debug(`Unable to parse support files to set event listeners with error ${e}`, true, e);
  }
}

// Process server accessibility configuration similar to Node Agent
exports.processServerAccessibilityConfig = (responseData) => {
  logger.debug('[A11Y] Processing server accessibility configuration', { responseData });
  
  try {
    // Use Scripts class to parse server response
    scripts.parseFromResponse(responseData);
    
    // Handle the commandsToWrap structure from the server response
    if (responseData.accessibility?.options?.commandsToWrap) {
      const commandsToWrapData = responseData.accessibility.options.commandsToWrap;
      
      // Extract the actual commands array from the nested structure
      const serverCommands = commandsToWrapData.commands || [];
      
      // Store server commands for Cypress to read
      process.env.ACCESSIBILITY_COMMANDS_TO_WRAP = JSON.stringify(serverCommands);
      
      logger.debug(`[A11Y] Server provided ${serverCommands.length} commands for wrapping`, { serverCommands });
      
      if (serverCommands.length === 0) {
        logger.debug('[A11Y] Server wants build-end-only scanning - command wrapping will be disabled');
        process.env.ACCESSIBILITY_BUILD_END_ONLY = 'true';
      } else {
        logger.debug(`[A11Y] Server wants command-level scanning for: ${serverCommands.map(cmd => cmd.name || cmd).join(', ')}`, { commandList: serverCommands.map(cmd => cmd.name || cmd) });
        process.env.ACCESSIBILITY_BUILD_END_ONLY = 'false';
      }
      
      // Log scriptsToRun if available (Scripts class handles the actual storage)
      if (commandsToWrapData.scriptsToRun) {
        logger.debug(`[A11Y] Server provided scripts to run: ${commandsToWrapData.scriptsToRun.join(', ')}`, { scriptsToRun: commandsToWrapData.scriptsToRun });
      }
    } else {
      logger.debug('[A11Y] No server commands provided, using default command list');
      process.env.ACCESSIBILITY_BUILD_END_ONLY = 'false';
    }
    
    // Process scripts from server response
    if (responseData.accessibility?.options?.scripts) {
      const serverScripts = responseData.accessibility.options.scripts;
      
      // Convert array of script objects to a map for easier access
      const scriptsMap = {};
      serverScripts.forEach(script => {
        scriptsMap[script.name] = script.command;
      });
      
      logger.debug(`[A11Y] Server provided accessibility scripts: ${Object.keys(scriptsMap).join(', ')}`, { scriptsMap });
    } else {
      logger.debug('[A11Y] No server scripts provided, using default scripts');
    }
    
    // Process capabilities for token and other settings
    if (responseData.accessibility?.options?.capabilities) {
      const capabilities = responseData.accessibility.options.capabilities;
      
      capabilities.forEach(cap => {
        if (cap.name === 'accessibilityToken') {
          process.env.BS_A11Y_JWT = cap.value;
          logger.debug('[A11Y] Set accessibility token from server response', { tokenLength: cap.value?.length || 0 });
        } else if (cap.name === 'test_run_id') {
          process.env.BS_A11Y_TEST_RUN_ID = cap.value;
          logger.debug('[A11Y] Set test run ID from server response', { testRunId: cap.value });
        } else if (cap.name === 'testhub_build_uuid') {
          process.env.BROWSERSTACK_TESTHUB_UUID = cap.value;
          logger.debug('[A11Y] Set TestHub build UUID from server response', { buildUuid: cap.value });
        } else if (cap.name === 'scannerVersion') {
          process.env.ACCESSIBILITY_SCANNERVERSION = cap.value;
          logger.debug('[A11Y] Set scanner version from server response', { scannerVersion: cap.value });
        }
      });
    }
    
    logger.debug('[A11Y] Successfully processed server accessibility configuration');
  } catch (error) {
    logger.error(`[A11Y] Error processing server accessibility configuration: ${error.message}`);
    // Fallback to default behavior
    process.env.ACCESSIBILITY_BUILD_END_ONLY = 'false';
  }
};

// Check if command should be wrapped based on server response
exports.shouldWrapCommand = (commandName) => {
  try {
    if (!commandName) {
      return false;
    }

    // Check if we're in build-end-only mode
    if (process.env.ACCESSIBILITY_BUILD_END_ONLY === 'true') {
      logger.debug(`[A11Y] Build-end-only mode: not wrapping command ${commandName}`, { commandName, mode: 'build-end-only' });
      return false;
    }

    // Use Scripts class to check if command should be wrapped
    const shouldWrap = scripts.shouldWrapCommand(commandName);
    
    // If Scripts class has no commands configured, fallback to checking environment
    if (!shouldWrap && process.env.ACCESSIBILITY_COMMANDS_TO_WRAP) {
      const serverCommands = JSON.parse(process.env.ACCESSIBILITY_COMMANDS_TO_WRAP);
      
      if (Array.isArray(serverCommands) && serverCommands.length > 0) {
        const envShouldWrap = serverCommands.some(command => {
          return (command.name || command).toLowerCase() === commandName.toLowerCase();
        });
        
        logger.debug(`[A11Y] shouldWrapCommand: ${commandName} -> ${envShouldWrap} (env-driven)`, { commandName, shouldWrap: envShouldWrap, source: 'environment' });
        return envShouldWrap;
      }
    }

    // If we got a result from Scripts class, use it
    if (scripts.commandsToWrap && scripts.commandsToWrap.length > 0) {
      logger.debug(`[A11Y] shouldWrapCommand: ${commandName} -> ${shouldWrap} (scripts-driven)`, { commandName, shouldWrap, source: 'scripts-class' });
      return shouldWrap;
    }

    // Fallback to default commands if no server commands
    const defaultCommands = ['visit', 'click', 'type', 'request', 'dblclick', 'rightclick', 'clear', 'check', 'uncheck', 'select', 'trigger', 'selectFile', 'scrollIntoView', 'scroll', 'scrollTo', 'blur', 'focus', 'go', 'reload', 'submit', 'viewport', 'origin'];
    const defaultShouldWrap = defaultCommands.includes(commandName.toLowerCase());
    
    logger.debug(`[A11Y] shouldWrapCommand: ${commandName} -> ${defaultShouldWrap} (default)`, { commandName, shouldWrap: defaultShouldWrap, source: 'default' });
    return defaultShouldWrap;
  } catch (error) {
    logger.debug(`[A11Y] Error in shouldWrapCommand: ${error.message}`, { commandName, error: error.message });
    return false;
  }
};

// Export the Scripts instance for direct access
exports.scripts = scripts;
