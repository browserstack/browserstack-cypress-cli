
const path = require("node:path");

const browserstackAccessibility = (on, config) => {
  on('before:browser:launch', (browser = {}, launchOptions) => {
    try {
      console.log("browser", browser)
    // console.log("launchOptions", launchOptions)

    let browser_validation = true;
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
      launchOptions.args.push('--auto-open-devtools-for-tabs');
      const ally_path = path.dirname(process.env.ACCESSIBILITY_EXTENSION_PATH)
      console.log(`FROM NODE ally_path : ${ally_path}`)
      launchOptions.extensions.push(ally_path);

      // launchOptions.extensions.push("/Users/riyadoshi1/cypress-example-kitchensink/0.0.8.0-debug")
      // console.log(launchOptions.args)
      return launchOptions
    }

    } catch (e){
      console.log(`catch erorr : ${e}`)
    }
    
  })
}

module.exports = browserstackAccessibility;