/* Event listeners + custom commands for Cypress */

Cypress.on('test:before:run', () => {
  try {
    if (Cypress.env("IS_ACCESSIBILITY_EXTENSION_LOADED") !== "true") return
    const extensionPath = Cypress.env("ACCESSIBILITY_EXTENSION_PATH")
  
    if (extensionPath !== undefined) {
      new Promise((resolve, reject) => {
        window.parent.addEventListener('A11Y_TAP_STARTED', () => {
          resolve("A11Y_TAP_STARTED");
        });
        const e = new CustomEvent('A11Y_FORCE_START');
        window.parent.dispatchEvent(e);
      })
    }
  } catch {}
  
});

Cypress.on('test:after:run', (attributes, runnable) => {
  try {
    if (Cypress.env("IS_ACCESSIBILITY_EXTENSION_LOADED") !== "true") return
    const extensionPath = Cypress.env("ACCESSIBILITY_EXTENSION_PATH")
    const isHeaded = Cypress.browser.isHeaded;
    if (isHeaded && extensionPath !== undefined) {

      let shouldScanTestForAccessibility = true;
      if (Cypress.env("INCLUDE_TAGS_FOR_ACCESSIBILITY") || Cypress.env("EXCLUDE_TAGS_FOR_ACCESSIBILITY")) {

        try {
          let includeTagArray = [];
          let excludeTagArray = [];
          if (Cypress.env("INCLUDE_TAGS_FOR_ACCESSIBILITY")) {
            includeTagArray = Cypress.env("INCLUDE_TAGS_FOR_ACCESSIBILITY").split(";")
          }
          if (Cypress.env("EXCLUDE_TAGS_FOR_ACCESSIBILITY")) {
            excludeTagArray = Cypress.env("EXCLUDE_TAGS_FOR_ACCESSIBILITY").split(";")
          }

          const fullTestName = attributes.title;
          const excluded = excludeTagArray.some((exclude) => fullTestName.includes(exclude));
          const included = includeTagArray.length === 0 || includeTags.some((include) => fullTestName.includes(include));
          shouldScanTestForAccessibility = !excluded && included;
        } catch (error) {
          console.log("Error while validating test case for accessibility before scanning. Error : ", error);
        }
      }
      let os_data;
      if (Cypress.env("OS")) {
        os_data = Cypress.env("OS");
      } else {
        os_data = Cypress.platform === 'linux' ? 'mac' : "win"
      }
      let filePath = '';
      if (attributes.invocationDetails !== undefined && attributes.invocationDetails.relativeFile !== undefined) {
        filePath = attributes.invocationDetails.relativeFile;
      }
      const dataForExtension = {
        "saveResults": shouldScanTestForAccessibility,
        "testDetails": {
          "name": attributes.title,
          "testRunId": '5058', // variable not consumed, shouldn't matter what we send
          "filePath": filePath,
          "scopeList": [
            filePath,
            attributes.title
          ]
        },
        "platform": {
          "os_name": os_data,
          "os_version": Cypress.env("OS_VERSION"),
          "browser_name": Cypress.browser.name,
          "browser_version": Cypress.browser.version
        }
      };
      return new Promise((resolve, reject) => {
        if (dataForExtension.saveResults) {
          window.parent.addEventListener('A11Y_TAP_TRANSPORTER', (event) => {
            resolve(event.detail);
          });
        }
        const e = new CustomEvent('A11Y_TEST_END', {detail: dataForExtension});
        window.parent.dispatchEvent(e);
        if (dataForExtension.saveResults !== true )
          resolve();
      });
    }

  } catch {}
});

Cypress.Commands.add('getAccessibilityResultsSummary', () => {
  try {
    if (Cypress.env("IS_ACCESSIBILITY_EXTENSION_LOADED") !== "true") {
      console.log(`Not a Accessibility Automation session, cannot retrieve Accessibility results.`);
      return
    }
    return new Promise(function (resolve, reject) {
      try{
        const e = new CustomEvent('A11Y_TAP_GET_RESULTS_SUMMARY');
        const fn = function (event) {
          window.parent.removeEventListener('A11Y_RESULTS_SUMMARY_RESPONSE', fn);
            resolve(event.detail.summary);
        };
        window.parent.addEventListener('A11Y_RESULTS_SUMMARY_RESPONSE', fn);
        window.parent.dispatchEvent(e);
      } catch (err) {
        console.log("No accessibility results summary was found.");
        reject(err);
      }
    });
  } catch {}
  
});

Cypress.Commands.add('getAccessibilityResults', () => {
  try {
    if (Cypress.env("IS_ACCESSIBILITY_EXTENSION_LOADED") !== "true") {
      console.log(`Not a Accessibility Automation session, cannot retrieve Accessibility results.`);
      return 
    }
    return new Promise(function (resolve, reject) {
      try{
        const e = new CustomEvent('A11Y_TAP_GET_RESULTS');
        const fn = function (event) {
          window.parent.removeEventListener('A11Y_RESULTS_RESPONSE', fn);
            resolve(event.detail.summary);
        };
        window.parent.addEventListener('A11Y_RESULTS_RESPONSE', fn);
        window.parent.dispatchEvent(e);
      } catch (err) {
        console.log("No accessibility results were found.");
        reject(err);
      }
    });
  } catch {}
  
});

