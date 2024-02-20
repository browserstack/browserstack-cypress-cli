/* Event listeners + custom commands for Cypress */

const commandsToWrap = ['visit', 'click', 'type', 'request', 'dblclick', 'rightclick', 'clear', 'check', 'uncheck', 'select', 'trigger', 'selectFile', 'scrollIntoView', 'scroll', 'scrollTo', 'blur', 'focus', 'go', 'reload', 'submit', 'viewport', 'origin'];

const performScan = (win, payloadToSend) =>
  new Promise(async (resolve, reject) => {

    const isHttpOrHttps = /^(http|https):$/.test(win.location.protocol);
    if (!isHttpOrHttps) {
      resolve();
    }

    function findAccessibilityAutomationElement() {
      return win.document.querySelector("#accessibility-automation-element");
    }

    function waitForScannerReadiness(retryCount = 30, retryInterval = 100) {
      return new Promise(async (resolve, reject) => {
        let count = 0;
        const intervalID = setInterval(async () => {
          if (count > retryCount) {
            clearInterval(intervalID);
            reject(
              new Error(
                "Accessibility Automation Scanner is not ready on the page."
              )
            );
          } else if (findAccessibilityAutomationElement()) {
            clearInterval(intervalID);
            resolve("Scanner set");
          } else {
            count += 1;
          }
        }, retryInterval);
      });
    }

    function startScan() {
      function onScanComplete() {
        win.removeEventListener("A11Y_SCAN_FINISHED", onScanComplete);
        resolve();
      }

      win.addEventListener("A11Y_SCAN_FINISHED", onScanComplete);
      const e = new CustomEvent("A11Y_SCAN", { detail: payloadToSend });
      win.dispatchEvent(e);
    }

    if (findAccessibilityAutomationElement()) {
      startScan();
    } else {
      waitForScannerReadiness()
        .then(startScan)
        .catch(async (err) => {
          resolve("Scanner is not ready on the page after multiple retries. performscan");
        });
    }
  })

const getAccessibilityResultsSummary = (win) =>
  new Promise((resolve) => {
    const isHttpOrHttps = /^(http|https):$/.test(window.location.protocol);
    if (!isHttpOrHttps) {
      resolve();
    }

    function findAccessibilityAutomationElement() {
      return win.document.querySelector("#accessibility-automation-element");
    }

    function waitForScannerReadiness(retryCount = 30, retryInterval = 100) {
      return new Promise((resolve, reject) => {
        let count = 0;
        const intervalID = setInterval(() => {
          if (count > retryCount) {
            clearInterval(intervalID);
            reject(
              new Error(
                "Accessibility Automation Scanner is not ready on the page."
              )
            );
          } else if (findAccessibilityAutomationElement()) {
            clearInterval(intervalID);
            resolve("Scanner set");
          } else {
            count += 1;
          }
        }, retryInterval);
      });
    }

    function getSummary() {
      function onReceiveSummary(event) {

        win.removeEventListener("A11Y_RESULTS_SUMMARY", onReceiveSummary);
        resolve(event.detail);
      }

      win.addEventListener("A11Y_RESULTS_SUMMARY", onReceiveSummary);
      const e = new CustomEvent("A11Y_GET_RESULTS_SUMMARY");
      win.dispatchEvent(e);
    }

    if (findAccessibilityAutomationElement()) {
      getSummary();
    } else {
      waitForScannerReadiness()
        .then(getSummary)
        .catch((err) => {
    
        });
    }
  })

const getAccessibilityResults = (win) =>
  new Promise((resolve) => {
    const isHttpOrHttps = /^(http|https):$/.test(window.location.protocol);
    if (!isHttpOrHttps) {
      resolve();
    }

    function findAccessibilityAutomationElement() {
      return win.document.querySelector("#accessibility-automation-element");
    }

    function waitForScannerReadiness(retryCount = 30, retryInterval = 100) {
      return new Promise((resolve, reject) => {
        let count = 0;
        const intervalID = setInterval(() => {
          if (count > retryCount) {
            clearInterval(intervalID);
            reject(
              new Error(
                "Accessibility Automation Scanner is not ready on the page."
              )
            );
          } else if (findAccessibilityAutomationElement()) {
            clearInterval(intervalID);
            resolve("Scanner set");
          } else {
            count += 1;
          }
        }, retryInterval);
      });
    }

    function getResults() {
      function onReceivedResult(event) {

        win.removeEventListener("A11Y_RESULTS_RESPONSE", onReceivedResult);
        resolve(event.detail);
      }

      win.addEventListener("A11Y_RESULTS_RESPONSE", onReceivedResult);
      const e = new CustomEvent("A11Y_GET_RESULTS");
      win.dispatchEvent(e);
    }

    if (findAccessibilityAutomationElement()) {
      getResults();
    } else {
      waitForScannerReadiness()
        .then(getResults)
        .catch((err) => {
    
        });
    }
  });

const saveTestResults = (win, payloadToSend) =>
  new Promise( (resolve, reject) => {
    try {
      const isHttpOrHttps = /^(http|https):$/.test(win.location.protocol);
      if (!isHttpOrHttps) {
        resolve("Unable to save accessibility results, Invalid URL.");
      }

      function findAccessibilityAutomationElement() {
        return win.document.querySelector("#accessibility-automation-element");
      }

      function waitForScannerReadiness(retryCount = 30, retryInterval = 100) {
        return new Promise((resolve, reject) => {
          let count = 0;
          const intervalID = setInterval(async () => {
            if (count > retryCount) {
              clearInterval(intervalID);
              reject(
                new Error(
                  "Accessibility Automation Scanner is not ready on the page."
                )
              );
            } else if (findAccessibilityAutomationElement()) {
              clearInterval(intervalID);
              resolve("Scanner set");
            } else {
              count += 1;
            }
          }, retryInterval);
        });
      }

      function saveResults() {
        function onResultsSaved(event) {
          resolve();
        }
        win.addEventListener("A11Y_RESULTS_SAVED", onResultsSaved);
        const e = new CustomEvent("A11Y_SAVE_RESULTS", {
          detail: payloadToSend,
        });
        win.dispatchEvent(e);
      }

      if (findAccessibilityAutomationElement()) {
        saveResults();
      } else {
        waitForScannerReadiness()
          .then(saveResults)
          .catch(async (err) => {
            resolve("Scanner is not ready on the page after multiple retries. after run");
          });
      }

    } catch(er) {
      resolve()
    }

  })

const shouldScanForAccessibility = (attributes) => {
  if (Cypress.env("IS_ACCESSIBILITY_EXTENSION_LOADED") !== "true") return false;

  const extensionPath = Cypress.env("ACCESSIBILITY_EXTENSION_PATH");
  const isHeaded = Cypress.browser.isHeaded;

  if (!isHeaded || (extensionPath === undefined)) return false;

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

  return shouldScanTestForAccessibility;
}

Cypress.on('command:start', async (command) => {
  if(!command || !command.attributes) return;
  if(command.attributes.name == 'window' || command.attributes.name == 'then' || command.attributes.name == 'wrap') {
    return;
  }

  if (!commandsToWrap.includes(command.attributes.name)) return;

  const attributes = Cypress.mocha.getRunner().suite.ctx.currentTest || Cypress.mocha.getRunner().suite.ctx._runnable;

  let shouldScanTestForAccessibility = shouldScanForAccessibility(attributes);
  if (!shouldScanTestForAccessibility) return;

  cy.window().then((win) => {
    cy.wrap(performScan(win, {method: command.attributes.name}), {timeout: 30000})
  })
})

afterEach(() => {
  const attributes = Cypress.mocha.getRunner().suite.ctx.currentTest;
  cy.window().then(async (win) => {
    let shouldScanTestForAccessibility = shouldScanForAccessibility(attributes);
    if (!shouldScanTestForAccessibility) return;

    cy.wrap(performScan(win), {timeout: 30000}).then(() => {
      try {
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
        const payloadToSend = {
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
        cy.wrap(saveTestResults(win, payloadToSend), {timeout: 30000})

      } catch (er) {
      }
    })
  });
})

Cypress.Commands.add('performScan', () => {
  cy.window().then(async (win) => {
    await performScan(win);
    return await getAccessibilityResultsSummary(win);
  });
})

Cypress.Commands.add('getAccessibilityResultsSummary', () => {
  try {
    if (Cypress.env("IS_ACCESSIBILITY_EXTENSION_LOADED") !== "true") {
      console.log(`Not a Accessibility Automation session, cannot retrieve Accessibility results.`);
      return
    }
      cy.window().then(async (win) => {
        await performScan(win);
        return await getAccessibilityResultsSummary(win);
      });
  } catch {}
  
});

Cypress.Commands.add('getAccessibilityResults', () => {
  try {
    if (Cypress.env("IS_ACCESSIBILITY_EXTENSION_LOADED") !== "true") {
      console.log(`Not a Accessibility Automation session, cannot retrieve Accessibility results.`);
      return 
    }

/* browserstack_accessibility_automation_script */

      cy.window().then(async (win) => {
        await performScan(win);
        return await getAccessibilityResults(win);
      });

  } catch {}
  
});
