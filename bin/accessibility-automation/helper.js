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
const { HttpsProxyAgent = require('https-proxy-agent') } = require('https-proxy-agent');

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

// Strip JS/TS comments so that commented-out plugin imports/calls are ignored
// by the static scans below. Best-effort: handles block and line comments while
// avoiding `://` in URLs.
const stripComments = (src) => {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')        // block comments
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');     // line comments (skip URLs like http://)
};

// Reads the cypress config source (comments stripped). Returns null if it cannot
// be read.
const readConfigSource = (user_config) => {
  const configPath = user_config.run_settings && user_config.run_settings.cypressConfigFilePath;
  if (!configPath || !fs.existsSync(configPath)) return null;
  return stripComments(fs.readFileSync(configPath, { encoding: 'utf-8' }));
};

// Finds the symbol the accessibility plugin is imported as, via require() or
// import, regardless of path style. Returns the binding name or null.
const getAccessibilityPluginBinding = (content) => {
  const requireMatch = content.match(/(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*require\(\s*['"][^'"]*accessibility-automation\/plugin['"]\s*\)/);
  const importMatch = content.match(/import\s+([A-Za-z0-9_$]+)\s+from\s+['"][^'"]*accessibility-automation\/plugin['"]/);
  return (requireMatch && requireMatch[1]) || (importMatch && importMatch[1]) || null;
};

const isBindingCalled = (content, binding) => {
  const callRegex = new RegExp('\\b' + binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(');
  return callRegex.test(content);
};

// Static check: confirm the (already-imported) accessibility plugin is actually
// invoked in the config source. Lenient — if the import binding cannot be located
// via static parsing (unusual syntax) or the source cannot be read, we do NOT
// veto the require-based detection (return true), to avoid wrongly disabling
// valid configs.
const isAccessibilityPluginInvokedInSource = (user_config) => {
  try {
    const content = readConfigSource(user_config);
    if (content === null) return true;
    const binding = getAccessibilityPluginBinding(content);
    if (!binding) return true;
    return isBindingCalled(content, binding);
  } catch (error) {
    logger.debug(`Unable to verify accessibility plugin invocation: ${error.message || error}`);
    return true;
  }
};

// Pure static fallback: confirm the plugin is BOTH imported AND invoked. Used
// only when the config could not be required (e.g. a TypeScript config before
// BrowserStack packages are installed), so such users are still evaluated.
const isAccessibilityPluginImportedAndCalledInSource = (user_config) => {
  try {
    const content = readConfigSource(user_config);
    if (content === null) return false;
    const binding = getAccessibilityPluginBinding(content);
    if (!binding) return false;
    return isBindingCalled(content, binding);
  } catch (error) {
    logger.debug(`Unable to scan cypress config for accessibility plugin: ${error.message || error}`);
    return false;
  }
};

/**
 * Determines whether the BrowserStack accessibility plugin is genuinely wired
 * into the user's cypress config, i.e. both imported AND invoked.
 *
 * Detection combines two signals:
 *  1) Require-load: reading the cypress config executes its top-level requires;
 *     the plugin sets BROWSERSTACK_ACCESSIBILITY_PLUGIN_LOADED on load, which
 *     readCypressConfigFile propagates back as a definitive 'true'/'false'. This
 *     tells us whether the plugin is imported (and does not false-positive on a
 *     commented-out require, since commented code never executes).
 *  2) Static source scan: confirms the imported plugin binding is actually called
 *     in the config — so "imported but never called" is treated as not loaded.
 *
 * If the config could not be required (env var stays undefined, e.g. a TS config
 * before packages are installed), we fall back to a pure static scan that checks
 * for both import and invocation.
 */
exports.isAccessibilityPluginLoaded = (user_config) => {
  try {
    // Reset before reading so a stale value from a previous run cannot leak in.
    delete process.env.BROWSERSTACK_ACCESSIBILITY_PLUGIN_LOADED;
    const { readCypressConfigFile } = require('../helpers/readCypressConfigUtil');
    readCypressConfigFile(user_config);

    const detection = process.env.BROWSERSTACK_ACCESSIBILITY_PLUGIN_LOADED;
    if (detection === 'true') {
      // Imported via require — additionally require that it is actually invoked.
      const called = isAccessibilityPluginInvokedInSource(user_config);
      if (!called) {
        logger.debug('Accessibility plugin is imported but not invoked in the cypress config; treating as not loaded.');
      }
      return called;
    }
    if (detection === 'false') return false;

    // Inconclusive (config could not be required) — fall back to a static scan
    // that checks for both import and invocation.
    logger.debug('Accessibility plugin detection inconclusive from config require; falling back to source scan.');
    return isAccessibilityPluginImportedAndCalledInSource(user_config);
  } catch (error) {
    logger.debug(`Unable to determine if accessibility plugin is loaded: ${error.message || error}`);
    return isAccessibilityPluginImportedAndCalledInSource(user_config);
  }
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
