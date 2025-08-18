'use strict';

const os = require('os');
const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');
const logger = require("../helpers/logger").winstonLogger;
const utils = require('../helpers/utils');
const helper = require('../helpers/helper');
const testhubUtils = require('./testhubUtils');
const { setAccessibilityCypressCapabilities } = require('../accessibility-automation/helper');

const BROWSERSTACK_TESTHUB_URL = 'https://collector-observability.browserstack.com';

class TestHubHandler {
  static requestQueue = null;
  static bsConfig = null;
  static frameworkDetails = null;

  /**
   * Unified launch method for both observability and accessibility
   * @param {Object} bsConfig - BrowserStack configuration
   * @param {string} bsConfigPath - Path to browserstack config
   * @param {Object} frameworkDetails - Framework information
   * @returns {Object} Build data containing observability and accessibility info
   */
  static async launch(bsConfig, bsConfigPath, frameworkDetails = {}) {
    this.bsConfig = bsConfig;
    this.frameworkDetails = frameworkDetails;

    try {
      const userName = bsConfig["auth"]["username"];
      const accessKey = bsConfig["auth"]["access_key"];

      if (!userName || !accessKey) {
        logger.error('Missing authentication credentials for TestHub');
        this.handleErrorForObservability();
        this.handleErrorForAccessibility();
        return null;
      }

      // Prepare common request payload
      const data = await testhubUtils.getCommonRequestPayload(bsConfig, frameworkDetails);
      if (!data) {
        logger.error('Failed to create request payload for TestHub');
        return null;
      }

      const config = {
        auth: {
          username: userName,
          password: accessKey
        },
        headers: this.defaultHeaders()
      };

      logger.debug('Sending unified launch request to TestHub');
      const response = await this.makeRequest('POST', 'api/v2/builds', data, config);
      
      if (!response || response.status !== 200) {
        const responseData = response?.data;
        if (responseData && responseData.success === false) {
          this.logBuildError(responseData);
          return null;
        }
        if (responseData?.observability) {
          this.handleErrorForObservability(responseData.observability);
        }
        if (responseData?.accessibility) {
          this.handleErrorForAccessibility(responseData.accessibility);
        }
        return null;
      }

      const buildData = await this.handleBuildResponse(response.data);
      logger.debug('TestHub launch completed successfully');
      return buildData;

    } catch (error) {
      logger.error(`Exception while creating unified build for TestHub: ${error.message}`);
      this.handleErrorForObservability();
      this.handleErrorForAccessibility();
      return null;
    }
  }

  /**
   * Stop the TestHub session
   * @param {string} killSig - Kill signal if any
   */
  static async stop(killSig = null) {
    const testhubJwt = process.env.BROWSERSTACK_TESTHUB_JWT;
    const testhubUuid = process.env.BROWSERSTACK_TESTHUB_UUID;

    if (!this.on() || testhubJwt === "null" || testhubUuid === "null") {
      return {
        status: 'error',
        message: 'Token/buildID is undefined, build creation might have failed'
      };
    }

    try {
      const data = {
        finished_at: new Date().toISOString()
      };

      if (killSig) {
        data.finished_metadata = [{
          reason: 'user_killed',
          signal: killSig
        }];
      }

      const config = {
        headers: this.defaultHeaders()
      };

      const endpoint = `api/v1/builds/${testhubUuid}/stop`;
      const response = await this.makeRequest('PUT', endpoint, data, config);
      
      if (!response || !response.ok) {
        throw new Error("Stop request not ok");
      }

      logger.debug('TestHub session stopped successfully');
      return { status: 'success' };

    } catch (error) {
      logger.error(`Exception in stop build request to TestHub: ${error.message}`);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Handle build response and set environment variables
   * @param {Object} responseData - Response from TestHub API
   * @returns {Object} Processed build data
   */
  static async handleBuildResponse(responseData) {
    console.log("response data:", JSON.stringify(responseData, null, 2));
    const buildData = {};

    // Set common environment variables
    const jwt = responseData.jwt || 'null';
    const buildHashedId = responseData.build_hashed_id || 'null';
    
    process.env.BROWSERSTACK_TESTHUB_JWT = jwt;
    process.env.BROWSERSTACK_TESTHUB_UUID = buildHashedId;

    logger.info(`TestHub started with id: ${buildHashedId}`);

    // Handle observability
    if (testhubUtils.isObservabilityEnabled(this.bsConfig, this.frameworkDetails)) {
      const [jwtToken, obsHashedId, allowScreenshots] = this.setObservabilityVariables(responseData);
      buildData.observability = jwtToken && obsHashedId ? {
        jwt_token: jwtToken,
        build_hashed_id: obsHashedId,
        allow_screenshots: allowScreenshots
      } : {};
    } else {
      buildData.observability = {};
    }

    // Handle accessibility
    if (testhubUtils.isAccessibilityEnabled(this.bsConfig)) {
      const [authToken, a11yHashedId] = await this.setAccessibilityVariables(responseData);
      buildData.accessibility = authToken && a11yHashedId ? {
        auth_token: authToken,
        build_hashed_id: a11yHashedId
      } : {};
    } else {
      buildData.accessibility = {};
    }

    return buildData;
  }

  /**
   * Set observability-specific environment variables
   * @param {Object} responseData - Response data
   * @returns {Array} [jwt_token, build_hashed_id, allow_screenshots]
   */
  static setObservabilityVariables(responseData) {
    if (!responseData.observability) {
      this.handleErrorForObservability();
      return [null, null, null];
    }

    if (responseData.observability.success !== true) {
      this.handleErrorForObservability(responseData.observability);
      return [null, null, null];
    }

    logger.debug('Test Observability Build creation Successful!');
    
    process.env.BS_TESTOPS_BUILD_COMPLETED = 'true';
    
    if (responseData.jwt) {
      process.env.CREDENTIALS_FOR_CRASH_REPORTING = JSON.stringify({
        username: this.bsConfig.auth.username,
        password: this.bsConfig.auth.access_key
      });
    }
    
    if (responseData.build_hashed_id) {
      process.env.BS_TESTOPS_BUILD_HASHED_ID = responseData.build_hashed_id;
    }
    
    const allowScreenshots = responseData.observability?.options?.allow_screenshots;
    process.env.BS_TESTOPS_ALLOW_SCREENSHOTS = allowScreenshots ? String(allowScreenshots) : "null";

    return [responseData.jwt, responseData.build_hashed_id, process.env.BS_TESTOPS_ALLOW_SCREENSHOTS];
  }

  /**
   * Set accessibility-specific environment variables
   * @param {Object} responseData - Response data
   * @returns {Array} [auth_token, build_hashed_id]
   */
  static async setAccessibilityVariables(responseData) {
    if (!responseData.accessibility) {
      this.handleErrorForAccessibility();
      return [null, null];
    }

    if (responseData.accessibility.success !== true) {
      this.handleErrorForAccessibility(responseData.accessibility);
      return [null, null];
    }

    if (responseData.accessibility.options) {
      logger.debug('Test Accessibility Build creation Successful!');
      
      logger.debug('Accessibility capabilities:', JSON.stringify(responseData.accessibility.options.capabilities));
      
      const capabilities = testhubUtils.convertArrayToDict(
        responseData.accessibility.options.capabilities, 
        'name', 
        'value'
      );
      
      logger.debug('Converted capabilities:', JSON.stringify(capabilities));
      
      const authToken = capabilities.accessibilityToken;
      let scannerVersion = capabilities.scannerVersion;
      
      // Fallback: try to get scannerVersion from direct options if not in capabilities
      if (!scannerVersion && responseData.accessibility.options.scannerVersion) {
        scannerVersion = responseData.accessibility.options.scannerVersion;
      }
      
      logger.debug(`Auth token: ${authToken}, Scanner version: ${scannerVersion}`);
      
      process.env.BS_A11Y_JWT = authToken;

      // Set additional accessibility environment variables
      if (scannerVersion) {
        process.env.BS_A11Y_SCANNER_VERSION = scannerVersion;
      }

      // Set accessibility capabilities in the config to maintain compatibility
      if (this.bsConfig && authToken && scannerVersion) {
        await setAccessibilityCypressCapabilities(this.bsConfig, {
          data: {
            accessibilityToken: authToken,
            scannerVersion: scannerVersion
          }
        });
        
        // Set cypress CLI dependency as in original accessibility flow
        helper.setBrowserstackCypressCliDependency(this.bsConfig);
      }

      return [authToken, responseData.build_hashed_id];
    }

    return [null, null];
  }

  /**
   * Handle error for observability
   * @param {Object} response - Error response
   */
  static handleErrorForObservability(response = null) {
    process.env.BROWSERSTACK_TESTHUB_UUID = 'null';
    process.env.BROWSERSTACK_TESTHUB_JWT = 'null';
    process.env.BS_TESTOPS_BUILD_COMPLETED = 'false';
    process.env.BS_TESTOPS_BUILD_HASHED_ID = "null";
    process.env.BS_TESTOPS_ALLOW_SCREENSHOTS = "null";
    this.logBuildError(response, "observability");
  }

  /**
   * Handle error for accessibility
   * @param {Object} response - Error response
   */
  static handleErrorForAccessibility(response = null) {
    process.env.BROWSERSTACK_TESTHUB_UUID = 'null';
    process.env.BS_A11Y_JWT = 'null';
    process.env.BROWSERSTACK_TESTHUB_JWT = 'null';
    process.env.BS_A11Y_SCANNER_VERSION = 'null';
    this.logBuildError(response, "accessibility");
  }

  /**
   * Log build errors
   * @param {Object} response - Error response
   * @param {string} product - Product name (observability/accessibility)
   */
  static logBuildError(response = null, product = "") {
    if (!response || !response.errors) {
      logger.error(`${product} Build creation failed`);
      return;
    }

    response.errors.forEach(error => {
      const errorType = error.key;
      const errorMessage = error.message;
      
      if (errorMessage) {
        if (errorType === "ERROR_ACCESS_DENIED") {
          logger.info(errorMessage);
        } else {
          logger.error(errorMessage);
        }
      } else {
        logger.error(`Data upload to BrowserStack ${product} failed due to some error`);
      }
    });
  }

  /**
   * Check if TestHub is active
   * @returns {boolean} True if active
   */
  static on() {
    const testhubJwt = process.env.BROWSERSTACK_TESTHUB_JWT;
    const a11yJwt = process.env.BS_A11Y_JWT;
    
    return (testhubJwt && testhubJwt !== "null") || (a11yJwt && a11yJwt !== "null");
  }

  /**
   * Make HTTP request to TestHub API
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {Object} config - Request config
   * @returns {Promise} Response promise
   */
  static async makeRequest(method, endpoint, data, config) {
    try {
      const options = {
        ...config,
        method,
        url: `${BROWSERSTACK_TESTHUB_URL}/${endpoint}`,
        data,
        maxAttempts: 2,
        headers: {
          ...config.headers,
          'Content-Type': 'application/json;charset=utf-8',
          "X-Forwarded-For": "127.0.0.1"
        },
        clientIp: "127.0.0.1"
      };

      if (process.env.HTTP_PROXY) {
        options.proxy = false;
        options.httpsAgent = new HttpsProxyAgent(process.env.HTTP_PROXY);
      } else if (process.env.HTTPS_PROXY) {
        options.proxy = false;
        options.httpsAgent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
      }

      const response = await axios(options);
      return response;
    } catch (error) {
      if (error.response) {
        return error.response;
      }
      throw error;
    }
  }

  /**
   * Get default headers for API requests
   * @returns {Object} Headers object
   */
  static defaultHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'X-BSTACK-TESTOPS': 'true'
    };

    const testhubJwt = process.env.BROWSERSTACK_TESTHUB_JWT;
    if (testhubJwt && testhubJwt !== "null") {
      headers['Authorization'] = `Bearer ${testhubJwt}`;
    }

    return headers;
  }
}

module.exports = TestHubHandler;
