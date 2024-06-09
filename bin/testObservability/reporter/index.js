'use strict';

const util = require('util');
const fs = require('fs');
const path = require('path');
const { requireModule } = require('../helper/helper');
const Base = requireModule('mocha/lib/reporters/base.js'),
      utils = requireModule('mocha/lib/utils.js');
const color = Base.color;
const Mocha = requireModule('mocha');
// const Runnable = requireModule('mocha/lib/runnable');
const Runnable = require('mocha/lib/runnable'); // need to handle as this isn't present in older mocha versions
const { v4: uuidv4 } = require('uuid');

const { IPC_EVENTS } = require('../helper/constants');
const { startIPCServer } = require('../plugin/ipcServer');

const HOOK_TYPES_MAP = {
  "before all": "BEFORE_ALL",
  "after all": "AFTER_ALL",
  "before each": "BEFORE_EACH",
  "after each": "AFTER_EACH",
}

const {
  EVENT_RUN_END,
  EVENT_TEST_BEGIN,
  EVENT_TEST_END,
  EVENT_TEST_PENDING,
  EVENT_RUN_BEGIN,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
  EVENT_HOOK_BEGIN,
  EVENT_HOOK_END
} = Mocha.Runner.constants;

const {
  STATE_PASSED,
  STATE_PENDING,
  STATE_FAILED,
} = Runnable.constants;

const {
  uploadEventData,
  failureData,
  PathHelper,
  getTestEnv,
  getHookDetails,
  getHooksForTest,
  mapTestHooks,
  debug,
  isBrowserstackInfra,
  requestQueueHandler,
  getHookSkippedTests,
  getOSDetailsFromSystem,
  findGitConfig,
  getFileSeparatorData,
  setCrashReportingConfigFromReporter
} = require('../helper/helper');

const { consoleHolder } = require('../helper/constants');

// this reporter outputs test results, indenting two spaces per suite
class MyReporter {
  constructor(runner, options) {
    this.testObservability = true;
    Base.call(this, runner, options);
    this._testEnv = getTestEnv();
    this._paths = new PathHelper({ cwd: process.cwd() }, this._testEnv.location_prefix);
    this.currentTestSteps = [];
    this.currentTestCucumberSteps = [];
    this.hooksStarted = {};
    this.beforeHooks = [];
    this.platformDetailsMap = {};
    this.runStatusMarkedHash = {};
    this.haveSentBuildUpdate = false;
    this.registerListeners();
    setCrashReportingConfigFromReporter(null, process.env.OBS_CRASH_REPORTING_BS_CONFIG_PATH, process.env.OBS_CRASH_REPORTING_CYPRESS_CONFIG_PATH);

    runner
      .once(EVENT_RUN_BEGIN, async () => {
      })

      .on(EVENT_SUITE_BEGIN, (suite) => {
      })

      .on(EVENT_HOOK_BEGIN, async (hook) => {
        if(this.testObservability == true) {
          if(!hook.hookAnalyticsId) {
            hook.hookAnalyticsId = uuidv4();
          } else if(this.runStatusMarkedHash[hook.hookAnalyticsId]) {
            delete this.runStatusMarkedHash[hook.hookAnalyticsId];
            hook.hookAnalyticsId = uuidv4();
          }
          hook.hook_started_at = (new Date()).toISOString();
          hook.started_at = (new Date()).toISOString();
          this.current_hook = hook;
          await this.sendTestRunEvent(hook,undefined,false,"HookRunStarted");
        }
      })

      .on(EVENT_HOOK_END, async (hook) => {
        if(this.testObservability == true) {
          if(!this.runStatusMarkedHash[hook.hookAnalyticsId]) {
            if(!hook.hookAnalyticsId) {
              /* Hook objects don't maintain uuids in Cypress-Mocha */
              hook.hookAnalyticsId = this.current_hook.hookAnalyticsId;
              this.runStatusMarkedHash[this.current_hook.hookAnalyticsId] = true;
            } else {
              this.runStatusMarkedHash[hook.hookAnalyticsId] = true;
            }

            // Remove hooks added at hook start
            delete this.hooksStarted[hook.hookAnalyticsId];
            await this.sendTestRunEvent(hook,undefined,false,"HookRunFinished");
          }
        }
      })

      .on(EVENT_SUITE_END, (suite) => {
      })

      .on(EVENT_TEST_PASS, async (test) => {
        if(this.testObservability == true) {
          if(!this.runStatusMarkedHash[test.testAnalyticsId]) {
            if(test.testAnalyticsId) this.runStatusMarkedHash[test.testAnalyticsId] = true;
            await this.sendTestRunEvent(test);
          }
        }
      })

      .on(EVENT_TEST_FAIL, async (test, err) => {
        if(this.testObservability == true) {
          if((test.testAnalyticsId && !this.runStatusMarkedHash[test.testAnalyticsId]) || (test.hookAnalyticsId && !this.runStatusMarkedHash[test.hookAnalyticsId])) {
            if(test.testAnalyticsId) {
              this.runStatusMarkedHash[test.testAnalyticsId] = true;
              await this.sendTestRunEvent(test,err);
            } else if(test.hookAnalyticsId) {
              this.runStatusMarkedHash[test.hookAnalyticsId] = true;
              await this.sendTestRunEvent(test,err,false,"HookRunFinished");
            }
          }
        }
      })

      .on(EVENT_TEST_PENDING, async (test) => {
        if(this.testObservability == true) {
          if(!test.testAnalyticsId) test.testAnalyticsId = uuidv4();
          if(!this.runStatusMarkedHash[test.testAnalyticsId]) {
            this.runStatusMarkedHash[test.testAnalyticsId] = true;
            await this.sendTestRunEvent(test,undefined,false,"TestRunSkipped");
          }
        }
      })

      .on(EVENT_TEST_BEGIN, async (test) => {
        if (this.runStatusMarkedHash[test.testAnalyticsId]) return;
        if(this.testObservability == true) {
          await this.testStarted(test);
        }
      })

      .on(EVENT_TEST_END, async (test) => {
        if (this.runStatusMarkedHash[test.testAnalyticsId]) return;
        if(this.testObservability == true) {
          if(!this.runStatusMarkedHash[test.testAnalyticsId]) {
            if(test.testAnalyticsId) this.runStatusMarkedHash[test.testAnalyticsId] = true;
            await this.sendTestRunEvent(test);
          }
        }
      })
      
      .once(EVENT_RUN_END, async () => {
        try {
          if(this.testObservability == true) {
            const hookSkippedTests = getHookSkippedTests(this.runner.suite);
            for(const test of hookSkippedTests) {
              if(!test.testAnalyticsId) test.testAnalyticsId = uuidv4();
              await this.sendTestRunEvent(test,undefined,false,"TestRunSkipped");
            }
          }
        } catch(err) {
          debug(`Exception in populating test data for hook skipped test with error : ${err}`, true, err);
        }

        await this.uploadTestSteps();
        await requestQueueHandler.shutdown();
      });
  }

  registerListeners() {
    startIPCServer(
      (server) => {
        server.on(IPC_EVENTS.CONFIG, this.cypressConfigListener.bind(this));
        server.on(IPC_EVENTS.LOG, this.cypressLogListener.bind(this));
        server.on(IPC_EVENTS.SCREENSHOT, this.cypressScreenshotListener.bind(this));
        server.on(IPC_EVENTS.COMMAND, this.cypressCommandListener.bind(this));
        server.on(IPC_EVENTS.CUCUMBER, this.cypressCucumberStepListener.bind(this));
        server.on(IPC_EVENTS.PLATFORM_DETAILS, this.cypressPlatformDetailsListener.bind(this));
      },
      (server) => {
        server.off(IPC_EVENTS.CONFIG, '*');
        server.off(IPC_EVENTS.LOG, '*');
        server.off(IPC_EVENTS.SCREENSHOT, '*');
      },
    );
  }

  testStarted = async (test) => {
    try {
      const lastTest = this.current_test;
      this.current_test = test;
      test.retryOf = null;
      test.testAnalyticsId = uuidv4();
      test.started_at = (new Date()).toISOString();
      test.test_started_at = test.started_at;
      if(test._currentRetry > 0 && lastTest && lastTest.title == test.title) {
        /* Sending async to current test start to avoid current test end call getting fired before its start call */
        test.retryOf = lastTest.testAnalyticsId
        await this.sendTestRunEvent(test, undefined, false, "TestRunStarted");
        lastTest.state = STATE_FAILED;
        await this.sendTestRunEvent(lastTest, undefined, true);
      } else {
        await this.sendTestRunEvent(test, undefined, false, "TestRunStarted");
      }
      this.lastTest = lastTest;
    } catch(err) {
      debug(`Exception in populating test data for test start with error : ${err}`, true, err);
    }
  }

  uploadTestSteps = async (shouldClearCurrentSteps = true, cypressSteps = null) => {
    const currentTestSteps = cypressSteps ? cypressSteps : JSON.parse(JSON.stringify(this.currentTestSteps));
    /* TODO - Send as test logs */
    const allStepsAsLogs = [];
    currentTestSteps.forEach(step => {
      const currentStepAsLog = {
        test_run_uuid : step.test_run_uuid,
        hook_run_uuid : step.hook_run_uuid,
        timestamp: step.started_at,
        duration: step.duration,
        level: step.result,
        message: step.text,
        failure: step.failure,
        failure_reason: step.failure_reason,
        failure_type: step.failure_type,
        kind: 'TEST_STEP',
        http_response: {}
      };
      allStepsAsLogs.push(currentStepAsLog);
    });
    await uploadEventData({
      event_type: 'LogCreated',
      logs: allStepsAsLogs
    });
    if(shouldClearCurrentSteps) this.currentTestSteps = [];
  }

  sendTestRunEvent = async (test, err = undefined, customFinished=false, eventType = "TestRunFinished") => {
    try {
      if(test.body && test.body.match(/browserstack internal helper hook/)) return;
      let failureArgs = [];
      if(test.state === STATE_FAILED || eventType.match(/HookRun/)) {
        if(test.err !== undefined) {
          failureArgs = test.err.multiple ? [test.err.multiple, 'test'] : [test.err, 'err'];
        } else if(err !== undefined) {
          failureArgs = [err, 'err'];
        } else {
          failureArgs = [];
        }
      }

      const failureReason = test.err !== undefined ? test.err.toString() : err !== undefined ? err.toString() : undefined;
      if(eventType == 'TestRunFinished' && failureReason && this.currentTestCucumberSteps.length) {
        this.currentTestCucumberSteps[this.currentTestCucumberSteps.length - 1] = {
          ...this.currentTestCucumberSteps[this.currentTestCucumberSteps.length - 1],
          result: 'failed'
        }
      }

      let rootParentFile;
      try {
        rootParentFile = this.getRootParentFile(test)
      } catch(e) {
        rootParentFile = null;
      }
      let gitConfigPath = process.env.OBSERVABILITY_GIT_CONFIG_PATH ? process.env.OBSERVABILITY_GIT_CONFIG_PATH.toString() : (rootParentFile ? findGitConfig(rootParentFile) : null);
      if(!isBrowserstackInfra()) gitConfigPath = process.env.OBSERVABILITY_GIT_CONFIG_PATH_LOCAL ? process.env.OBSERVABILITY_GIT_CONFIG_PATH_LOCAL.toString() : null;
      const prefixedTestPath = rootParentFile ? this._paths.prefixTestPath(rootParentFile) : 'File path could not be found';
      
      const fileSeparator = getFileSeparatorData();
      
      let testData = {
        'framework': 'Cypress',
        'uuid': (eventType.includes("Test") ? test.testAnalyticsId : test.hookAnalyticsId) || uuidv4(),
        'name': test.title,
        'body': {
          'lang': 'javascript',
          'code': test.body
        },
        'scope': this.scope(test),
        'scopes': this.scopes(test),
        'identifier': test.fullTitle(),
        'file_name': prefixedTestPath.replaceAll("\\", "/"),
        'vc_filepath': !isBrowserstackInfra() ? ( gitConfigPath ? path.relative(gitConfigPath, rootParentFile) : null ) : ( gitConfigPath ? ((gitConfigPath == 'DEFAULT' ? '' : gitConfigPath) + fileSeparator + rootParentFile).replaceAll("\\", "/") : null ),
        'location': prefixedTestPath.replaceAll("\\", "/"),
        'result': eventType === "TestRunSkipped" ? 'skipped' : ( eventType === "TestRunStarted" ? 'pending' : this.analyticsResult(test, eventType, err) ),
        'failure_reason': failureReason,
        'duration_in_ms': test.duration || (eventType.match(/Finished/) || eventType.match(/Skipped/) ? Date.now() - (new Date(test.started_at)).getTime() : null),
        'started_at': ( ( (eventType.match(/TestRun/) ? test.test_started_at : test.hook_started_at) || test.started_at ) || (new Date()).toISOString() ),
        'finished_at': eventType.match(/Finished/) || eventType.match(/Skipped/) ? (new Date()).toISOString() : null,
        'failure': failureData(...failureArgs),
        'failure_type': !failureReason ? null : failureReason.match(/AssertionError/) ? 'AssertionError' : 'UnhandledError',
        'retry_of': test.retryOf,
        'meta': {
          steps: []
        }
      };

      if(eventType.match(/TestRunFinished/) || eventType.match(/TestRunSkipped/)) {
        testData['meta'].steps = JSON.parse(JSON.stringify(this.currentTestCucumberSteps));
        this.currentTestCucumberSteps = [];
      }

      const { os, os_version } = await getOSDetailsFromSystem(process.env.observability_product);
      if(process.env.observability_integration) {
        testData = {...testData, integrations: {
          [process.env.observability_integration || 'local_grid' ]: {
            'build_id': process.env.observability_build_id,
            'session_id': process.env.observability_automate_session_id + btoa(prefixedTestPath.replaceAll("\\", "/")),
            'capabilities': {},
            'product': process.env.observability_product,
            'platform': process.env.observability_os || os,
            'platform_version': process.env.observability_os_version || os_version,
            'browser': process.env.observability_browser,
            'browser_version': process.env.observability_browser_version
          }
        }};
      } else if(this.platformDetailsMap[process.pid] && this.platformDetailsMap[process.pid][test.title]) {
        const {browser, platform} = this.platformDetailsMap[process.pid][test.title];
        testData = {...testData, integrations: {
          'local_grid': {
            'capabilities': {},
            'platform': os,
            'platform_version': os_version,
            'browser': browser.name,
            'browser_version': browser.majorVersion
          }
        }};
        if(eventType === "TestRunFinished" || eventType === "TestRunSkipped") {
          delete this.platformDetailsMap[process.pid][test.title];
        }
      }

      if (eventType === "TestRunSkipped" && !testData['started_at']) {
        testData['started_at'] = testData['finished_at'];
      }

      try {
        if(eventType.match(/HookRun/)) {
          [testData.hook_type, testData.name] = getHookDetails(test.fullTitle() || test.originalTitle || test.title);
          if(eventType === "HookRunFinished") {
            if(testData.result === 'pending') testData.result = 'passed';
            if(testData.hook_type == 'before each' && testData.result === 'failed' && ( !this.runStatusMarkedHash[test.ctx.currentTest.testAnalyticsId] )) {
              if(test.ctx.currentTest.testAnalyticsId) this.runStatusMarkedHash[test.ctx.currentTest.testAnalyticsId] = true;
              test.ctx.currentTest.state = STATE_FAILED;
              await this.sendTestRunEvent(test.ctx.currentTest,undefined,true);
            }
          }
          if(testData.hook_type.includes('each')) {
            testData['test_run_id'] = testData['test_run_id'] || test.testAnalyticsId;
          } else if(testData.hook_type.includes('after')) {
            testData['test_run_id'] = this.lastTest ? this.lastTest.testAnalyticsId : testData['test_run_id'];
          }
        } else if(eventType.match(/TestRun/)) {
          mapTestHooks(test);
        }
      } catch(e) {
        debug(`Exception in processing hook data for event ${eventType} with error : ${e}`, true, e);
      }

      const failure_data = testData['failure'][0];
      if (failure_data) {
        testData['failure_backtrace'] = failure_data['backtrace']
        testData['failure_reason_expanded'] = failure_data['expanded']
      }

      if(["TestRunFinished","TestRunSkipped"].includes(eventType)) {
        testData.hooks = getHooksForTest(test);
      }

      let uploadData = {
        event_type: eventType === "TestRunSkipped" ? "TestRunFinished" : eventType,
      }

      if(eventType == "HookRunFinished") delete testData.started_at;
      
      if(eventType.match(/HookRun/)) {
        testData['hook_type'] = HOOK_TYPES_MAP[testData['hook_type']];
        uploadData['hook_run'] = testData;
      } else {
        uploadData['test_run'] = testData;
      }
      
      if(eventType == 'HookRunFinished' && testData['hook_type'] == 'BEFORE_ALL') {
        uploadData.cypressSteps = JSON.parse(JSON.stringify(this.currentTestSteps));
        this.beforeHooks.push(uploadData);
        this.currentTestSteps = [];
      } else {
        await uploadEventData(uploadData);

        if(eventType.match(/Finished/)) {
          await this.uploadTestSteps();
        }

        if(eventType.match(/TestRun/)) {
          this.beforeHooks.forEach(async(hookUploadObj) => {
            const currentTestSteps = hookUploadObj.cypressSteps;
            delete hookUploadObj.cypressSteps;
            hookUploadObj['hook_run']['test_run_id'] = test.testAnalyticsId;
            await uploadEventData(hookUploadObj);
            await this.uploadTestSteps(false, currentTestSteps);
          });
          this.beforeHooks = [];
        }
      }

      if(!this.haveSentBuildUpdate && (process.env.observability_framework_version || this.currentCypressVersion)) {
        this.shouldSendBuildUpdate = true;
        const buildUpdateData = {
          event_type: 'BuildUpdate',
          'misc': {
            observability_version: {
              frameworkName: "Cypress",
              sdkVersion: process.env.OBSERVABILITY_LAUNCH_SDK_VERSION,
              frameworkVersion: ( process.env.observability_framework_version || this.currentCypressVersion )
            }
          }
        };
        await uploadEventData(buildUpdateData);
      }

      // Add started hooks to the hash
      if(eventType === 'HookRunStarted' && ['BEFORE_EACH', 'AFTER_EACH', 'BEFORE_ALL'].includes(testData['hook_type'])) {
        this.hooksStarted[testData.uuid] = uploadData;
      }

      // Send pending hook finsihed events for hook starts
      if (eventType === 'TestRunFinished' || eventType === 'TestRunSkipped') {
        Object.values(this.hooksStarted).forEach(async hookData => {
          hookData['event_type'] = 'HookRunFinished';
          hookData['hook_run'] = {
            ...hookData['hook_run'],
            result: uploadData['test_run'].result,
            failure: uploadData['test_run'].failure,
            failure_type: uploadData['test_run'].failure_type,
            failure_reason: uploadData['test_run'].failure_reason,
            failure_reason_expanded: uploadData['test_run'].failure_reason_expanded,
            failure_backtrace: uploadData['test_run'].failure_backtrace

          }

          if (hookData['hook_run']['hook_type'] === 'BEFORE_ALL') {
            hookData['hook_run'].finished_at = uploadData['test_run'].finished_at;
            hookData['hook_run'].duration_in_ms = new Date(hookData['hook_run'].finished_at).getTime() - new Date(hookData['hook_run'].started_at).getTime();
          } else {
            hookData['hook_run'].finished_at = hookData['hook_run'].started_at;
            hookData['hook_run'].duration_in_ms = 0;
          }
          await uploadEventData(hookData);
        })
        this.hooksStarted = {};
      }
    } catch(error) {
      debug(`Exception in populating test data for event ${eventType} with error : ${error}`, true, error);
    }
  }

  appendTestItemLog = async (log) => {
    try {
      if(this.current_hook && ( this.current_hook.hookAnalyticsId && !this.runStatusMarkedHash[this.current_hook.hookAnalyticsId] )) {
        log.hook_run_uuid = this.current_hook.hookAnalyticsId;
      }
      if(!log.hook_run_uuid && this.current_test && ( this.current_test.testAnalyticsId && !this.runStatusMarkedHash[this.current_test.testAnalyticsId] )) log.test_run_uuid = this.current_test.testAnalyticsId;
      if(log.hook_run_uuid || log.test_run_uuid) {
        await uploadEventData({
          event_type: 'LogCreated',
          logs: [log]
        });
      }
    } catch(error) {
      debug(`Exception in uploading log data to Observability with error : ${error}`, true, error);
    }
  }

  cypressConfigListener = async (config) => {
  }

  cypressCucumberStepListener = async ({log}) => {
    if(log.name == 'step' && log.consoleProps && log.consoleProps.step && log.consoleProps.step.keyword) {
      this.currentTestCucumberSteps = [
        ...this.currentTestCucumberSteps,
        {
          id: log.chainerId,
          keyword: log.consoleProps.step.keyword,
          text: log.consoleProps.step.text,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          duration: 0,
          result: 'passed'
        }
      ];
    } else if(log.name == 'then' && log.type == 'child' && log.chainerId) {
      this.currentTestCucumberSteps.forEach((gherkinStep, idx) => {
        if(gherkinStep.id == log.chainerId) {
          this.currentTestCucumberSteps[idx] = {
            ...gherkinStep,
            finished_at: new Date().toISOString(),
            duration: Date.now() - (new Date(gherkinStep.started_at)).getTime(),
            result: log.state,
            failure: log.err?.stack || log.err?.message,
            failure_reason: log.err?.stack || log.err?.message,
            failure_type: log.err?.name ||  'UnhandledError'
          }
        }
      })
    }
  }

  cypressLogListener = async ({level, message, file}) => {
    this.appendTestItemLog({
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      kind: 'TEST_LOG',
      http_response: {}
    });
  }

  cypressScreenshotListener = async ({logMessage, screenshotInfo}) => {
    if(screenshotInfo.path) {
      const screenshotAsBase64 = fs.readFileSync(screenshotInfo.path, {encoding: 'base64'});
      if(screenshotAsBase64) {
        this.appendTestItemLog({
          timestamp: screenshotInfo.takenAt || new Date().toISOString(),
          message: screenshotAsBase64,
          kind: 'TEST_SCREENSHOT'
        });
      }
    }
  }

  cypressPlatformDetailsListener = async({testTitle, browser, platform, cypressVersion}) => {
    if(!process.env.observability_integration) {
      this.platformDetailsMap[process.pid] = this.platformDetailsMap[process.pid] || {};
      if(testTitle) this.platformDetailsMap[process.pid][testTitle] = { browser, platform };
    }
    this.currentCypressVersion = cypressVersion;
  }

  getFormattedArgs = (args) => {
    if(!args) return '';
    let res = '';
    args.forEach((val) => {
      res = res + (res.length ? ', ' : '') + JSON.stringify(val);
    });
    return res;
  }

  cypressCommandListener = async ({type, command}) => {
    if(!command || command?.attributes?.name == 'then') return;

    if(type == 'COMMAND_RETRY') {
      command.id = command._log.chainerId;
    }

    if(type == 'COMMAND_START') {
      let isCommandPresent = null;
      for(let idx=0; idx<this.currentTestSteps.length; idx++) {
        if(this.currentTestSteps[idx].id == command.attributes.id) {
          isCommandPresent = idx;
          break;
        }
      }
      /* COMMAND_END reported before COMMAND_START */
      if(isCommandPresent) {
        return;
      }
      
      const currentStepObj = {
        id: command.attributes.id,
        text: 'cy.' + command.attributes.name + '(' + this.getFormattedArgs(command.attributes.args) + ')',
        started_at: new Date().toISOString(),
        finished_at: null,
        duration: null,
        result: 'pending',
        test_run_uuid: this.current_test?.testAnalyticsId && !this.runStatusMarkedHash[this.current_test.testAnalyticsId] ? this.current_test.testAnalyticsId : null,
        hook_run_uuid : this.current_hook?.hookAnalyticsId && !this.runStatusMarkedHash[this.current_hook.hookAnalyticsId] ? this.current_hook.hookAnalyticsId : null
      };
      if(currentStepObj.hook_run_uuid && currentStepObj.test_run_uuid) delete currentStepObj.test_run_uuid;
      this.currentTestSteps = [
        ...this.currentTestSteps,
        currentStepObj
      ];
    } else if(type == 'COMMAND_END') {
      let stepUpdated = false;
      this.currentTestSteps.forEach((val, idx) => {
        if(val.id == command.attributes.id) {
          this.currentTestSteps[idx] = {
            ...val,
            finished_at: new Date().toISOString(),
            duration: Date.now() - (new Date(val.started_at)).getTime(),
            result: command.state
          };
          stepUpdated = true;
        }
      });

      if(!stepUpdated) {
        /* COMMAND_END reported before COMMAND_START */
        const currentStepObj = {
          id: command.attributes.id,
          text: 'cy.' + command.attributes.name + '(' + this.getFormattedArgs(command.attributes.args) + ')',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          duration: 0,
          result: command.state,
          test_run_uuid: this.current_test?.testAnalyticsId && !this.runStatusMarkedHash[this.current_test.testAnalyticsId] ? this.current_test.testAnalyticsId : null,
          hook_run_uuid : this.current_hook?.hookAnalyticsId && !this.runStatusMarkedHash[this.current_hook.hookAnalyticsId] ? this.current_hook.hookAnalyticsId : null
        };
        if(currentStepObj.hook_run_uuid && currentStepObj.test_run_uuid) delete currentStepObj.test_run_uuid;
        this.currentTestSteps = [
          ...this.currentTestSteps,
          currentStepObj
        ];
      }
    } else if(type == 'COMMAND_RETRY') {
      if(!command.id) return;
      
      let isRetryStepFound = false;
      /* Parse steps array in reverse and update the last step with common chainerId */
      for(let idx=this.currentTestSteps.length-1; idx>=0; idx--) {
        const val = this.currentTestSteps[idx];
        if(val.id.includes(command.id)) {
          this.currentTestSteps[idx] = {
            ...val,
            failure: command?.error?.message,
            failure_reason: command?.error?.message,
            failure_type: command?.error?.isDefaultAssertionErr ? 'AssertionError' : 'UnhandledError',
            finished_at: new Date().toISOString(),
            duration: Date.now() - (new Date(val.started_at)).getTime(),
            result: command?.error?.message ? 'failed' : 'pending'
          };
          isRetryStepFound = true;
          break;
        }
      }

      /* As a backup, parse steps array in reverse and update the last step with pending status */
      if(!isRetryStepFound) {
        for(let idx=this.currentTestSteps.length-1; idx>=0; idx--) {
          const val = this.currentTestSteps[idx];
          if(val.state == 'pending') {
            this.currentTestSteps[idx] = {
              ...val,
              failure: command?.error?.message,
              failure_reason: command?.error?.message,
              failure_type: command?.error?.isDefaultAssertionErr ? 'AssertionError' : 'UnhandledError',
              finished_at: new Date().toISOString(),
              duration: Date.now() - (new Date(val.started_at)).getTime(),
              result: command?.error?.message ? 'failed' : 'pending'
            };
            isRetryStepFound = true;
            break;
          }
        } 
      }
    }
  }

  analyticsResult(test, eventType, err) {
    if(eventType.match(/HookRun/)) {
      if(test.isFailed() || test.err || err) {
        return 'failed';
      } else if(eventType == 'HookRunFinished') {
        return 'passed';
      } else {
        return 'pending';
      }
    } else {
      return {
        [STATE_PASSED]: 'passed',
        [STATE_PENDING]: 'pending',
        [STATE_FAILED]: 'failed',
      }[test.state]
    }
  }

  scope(test) {
    const titlePath = test.titlePath()
    // titlePath returns an array of the scope + the test title.
    // as the test title is the last array item, we just remove it
    // and then join the rest of the array as a space separated string
    return titlePath.slice(0, titlePath.length - 1).join(' ')
  }

  scopes(test) {
    const titlePath = test.titlePath()
    return titlePath.slice(0, titlePath.length - 1)
  }

  // Recursively find the root parent, and return the parents file
  // This is required as test.file can be undefined in some tests on cypress
  getRootParentFile(test) {
    if (test.file) {
      return test.file
    }
    if(test.ctx) {
      const ctxRes = (test.ctx.currentTest ? this.getRootParentFile(test.ctx.currentTest) : null);
      if(ctxRes) return ctxRes;
    }
    if (test.parent) {
      const parentRes = this.getRootParentFile(test.parent) || (test.parent.ctx && test.parent.ctx.currentTest ? this.getRootParentFile(test.parent.ctx.currentTest) : null);
      if(parentRes) return parentRes;

      if(test.parent.suites && test.parent.suites.length > 0) {
        test.parent.suites.forEach(suite => {
          const suiteRes = suite.ctx ? this.getRootParentFile(suite.ctx) : null;
          if(suiteRes) return suiteRes;
        });
      }
    }
    
    return null
  }
}

module.exports = MyReporter;
