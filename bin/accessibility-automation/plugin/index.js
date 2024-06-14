
const path = require("node:path");
const fs = require('node:fs');
const ipc = require('node-ipc');
const { connectIPCClient } = require('../../testObservability/plugin/ipcClient');
const { IPC_EVENTS } = require('../../testObservability/helper/constants');

const browserstackAccessibility = (on, config) => {
  connectIPCClient(config);

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

    test_accessibility_data(data) {
      ipc.of.browserstackTestObservability.emit(IPC_EVENTS.ACCESSIBILITY_DATA, data);
      return null;
    },

    readFileMaybe(filename) {
      if (fs.existsSync(filename)) {
        return fs.readFileSync(filename, 'utf8')
      }

      return null
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
          launchOptions.extensions.push(ally_path);
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

  config.env.IS_ACCESSIBILITY_EXTENSION_LOADED = browser_validation.toString()

  config.env.INCLUDE_TAGS_FOR_ACCESSIBILITY = process.env.ACCESSIBILITY_INCLUDETAGSINTESTINGSCOPE
  config.env.EXCLUDE_TAGS_FOR_ACCESSIBILITY = process.env.ACCESSIBILITY_EXCLUDETAGSINTESTINGSCOPE

  return config;
}

module.exports = browserstackAccessibility;
