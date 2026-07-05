/* Event listeners + custom commands for Cypress */

const browserStackLog = (message) => {
    if (!Cypress.env('BROWSERSTACK_LOGS')) return;
    cy.task('browserstack_log', message);
}

// SDK-6463: circuit breaker for a dead/unresponsive accessibility scanner.
// Each hung scan/save costs up to ACCESSIBILITY_SCAN_TIMEOUT (default 25s). Without a
// breaker, a scanner that never responds stalls EVERY test's afterEach (and every
// wrapped command) by that much. After N consecutive timeouts we stop attempting
// accessibility work for the remainder of this spec file (module state resets per spec).
let consecutiveA11yTimeouts = 0;
let a11yCircuitOpen = false;
let a11yCircuitLogged = false;
const getA11yCircuitLimit = () => parseInt(Cypress.env('ACCESSIBILITY_SCAN_CIRCUIT_LIMIT')) || 3;
const noteA11yTimeout = () => {
    consecutiveA11yTimeouts += 1;
    if (!a11yCircuitOpen && consecutiveA11yTimeouts >= getA11yCircuitLimit()) {
        a11yCircuitOpen = true;
        // eslint-disable-next-line no-console
        console.warn('BrowserStack Accessibility: scanner did not respond ' + consecutiveA11yTimeouts + ' consecutive times; skipping accessibility scans for the remaining tests in this spec.');
    }
};
const noteA11ySuccess = () => { consecutiveA11yTimeouts = 0; };


const commandsToWrap = ['visit', 'click', 'type', 'request', 'dblclick', 'rightclick', 'clear', 'check', 'uncheck', 'select', 'trigger', 'selectFile', 'scrollIntoView', 'scroll', 'scrollTo', 'blur', 'focus', 'go', 'reload', 'submit', 'viewport', 'origin'];
// scroll is not a default function in cypress.
const commandToOverwrite = ['visit', 'click', 'type', 'request', 'dblclick', 'rightclick', 'clear', 'check', 'uncheck', 'select', 'trigger', 'selectFile', 'scrollIntoView', 'scrollTo', 'blur', 'focus', 'go', 'reload', 'submit', 'viewport', 'origin'];

/*
    Overrriding the cypress commands to perform Accessibility Scan before Each command
    - runCutomizedCommand is handling both the cases of subject available in cypress original command
      and chaning available from original cypress command.   
*/
const performModifiedScan = (originalFn, Subject, stateType, ...args) => {
    let customChaining = cy.wrap(null).performScan();
    const changeSub = (args, stateType, newSubject) => {
        if (stateType !== 'parent') {
            return [newSubject, ...args.slice(1)];
        }
        return args;
    }
    const runCustomizedCommand = () => {
        if (!Subject) {
            let orgS1, orgS2, cypressCommandSubject = null;
            if((orgS2 = (orgS1 = cy).subject) !==null && orgS2 !== void 0){
                cypressCommandSubject = orgS2.call(orgS1);
            }
            customChaining.then(()=> cypressCommandSubject).then(() => {originalFn(...args)});
        } else {
            let orgSC1, orgSC2, timeO1, cypressCommandChain = null, setTimeout = null;
            if((timeO1 = args.find(arg => arg !== null && arg !== void 0 ? arg.timeout : null)) !== null && timeO1 !== void 0) {
                setTimeout = timeO1.timeout;
            }
            if((orgSC1 = (orgSC2 = cy).subjectChain) !== null && orgSC1 !== void 0){
                cypressCommandChain = orgSC1.call(orgSC2);
            }
            customChaining.performScanSubjectQuery(cypressCommandChain, setTimeout).then({timeout: 30000}, (newSubject) => originalFn(...changeSub(args, stateType, newSubject)));
        }
    }
    runCustomizedCommand(); 
}

const performScan = (win, payloadToSend) =>
new Promise((resolve) => {
    // SDK-6463: this promise MUST always settle (never hang, never reject). It runs inside the
    // global afterEach; if it hangs, cy.wrap()'s 30s timeout fails the hook and Cypress skips
    // the rest of the spec. Failure modes guarded here:
    //  - the injected scanner never dispatches A11Y_SCAN_FINISHED (page mid-navigation / slow scan)
    //  - win is cross-origin (e.g. an SSO redirect) so win.location / win.document throw synchronously
    if (a11yCircuitOpen) {
        // Scanner has repeatedly not responded in this spec — don't stall this test too.
        return resolve("Accessibility scan skipped: scanner unresponsive (circuit open)");
    }
    let settled = false;
    const finish = (val) => { if (!settled) { settled = true; clearTimeout(overallTimer); resolve(val); } };
    const overallTimeout = parseInt(Cypress.env('ACCESSIBILITY_SCAN_TIMEOUT')) || 25000;
    const overallTimer = setTimeout(() => { noteA11yTimeout(); finish("Accessibility scan timed out"); }, overallTimeout);

    try {
        const isHttpOrHttps = /^(http|https):$/.test(win.location.protocol);
        if (!isHttpOrHttps) {
            return finish();
        }

        function findAccessibilityAutomationElement() {
            return win.document.querySelector("#accessibility-automation-element");
        }

        function waitForScannerReadiness(retryCount = 100, retryInterval = 100) {
        return new Promise((resolve, reject) => {
            let count = 0;
            const intervalID = setInterval(() => {
                if (count > retryCount) {
                    clearInterval(intervalID);
                    return reject(
                    new Error(
                        "Accessibility Automation Scanner is not ready on the page."
                    )
                    );
                } else if (findAccessibilityAutomationElement()) {
                    clearInterval(intervalID);
                    return resolve("Scanner set");
                } else {
                    count += 1;
                }
            }, retryInterval);
        });
        }

        function startScan() {
            function onScanComplete() {
                win.removeEventListener("A11Y_SCAN_FINISHED", onScanComplete);
                if (!settled) noteA11ySuccess();
                return finish();
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
                .catch(() => finish("Scanner is not ready on the page after multiple retries. performscan"));
        }
    } catch (err) {
        // cross-origin window access or any unexpected error must not fail the hook
        finish();
    }
})

const getAccessibilityResultsSummary = (win) =>
new Promise((resolve) => {
    const isHttpOrHttps = /^(http|https):$/.test(window.location.protocol);
    if (!isHttpOrHttps) {
        return resolve();
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
                    return reject(
                    new Error(
                        "Accessibility Automation Scanner is not ready on the page."
                    )
                    );
                } else if (findAccessibilityAutomationElement()) {
                    clearInterval(intervalID);
                    return resolve("Scanner set");
                } else {
                    count += 1;
                }
            }, retryInterval);
        });
    }

    function getSummary() {
        function onReceiveSummary(event) {
            win.removeEventListener("A11Y_RESULTS_SUMMARY", onReceiveSummary);
            return resolve(event.detail);
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
            return resolve();
        });
    }
})

const getAccessibilityResults = (win) =>
new Promise((resolve) => {
    const isHttpOrHttps = /^(http|https):$/.test(window.location.protocol);
    if (!isHttpOrHttps) {
        return resolve();
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
                    return reject(
                    new Error(
                        "Accessibility Automation Scanner is not ready on the page."
                    )
                    );
                } else if (findAccessibilityAutomationElement()) {
                    clearInterval(intervalID);
                    return resolve("Scanner set");
                } else {
                    count += 1;
                }
            }, retryInterval);
        });
    }

    function getResults() {
        function onReceivedResult(event) {
            win.removeEventListener("A11Y_RESULTS_RESPONSE", onReceivedResult);
            return resolve(event.detail);
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
            return resolve();
        });
    }
});

const saveTestResults = (win, payloadToSend) =>
new Promise((resolve) => {
    // SDK-6463: must always settle (see performScan note) so a slow/absent A11Y_RESULTS_SAVED
    // event or a cross-origin window cannot fail the afterEach hook.
    if (a11yCircuitOpen) {
        return resolve("Accessibility results save skipped: scanner unresponsive (circuit open)");
    }
    let settled = false;
    const finish = (val) => { if (!settled) { settled = true; clearTimeout(overallTimer); resolve(val); } };
    const overallTimeout = parseInt(Cypress.env('ACCESSIBILITY_SCAN_TIMEOUT')) || 25000;
    const overallTimer = setTimeout(() => { noteA11yTimeout(); finish("Accessibility results save timed out"); }, overallTimeout);
    try {
        const isHttpOrHttps = /^(http|https):$/.test(win.location.protocol);
        if (!isHttpOrHttps) {
            finish("Unable to save accessibility results, Invalid URL.");
			return;
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
                    return reject(
                        new Error(
                        "Accessibility Automation Scanner is not ready on the page."
                        )
                    );
                } else if (findAccessibilityAutomationElement()) {
                    clearInterval(intervalID);
                    return resolve("Scanner set");
                } else {
                    count += 1;
                }
            }, retryInterval);
            });
        }

        function saveResults() {
            function onResultsSaved(event) {
                win.removeEventListener("A11Y_RESULTS_SAVED", onResultsSaved);
                if (!settled) noteA11ySuccess();
                return finish();
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
            .catch(() => finish("Scanner is not ready on the page after multiple retries. after run"));
        }
    } catch(error) {
        browserStackLog(`Error in saving results with error: ${error.message}`);
        finish();
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
            browserStackLog(`Error while validating test case for accessibility before scanning. Error : ${error.message}`);
        }
    }

    return shouldScanTestForAccessibility;
}

commandToOverwrite.forEach((command) => {
    Cypress.Commands.overwrite(command, (originalFn, ...args) => {
            const attributes = Cypress.mocha.getRunner().suite.ctx.currentTest || Cypress.mocha.getRunner().suite.ctx._runnable;
            const shouldScanTestForAccessibility = shouldScanForAccessibility(attributes);
            const state = cy.state('current'), Subject = 'getSubjectFromChain' in cy; 
            const stateName = state === null || state === void 0 ? void 0 : state.get('name');
            let stateType = null;
            if (!shouldScanTestForAccessibility || (stateName && stateName !== command)) {
                return originalFn(...args);
            }
            if(state !== null && state !== void 0){
                stateType = state.get('type');
            }
            performModifiedScan(originalFn, Subject, stateType, ...args);
    });
});

afterEach(() => {
    // SDK-6463: nothing that happens inside this accessibility hook may fail the user's
    // test or abort the remaining tests in the spec. Cypress chains have no .catch, so
    // suppress any failure raised while this hook's commands run (e.g. cy.window() on a
    // cross-origin page after an SSO redirect, or a cy.task that is not registered) via
    // the per-test 'fail' listener. Returning false prevents Cypress from failing the
    // test; the listener is scoped to the current test and auto-removed afterwards.
    cy.on('fail', (err) => {
        // eslint-disable-next-line no-console
        console.warn(`BrowserStack Accessibility: suppressed afterEach error: ${err && err.message}`);
        return false;
    });
    const attributes = Cypress.mocha.getRunner().suite.ctx.currentTest;
    cy.window().then(async (win) => {
        let shouldScanTestForAccessibility = shouldScanForAccessibility(attributes);
        if (!shouldScanTestForAccessibility) return cy.wrap({});

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
            } else if (attributes.prevAttempts && attributes.prevAttempts.length > 0) {
                filePath = (attributes.prevAttempts[0].invocationDetails && attributes.prevAttempts[0].invocationDetails.relativeFile) || '';
            }

            let testRunUuid = null;
            cy.task('get_test_run_uuid', { testIdentifier: attributes.title })
                .then((response) => {
                if (response && response.testRunUuid) {
                    testRunUuid = response.testRunUuid;
                }

                const payloadToSend = {
                    "thTestRunUuid": testRunUuid,
                    "thBuildUuid": Cypress.env("BROWSERSTACK_TESTHUB_UUID"),
                    "thJwtToken": Cypress.env("BROWSERSTACK_TESTHUB_JWT")
                };
                browserStackLog(`Payload to send: ${JSON.stringify(payloadToSend)}`);

                return cy.wrap(saveTestResults(win, payloadToSend), {timeout: 30000});
            }).then(() => {
                browserStackLog(`Saved accessibility test results`);
            })

        } catch (er) {
			browserStackLog(`Error in saving results with error: ${er.message}`);
        }
        })
    });
})

Cypress.Commands.add('performScan', () => {
    try {
        const attributes = Cypress.mocha.getRunner().suite.ctx.currentTest || Cypress.mocha.getRunner().suite.ctx._runnable;
        const shouldScanTestForAccessibility = shouldScanForAccessibility(attributes);
        if (!shouldScanTestForAccessibility) {
            browserStackLog(`Not a Accessibility Automation session, cannot perform scan.`);
            return cy.wrap({});
        }
        cy.window().then(async (win) => {
            browserStackLog(`Performing accessibility scan`);
            cy.wrap(performScan(win), {timeout:30000});
        });
    } catch(error) {
		browserStackLog(`Error in performing scan with error: ${error.message}`);
	}
})

Cypress.Commands.add('getAccessibilityResultsSummary', () => {
    try {
        const attributes = Cypress.mocha.getRunner().suite.ctx.currentTest || Cypress.mocha.getRunner().suite.ctx._runnable;
        const shouldScanTestForAccessibility = shouldScanForAccessibility(attributes);
        if (!shouldScanTestForAccessibility) {
            browserStackLog(`Not a Accessibility Automation session, cannot retrieve Accessibility results summary.`);
            return cy.wrap({});
        }
        cy.window().then(async (win) => {
            await performScan(win);
            browserStackLog('Getting accessibility results summary');
            return await getAccessibilityResultsSummary(win);
        });
    } catch(error) {
		browserStackLog(`Error in getting accessibilty results summary with error: ${error.message}`);
	}

});

Cypress.Commands.add('getAccessibilityResults', () => {
    try {
        const attributes = Cypress.mocha.getRunner().suite.ctx.currentTest || Cypress.mocha.getRunner().suite.ctx._runnable;
        const shouldScanTestForAccessibility = shouldScanForAccessibility(attributes);
        if (!shouldScanTestForAccessibility) {
            browserStackLog(`Not a Accessibility Automation session, cannot retrieve Accessibility results.`);
            return cy.wrap({});
        }

    /* browserstack_accessibility_automation_script */

        cy.window().then(async (win) => {
            await performScan(win);
            browserStackLog('Getting accessibility results');
            return await getAccessibilityResults(win);
        });

    } catch(error) {
		browserStackLog(`Error in getting accessibilty results with error: ${error.message}`);
	}
});

if (!Cypress.Commands.hasOwnProperty('_browserstackSDKQueryAdded')) {
    Cypress.Commands.addQuery('performScanSubjectQuery', function (chaining, setTimeout) {
        this.set('timeout', setTimeout);
        return () => cy.getSubjectFromChain(chaining);
    });
    Cypress.Commands._browserstackSDKQueryAdded = true;
}
