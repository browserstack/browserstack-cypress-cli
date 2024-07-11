const logger = require('../../bin/helpers/logger').winstonLogger;
const { setCrashReportingConfig, nodeRequest, isTestObservabilitySession } = require("../testObservability/helper/helper");
const helper = require('../helpers/helper');
const testhubUtils = require('./utils');
const TESTHUB_CONSTANTS = require('./constants');

class TestHubHandler {
  static async launchBuild(user_config, bsConfigPath) {
    setCrashReportingConfig(user_config, bsConfigPath);
  
    const obsUserName = user_config["auth"]["username"];
    const obsAccessKey = user_config["auth"]["access_key"];
    
    const BSTestOpsToken = `${obsUserName || ''}:${obsAccessKey || ''}`;
    if(BSTestOpsToken === '') {
      // if olly true 
      if (isTestObservabilitySession()) {
        logger.debug('EXCEPTION IN BUILD START EVENT : Missing authentication token');
        process.env.BS_TESTOPS_BUILD_COMPLETED = false;
      }

      if (testhubUtils.isAccessibilityEnabled()) {
        logger.debug('Exception while creating test run for BrowserStack Accessibility Automation: Missing authentication token');
        process.env.BROWSERSTACK_TEST_ACCESSIBILITY = 'false'
      }

      return [null, null];
    }

    try {
      const data = await this.generateBuildUpstreamData(user_config);
      const config = this.getConfig(obsUserName, obsAccessKey);
      const response = await nodeRequest('POST', TESTHUB_CONSTANTS.TESTHUB_BUILD_API, data, config);
      const launchData = this.extractDataFromResponse(user_config, data, response, config);
    } catch (error) {
      if (error.success === false) { // non 200 response
        testhubUtils.logBuildError(error);
        return;
      }
    }
  }

  static async extractDataFromResponse(user_config, requestData, response, config) {
    const launchData = {};

    if (isTestObservabilitySession()) {
      const [jwt, buildHashedId, allowScreenshot] = testhubUtils.setTestObservabilityVariables(user_config, requestData, response.data);
      if (jwt && buildHashedId) {
        launchData[TESTHUB_CONSTANTS.OBSERVABILITY] =  {jwt, buildHashedId, allowScreenshot};
        process.env.BROWSERSTACK_TEST_OBSERVABILITY = 'true';
      } else {
        launchData[TESTHUB_CONSTANTS.OBSERVABILITY] = {};
        process.env.BROWSERSTACK_TEST_OBSERVABILITY = 'false';
      }
    } else {
      process.env.BROWSERSTACK_TEST_OBSERVABILITY = 'false';
    }

    if(testhubUtils.isAccessibilityEnabled()) {
      const [authToken, buildHashedId] = testhubUtils.setAccessibilityVariables(user_config, response.data);
      if (authToken && buildHashedId) {
        launchData[TESTHUB_CONSTANTS.ACCESSIBILITY] = {authToken, buildHashedId};
        process.env.BROWSERSTACK_ACCESSIBILITY = 'true';
        testhubUtils.checkAndSetAccessibility(user_config, true);
      } else {
        launchData[TESTHUB_CONSTANTS.ACCESSIBILITY] = {};
        process.env.BROWSERSTACK_ACCESSIBILITY = 'false';
        testhubUtils.checkAndSetAccessibility(user_config, false);
      }
    } else {
      process.env.BROWSERSTACK_ACCESSIBILITY = 'false';
      testhubUtils.checkAndSetAccessibility(user_config, false)
    }

    if (testhubUtils.shouldProcessEventForTesthub()) {
      testhubUtils.setTestHubCommonMetaInfo(user_config, response.data);
    }
  }

  static async generateBuildUpstreamData(user_config) {
    const {buildName, projectName, buildDescription, buildTags} = helper.getBuildDetails(user_config, true);
    const productMap = testhubUtils.getProductMap(user_config);
    const data = {
      'project_name': projectName,
      'name': buildName,
      'build_identifier': '', // no build identifier in cypress
      'description': buildDescription || '',
      'started_at': (new Date()).toISOString(),
      'tags': buildTags,
      'host_info': helper.getHostInfo(),
      'ci_info': helper.getCiInfo(),
      'build_run_identifier': process.env.BROWSERSTACK_BUILD_RUN_IDENTIFIER,
      'failed_tests_rerun': process.env.BROWSERSTACK_RERUN || false,
      'version_control': await helper.getGitMetaData(),
      'accessibility': testhubUtils.getAccessibilityOptions(user_config),
      'framework_details': testhubUtils.getFrameworkDetails(),
      'product_map': productMap,
      'browserstackAutomation': productMap['automate']
    };

    return data;
  }

  static getConfig(obsUserName, obsAccessKey) {
    return {
      auth: {
        username: obsUserName,
        password: obsAccessKey
      },
      headers: {
        'Content-Type': 'application/json',
        'X-BSTACK-TESTOPS': 'true'
      }
    };
  }
}


module.exports = TestHubHandler;
