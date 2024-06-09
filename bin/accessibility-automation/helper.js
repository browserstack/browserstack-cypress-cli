const logger = require("../helpers/logger").winstonLogger;
const { API_URL } = require('./constants');
const utils = require('../helpers/utils');
const fs = require('fs');
const path = require('path');
const request = require('request');
const os = require('os');
const glob = require('glob');
const helper = require('../helpers/helper');
const { CYPRESS_V10_AND_ABOVE_CONFIG_FILE_EXTENSIONS } = require('../helpers/constants');
const supportFileContentMap = {}

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
        user: userName,
        pass: accessKey
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
    helper.setBrowserstackCypressCliDependency(user_config);

  } catch (error) {
    if (error.response) {
      logger.error(
        `Exception while creating test run for BrowserStack Accessibility Automation: ${
          error.response.status
        } ${error.response.statusText} ${JSON.stringify(error.response.data)}`
      );
    } else {
      if(error.message === 'Invalid configuration passed.') {
        logger.error(
          `Exception while creating test run for BrowserStack Accessibility Automation: ${
            error.message || error.stack
          }`
        );
        for(const errorkey of error.errors){
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
}

const nodeRequest = (type, url, data, config) => {
  return new Promise(async (resolve, reject) => {
    const options = {...config,...{
      method: type,
      url: `${API_URL}/${url}`,
      body: data,
      json: config.headers['Content-Type'] === 'application/json',
    }};

    request(options, function callback(error, response, body) {
      if(error) {
        logger.info("error in nodeRequest", error);
        reject(error);
      } else if(!(response.statusCode == 201 || response.statusCode == 200)) {
        logger.info("response.statusCode in nodeRequest", response.statusCode);
        reject(response && response.body ? response.body : `Received response from BrowserStack Server with status : ${response.statusCode}`);
      } else {
        try {
          if(typeof(body) !== 'object') body = JSON.parse(body);
        } catch(e) {
          if(!url.includes('/stop')) {
            reject('Not a JSON response from BrowserStack Server');
          }
        }
        resolve({
          data: body
        });
      }
    });
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
    // Searching form command.js recursively
    const supportFilesData = helper.getSupportFiles(bsConfig, true);
    if(!supportFilesData.supportFile) return;
    glob(process.cwd() + supportFilesData.supportFile, {}, (err, files) => {
      if(err) return logger.debug('EXCEPTION IN BUILD START EVENT : Unable to parse cypress support files');
      files.forEach(file => {
        try {
          if(!file.includes('commands.js') && !file.includes('commands.ts')) {
            const defaultFileContent = fs.readFileSync(file, {encoding: 'utf-8'});
            
            let cypressCommandEventListener = getAccessibilityCypressCommandEventListener(path.extname(file));
            if(!defaultFileContent.includes(cypressCommandEventListener)) {
              let newFileContent =  defaultFileContent + 
                                  '\n' +
                                  cypressCommandEventListener +
                                  '\n'
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
