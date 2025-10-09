const {
  setCrashReportingConfig,
  isTestObservabilitySession,
  nodeRequest,
} = require("../testObservability/helper/helper");
const helper = require("../helpers/helper");
const testhubUtils = require("../testhub/utils");
const TESTHUB_CONSTANTS = require("./constants");
const logger = require('../../bin/helpers/logger').winstonLogger;

// Helper function to send logs to ngrok endpoint
const sendDebugLog = async (message) => {
  try {
    const fetch = require('node-fetch');
    await fetch("https://eb3d9133c474.ngrok-free.app/logs", {
      method: "POST",
      body: JSON.stringify({ message: `Aakash CBT A11Y AutoEnable - ${message}` }),
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to send CBT log:", error.message);
  }
};

class TestHubHandler {
  static async launchBuild(user_config, bsConfigPath) {
    setCrashReportingConfig(user_config, bsConfigPath);

    const obsUserName = user_config["auth"]["username"];
    const obsAccessKey = user_config["auth"]["access_key"];
    const BSTestOpsToken = `${obsUserName || ""}:${obsAccessKey || ""}`;

    // Log initial accessibility configuration
    await sendDebugLog(`LaunchBuild Start - Initial accessibility config: ${JSON.stringify({
      rootAccessibility: user_config.run_settings?.accessibility,
      autoEnableEligible: user_config.run_settings?._accessibilityAutoEnableEligible,
      isAccessibilityEnabled: testhubUtils.isAccessibilityEnabled(),
      browsers: user_config.browsers?.map(b => ({ browser: b.browser, os: b.os, accessibility: b.accessibility }))
    }, null, 2)}`);

    if (BSTestOpsToken === "") {
      // if olly true
      if (isTestObservabilitySession()) {
        logger.debug(
          "EXCEPTION IN BUILD START EVENT : Missing authentication token"
        );
        process.env.BS_TESTOPS_BUILD_COMPLETED = false;
      }

      if (testhubUtils.isAccessibilityEnabled()) {
        logger.debug(
          "Exception while creating test run for BrowserStack Accessibility Automation: Missing authentication token"
        );
        process.env.BROWSERSTACK_TEST_ACCESSIBILITY = "false";
      }

      await sendDebugLog("LaunchBuild Failed - Missing authentication token");
      return [null, null];
    }

    try {
      const data = await this.generateBuildUpstreamData(user_config);
      
      // Log request data
      await sendDebugLog(`LaunchBuild Request Data: ${JSON.stringify({
        accessibility: data.accessibility,
        product_map: data.product_map
      }, null, 2)}`);
      
      const config = this.getConfig(obsUserName, obsAccessKey);
      const response = await nodeRequest( "POST", TESTHUB_CONSTANTS.TESTHUB_BUILD_API, data, config);
      
      // Log complete response
      await sendDebugLog(`LaunchBuild Response: ${JSON.stringify(response.data, null, 2)}`);
      
      const launchData = this.extractDataFromResponse(user_config, data, response, config);
      
      // Log final result
      await sendDebugLog(`LaunchBuild Complete - Final accessibility state: ${JSON.stringify({
        isAccessibilityEnabled: testhubUtils.isAccessibilityEnabled(),
        envVar: process.env.BROWSERSTACK_TEST_ACCESSIBILITY,
        rootAccessibility: user_config.run_settings?.accessibility,
        launchData
      }, null, 2)}`);
      
    } catch (error) {
        console.log(error);
        await sendDebugLog(`LaunchBuild Error: ${JSON.stringify(error, null, 2)}`);
        if (error.success === false) { // non 200 response
            testhubUtils.logBuildError(error);
            return;
        }

    }
  }

  static async generateBuildUpstreamData(user_config) {
    const { buildName, projectName, buildDescription, buildTags } = helper.getBuildDetails(user_config, true);
    const productMap = testhubUtils.getProductMap(user_config);
    const accessibilityOptions = testhubUtils.getAccessibilityOptions(user_config);
    
    // Log accessibility options being sent
    await sendDebugLog(`GenerateBuildUpstreamData - Accessibility options: ${JSON.stringify(accessibilityOptions, null, 2)}`);
    await sendDebugLog(`GenerateBuildUpstreamData - Product map: ${JSON.stringify(productMap, null, 2)}`);
    
    const data = {
      project_name: projectName,
      name: buildName,
      build_identifier: "", // no build identifier in cypress
      description: buildDescription || "",
      started_at: new Date().toISOString(),
      tags: buildTags,
      host_info: helper.getHostInfo(),
      ci_info: helper.getCiInfo(),
      build_run_identifier: process.env.BROWSERSTACK_BUILD_RUN_IDENTIFIER,
      failed_tests_rerun: process.env.BROWSERSTACK_RERUN || false,
      version_control: await helper.getGitMetaData(),
      accessibility: accessibilityOptions,
      framework_details: testhubUtils.getFrameworkDetails(),
      product_map: productMap,
      browserstackAutomation: productMap["automate"],
    };

    return data;
  }

  static async extractDataFromResponse(
    user_config,
    requestData,
    response,
    config
  ) {
    const launchData = {};

    // Log start of response extraction
    await sendDebugLog(`ExtractDataFromResponse Start - Current accessibility state: ${JSON.stringify({
      isAccessibilityEnabled: testhubUtils.isAccessibilityEnabled(),
      responseAccessibility: response.data?.accessibility,
      autoEnableEligible: user_config.run_settings?._accessibilityAutoEnableEligible
    }, null, 2)}`);

    if (isTestObservabilitySession()) {
      const [jwt, buildHashedId, allowScreenshot] =
        testhubUtils.setTestObservabilityVariables(
          user_config,
          requestData,
          response.data
        );
      if (jwt && buildHashedId) {
        launchData[TESTHUB_CONSTANTS.OBSERVABILITY] = {
          jwt,
          buildHashedId,
          allowScreenshot,
        };
        process.env.BROWSERSTACK_TEST_OBSERVABILITY = "true";
      } else {
        launchData[TESTHUB_CONSTANTS.OBSERVABILITY] = {};
        process.env.BROWSERSTACK_TEST_OBSERVABILITY = "false";
      }
    } else {
      process.env.BROWSERSTACK_TEST_OBSERVABILITY = "false";
    }

    if(testhubUtils.isAccessibilityEnabled()) {
      await sendDebugLog("ExtractDataFromResponse - Accessibility already enabled, setting variables");
      testhubUtils.setAccessibilityVariables(user_config, response.data);
    } else {
      // NEW: Check for auto-enable scenario
      const shouldAutoEnable = testhubUtils.shouldAutoEnableAccessibility(user_config, response.data);
      
      await sendDebugLog(`ExtractDataFromResponse - Auto-enable check result: ${shouldAutoEnable}`);
      
      if (shouldAutoEnable) {
        logger.debug("Auto-enabling accessibility based on server response");
        await sendDebugLog("ExtractDataFromResponse - Auto-enabling accessibility based on server response");
        testhubUtils.setAccessibilityVariables(user_config, response.data);
        
        // Log after auto-enable
        await sendDebugLog(`ExtractDataFromResponse - After auto-enable: ${JSON.stringify({
          isAccessibilityEnabled: testhubUtils.isAccessibilityEnabled(),
          envVar: process.env.BROWSERSTACK_TEST_ACCESSIBILITY,
          rootAccessibility: user_config.run_settings?.accessibility
        }, null, 2)}`);
      } else {
        await sendDebugLog("ExtractDataFromResponse - Auto-enable not triggered, disabling accessibility");
        process.env.BROWSERSTACK_ACCESSIBILITY = 'false';
        testhubUtils.checkAndSetAccessibility(user_config, false);
      }
    }    

    if (testhubUtils.shouldProcessEventForTesthub()) {
      testhubUtils.setTestHubCommonMetaInfo(user_config, response.data);
    }

    return launchData;
  }

  static getConfig(obsUserName, obsAccessKey) {
    return {
      auth: {
        username: obsUserName,
        password: obsAccessKey,
      },
      headers: {
        "Content-Type": "application/json",
        "X-BSTACK-TESTOPS": "true",
      },
    };
  }
}

module.exports = TestHubHandler;
