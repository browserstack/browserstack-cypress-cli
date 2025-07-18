const path = require("node:path");
const { decodeJWTToken } = require("../../helpers/utils");
const utils = require('../../helpers/utils');

const browserstackAccessibility = (on, config) => {
  let browser_validation = true;
  console.log('[A11Y][plugin] Initializing BrowserStack Accessibility plugin');
  if (process.env.BROWSERSTACK_ACCESSIBILITY_DEBUG === 'true') {
    config.env.BROWSERSTACK_LOGS = 'true';
    process.env.BROWSERSTACK_LOGS = 'true';
    console.log('[A11Y][plugin] BROWSERSTACK_ACCESSIBILITY_DEBUG enabled, forcing BROWSERSTACK_LOGS to true');
  }
  on('task', {
    browserstack_log(message) {
      console.log('[A11Y][plugin][browserstack_log]', message)
      return null
    },
  })
  on('before:browser:launch', (browser = {}, launchOptions) => {
    try {
      console.log(`[A11Y][plugin][before:browser:launch] Browser: ${browser.name}, Version: ${browser.majorVersion}, Headless: ${browser.isHeadless}`);
      if (process.env.ACCESSIBILITY_EXTENSION_PATH !== undefined) {
        console.log(`[A11Y][plugin] ACCESSIBILITY_EXTENSION_PATH: ${process.env.ACCESSIBILITY_EXTENSION_PATH}`);
        if (browser.name !== 'chrome') {
          console.log(`[A11Y][plugin] Accessibility Automation will run only on Chrome browsers.`);
          browser_validation = false;
        }
        if (browser.name === 'chrome' && browser.majorVersion <= 94) {
          console.log(`[A11Y][plugin] Accessibility Automation will run only on Chrome browser version greater than 94.`);
          browser_validation = false;
        }
        if (browser.isHeadless === true) {
          console.log(`[A11Y][plugin] Accessibility Automation will not run on legacy headless mode. Switch to new headless mode or avoid using headless mode.`);
          browser_validation = false;
        }
        if (browser_validation) {
          const ally_path = path.dirname(process.env.ACCESSIBILITY_EXTENSION_PATH)
          const payload = decodeJWTToken(process.env.ACCESSIBILITY_AUTH);
          console.log(`[A11Y][plugin] Decoded JWT payload:`, payload);
          launchOptions.extensions.push(ally_path);
          if(!utils.isUndefined(payload) && !utils.isUndefined(payload.a11y_core_config) && payload.a11y_core_config.domForge === true) {
            console.log('[A11Y][plugin] domForge enabled, opening devtools for tabs');
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
    } catch(err) {
      console.log('[A11Y][plugin][before:browser:launch] Error:', err);
    }
  })
  config.env.ACCESSIBILITY_EXTENSION_PATH = process.env.ACCESSIBILITY_EXTENSION_PATH
  config.env.OS_VERSION = process.env.OS_VERSION
  config.env.OS = process.env.OS

  config.env.IS_ACCESSIBILITY_EXTENSION_LOADED = browser_validation.toString()

  config.env.INCLUDE_TAGS_FOR_ACCESSIBILITY = process.env.ACCESSIBILITY_INCLUDETAGSINTESTINGSCOPE
  config.env.EXCLUDE_TAGS_FOR_ACCESSIBILITY = process.env.ACCESSIBILITY_EXCLUDETAGSINTESTINGSCOPE

  console.log('[A11Y][plugin] Final config.env:', config.env);
  return config;
}

module.exports = browserstackAccessibility;
