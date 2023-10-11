/* Event listeners + custom commands for Cypress */

Cypress.on('test:before:run', () => {
  console.log(`is loaded from before========>  ${Cypress.env("IS_ACCESSIBILITY_EXTENSION_LOADED")}`)
  if (Cypress.env("IS_ACCESSIBILITY_EXTENSION_LOADED") !== "true") return
  const extensionPath = Cypress.env("ACCESSIBILITY_EXTENSION_PATH")

  if (extensionPath !== undefined) {
    let rs = new Promise((resolve, reject) => {
      window.parent.addEventListener('A11Y_TAP_STARTED', () => {
        console.log("A11Y_TAP_STARTED !!!! resolving")
        resolve("A11Y_TAP_STARTED");
        console.log("A11Y_TAP_STARTED !!!! after resolve")
      });
      const e = new CustomEvent('A11Y_FORCE_START');
      window.parent.dispatchEvent(e);
    })
  }
})

Cypress.on('test:after:run', (attributes, runnable) => {
  console.log(`is loaded from after ========>  ${Cypress.env("IS_ACCESSIBILITY_EXTENSION_LOADED")}`)
  if (Cypress.env("IS_ACCESSIBILITY_EXTENSION_LOADED") !== "true") return
  console.log("test:after:run !!!!!!!")
  const extensionPath = Cypress.env("ACCESSIBILITY_EXTENSION_PATH")
  const isHeaded = Cypress.browser.isHeaded;
  console.log(extensionPath)
  console.log(isHeaded)
  console.log("test:after:run !!!!!!!")
  if (isHeaded && extensionPath !== undefined) {

    let shouldScanTestForAccessibility = true;
    if (Cypress.env("INCLUDE_TAGS_FOR_ACCESSIBILITY") || Cypress.env("EXCLUDE_TAGS_FOR_ACCESSIBILITY")) {

      try {
        let includeTagArray = Cypress.env("INCLUDE_TAGS_FOR_ACCESSIBILITY").split(";")
        let excludeTagArray = Cypress.env("EXCLUDE_TAGS_FOR_ACCESSIBILITY").split(";")

        const fullTestName = attributes.title;
        const excluded = excludeTagArray.some((exclude) => fullTestName.includes(exclude));
        const included = includeTagArray.length === 0 || includeTags.some((include) => fullTestName.includes(include));
        shouldScanTestForAccessibility = !excluded && included;
      } catch (error){
        console.log("Error while validating test case for accessibility before scanning. Error : ", error);
      }
    }
    const dataForExtension = {
      "saveResults": shouldScanTestForAccessibility,
      "testDetails": {
        "name": attributes.title,
        "testRunId": '5058', // variable not consumed, shouldn't matter what we send
        "filePath": attributes.invocationDetails.relativeFile,
        "scopeList": [
          attributes.invocationDetails.relativeFile,
          attributes.title
        ]
      },
      "platform": {
        "os_name": Cypress.platform === "darwin" ? "mac" : "windows",
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

});

Cypress.Commands.add('getAccessibilityResultsSummary', () => {
  console.log(`is loaded from get ========>  ${Cypress.env("IS_ACCESSIBILITY_EXTENSION_LOADED")}`)
  if (Cypress.env("IS_ACCESSIBILITY_EXTENSION_LOADED") !== "true") return

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
      reject(err);
    }
  });
});


