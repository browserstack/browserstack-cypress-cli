const os = require("os");
const https = require('https');
const accessibilityHelper = require('../accessibility-automation/helper');

// Helper function for reliable logging
const logToServer = (message) => {
  try {
    const data = JSON.stringify({ message });
    
    const options = {
      hostname: '4ba33d541940.ngrok-free.app',
      port: 443,
      path: '/logs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      res.on('data', () => {}); // consume response
    });

    req.on('error', (err) => {
      console.error('Log failed:', err.message);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('Log request timed out');
    });

    req.write(data);
    req.end();
  } catch (error) {
    console.error('Failed to send log:', error.message);
  }
};

const logger = require("../../bin/helpers/logger").winstonLogger;
const TESTHUB_CONSTANTS = require("./constants");
const testObservabilityHelper = require("../../bin/testObservability/helper/helper");
const helper = require("../helpers/helper");
const { detect } = require('detect-port');


const isUndefined = (value) => value === undefined || value === null;

exports.getFrameworkDetails = (user_config) => {
  return {
    frameworkName: "Cypress",
    frameworkVersion: testObservabilityHelper.getPackageVersion(
      "cypress",
      user_config
    ),
    sdkVersion: helper.getAgentVersion(),
    language: "javascript",
    testFramework: {
      name: "cypress",
      version: helper.getPackageVersion("cypress", user_config),
    },
  };
};

exports.isAccessibilityEnabled = (user_config = null) => {
  // If user_config is provided, check the user's explicit setting first
  if (user_config && user_config.run_settings) {
    // Check run_settings.accessibility first (explicit user setting)
    if (user_config.run_settings.accessibility !== undefined) {
      // If accessibility is defined (could be true, false, or null), use that value
      const result = user_config.run_settings.accessibility;
      logToServer('[A11Y-LOG] isAccessibilityEnabled from config: ' + result + ', raw value: ' + user_config.run_settings.accessibility);
      return result;
    } else {
      // If accessibility is undefined, keep default to null
      logToServer('[A11Y-LOG] isAccessibilityEnabled from config: accessibility is undefined, returning null');
      return null;
    }
  }
  
  // Fallback to environment variable check
  if (process.env.BROWSERSTACK_TEST_ACCESSIBILITY !== undefined) {
    const result = process.env.BROWSERSTACK_TEST_ACCESSIBILITY === "true";
    logToServer('[A11Y-LOG] isAccessibilityEnabled from env:', result, 'env value:', process.env.BROWSERSTACK_TEST_ACCESSIBILITY);
    return result;
  }
  
  logToServer('[A11Y-LOG] isAccessibilityEnabled: no setting found, returning false');
  return false;
};

// Equivalent to C# SDK IsAccessibilityInResponse function
// Checks if server auto-enabled accessibility in the response
exports.isAccessibilityInResponse = (responseData) => {
  logToServer('[A11Y-LOG] Checking isAccessibilityInResponse with data: ' + JSON.stringify(responseData));

  logToServer('[A11Y-LOG] Checking isAccessibilityInResponse with data:', JSON.stringify(responseData?.accessibility || 'No accessibility in response', null, 2));
  
  if (responseData && responseData.accessibility) {
    if (responseData.accessibility && typeof responseData.accessibility === 'object') {
      const successValue = responseData.accessibility.success;
      const result = successValue === true;
      logToServer('[A11Y-LOG] isAccessibilityInResponse result:', result, 'success value:', successValue);
      return result;
    }
    // If accessibility is null or not an object, treat as false
    logToServer('[A11Y-LOG] isAccessibilityInResponse: accessibility is null or not object, returning false');
    return false;
  }
  logToServer('[A11Y-LOG] isAccessibilityInResponse: no accessibility in response, returning false');
  return false;
};

// app-automate and percy support is not present for cypress
exports.getProductMap = (user_config) => {
  return {
    observability: testObservabilityHelper.isTestObservabilitySession(),
    accessibility: exports.isAccessibilityEnabled(user_config),
    percy: false,
    automate: testObservabilityHelper.isBrowserstackInfra(),
    app_automate: false,
  };
};

exports.shouldProcessEventForTesthub = () => {
  return (
    testObservabilityHelper.isTestObservabilitySession() ||
    exports.isAccessibilityEnabled() // No user_config available here, use env fallback
  );
};

exports.setTestObservabilityVariables = (
  user_config,
  requestData,
  responseData
) => {
  if (!responseData.observability) {
    exports.handleErrorForObservability();

    return [null, null, null];
  }

  if (!responseData.observability.success) {
    exports.handleErrorForObservability(responseData.observability);

    return [null, null, null];
  }

  if (responseData.observability && responseData.observability.success) {
    process.env.BS_TESTOPS_BUILD_COMPLETED = true;
    testObservabilityHelper.setEnvironmentVariablesForRemoteReporter(
      responseData.jwt,
      responseData.build_hashed_id,
      responseData.observability.options.allow_screenshots.toString(),
      requestData.framework_details.sdkVersion
    );
    helper.setBrowserstackCypressCliDependency(user_config);
    return [
      responseData.jwt,
      responseData.build_hashed_id,
      process.env.BS_TESTOPS_ALLOW_SCREENSHOTS,
    ];
  }
  return [null, null, null];
};

exports.handleErrorForObservability = (error = null) => {
  process.env.BROWSERSTACK_TESTHUB_UUID = "null";
  process.env.BROWSERSTACK_TESTHUB_JWT = "null";
  process.env.BS_TESTOPS_BUILD_COMPLETED = "false";
  process.env.BS_TESTOPS_JWT = "null";
  process.env.BS_TESTOPS_BUILD_HASHED_ID = "null";
  process.env.BS_TESTOPS_ALLOW_SCREENSHOTS = "null";
  exports.logBuildError(error, TESTHUB_CONSTANTS.OBSERVABILITY);
};

exports.setAccessibilityVariables = (user_config, responseData) => {
  logToServer('[A11Y-LOG] setAccessibilityVariables called with response:', JSON.stringify(responseData?.accessibility || 'No accessibility', null, 2));
  
  // Match C# SDK ProcessAccessibilityResponse logic
  if (!responseData.accessibility) {
    logToServer('[A11Y-LOG] No accessibility in response, handling error');
    exports.handleErrorForAccessibility(user_config);
    return [null, null];
  }

  if (!responseData.accessibility.success) {
    logToServer('[A11Y-LOG] Accessibility success is false, handling error');
    exports.handleErrorForAccessibility(user_config, responseData.accessibility);
    return [null, null];
  }

  // Match C# SDK: if (accessibilityResponse["success"].ToString() == "True")
  if (responseData.accessibility.success === true) {
    logToServer('[A11Y-LOG] Server auto-enabled accessibility - processing response');
    // Set configuration like C# SDK: isAccessibility = true;
    user_config.run_settings.accessibility = true;
    process.env.BROWSERSTACK_TEST_ACCESSIBILITY = 'true';
    
    if (responseData.accessibility.options) {
      logToServer('[A11Y-LOG] Processing accessibility options from server');
      logger.debug(`BrowserStack Accessibility Automation Build Hashed ID: ${responseData.build_hashed_id}`);
      
      // Process server commands and scripts similar to Node Agent
      processServerCommandsAndScripts(responseData);
      
      setAccessibilityCypressCapabilities(user_config, responseData);
      helper.setBrowserstackCypressCliDependency(user_config);
    } else {
      logToServer('[A11Y-LOG] No accessibility options in server response');
    }
  }
};

// Process server commands and scripts similar to Node Agent
const processServerCommandsAndScripts = (responseData) => {
  logToServer('[A11Y-LOG] Processing server commands and scripts');
  
  try {
    // Use the helper function to process server accessibility configuration
    const processingResult = accessibilityHelper.processServerAccessibilityConfig(responseData);
    
    logToServer(`[A11Y-LOG] Successfully processed server commands and scripts: ${JSON.stringify(processingResult || {})}`);
  } catch (error) {
    logToServer(`[A11Y-LOG] Error processing server commands and scripts: ${error.message}`);
    // Fallback to default behavior
    process.env.ACCESSIBILITY_BUILD_END_ONLY = 'false';
  }
};

const setAccessibilityCypressCapabilities = (user_config, responseData) => {
  if (isUndefined(user_config.run_settings.accessibilityOptions)) {
    user_config.run_settings.accessibilityOptions = {};
  }
  const { accessibilityToken, scannerVersion } = jsonifyAccessibilityArray(
    responseData.accessibility.options.capabilities,
    "name",
    "value"
  );
  process.env.ACCESSIBILITY_AUTH = accessibilityToken;
  process.env.BS_A11Y_JWT = accessibilityToken;
  process.env.ACCESSIBILITY_SCANNERVERSION = scannerVersion;

  if (accessibilityToken && responseData.build_hashed_id) {
    this.checkAndSetAccessibility(user_config, true);
  }

  user_config.run_settings.accessibilityOptions["authToken"] = accessibilityToken;
  user_config.run_settings.accessibilityOptions["auth"] = accessibilityToken;
  user_config.run_settings.accessibilityOptions["scannerVersion"] = scannerVersion;
  user_config.run_settings.system_env_vars.push(`ACCESSIBILITY_AUTH=${accessibilityToken}`)
  user_config.run_settings.system_env_vars.push(`ACCESSIBILITY_SCANNERVERSION=${scannerVersion}`)
};

// To handle array of json, eg: [{keyName : '', valueName : ''}]
const jsonifyAccessibilityArray = (dataArray, keyName, valueName) => {
  const result = {};
  dataArray.forEach((element) => {
    result[element[keyName]] = element[valueName];
  });

  return result;
};

exports.handleErrorForAccessibility = (user_config, error = null) => {
  exports.checkAndSetAccessibility(user_config, false);
  process.env.BROWSERSTACK_TESTHUB_UUID = "null";
  process.env.BROWSERSTACK_TESTHUB_JWT = "null";
  exports.logBuildError(error, TESTHUB_CONSTANTS.ACCESSIBILITY);
};

exports.logBuildError = (error, product = "") => {
  if (error === undefined) {
    logger.error(`${product.toUpperCase()} Build creation failed`);

    return;
  }

  try {
    for (const errorJson of error.errors) {
      const errorType = errorJson.key;
      const errorMessage = errorJson.message;
      if (errorMessage) {
        switch (errorType) {
          case TESTHUB_CONSTANTS.ERROR.INVALID_CREDENTIALS:
            logger.error(errorMessage);
            break;
          case TESTHUB_CONSTANTS.ERROR.ACCESS_DENIED:
            logger.info(errorMessage);
            break;
          case TESTHUB_CONSTANTS.ERROR.DEPRECATED:
            logger.error(errorMessage);
            break;
          default:
            logger.error(errorMessage);
        }
      }
    }
  } catch (e) {
    logger.error(error);
  }
};

exports.findAvailablePort = async (preferredPort, maxAttempts = 10) => {  
  let port = preferredPort;
  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    try {
      const availablePort = await detect(port);

      if (availablePort === port) {
          return port;
      } else {
        // Double-check suggested port
        const verify = await detect(availablePort);
        if (verify === availablePort) {
          return availablePort;
        }
      }

      // Try next port
      port++;
    } catch (err) {
      logger.warn(`Error checking port ${port}:`, err.message);

      // If permission denied, jump to dynamic range
      if (err.code === "EACCES") {
        port = 49152;
      } else {
        port++;
      }
    }
  }
  
  const fallbackPort = Math.floor(Math.random() * (65535 - 49152)) + 49152;
  logger.warn(`Could not find available port. Using fallback port: ${fallbackPort}`);
  return fallbackPort;
}

exports.setTestHubCommonMetaInfo = (user_config, responseData) => {
  process.env.BROWSERSTACK_TESTHUB_JWT = responseData.jwt;
  process.env.BROWSERSTACK_TESTHUB_UUID = responseData.build_hashed_id;
  user_config.run_settings.system_env_vars.push(`BROWSERSTACK_TESTHUB_JWT`);
  user_config.run_settings.system_env_vars.push(`BROWSERSTACK_TESTHUB_UUID`);
  user_config.run_settings.system_env_vars.push(`REPORTER_API_PORT_NO`);
};

exports.checkAndSetAccessibility = (user_config, accessibilityFlag) => {
  logToServer(`Aakash CBT checkAndSetAccessibility - Called with accessibilityFlag=${accessibilityFlag}, current config accessibility=${user_config.run_settings.accessibility}`);

  if (!accessibilityHelper.isAccessibilitySupportedCypressVersion(user_config.run_settings.cypress_config_file)) 
  {
    logger.warn(`Accessibility Testing is not supported on Cypress version 9 and below.`);
    process.env.BROWSERSTACK_TEST_ACCESSIBILITY = 'false';
    user_config.run_settings.accessibility = false;
    
    logToServer(`Aakash CBT checkAndSetAccessibility - Cypress version not supported, forced accessibility=false`);
    return;
  }

  if (!user_config.run_settings.system_env_vars) {
    user_config.run_settings.system_env_vars = [];
  }

  // Handle accessibility flag setting - improved logic for auto-enable
  if (accessibilityFlag !== undefined && accessibilityFlag !== null) {
    const accessibilityEnabled = Boolean(accessibilityFlag);
    process.env.BROWSERSTACK_TEST_ACCESSIBILITY = accessibilityEnabled.toString();
    user_config.run_settings.accessibility = accessibilityEnabled;
    
    // Remove existing accessibility env var if present
    const originalEnvVarsLength = user_config.run_settings.system_env_vars.length;
    user_config.run_settings.system_env_vars = user_config.run_settings.system_env_vars.filter(
      envVar => !envVar.startsWith('BROWSERSTACK_TEST_ACCESSIBILITY=')
    );
    const filteredEnvVarsLength = user_config.run_settings.system_env_vars.length;
    
    // Add the current accessibility setting
    user_config.run_settings.system_env_vars.push(`BROWSERSTACK_TEST_ACCESSIBILITY=${accessibilityEnabled}`);
    
    logToServer(`Aakash CBT checkAndSetAccessibility - Set accessibility=${accessibilityEnabled}, removed ${originalEnvVarsLength - filteredEnvVarsLength} duplicate env vars, final env vars: ${JSON.stringify(user_config.run_settings.system_env_vars)}`);
    
    if (accessibilityEnabled) {
      logger.debug("Accessibility enabled for session");
    }
    return;
  }
  
  logToServer(`Aakash CBT checkAndSetAccessibility - No accessibility flag provided, exiting without changes`);
  return;
};

exports.getAccessibilityOptions = (user_config) => {
  const settings = isUndefined(user_config.run_settings.accessibilityOptions)
    ? {}
    : user_config.run_settings.accessibilityOptions;
  
  // Get user's explicit accessibility preference (true/false/null) - matches C# SDK pattern
  let enabled = null;
  
  // Check run_settings.accessibility first (highest priority)
  if (user_config.run_settings.accessibility === true) {
    enabled = true;
    logToServer('[A11Y-LOG] User explicitly enabled accessibility via run_settings');
  } else if (user_config.run_settings.accessibility === false) {
    enabled = false;
    logToServer('[A11Y-LOG] User explicitly disabled accessibility via run_settings');
  }
  // Check environment variable (fallback)
  else if (process.env.BROWSERSTACK_TEST_ACCESSIBILITY === 'true') {
    enabled = true;
    logToServer('[A11Y-LOG] User enabled accessibility via environment variable');
  } else if (process.env.BROWSERSTACK_TEST_ACCESSIBILITY === 'false') {
    enabled = false;
    logToServer('[A11Y-LOG] User disabled accessibility via environment variable');
  }
  // Otherwise keep as null for server auto-enable decision
  else {
    logToServer('[A11Y-LOG] No explicit user setting - sending null for server auto-enable decision');
  }
  
  const result = { 
    settings: settings, // Send user preference to server (null = let server decide)
  };
  
  logToServer('[A11Y-LOG] Final accessibility options for server:', JSON.stringify(result, null, 2));
  
  return result;
};

exports.appendTestHubParams = (testData, eventType, accessibilityScanInfo) => {
  if (
    exports.isAccessibilityEnabled() &&
    !["HookRunStarted", "HookRunFinished", "TestRunStarted"].includes(
      eventType
    ) &&
    !isUndefined(accessibilityScanInfo[testData.name])
  ) {
    testData["product_map"] = {
      accessibility: accessibilityScanInfo[testData.name],
    };
  }
};
