const path = require("node:path");
const { decodeJWTToken } = require("../../helpers/utils");
const utils = require('../../helpers/utils');
const http = require('http');

// Cypress 16 removed Cypress.env() from the browser. Values the support file needs are
// written to config.expose (read by Cypress.expose(), Cypress >= 15.10) as well as config.env
// (read by Cypress.env(), Cypress <= 15.x). Unknown config.expose is accepted by Cypress 15.8+
// without error. [APS-22894]
const exposeToBrowser = (config, key, value) => {
  config.env = config.env || {};
  config.env[key] = value;
  config.expose = config.expose || {};
  config.expose[key] = value;
};

process.env.BROWSERSTACK_ACCESSIBILITY_PLUGIN_LOADED = 'true';

const browserstackAccessibility = (on, config) => {
  // Also set on invocation, so that a runtime read of the plugin reflects that
  // it was actually called within setupNodeEvents.
  process.env.BROWSERSTACK_ACCESSIBILITY_PLUGIN_LOADED = 'true';
  let browser_validation = true;
  if (process.env.BROWSERSTACK_ACCESSIBILITY_DEBUG === 'true') {
    exposeToBrowser(config, 'BROWSERSTACK_LOGS', 'true');
    process.env.BROWSERSTACK_LOGS = 'true';
  }
  on('task', {
    browserstack_log(message) {
      console.log(message)
      
      return null
    },
    get_test_run_uuid({ testIdentifier, retries = 15, interval = 300 } = {}) {
      return new Promise((resolve) => {
        if(!testIdentifier) return resolve(null);
        const port = process.env.REPORTER_API_PORT_NO;
        let attempt = 0;
        const fetchUuid = () => {
          const options = {
            hostname: '127.0.0.1',
            port,
            path: `/test-uuid?testIdentifier=${encodeURIComponent(testIdentifier)}`,
            method: 'GET',
            timeout: 2000
          };
          const httpModule = http;
          const req = httpModule.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              if(res.statusCode === 200) {
                try {
                  const json = JSON.parse(data || '{}');
                  return resolve({ testRunUuid: json.testRunUuid || null });
                } catch(e) {
                  return resolve(null);
                }
              } else if (res.statusCode === 404) {
                // Server up but endpoint not responding as expected – stop retrying.
                return resolve(null);
              } else {
                retryOrResolve();
              }
            });
          });
          req.on('error', () => retryOrResolve());
          req.on('timeout', () => { req.destroy(); retryOrResolve(); });
          req.end();
        };
        const retryOrResolve = () => {
          attempt += 1;
            if(attempt >= retries) return resolve(null);
            setTimeout(fetchUuid, interval);
        };
        fetchUuid();
      });
    }
  })
  on('before:browser:launch', (browser = {}, launchOptions) => {
    try {
      if (process.env.ACCESSIBILITY_EXTENSION_PATH !== undefined) {
        if (browser.name !== 'chrome') {
          console.log(`Accessibility Automation will run only on Chrome browsers.`);
          browser_validation = false;
        }
        if (browser.name === 'chrome' && browser.majorVersion <= 94) {
          console.log(`Accessibility Automation will run only on Chrome browser version greater than 94.`);
          browser_validation = false;
        }
        if (browser.isHeadless === true) {
          console.log(`Accessibility Automation will not run on legacy headless mode. Switch to new headless mode or avoid using headless mode.`);
          browser_validation = false;
        }
        if (browser_validation) {
          const ally_path = path.dirname(process.env.ACCESSIBILITY_EXTENSION_PATH)
          const payload = decodeJWTToken(process.env.ACCESSIBILITY_AUTH);
          launchOptions.extensions.push(ally_path);
          if(!utils.isUndefined(payload) && !utils.isUndefined(payload.a11y_core_config) && payload.a11y_core_config.domForge === true) {
            launchOptions.args.push("--auto-open-devtools-for-tabs");
            launchOptions.preferences.default["devtools"] = launchOptions.preferences.default["devtools"] || {};
            launchOptions.preferences.default["devtools"]["preferences"] = launchOptions.preferences.default["devtools"]["preferences"] || {};
            launchOptions.preferences.default["devtools"]["preferences"][
              "currentDockState"
            ] = '"undocked"';
          }
          return launchOptions
        }
      }
    } catch(err) {}

  })
  exposeToBrowser(config, 'ACCESSIBILITY_EXTENSION_PATH', process.env.ACCESSIBILITY_EXTENSION_PATH)
  exposeToBrowser(config, 'OS_VERSION', process.env.OS_VERSION)
  exposeToBrowser(config, 'OS', process.env.OS)
  exposeToBrowser(config, 'BROWSERSTACK_TESTHUB_UUID', process.env.BROWSERSTACK_TESTHUB_UUID)
  exposeToBrowser(config, 'BROWSERSTACK_TESTHUB_JWT', process.env.BROWSERSTACK_TESTHUB_JWT)
  exposeToBrowser(config, 'BROWSERSTACK_TESTHUB_API_PORT', process.env.BROWSERSTACK_TESTHUB_API_PORT)
  exposeToBrowser(config, 'REPORTER_API_PORT_NO', process.env.REPORTER_API_PORT_NO)

  exposeToBrowser(config, 'IS_ACCESSIBILITY_EXTENSION_LOADED', browser_validation.toString())

  exposeToBrowser(config, 'INCLUDE_TAGS_FOR_ACCESSIBILITY', process.env.ACCESSIBILITY_INCLUDETAGSINTESTINGSCOPE)
  exposeToBrowser(config, 'EXCLUDE_TAGS_FOR_ACCESSIBILITY', process.env.ACCESSIBILITY_EXCLUDETAGSINTESTINGSCOPE)

  // Customer-tunable keys arrive via config.env, which Cypress 16 no longer passes to the browser.
  const customerScanKeys = ['ACCESSIBILITY_SCAN_TIMEOUT', 'ACCESSIBILITY_SCAN_CIRCUIT_LIMIT'];
  customerScanKeys.forEach((key) => {
    if (config.env[key] !== undefined && config.expose[key] === undefined) {
      config.expose[key] = config.env[key];
    }
  });

  return config;
}

module.exports = browserstackAccessibility;
