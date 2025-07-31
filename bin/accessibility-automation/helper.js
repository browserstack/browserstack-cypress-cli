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
const supportFileContentMap = {}
const HttpsProxyAgent = require('https-proxy-agent');

exports.checkAccessibilityPlatform = (user_config) => {
  let accessibility = false;
  try {
    console.debug('[A11Y][helper] Checking accessibility platform. Browsers:', user_config.browsers);
    user_config.browsers.forEach(browser => {
      if (browser.accessibility) {
        accessibility = true;
        console.debug(`[A11Y][helper] Accessibility enabled for browser:`, browser);
      }
    })
  } catch (err) {
    console.debug('[A11Y][helper] Error checking accessibility platform:', err);
  }
  console.debug(`[A11Y][helper] Accessibility platform result: ${accessibility}`);
  return accessibility;
}

exports.setAccessibilityCypressCapabilities = async (user_config, accessibilityResponse) => {
  if (utils.isUndefined(user_config.run_settings.accessibilityOptions)) {
    user_config.run_settings.accessibilityOptions = {}
  }
  console.debug('[A11Y][helper] Setting Cypress capabilities for accessibility:', accessibilityResponse.data);
  user_config.run_settings.accessibilityOptions["authToken"] = accessibilityResponse.data.accessibilityToken;
  user_config.run_settings.accessibilityOptions["auth"] = accessibilityResponse.data.accessibilityToken;
  user_config.run_settings.accessibilityOptions["scannerVersion"] = accessibilityResponse.data.scannerVersion;
  user_config.run_settings.system_env_vars.push(`ACCESSIBILITY_AUTH=${accessibilityResponse.data.accessibilityToken}`)
  user_config.run_settings.system_env_vars.push(`ACCESSIBILITY_SCANNERVERSION=${accessibilityResponse.data.scannerVersion}`)
  console.debug('[A11Y][helper] Updated user_config.run_settings:', user_config.run_settings);
}

exports.isAccessibilitySupportedCypressVersion = (cypress_config_filename) => {
  const extension = cypress_config_filename.split('.').pop();
  return CYPRESS_V10_AND_ABOVE_CONFIG_FILE_EXTENSIONS.includes(extension);
}

exports.createAccessibilityTestRun = async (user_config, framework) => {

  try {
    console.debug('[A11Y][helper] Starting createAccessibilityTestRun');
    if (!this.isAccessibilitySupportedCypressVersion(user_config.run_settings.cypress_config_file) ){
      logger.warn(`[A11Y][helper] Accessibility Testing is not supported on Cypress version 9 and below.`)
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
    console.debug('[A11Y][helper] Build details:', { buildName, projectName, buildDescription });

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
    console.debug('[A11Y][helper] Test run payload:', data);

    const config = {
      auth: {
        username: userName,
        password: accessKey
      },
      headers: {
        'Content-Type': 'application/json'
      }
    };
    console.debug('[A11Y][helper] Test run config:', config);

    const response = await nodeRequest(
      'POST', 'v2/test_runs', data, config, API_URL
    );
    console.debug('[A11Y][helper] Test run response:', response.data);
    if(!utils.isUndefined(response.data)) {
      process.env.BS_A11Y_JWT = response.data.data.accessibilityToken;
      process.env.BS_A11Y_TEST_RUN_ID = response.data.data.id;
      console.debug(`[A11Y][helper] Set BS_A11Y_JWT: ${process.env.BS_A11Y_JWT}, BS_A11Y_TEST_RUN_ID: ${process.env.BS_A11Y_TEST_RUN_ID}`);
    }
    if (process.env.BS_A11Y_JWT) {
      process.env.BROWSERSTACK_TEST_ACCESSIBILITY = 'true';
      console.debug('[A11Y][helper] Accessibility session enabled');
    }
    logger.debug(`[A11Y][helper] BrowserStack Accessibility Automation Test Run ID: ${response.data.data.id}`);

    this.setAccessibilityCypressCapabilities(user_config, response.data);
    helper.setBrowserstackCypressCliDependency(user_config);

  } catch (error) {
    console.debug('[A11Y][helper] Error in createAccessibilityTestRun:', error);
    if (error.response) {
      logger.error("Incorrect Cred")
      logger.error(
        `[A11Y][helper] Exception while creating test run for BrowserStack Accessibility Automation: ${
          error.response.status
        } ${error.response.statusText} ${JSON.stringify(error.response.data)}`
      );
    } else {
      if(error.message === 'Invalid configuration passed.') {
        logger.error("Invalid configuration passed.")
        logger.error(
          `[A11Y][helper] Exception while creating test run for BrowserStack Accessibility Automation: ${
            error.message || error.stack
          }`
        );
        for(const errorkey of error.errors){
          logger.error(errorkey.message);
        }

      } else {
        logger.error(
          `[A11Y][helper] Exception while creating test run for BrowserStack Accessibility Automation: ${
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
    // Searching form command.js recursively
    const supportFilesData = helper.getSupportFiles(bsConfig, true);
    if(!supportFilesData.supportFile) return;
    const isPattern = glob.hasMagic(supportFilesData.supportFile);
    if(!isPattern) {
      console.debug(`Inside isPattern`);
      logger.debug(`Inside isPattern`);
      const defaultFileContent = fs.readFileSync(supportFilesData.supportFile, {encoding: 'utf-8'});

            let cypressCommandEventListener = getAccessibilityCypressCommandEventListener(path.extname(supportFilesData.supportFile));
            if(!defaultFileContent.includes(cypressCommandEventListener)) {
              let newFileContent =  defaultFileContent + 
                                  '\n' +
                                  cypressCommandEventListener +
                                  '\n'
              fs.writeFileSync(file, newFileContent, {encoding: 'utf-8'});
              supportFileContentMap[file] = supportFilesData.cleanupParams ? supportFilesData.cleanupParams : defaultFileContent;
            }

    }
    glob(process.cwd() + supportFilesData.supportFile, {}, (err, files) => {
      if(err) return logger.debug('EXCEPTION IN BUILD START EVENT : Unable to parse cypress support files');
      files.forEach(file => {
        try {
          const fileName = path.basename(file);
          console.debug(`Adding accessibility event listeners to ${fileName}`);
            logger.debug(`Adding accessibility event listeners to ${fileName}`);
          if((fileName === 'e2e.js' || fileName === 'e2e.ts' || fileName === 'component.ts' || fileName === 'component.js')) {
            console.debug(`Adding accessibility event listeners to ${file}`);
            logger.debug(`Adding accessibility event listeners to ${file}`);
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
