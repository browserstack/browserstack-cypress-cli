/* Event listeners + custom commands for Cypress */

Cypress.on('test:before:run', () => {

  console.log("env ACCESSIBILITY_EXTENSION_PATH ", process.env.ACCESSIBILITY_EXTENSION_PATH)
  console.log("Cypress.config()")
  console.log(Cypress.config())
  console.log("cypress.env.ACCESSIBILITY_EXTENSION_PATH")
  console.log(Cypress.env())

  // if (process.env.ACCESSIBILITY_EXTENSION_PATH !== undefined) {
    let rs = new Promise((resolve, reject) => {
      window.parent.addEventListener('A11Y_TAP_STARTED', () => {
        console.log("A11Y_TAP_STARTED !!!! resolving")
        resolve("A11Y_TAP_STARTED");
        console.log("A11Y_TAP_STARTED !!!! after resolve")
      });
      const e = new CustomEvent('A11Y_FORCE_START');
      window.parent.dispatchEvent(e);
    })
    console.log("rs")
    console.log(rs)
    console.log("rs 1")
  // }
})

Cypress.on('test:after:run', (attributes, runnable) => {
  console.log("test:after:run !!!!!!!")
  console.log("test:after:run !!!!!!!")
  console.log("test:after:run !!!!!!!")
  console.log("test:after:run !!!!!!!")
  console.log("test:after:run !!!!!!!")
  // if (process.env.ACCESSIBILITY_EXTENSION_PATH !== undefined) {

    let shouldScanTestForAccessibility = true;
    // if (process.env.BROWSERSTACK_TEST_ACCESSIBILITY_CONFIGURATION_YML) {
    //   try {
    //     const accessibilityConfig = JSON.parse(process.env.BROWSERSTACK_TEST_ACCESSIBILITY_CONFIGURATION_YML);
    
    //     const includeTags = Array.isArray(accessibilityConfig.includeTagsInTestingScope) ? accessibilityConfig.includeTagsInTestingScope : [];
    //     const excludeTags = Array.isArray(accessibilityConfig.excludeTagsInTestingScope) ? accessibilityConfig.excludeTagsInTestingScope : [];
    
    //     const fullTestName = attributes.title;
    //     const excluded = excludeTags.some((exclude) => fullTestName.includes(exclude));
    //     const included = includeTags.length === 0 || includeTags.some((include) => fullTestName.includes(include));
    //     shouldScanTestForAccessibility = !excluded && included;
    //   } catch (error){
    //     console.log("Error while validating test case for accessibility before scanning. Error : ", error);
    //   }
    // }
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
        "os_name": process.env.SESSION_OS,
        "os_version": process.env.OS_VERSION,
        "browser_name": process.env.BROWSER,
        "browser_version": process.env.BROWSER_VERSION
      }
    };
    console.log("test:after:run !!!!!!! dataForExtension")
    console.log(dataForExtension)
    console.log("test:after:run !!!!!!! dataForExtension 2 ")
    return new Promise((resolve, reject) => {
      console.log("dataForExtension")
      console.log(dataForExtension)

      if (dataForExtension.saveResults) {
        window.parent.addEventListener('A11Y_TAP_TRANSPORTER', (event) => {
          resolve(event.detail);
        });
      }
      const e = new CustomEvent('A11Y_TEST_END', {detail: dataForExtension});
      window.parent.dispatchEvent(e);
      if (dataForExtension.saveResults !== true ) {
        resolve();
      }
    });
//  }

});

Cypress.Commands.add('getAccessibilityResultsSummary', () => {
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


