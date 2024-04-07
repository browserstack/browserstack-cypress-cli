
const path = require("node:path");

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
          launchOptions.extensions.push(ally_path);
          return launchOptions
        }
      }
    } catch(err) {}
    
  })
  config.env.ACCESSIBILITY_EXTENSION_PATH = process.env.ACCESSIBILITY_EXTENSION_PATH
  config.env.OS_VERSION = process.env.OS_VERSION
  config.env.OS = process.env.OS

  config.env.IS_ACCESSIBILITY_EXTENSION_LOADED = browser_validation.toString()

  config.env.INCLUDE_TAGS_FOR_ACCESSIBILITY = process.env.ACCESSIBILITY_INCLUDETAGSINTESTINGSCOPE
  config.env.EXCLUDE_TAGS_FOR_ACCESSIBILITY = process.env.ACCESSIBILITY_EXCLUDETAGSINTESTINGSCOPE

  return config;
}

module.exports = browserstackAccessibility;
