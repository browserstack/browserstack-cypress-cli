const os = require("os");

const logger = require("../../bin/helpers/logger").winstonLogger;
const TESTHUB_CONSTANTS = require("./constants");
const testObservabilityHelper = require("../../bin/testObservability/helper/helper");
const helper = require("../helpers/helper");
const accessibilityHelper = require("../accessibility-automation/helper");
const { detect } = require('detect-port');


const isUndefined = (value) => value === undefined || value === null;

exports.getFrameworkDetails = (user_config) => {
  return {
    frameworkName: "Cypres",
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

exports.isAccessibilityEnabled = () => {
  if (process.env.BROWSERSTACK_TEST_ACCESSIBILITY !== undefined) {
    return process.env.BROWSERSTACK_TEST_ACCESSIBILITY === "true";
  }
  logger.debug('Accessibility is disabled');
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
    exports.isAccessibilityEnabled()
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

  if (testObservabilityHelper.isBrowserstackInfra()) {
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
  if (!responseData.accessibility) {
    exports.handleErrorForAccessibility(user_config);

    return [null, null];
  }

  if (!responseData.accessibility.success) {
    exports.handleErrorForAccessibility(
      user_config,
      responseData.accessibility
    );

    return [null, null];
  }

  if (responseData.accessibility.options) {
    logger.debug(
      `BrowserStack Accessibility Automation Build Hashed ID: ${responseData.build_hashed_id}`
    );
    setAccessibilityCypressCapabilities(user_config, responseData);
    helper.setBrowserstackCypressCliDependency(user_config);
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
  if (!accessibilityHelper.isAccessibilitySupportedCypressVersion(user_config.run_settings.cypress_config_file)) 
  {
    logger.warn(`Accessibility Testing is not supported on Cypress version 9 and below.`);
    process.env.BROWSERSTACK_TEST_ACCESSIBILITY = 'false';
    user_config.run_settings.accessibility = false;
    return;
  }

  if (!user_config.run_settings.system_env_vars) {
    user_config.run_settings.system_env_vars = [];
  }

  if (!isUndefined(accessibilityFlag)) {
    process.env.BROWSERSTACK_TEST_ACCESSIBILITY = accessibilityFlag.toString();
    user_config.run_settings.accessibility = accessibilityFlag;
    if (
      !user_config.run_settings.system_env_vars.includes("BROWSERSTACK_TEST_ACCESSIBILITY")
    ) {
      user_config.run_settings.system_env_vars.push(`BROWSERSTACK_TEST_ACCESSIBILITY=${accessibilityFlag}`);
    }
    return;
  }
  return;
};

exports.getAccessibilityOptions = (user_config) => {
  const settings = isUndefined(user_config.run_settings.accessibilityOptions)
    ? {}
    : user_config.run_settings.accessibilityOptions;
  return { settings: settings };
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
