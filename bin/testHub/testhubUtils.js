'use strict';

const os = require('os');
const logger = require("../helpers/logger").winstonLogger;
const utils = require('../helpers/utils');
const helper = require('../helpers/helper');

/**
 * Get common request payload for TestHub API
 * @param {Object} bsConfig - BrowserStack configuration
 * @param {Object} frameworkDetails - Framework details
 * @returns {Object} Common request payload
 */
async function getCommonRequestPayload(bsConfig, frameworkDetails = {}) {
  try {
    const {
      buildName,
      projectName,
      buildDescription,
      buildTags
    } = helper.getBuildDetails(bsConfig, true);

    const data = {
      format: 'json',
      project_name: projectName,
      name: buildName,
      build_identifier: bsConfig.buildIdentifier,
      description: buildDescription,
      started_at: new Date().toISOString(),
      tags: buildTags,
      host_info: getHostInfo(),
      ci_info: helper.getCiInfo(),
      build_run_identifier: process.env.BROWSERSTACK_BUILD_RUN_IDENTIFIER,
      failed_tests_rerun: process.env.BROWSERSTACK_RERUN || false,
      version_control: await helper.getGitMetaData(),
      accessibility: getAccessibilitySettings(bsConfig),
      framework_details: getFrameworkDetails(frameworkDetails),
      product_map: getProductMapForBuildStartCall(bsConfig, frameworkDetails.framework_used || ''),
      browserstackAutomation: process.env.BROWSERSTACK_AUTOMATION === 'true'
    };

    return data;
  } catch (error) {
    logger.error(`Exception while creating payload for TestHub: ${error.message}`);
    return null;
  }
}

/**
 * Get framework details for the payload
 * @param {Object} framework - Framework information
 * @returns {Object} Framework details
 */
function getFrameworkDetails(framework = {}) {
  return {
    frameworkName: framework.framework_name || 'Cypress',
    frameworkVersion: framework.framework_version || helper.getPackageVersion('cypress'),
    sdkVersion: framework.sdk_version || helper.getAgentVersion(),
    language: 'javascript',
    testFramework: framework.testFramework || 'cypress'
  };
}

/**
 * Get host information
 * @returns {Object} Host info
 */
function getHostInfo() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    type: os.type(),
    version: os.version(),
    arch: os.arch()
  };
}

/**
 * Get accessibility settings
 * @param {Object} bsConfig - BrowserStack configuration
 * @returns {Object} Accessibility settings
 */
function getAccessibilitySettings(bsConfig) {
  try {
    let accessibilitySettings = {};
    
    // Check if accessibility is enabled in run_settings
    if (bsConfig.run_settings && bsConfig.run_settings.accessibilityOptions) {
      accessibilitySettings = bsConfig.run_settings.accessibilityOptions;
    }

    // Add non-BrowserStack infrastructure settings if needed
    accessibilitySettings = addNonBstackInfraA11ySettings(bsConfig, accessibilitySettings);

    return {
      settings: accessibilitySettings
    };
  } catch (error) {
    logger.error(`Exception while creating accessibility settings for TestHub: ${error.message}`);
    return {};
  }
}

/**
 * Add non-BrowserStack infrastructure accessibility settings
 * @param {Object} bsConfig - BrowserStack configuration
 * @param {Object} accessibilitySettings - Current accessibility settings
 * @returns {Object} Updated accessibility settings
 */
function addNonBstackInfraA11ySettings(bsConfig, accessibilitySettings) {
  const isTurboScale = bsConfig.turboScale !== undefined;
  const isNonBstackInfra = process.env.BROWSERSTACK_AUTOMATION !== 'true';
  
  if ((isTurboScale || isNonBstackInfra) && isAccessibilityEnabled(bsConfig)) {
    accessibilitySettings.includeEncodedExtension = true;
  }
  
  return accessibilitySettings;
}

/**
 * Convert array of objects to dictionary
 * @param {Array} array - Array to convert
 * @param {string} keyField - Field to use as key
 * @param {string} valueField - Field to use as value
 * @returns {Object} Converted dictionary
 */
function convertArrayToDict(array, keyField, valueField) {
  const result = {};
  
  if (!Array.isArray(array)) {
    return result;
  }
  
  array.forEach(item => {
    if (item[keyField] !== undefined) {
      result[item[keyField]] = item[valueField];
    }
  });
  
  return result;
}

/**
 * Check if observability is enabled
 * @param {Object} bsConfig - BrowserStack configuration
 * @param {Object} frameworkDetails - Framework details
 * @returns {boolean} True if observability is enabled
 */
function isObservabilityEnabled(bsConfig, frameworkDetails = {}) {
  // Check if observability is explicitly enabled in config
  if (bsConfig.run_settings && bsConfig.run_settings.testObservability) {
    return true;
  }
  
  // Check environment variable
  if (process.env.BS_TESTOPS_BUILD_COMPLETED === 'true') {
    return true;
  }
  
  // Default to false
  return false;
}

/**
 * Check if accessibility is enabled
 * @param {Object} bsConfig - BrowserStack configuration
 * @returns {boolean} True if accessibility is enabled
 */
function isAccessibilityEnabled(bsConfig) {
  // Check if accessibility is explicitly enabled in run_settings
  if (bsConfig.run_settings && bsConfig.run_settings.accessibility) {
    return true;
  }
  
  // Check if any browser has accessibility enabled
  if (bsConfig.browsers && Array.isArray(bsConfig.browsers)) {
    return bsConfig.browsers.some(browser => browser.accessibility);
  }
  
  // Check environment variable
  if (process.env.BROWSERSTACK_TEST_ACCESSIBILITY === 'true') {
    return true;
  }
  
  return false;
}

/**
 * Get product map for build start call
 * @param {Object} bsConfig - BrowserStack configuration
 * @param {string} framework - Framework name
 * @returns {Object} Product map
 */
function getProductMapForBuildStartCall(bsConfig, framework) {
  const isAppAutomate = bsConfig.app !== undefined;
  const isTurboScale = bsConfig.turboScale !== undefined;
  const isAutomate = !isAppAutomate && !isTurboScale;

  return {
    observability: isObservabilityEnabled(bsConfig, { framework_used: framework }),
    accessibility: isAccessibilityEnabled(bsConfig),
    percy: bsConfig.percy || false,
    automate: isAutomate,
    app_automate: isAppAutomate,
    turboscale: isTurboScale
  };
}

/**
 * Check if event should be sent for TestHub
 * @param {string} eventType - Type of event
 * @returns {boolean} True if event should be sent
 */
function shouldSendEventForTestHub(eventType = '') {
  const isA11yEnabled = process.env.BS_A11Y_JWT && process.env.BS_A11Y_JWT !== 'null';
  const isO11yEnabled = process.env.BS_TESTOPS_BUILD_COMPLETED === 'true';
  const isPercyEnabled = false; // TODO: Add Percy check if needed

  // If Percy is enabled but not O11y and A11y, exclude certain events
  if (isPercyEnabled && !isO11yEnabled && !isA11yEnabled) {
    return !['CBTSessionCreated', 'LogCreated'].includes(eventType);
  }
  
  // If only A11y is enabled, exclude certain events
  if (isA11yEnabled && !isO11yEnabled) {
    return !['HookRunStarted', 'HookRunFinished', 'LogCreated'].includes(eventType);
  }

  return isA11yEnabled || isO11yEnabled || isPercyEnabled;
}

/**
 * Get product map for specific event
 * @param {string} eventType - Type of event
 * @param {Object} test - Test object
 * @returns {Object|null} Product map for event
 */
function getProductMapForEvent(eventType, test = null) {
  const isA11yOn = process.env.BS_A11Y_JWT && process.env.BS_A11Y_JWT !== 'null';
  
  if (!isA11yOn || eventType !== 'TestRunFinished' || !test) {
    return null;
  }
  
  return {
    accessibility: isA11yOn && isAccessibilityEnabledForTest(test)
  };
}

/**
 * Check if accessibility is enabled for specific test
 * @param {Object} test - Test object
 * @returns {boolean} True if accessibility is enabled for test
 */
function isAccessibilityEnabledForTest(test) {
  // This is a simplified check - extend based on your test structure
  if (test.tags && Array.isArray(test.tags)) {
    return test.tags.includes('accessibility') || test.tags.includes('a11y');
  }
  
  return true; // Default to enabled if no specific tags
}

module.exports = {
  getCommonRequestPayload,
  getFrameworkDetails,
  getHostInfo,
  getAccessibilitySettings,
  addNonBstackInfraA11ySettings,
  convertArrayToDict,
  isObservabilityEnabled,
  isAccessibilityEnabled,
  getProductMapForBuildStartCall,
  shouldSendEventForTestHub,
  getProductMapForEvent,
  isAccessibilityEnabledForTest
};
