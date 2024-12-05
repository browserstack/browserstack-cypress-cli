/* Event listeners + custom commands for Cypress */

const browserStackLog = (message) => {
	if (!Cypress.env('BROWSERSTACK_LOGS')) return;
	cy.task('browserstack_log', message);
}
const commandsToWrap = ['visit', 'click', 'type', 'request', 'dblclick', 'rightclick', 'clear', 'check', 'uncheck', 'select', 'trigger', 'selectFile', 'scrollIntoView', 'scroll', 'scrollTo', 'blur', 'focus', 'go', 'reload', 'submit', 'viewport', 'origin'];
const commandToOverwrite = [ 'visit', 'click', 'type', 'request', 'dblclick', 'rightclick', 'clear', 'check', 'uncheck', 'select', 'trigger', 'selectFile', 'scrollIntoView', 'scrollTo', 'blur', 'focus', 'go', 'reload', 'submit', 'viewport', 'origin'];
const performModifiedScan = (originalFn, Subject, stateType, ...args) => {
    let customChaining = cy.wrap(null).performScan();
    function changeSub(args, stateType, newSubject) {
        if (stateType !== 'parent') {
            return [newSubject, ...args.slice(1)];
        }
        return args;
    }
    function runCutomizedCommand() {
        if (!Subject) {
            let cypressCommandSubject = (cy.subject?.call(cy)) ?? null;
            customChaining.then(() => cypressCommandSubject).then(() => { originalFn(...args); });
        } else {
            let setTimeout = args.find(arg => arg?.timeout)?.timeout ?? null;
            let cypressCommandChain = (cy.subjectChain?.call(cy)) ?? null;
            customChaining.performScanSubjectQuery(cypressCommandChain, setTimeout).then({ timeout: 30000 }, newSubject => originalFn(...changeSub(args, stateType, newSubject)));
        }
    }
    runCutomizedCommand(); 
}

const performScan = (win, payloadToSend) =>
new Promise(async (resolve, reject) => {
	const isHttpOrHttps = /^(http|https):$/.test(win.location.protocol);
	if (!isHttpOrHttps) {
			resolve();
			return;
	}

	function findAccessibilityAutomationElement() {
			
			return win.document.querySelector("#accessibility-automation-element");
	}

	function waitForScannerReadiness(retryCount = 30, retryInterval = 300) {
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
					console.log(`Scan completed for ${win.location.href}`);
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
						browserStackLog("Scanner is not ready on the page after multiple retries. performscan");
						resolve("Scanner is not ready on the page after multiple retries. performscan");
					});
	}
})

const getAccessibilityResultsSummary = (win) =>
new Promise((resolve) => {
	const isHttpOrHttps = /^(http|https):$/.test(window.location.protocol);
	if (!isHttpOrHttps) {
			resolve();
			return;
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
					resolve();
					});
	}
})

const getAccessibilityResults = (win) =>
new Promise((resolve) => {
	const isHttpOrHttps = /^(http|https):$/.test(window.location.protocol);
	if (!isHttpOrHttps) {
			resolve();
			return;
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
					resolve();
					});
	}
});

const saveTestResults = (win, payloadToSend) =>
new Promise( (resolve, reject) => {
	try {
			const isHttpOrHttps = /^(http|https):$/.test(win.location.protocol);
			if (!isHttpOrHttps) {
					resolve("Unable to save accessibility results, Invalid URL.");
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
					browserStackLog("Error while validating test case for accessibility before scanning. Error : ", error);
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
            let stateType;
            if (!shouldScanTestForAccessibility || (stateName && stateName !== command)) {
                return originalFn(...args);
            }
            if(state !== null && state !== void 0){
                stateType = state.get('type');
            }
            else {
                stateType = null;
            }
            performModifiedScan(originalFn, Subject, stateType, ...args);
	});
});

afterEach(() => {
	const attributes = Cypress.mocha.getRunner().suite.ctx.currentTest;
	let shouldScanTestForAccessibility = shouldScanForAccessibility(attributes);
	if (!shouldScanTestForAccessibility) return cy.wrap({});

	cy.wrap(null).performScan().then(() => {
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
				cy.window()
				.then((win)=>{
					console.log("started saving results.", win.location.href);
					cy.wrap(saveTestResults(win, payloadToSend), {timeout: 30000});
				});
			} catch (er) {
		}
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
				cy.wrap(performScan(win), {timeout:30000});
			});
	} catch {}
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
	} catch {}

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

	} catch {}

});

Cypress.Commands.addQuery('performScanSubjectQuery', function (chaining, setTimeout) {
    this.set('timeout', setTimeout);
    this.set('onFail', (err) => {
        err.codeFrame = cy.state('runnable').runnable;
    });
    return () => cy.getSubjectFromChain(chaining);
});