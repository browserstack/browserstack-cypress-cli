const path = require("node:path");
const { decodeJWTToken } = require("../../helpers/utils");
const utils = require('../../helpers/utils');
const http = require('http');

const browserstackAccessibility = (on, config) => {
  let browser_validation = true;
  if (process.env.BROWSERSTACK_ACCESSIBILITY_DEBUG === 'true') {
    config.env.BROWSERSTACK_LOGS = 'true';
    process.env.BROWSERSTACK_LOGS = 'true';
  }
  on('task', {
    browserstack_log(message) {
      console.log(message)
      
      return null
    },
    get_test_run_uuid({ testIdentifier, retries = 15, interval = 300 } = {}) {
      return new Promise((resolve) => {
        console.log(`printing env variables take 2`);
        console.log(`Cypress env browserstack testhub uuid from plugin: ${config.env.BROWSERSTACK_TESTHUB_UUID}`);
        console.log(`Cypress env http port: ${config.env.REPORTER_API}`);
        console.log(`test env: ${config.env.TEST_ENV}`);
        console.log(`reporter api from process: ${process.env.REPORTER_API}`);
        console.log(`Fetching testRunUuid for testIdentifier: ${testIdentifier}`);
        if(!testIdentifier) return resolve(null);
        const port = process.env.REPORTER_API || 5347;
        let attempt = 0;
        const fetchUuid = () => {
          const options = {
            hostname: '127.0.0.1',
            port,
            path: `/test-uuid?testIdentifier=${encodeURIComponent(testIdentifier)}`,
            method: 'GET',
            timeout: 2000
          };
          const req = http.request(options, (res) => {
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
  config.env.ACCESSIBILITY_EXTENSION_PATH = process.env.ACCESSIBILITY_EXTENSION_PATH
  config.env.OS_VERSION = process.env.OS_VERSION
  config.env.OS = process.env.OS
  config.env.BROWSERSTACK_TESTHUB_UUID = process.env.BROWSERSTACK_TESTHUB_UUID
  config.env.BROWSERSTACK_TESTHUB_JWT = process.env.BROWSERSTACK_TESTHUB_JWT
  config.env.BROWSERSTACK_TESTHUB_API_PORT = process.env.BROWSERSTACK_TESTHUB_API_PORT
  config.env.REPORTER_API = process.env.REPORTER_API
  config.env.TEST_ENV = process.env.TEST_ENV

  config.env.IS_ACCESSIBILITY_EXTENSION_LOADED = browser_validation.toString()

  config.env.INCLUDE_TAGS_FOR_ACCESSIBILITY = process.env.ACCESSIBILITY_INCLUDETAGSINTESTINGSCOPE
  config.env.EXCLUDE_TAGS_FOR_ACCESSIBILITY = process.env.ACCESSIBILITY_EXCLUDETAGSINTESTINGSCOPE

  return config;
}

module.exports = browserstackAccessibility;
