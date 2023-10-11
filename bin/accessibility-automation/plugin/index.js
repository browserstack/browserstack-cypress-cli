
const path = require("node:path");

const browserstackAccessibility = (on, config) => {
  let browser_validation = true;
  on('before:browser:launch', (browser = {}, launchOptions) => {
    try {
      console.log(`ACCESSIBILITY_EXTENSION_PATH :: ${process.env.ACCESSIBILITY_EXTENSION_PATH}`)

      if (process.env.ACCESSIBILITY_EXTENSION_PATH === undefined) {
        browser_validation = false
        return
      }

      // add accessibility attribute validation !!
      // add OS validation !!
      if (browser.name !== 'chrome') {
        // logger.warn(`Accessibility Automation will run only on Chrome browsers.`);
        browser_validation = false;
      }
      if (browser.majorVersion <= 94) {
        // logger.warn(`Accessibility Automation will run only on Chrome browser version greater than 94.`);
        browser_validation = false;
      }
      if (browser.isHeadless === true) {
        // logger.warn(`Accessibility Automation will not run on legacy headless mode. Switch to new headless mode or avoid using headless mode.`);
        browser_validation = false;
      }

      if (browser_validation) {
        console.log(` inside before browser launch -> process.env.ACCESSIBILITY_EXTENSION_PATH - ${process.env.ACCESSIBILITY_EXTENSION_PATH}`)
        const ally_path = path.dirname(process.env.ACCESSIBILITY_EXTENSION_PATH)
        console.log(`FROM NODE ally_path : ${ally_path}`)
        launchOptions.args.push('--auto-open-devtools-for-tabs');
        launchOptions.extensions.push(ally_path);
        return launchOptions
      }
    } catch (e){
      console.log(`catch error : ${e}`)
    }
    
  })
  config.env.ACCESSIBILITY_EXTENSION_PATH = process.env.ACCESSIBILITY_EXTENSION_PATH
  config.env.OS_VERSION = process.env.OS_VERSION
  config.env.IS_ACCESSIBILITY_EXTENSION_LOADED = browser_validation.toString()
  
  config.env.INCLUDE_TAGS_FOR_ACCESSIBILITY = process.env.ACCESSIBILITY_INCLUDETAGSINTESTINGSCOPE
  config.env.EXCLUDE_TAGS_FOR_ACCESSIBILITY = process.env.ACCESSIBILITY_EXCLUDETAGSINTESTINGSCOPE

  return config;
}

module.exports = browserstackAccessibility;