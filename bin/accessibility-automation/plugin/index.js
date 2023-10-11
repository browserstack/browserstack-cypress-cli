
const path = require("node:path");

const browserstackAccessibility = (on, config) => {
  let browser_validation = true;
  on('before:browser:launch', (browser = {}, launchOptions) => {
    try {

      if (browser.name !== 'chrome') {
        console.log(`Accessibility Automation will run only on Chrome browsers.`);
        browser_validation = false;
      }
      if (browser.majorVersion <= 94) {
        console.log(`Accessibility Automation will run only on Chrome browser version greater than 94.`);
        browser_validation = false;
      }
      if (browser.isHeadless === true) {
        console.log(`Accessibility Automation will not run on legacy headless mode. Switch to new headless mode or avoid using headless mode.`);
        browser_validation = false;
      }

      if (process.env.ACCESSIBILITY_EXTENSION_PATH === undefined) {
        browser_validation = false
        return
      }

      if (browser_validation) {
        const ally_path = path.dirname(process.env.ACCESSIBILITY_EXTENSION_PATH)
        launchOptions.extensions.push(ally_path);
        return launchOptions
      }
    } catch {}
    
  })
  config.env.ACCESSIBILITY_EXTENSION_PATH = process.env.ACCESSIBILITY_EXTENSION_PATH
  config.env.OS_VERSION = process.env.OS_VERSION
  config.env.OS = process.env.SESSION_OS 

  config.env.IS_ACCESSIBILITY_EXTENSION_LOADED = browser_validation.toString()

  config.env.INCLUDE_TAGS_FOR_ACCESSIBILITY = process.env.ACCESSIBILITY_INCLUDETAGSINTESTINGSCOPE
  config.env.EXCLUDE_TAGS_FOR_ACCESSIBILITY = process.env.ACCESSIBILITY_EXCLUDETAGSINTESTINGSCOPE

  return config;
}

module.exports = browserstackAccessibility;
