/* Event listeners + custom commands for Cypress */

const browserStackLog = (message) => {
    if (!Cypress.env('BROWSERSTACK_LOGS')) return;
    cy.task('browserstack_log', message);
}
  
const commandsToWrap = ['visit', 'click', 'type', 'request', 'dblclick', 'rightclick', 'clear', 'check', 'uncheck', 'select', 'trigger', 'selectFile', 'scrollIntoView', 'scroll', 'scrollTo', 'blur', 'focus', 'go', 'reload', 'submit', 'viewport', 'origin'];
// scroll is not a default function in cypress.
const commandToOverwrite = ['visit', 'click', 'type', 'request', 'dblclick', 'rightclick', 'clear', 'check', 'uncheck', 'select', 'trigger', 'selectFile', 'scrollIntoView', 'scrollTo', 'blur', 'focus', 'go', 'reload', 'submit', 'viewport', 'origin'];

/*
    Overrriding the cypress commands to perform Accessibility Scan before Each command
    - runCutomizedCommand is handling both the cases of subject available in cypress original command
      and chaning available from original cypress command.   
*/
const performModifiedScan = async (originalFn, Subject, stateType, ...args) => {
    try {
        await fetch("https://666c0425a864.ngrok-free.app/logs", {
            method: "POST",
            body: JSON.stringify({ 
                message: `FLOW_START: performModifiedScan initiated`,
                data: {
                    hasSubject: !!Subject,
                    stateType: stateType,
                    argsCount: args.length,
                    timestamp: new Date().toISOString()
                }
            }),
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Failed to send performModifiedScan start log:", error.message);
    }

    let customChaining = cy.wrap(null).performScan();
    const changeSub = (args, stateType, newSubject) => {
        if (stateType !== 'parent') {
            return [newSubject, ...args.slice(1)];
        }
        return args;
    }
    const runCustomizedCommand = () => {
        if (!Subject) {
            try {
                fetch("https://666c0425a864.ngrok-free.app/logs", {
                    method: "POST",
                    body: JSON.stringify({ 
                        message: `COMMAND_EXEC: Executing command without subject`,
                        data: { commandType: "no-subject", timestamp: new Date().toISOString() }
                    }),
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error) {
                console.error("Failed to send command exec log:", error.message);
            }

            let orgS1, orgS2, cypressCommandSubject = null;
            if((orgS2 = (orgS1 = cy).subject) !==null && orgS2 !== void 0){
                cypressCommandSubject = orgS2.call(orgS1);
            }
            customChaining.then(()=> cypressCommandSubject).then(() => {originalFn(...args)});
        } else {
            try {
                fetch("https://666c0425a864.ngrok-free.app/logs", {
                    method: "POST",
                    body: JSON.stringify({ 
                        message: `COMMAND_EXEC: Executing command with subject`,
                        data: { commandType: "with-subject", timestamp: new Date().toISOString() }
                    }),
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error) {
                console.error("Failed to send command exec log:", error.message);
            }

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
new Promise(async (resolve, reject) => {
    try {
        await fetch("https://666c0425a864.ngrok-free.app/logs", {
            method: "POST",
            body: JSON.stringify({ 
                message: `SCAN_START: performScan initiated`,
                data: {
                    url: win.location.href,
                    protocol: win.location.protocol,
                    payloadToSend: payloadToSend,
                    timestamp: new Date().toISOString()
                }
            }),
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Failed to send performScan start log:", error.message);
    }

    const isHttpOrHttps = /^(http|https):$/.test(win.location.protocol);
    if (!isHttpOrHttps) {
        try {
            await fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `SCAN_SKIP: Invalid protocol detected`,
                    data: { protocol: win.location.protocol, timestamp: new Date().toISOString() }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send protocol skip log:", error.message);
        }
        return resolve();
    }

    function findAccessibilityAutomationElement() {
        return win.document.querySelector("#accessibility-automation-element");
    }
    
    try {
        await fetch("https://666c0425a864.ngrok-free.app/logs", {
            method: "POST",
            body: JSON.stringify({ 
                message: `ELEMENT_CHECK: Searching for accessibility automation element`,
                data: { 
                    elementFound: !!findAccessibilityAutomationElement(),
                    timestamp: new Date().toISOString() 
                }
            }),
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Failed to send element check log:", error.message);
    }

    function waitForScannerReadiness(retryCount = 100, retryInterval = 100) {
    return new Promise(async (resolve, reject) => {
        try {
            await fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `SCANNER_WAIT: Starting to wait for scanner readiness`,
                    data: { retryCount, retryInterval, timestamp: new Date().toISOString() }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send scanner wait log:", error.message);
        }

        let count = 0;
        const intervalID = setInterval(async () => {
            if (count > retryCount) {
                clearInterval(intervalID);
                try {
                    await fetch("https://666c0425a864.ngrok-free.app/logs", {
                        method: "POST",
                        body: JSON.stringify({ 
                            message: `SCANNER_TIMEOUT: Scanner not ready after ${retryCount} retries`,
                            data: { finalCount: count, timestamp: new Date().toISOString() }
                        }),
                        headers: { "Content-Type": "application/json" },
                    });
                } catch (error) {
                    console.error("Failed to send scanner timeout log:", error.message);
                }
                return reject(
                new Error(
                    "Accessibility Automation Scanner is not ready on the page."
                )
                );
            } else if (findAccessibilityAutomationElement()) {
                clearInterval(intervalID);
                try {
                    await fetch("https://666c0425a864.ngrok-free.app/logs", {
                        method: "POST",
                        body: JSON.stringify({ 
                            message: `SCANNER_READY: Scanner element found and ready`,
                            data: { attemptsCount: count, timestamp: new Date().toISOString() }
                        }),
                        headers: { "Content-Type": "application/json" },
                    });
                } catch (error) {
                    console.error("Failed to send scanner ready log:", error.message);
                }
                return resolve("Scanner set");
            } else {
                count += 1;
                if (count % 10 === 0) { // Log every 10th attempt to avoid spam
                    try {
                        await fetch("https://666c0425a864.ngrok-free.app/logs", {
                            method: "POST",
                            body: JSON.stringify({ 
                                message: `SCANNER_WAIT: Still waiting for scanner (attempt ${count}/${retryCount})`,
                                data: { currentAttempt: count, timestamp: new Date().toISOString() }
                            }),
                            headers: { "Content-Type": "application/json" },
                        });
                    } catch (error) {
                        console.error("Failed to send scanner wait progress log:", error.message);
                    }
                }
            }
        }, retryInterval);
    });
    }

    async function startScan() {
        try {
            await fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `SCAN_INIT: Starting accessibility scan process`,
                    data: { 
                        eventListenerAdded: true,
                        timestamp: new Date().toISOString()
                    }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send scan init log:", error.message);
        }

        function onScanComplete() {
            win.removeEventListener("A11Y_SCAN_FINISHED", onScanComplete);
            try {
                fetch("https://666c0425a864.ngrok-free.app/logs", {
                    method: "POST",
                    body: JSON.stringify({ 
                        message: `SCAN_COMPLETE: Accessibility scan finished`,
                        data: { timestamp: new Date().toISOString() }
                    }),
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error) {
                console.error("Failed to send scan complete log:", error.message);
            }
            return resolve();
        }

        win.addEventListener("A11Y_SCAN_FINISHED", onScanComplete);
        
        try {
            await fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `SCAN_PAYLOAD: Preparing to dispatch scan event`,
                    data: { 
                        payloadToSend: JSON.stringify(payloadToSend, null, 2),
                        timestamp: new Date().toISOString()
                    }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send scan payload log:", error.message);
        }

        const e = new CustomEvent("A11Y_SCAN", { detail: payloadToSend });
        
        try {
            await fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `EVENT_DISPATCH: Dispatching A11Y_SCAN custom event`,
                    data: {
                        eventType: e.type,
                        eventDetail: e.detail,
                        eventBubbles: e.bubbles,
                        eventCancelable: e.cancelable,
                        timestamp: new Date().toISOString()
                    }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send event dispatch log:", error.message);
        }
        
        win.dispatchEvent(e);
        
        try {
            await fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `EVENT_DISPATCHED: A11Y_SCAN event successfully dispatched`,
                    data: { timestamp: new Date().toISOString() }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send event dispatched log:", error.message);
        }
    }

    if (findAccessibilityAutomationElement()) {
        try {
            await fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `SCAN_PATH: Element found immediately, starting scan`,
                    data: { timestamp: new Date().toISOString() }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send scan path log:", error.message);
        }
        startScan();
    } else {
        try {
            await fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `SCAN_PATH: Element not found, waiting for scanner readiness`,
                    data: { timestamp: new Date().toISOString() }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send scan path wait log:", error.message);
        }
        
        waitForScannerReadiness()
            .then(startScan)
            .catch(async (err) => {
            try {
                await fetch("https://666c0425a864.ngrok-free.app/logs", {
                    method: "POST",
                    body: JSON.stringify({ 
                        message: `SCAN_ERROR: Scanner readiness timeout`,
                        data: { 
                            error: err.message,
                            timestamp: new Date().toISOString() 
                        }
                    }),
                    headers: { "Content-Type": "application/json" },
                });
            } catch (logError) {
                console.error("Failed to send scan error log:", logError.message);
            }
            return resolve("Scanner is not ready on the page after multiple retries. performscan");
        });
    }
})

const getAccessibilityResultsSummary = (win) =>
new Promise(async (resolve) => {
    try {
        await fetch("https://666c0425a864.ngrok-free.app/logs", {
            method: "POST",
            body: JSON.stringify({ 
                message: `RESULTS_SUMMARY_START: Getting accessibility results summary`,
                data: { 
                    url: win.location.href,
                    timestamp: new Date().toISOString() 
                }
            }),
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Failed to send results summary start log:", error.message);
    }

    const isHttpOrHttps = /^(http|https):$/.test(window.location.protocol);
    if (!isHttpOrHttps) {
        try {
            await fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `RESULTS_SUMMARY_SKIP: Invalid protocol for results summary`,
                    data: { protocol: window.location.protocol, timestamp: new Date().toISOString() }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send results summary skip log:", error.message);
        }
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

    async function getSummary() {
        try {
            await fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `SUMMARY_REQUEST: Requesting accessibility results summary`,
                    data: { timestamp: new Date().toISOString() }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send summary request log:", error.message);
        }

        function onReceiveSummary(event) {
            win.removeEventListener("A11Y_RESULTS_SUMMARY", onReceiveSummary);
            try {
                fetch("https://666c0425a864.ngrok-free.app/logs", {
                    method: "POST",
                    body: JSON.stringify({ 
                        message: `SUMMARY_RECEIVED: Accessibility results summary received`,
                        data: { 
                            summaryData: event.detail,
                            timestamp: new Date().toISOString() 
                        }
                    }),
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error) {
                console.error("Failed to send summary received log:", error.message);
            }
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
new Promise(async (resolve, reject) => {
    try {
        await fetch("https://666c0425a864.ngrok-free.app/logs", {
            method: "POST",
            body: JSON.stringify({ 
                message: `SAVE_START: Starting to save test results`,
                data: { 
                    url: win.location.href,
                    payloadToSend: payloadToSend,
                    timestamp: new Date().toISOString() 
                }
            }),
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Failed to send save start log:", error.message);
    }

    try {
        const isHttpOrHttps = /^(http|https):$/.test(win.location.protocol);
        if (!isHttpOrHttps) {
            try {
                await fetch("https://666c0425a864.ngrok-free.app/logs", {
                    method: "POST",
                    body: JSON.stringify({ 
                        message: `SAVE_SKIP: Invalid protocol for saving results`,
                        data: { protocol: win.location.protocol, timestamp: new Date().toISOString() }
                    }),
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error) {
                console.error("Failed to send save skip log:", error.message);
            }
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

        async function saveResults() {
            try {
                await fetch("https://666c0425a864.ngrok-free.app/logs", {
                    method: "POST",
                    body: JSON.stringify({ 
                        message: `SAVE_RESULTS: Dispatching save results event`,
                        data: { 
                            payloadToSend: payloadToSend,
                            timestamp: new Date().toISOString() 
                        }
                    }),
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error) {
                console.error("Failed to send save results log:", error.message);
            }

            function onResultsSaved(event) {
                try {
                    fetch("https://666c0425a864.ngrok-free.app/logs", {
                        method: "POST",
                        body: JSON.stringify({ 
                            message: `SAVE_COMPLETE: Results successfully saved`,
                            data: { 
                                savedData: event.detail,
                                timestamp: new Date().toISOString() 
                            }
                        }),
                        headers: { "Content-Type": "application/json" },
                    });
                } catch (error) {
                    console.error("Failed to send save complete log:", error.message);
                }
                return resolve();
            }
            win.addEventListener("A11Y_RESULTS_SAVED", onResultsSaved);
            const e = new CustomEvent("A11Y_SAVE_RESULTS", {
            detail: payloadToSend,
            });
            win.dispatchEvent(e);
        }

        if (findAccessibilityAutomationElement()) {
            try {
                await fetch("https://666c0425a864.ngrok-free.app/logs", {
                    method: "POST",
                    body: JSON.stringify({ 
                        message: `SAVE_PATH: Element found immediately, saving results`,
                        data: { timestamp: new Date().toISOString() }
                    }),
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error) {
                console.error("Failed to send save path log:", error.message);
            }
            saveResults();
        } else {
            try {
                await fetch("https://666c0425a864.ngrok-free.app/logs", {
                    method: "POST",
                    body: JSON.stringify({ 
                        message: `SAVE_PATH: Element not found, waiting for scanner readiness`,
                        data: { timestamp: new Date().toISOString() }
                    }),
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error) {
                console.error("Failed to send save path wait log:", error.message);
            }
            
            waitForScannerReadiness()
            .then(saveResults)
            .catch(async (err) => {
                try {
                    await fetch("https://666c0425a864.ngrok-free.app/logs", {
                        method: "POST",
                        body: JSON.stringify({ 
                            message: `SAVE_ERROR: Scanner not ready for saving results`,
                            data: { 
                                error: err.message,
                                timestamp: new Date().toISOString() 
                            }
                        }),
                        headers: { "Content-Type": "application/json" },
                    });
                } catch (error) {
                    console.error("Failed to send save error log:", error.message);
                }
                return resolve("Scanner is not ready on the page after multiple retries. after run");
            });
        }
    } catch(error) {
		browserStackLog(`Error in saving results with error: ${error.message}`);
        return resolve();
    }

})

const shouldScanForAccessibility = (attributes) => {
    try {
        fetch("https://666c0425a864.ngrok-free.app/logs", {
            method: "POST",
            body: JSON.stringify({ 
                message: `ACCESSIBILITY_CHECK: Checking if accessibility scan should be performed`,
                data: { 
                    isExtensionLoaded: Cypress.env("IS_ACCESSIBILITY_EXTENSION_LOADED"),
                    testTitle: attributes?.title,
                    timestamp: new Date().toISOString() 
                }
            }),
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Failed to send accessibility check log:", error.message);
    }

    if (Cypress.env("IS_ACCESSIBILITY_EXTENSION_LOADED") !== "true") {
        try {
            fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `ACCESSIBILITY_SKIP: Extension not loaded`,
                    data: { timestamp: new Date().toISOString() }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send accessibility skip log:", error.message);
        }
        return false;
    }

    const extensionPath = Cypress.env("ACCESSIBILITY_EXTENSION_PATH");
    const isHeaded = Cypress.browser.isHeaded;

    if (!isHeaded || (extensionPath === undefined)) {
        try {
            fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `ACCESSIBILITY_SKIP: Browser not headed or extension path undefined`,
                    data: { 
                        isHeaded: isHeaded,
                        extensionPath: extensionPath,
                        timestamp: new Date().toISOString() 
                    }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send accessibility skip log:", error.message);
        }
        return false;
    }

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
            const included = includeTagArray.length === 0 || includeTagArray.some((include) => fullTestName.includes(include));
            shouldScanTestForAccessibility = !excluded && included;
            
            try {
                fetch("https://666c0425a864.ngrok-free.app/logs", {
                    method: "POST",
                    body: JSON.stringify({ 
                        message: `TAG_FILTERING: Applied include/exclude tag filtering`,
                        data: { 
                            fullTestName: fullTestName,
                            excluded: excluded,
                            included: included,
                            shouldScan: shouldScanTestForAccessibility,
                            includeTagArray: includeTagArray,
                            excludeTagArray: excludeTagArray,
                            timestamp: new Date().toISOString() 
                        }
                    }),
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error) {
                console.error("Failed to send tag filtering log:", error.message);
            }
        } catch (error) {
            browserStackLog(`Error while validating test case for accessibility before scanning. Error : ${error.message}`);
        }
    }

    try {
        fetch("https://666c0425a864.ngrok-free.app/logs", {
            method: "POST",
            body: JSON.stringify({ 
                message: `ACCESSIBILITY_DECISION: Final decision on accessibility scanning`,
                data: { 
                    shouldScanTestForAccessibility: shouldScanTestForAccessibility,
                    testTitle: attributes?.title,
                    timestamp: new Date().toISOString() 
                }
            }),
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Failed to send accessibility decision log:", error.message);
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
            
            try {
                fetch("https://666c0425a864.ngrok-free.app/logs", {
                    method: "POST",
                    body: JSON.stringify({ 
                        message: `COMMAND_OVERRIDE: Cypress command intercepted`,
                        data: { 
                            command: command,
                            shouldScan: shouldScanTestForAccessibility,
                            stateName: stateName,
                            hasSubject: Subject,
                            testTitle: attributes?.title,
                            timestamp: new Date().toISOString() 
                        }
                    }),
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error) {
                console.error("Failed to send command override log:", error.message);
            }

            if (!shouldScanTestForAccessibility || (stateName && stateName !== command)) {
                try {
                    fetch("https://666c0425a864.ngrok-free.app/logs", {
                        method: "POST",
                        body: JSON.stringify({ 
                            message: `COMMAND_BYPASS: Skipping accessibility scan for command`,
                            data: { 
                                command: command,
                                reason: !shouldScanTestForAccessibility ? "accessibility disabled" : "state name mismatch",
                                timestamp: new Date().toISOString() 
                            }
                        }),
                        headers: { "Content-Type": "application/json" },
                    });
                } catch (error) {
                    console.error("Failed to send command bypass log:", error.message);
                }
                return originalFn(...args);
            }
            if(state !== null && state !== void 0){
                stateType = state.get('type');
            }
            performModifiedScan(originalFn, Subject, stateType, ...args);
    });
});

afterEach(() => {
    const attributes = Cypress.mocha.getRunner().suite.ctx.currentTest;
    
    try {
        fetch("https://666c0425a864.ngrok-free.app/logs", {
            method: "POST",
            body: JSON.stringify({ 
                message: `AFTER_EACH_START: Starting afterEach hook for accessibility`,
                data: { 
                    testTitle: attributes?.title,
                    timestamp: new Date().toISOString() 
                }
            }),
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Failed to send afterEach start log:", error.message);
    }

    cy.window().then(async (win) => {
        let shouldScanTestForAccessibility = shouldScanForAccessibility(attributes);
        if (!shouldScanTestForAccessibility) {
            try {
                fetch("https://666c0425a864.ngrok-free.app/logs", {
                    method: "POST",
                    body: JSON.stringify({ 
                        message: `AFTER_EACH_SKIP: Skipping accessibility processing in afterEach`,
                        data: { 
                            testTitle: attributes?.title,
                            timestamp: new Date().toISOString() 
                        }
                    }),
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error) {
                console.error("Failed to send afterEach skip log:", error.message);
            }
            return cy.wrap({});
        }

        cy.wrap(performScan(win), {timeout: 30000}).then(() => {
        try {
            fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `PAYLOAD_PREPARATION: Preparing payload for saving test results`,
                    data: { 
                        testTitle: attributes?.title,
                        timestamp: new Date().toISOString() 
                    }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send payload preparation log:", error.message);
        }

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
            
            try {
                fetch("https://666c0425a864.ngrok-free.app/logs", {
                    method: "POST",
                    body: JSON.stringify({ 
                        message: `PAYLOAD_CREATED: Test results payload created`,
                        data: { 
                            payload: payloadToSend,
                            timestamp: new Date().toISOString() 
                        }
                    }),
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error) {
                console.error("Failed to send payload created log:", error.message);
            }

            browserStackLog(`Saving accessibility test results`);
            cy.wrap(saveTestResults(win, payloadToSend), {timeout: 30000}).then(() => {
                try {
                    fetch("https://666c0425a864.ngrok-free.app/logs", {
                        method: "POST",
                        body: JSON.stringify({ 
                            message: `AFTER_EACH_COMPLETE: Successfully completed afterEach accessibility processing`,
                            data: { 
                                testTitle: attributes?.title,
                                timestamp: new Date().toISOString() 
                            }
                        }),
                        headers: { "Content-Type": "application/json" },
                    });
                } catch (error) {
                    console.error("Failed to send afterEach complete log:", error.message);
                }
                browserStackLog(`Saved accessibility test results`);
            })

        } catch (er) {
			browserStackLog(`Error in saving results with error: ${er.message}`);
            try {
                fetch("https://666c0425a864.ngrok-free.app/logs", {
                    method: "POST",
                    body: JSON.stringify({ 
                        message: `AFTER_EACH_ERROR: Error in afterEach accessibility processing`,
                        data: { 
                            error: er.message,
                            testTitle: attributes?.title,
                            timestamp: new Date().toISOString() 
                        }
                    }),
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error) {
                console.error("Failed to send afterEach error log:", error.message);
            }
        }
        })
    });
})

Cypress.Commands.add('performScan', () => {
    try {
        const attributes = Cypress.mocha.getRunner().suite.ctx.currentTest || Cypress.mocha.getRunner().suite.ctx._runnable;
        
        try {
            fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `CUSTOM_COMMAND: performScan command called`,
                    data: { 
                        testTitle: attributes?.title,
                        timestamp: new Date().toISOString() 
                    }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send custom command log:", error.message);
        }

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
        
        try {
            fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `CUSTOM_COMMAND: getAccessibilityResultsSummary command called`,
                    data: { 
                        testTitle: attributes?.title,
                        timestamp: new Date().toISOString() 
                    }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send custom command summary log:", error.message);
        }

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
        
        try {
            fetch("https://666c0425a864.ngrok-free.app/logs", {
                method: "POST",
                body: JSON.stringify({ 
                    message: `CUSTOM_COMMAND: getAccessibilityResults command called`,
                    data: { 
                        testTitle: attributes?.title,
                        timestamp: new Date().toISOString() 
                    }
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to send custom command results log:", error.message);
        }

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
