const fs = require('fs');
const path = require('path');
const request = require('request');
const http = require('http');
const https = require('https');

const logger = require("../../helpers/logger").winstonLogger;

const { API_URL, consoleHolder } = require('../helper/constants');

/* Below global methods are added here to remove cyclic dependency with helper.js, refactor later */
const httpKeepAliveAgent = new http.Agent({
  keepAlive: true,
  timeout: 60000,
  maxSockets: 2,
  maxTotalSockets: 2
});

const httpsKeepAliveAgent = new https.Agent({
  keepAlive: true,
  timeout: 60000,
  maxSockets: 2,
  maxTotalSockets: 2
});

const debug = (text) => {
  if (process.env.BROWSERSTACK_OBSERVABILITY_DEBUG === "true" || process.env.BROWSERSTACK_OBSERVABILITY_DEBUG === "1") {
    logger.info(`[ OBSERVABILITY ] ${text}`);
  }
}

let packages = {};

exports.requireModule = (module, internal = false) => {
  let local_path = "";
  if(process.env["browserStackCwd"]){
   local_path = path.join(process.env["browserStackCwd"], 'node_modules', module);
  } else if(internal) {
    local_path = path.join(process.cwd(), 'node_modules', 'browserstack-cypress-cli', 'node_modules', module);
  } else {
    local_path = path.join(process.cwd(), 'node_modules', module);
  }
  if(!fs.existsSync(local_path)) {
    let global_path;
    if(['jest-runner', 'jest-runtime'].includes(module))
      global_path = path.join(GLOBAL_MODULE_PATH, 'jest', 'node_modules', module);
    else
      global_path = path.join(GLOBAL_MODULE_PATH, module);
    if(!fs.existsSync(global_path)) {
      throw new Error(`${module} doesn't exist.`);
    }
    return require(global_path);
  }
  return require(local_path);
}

getPackageVersion = (package_) => {
  if(packages[package_]) return packages[package_];
  return packages[package_] = this.requireModule(`${package_}/package.json`).version;
}

getAgentVersion = () => {
  let _path = path.join(__dirname, '../../../package.json');
  if(fs.existsSync(_path))
    return require(_path).version;
}

class CrashReporter {
  static instance;

  constructor() {
  }

  static getInstance() {
    if (!CrashReporter.instance) {
      CrashReporter.instance = new CrashReporter();
    }
    return CrashReporter.instance;
  }

  setCredentialsForCrashReportUpload(credentialsStr) {
    /* User credentials used for reporting crashes */
    this.credentialsForCrashReportUpload = JSON.parse(credentialsStr);
  }

  setConfigDetails(credentialsStr, browserstackConfigFile, cypressConfigFile) {
    /* User test config for build run */
    this.userConfigForReporting = {
      framework: 'Cypress',
      browserstackConfigFile: browserstackConfigFile,
      cypressConfigFile: cypressConfigFile
    };
    this.setCredentialsForCrashReportUpload(credentialsStr);
  }

  uploadCrashReport(exception, stacktrace) {
    try {
      if (!this.credentialsForCrashReportUpload.username || !this.credentialsForCrashReportUpload.password) {
        return debug('[Crash_Report_Upload] Failed to parse user credentials while reporting crash')
      }
  
      const data = {
          hashed_id: process.env.BS_TESTOPS_BUILD_HASHED_ID,
          observability_version: {
              frameworkName: 'Cypress',
              frameworkVersion: getPackageVersion('cypress'),
              sdkVersion: getAgentVersion()
          },
          exception: {
              error: exception.toString(),
              stackTrace: stacktrace
          },
          config: this.userConfigForReporting
      }
  
      const options = {
        auth: {
          ...this.credentialsForCrashReportUpload
        },
        headers: {
          'Content-Type': 'application/json',
          'X-BSTACK-TESTOPS': 'true'
        },
        method: 'POST',
        url: `${API_URL}/api/v1/analytics`,
        body: data,
        json: true,
        agent: API_URL.includes('https') ? httpsKeepAliveAgent : httpKeepAliveAgent
      };
  
      request(options, function callback(error, response, body) {
        if(error) {
          debug(`[Crash_Report_Upload] Failed due to ${error}`);
        } else if(response.statusCode != 200) {
          debug(`[Crash_Report_Upload] Failed due to ${response && response.body ? response.body : `Received response from BrowserStack Server with status : ${response.statusCode}`}`);
        } else {
          debug(`[Crash_Report_Upload] Success response: ${JSON.stringify({status: response.status, body: response.body})}`)
        }
      });
    } catch(e) {
      debug(`[Crash_Report_Upload] Processing failed due to ${e && e.stack}`);
    }
  }
}

module.exports = CrashReporter;
