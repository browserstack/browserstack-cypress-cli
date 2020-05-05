'use strict';
const cp = require('child_process'),
  os = require('os'),
  request = require('request'),
  fs = require('fs'),
  path = require('path');

const config = require('./config'),
  fileLogger = require('./logger').fileLogger;

function get_version(package_name) {
  try {
    let options = { stdio: 'pipe' };
    return cp.execSync(`${package_name} --version`, options).toString().trim();
  } catch (err) {
    return null;
  }
}

function npm_version() {
  return get_version('npm');
}

function _os() {
  return os.platform();
}

function os_version() {
  return os.release();
}

function local_cypress_version(bsConfig) {
  // 1. check version of Cypress installed in local project
  // 2. check version of Cypress installed globally if not present in project

  if (bsConfig) {
    let version = get_version(path.join(bsConfig.run_settings.cypress_proj_dir, 'node_modules', '.bin', 'cypress'));
    if (!version) {
      version = get_version('cypress');
    }
    return version;
  } else {
    return get_version('cypress');
  }
}

function bstack_json_found_in_pwd() {
  try {
    if (fs.existsSync(path.join(process.cwd(), 'browserstack.json'))) {
      //file exists
      return true;
    }
    else {
      return false;
    }
  } catch (err) {
    return null;
  }
}

function cypress_json_found_in_pwd() {
  try {
    if (fs.existsSync(path.join(process.cwd(), 'cypress.json'))) {
      //file exists
      return true;
    }
    else {
      return false;
    }
  } catch (err) {
    return null;
  }
}

function npm_global_path() {
  return cp.execSync('npm root -g', { stdio: 'pipe' }).toString().trim();
}

function cli_version_and_path(bsConfig) {
  // 1. check version of Cypress installed in local project
  // 2. check version of Cypress installed globally if not present in project

  if (bsConfig) {
    let _path = path.join(bsConfig.run_settings.cypress_proj_dir, 'node_modules', 'browserstack-cypress-cli');
    let version = get_version(_path);
    if (!version) {
      version = get_version('browserstack-cypress-cli');

      if (!version) {
        // return path = null if version is null
        return [null, null];
      }
      _path = npm_global_path();
      return [version, _path];
    }
    return [version, _path];
  } else {
    let version = get_version('browserstack-cypress-cli');

    if (!version) {
      // return path = null if version is null
      return [null, null];
    }
    return [version, npm_global_path()];
  }
}

function isUsageReportingEnabled() {
  return process.env.DISABLE_USAGE_REPORTING;
}

function send(args) {
  if (!isUsageReportingEnabled()) return;

  let [cli_version, cli_path] = cli_version_and_path(args.bsConfig);

  const payload = {
    api_key: config.usageReportingApiKey,
    data: {
      event_type: 'cypress_cli_instrumentation',
      os: _os(),
      os_version: os_version(),
      bstack_json_found_in_pwd: bstack_json_found_in_pwd(),
      cypress_json_found_in_pwd: cypress_json_found_in_pwd(),
      cli_version: cli_version,
      cli_path: cli_path,
      npm_version: npm_version(),
      local_cypress_version: local_cypress_version(args.bstack_config),
      timestamp: new Date().getTime(),
      ...args
    }
  };

  const options = {
    method: 'POST',
    url: config.usageReportingUrl,
    body: payload,
    json: true
  }

  fileLogger.info(`Sending ${payload} to ${config.usageReportingUrl}`);
  request(options, function (error, res, body) {
    if (error) {
      //write err response to file
      fileLogger.err(JSON.stringify(error));
      return;
    }
    // write response and body to file
    fileLogger.info(
      `statusCode: ${res.statusCode}, body: ${JSON.stringify(body)}`
    );
  });
}

module.exports = {
  send
}
