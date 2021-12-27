'use strict';
const cp = require("child_process"),
  os = require("os"),
  request = require("requestretry"),
  fs = require('fs'),
  path = require('path');

const config = require('./config'),
  fileLogger = require('./logger').fileLogger,
  utils = require('./utils');
  
const { AUTH_REGEX, REDACTED_AUTH } = require("./constants");

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

  if (bsConfig && bsConfig.run_settings && bsConfig.run_settings.cypressProjectDir) {
    let version = get_version(path.join(bsConfig.run_settings.cypressProjectDir, 'node_modules', '.bin', 'cypress'));
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

  if (bsConfig && bsConfig.run_settings && bsConfig.run_settings.cypressProjectDir) {
    let _path = path.join(bsConfig.run_settings.cypressProjectDir, 'node_modules', 'browserstack-cypress');
    let version = get_version(_path);
    if (!version) {
      version = get_version('browserstack-cypress');

      if (!version) {
        // return path = null if version is null
        return {
          version: null,
          path: null
        };
      }
      return {
        version: version,
        path: npm_global_path(),
      };
    }
    return {
      version: version,
      path: _path,
    };
  } else {
    let version = get_version('browserstack-cypress');

    if (!version) {
      // return path = null if version is null
      return {
        version: null,
        path: null,
      };
    }
    return {
      version: version,
      path: npm_global_path(),
    };
  }
}

function ci_environment() {
  var env = process.env;
  // Jenkins
  if ((typeof env.JENKINS_URL === "string" && env.JENKINS_URL.length > 0) || (typeof env.JENKINS_HOME === "string" && env.JENKINS_HOME.length > 0)) {
    return "Jenkins";
  }
  // CircleCI
  if (env.CI === "true" && env.CIRCLECI === "true") {
    return "CircleCI";
  }
  // Travis CI
  if (env.CI === "true" && env.TRAVIS === "true") {
    return "Travis CI";
  }
  // Codeship
  if (env.CI === "true" && env.CI_NAME === "codeship") {
    return "Codeship";
  }
  // Bitbucket
  if (env.BITBUCKET_BRANCH && env.BITBUCKET_COMMIT) {
    return "Bitbucket";
  }
  // Drone
  if (env.CI === "true" && env.DRONE === "true") {
    return "Drone";
  }
  // Semaphore
  if (env.CI === "true" && env.SEMAPHORE === "true") {
    return "Semaphore";
  }
  // GitLab
  if (env.CI === "true" && env.GITLAB_CI === "true") {
    return "GitLab";
  }
  // Buildkite
  if (env.CI === "true" && env.BUILDKITE === "true") {
    return "Buildkite";
  }
  // Visual Studio Team Services
  if (env.TF_BUILD === "True") {
    return "Visual Studio Team Services";
  }
  // if no matches, return null
  return null;
}

function isUsageReportingEnabled() {
  return process.env.DISABLE_USAGE_REPORTING;
}

function send(args) {
  if (isUsageReportingEnabled() === "true") return;

  let bsConfig = JSON.parse(JSON.stringify(args.bstack_config));
  let runSettings = "";
  let sanitizedbsConfig = "";
  let cli_details = cli_version_and_path(bsConfig);
  let data = utils.isUndefined(args.data) ? {} : args.data;

  if (bsConfig && bsConfig.run_settings) {
    runSettings = bsConfig.run_settings;
    data.cypress_version = bsConfig.run_settings.cypress_version;
  }

  sanitizedbsConfig = `${(typeof bsConfig === 'string') ? bsConfig : 
  JSON.stringify(bsConfig)}`.replace(AUTH_REGEX, REDACTED_AUTH);

  delete args.bstack_config;

  let zipUploadDetails = {
    test_suite_zip_upload: data.test_suite_zip_upload,
    package_zip_upload: data.package_zip_upload,
    test_suite_zip_size: data.test_suite_zip_size,
    test_suite_zip_upload_avg_speed: data.test_suite_zip_upload_avg_speed,
    npm_package_zip_size: data.npm_package_zip_size,
    npm_package_zip_upload_avg_speed: data.npm_package_zip_upload_avg_speed,
  }

  Object.keys(zipUploadDetails).forEach((key) => {
    delete data[key];
  })

  const payload = {
    event_type: "cypress_cli_stats",
    data: {
      build_hashed_id: data.build_id,
      user_id: data.user_id,
      parallels: data.parallels,
      bstack_json: sanitizedbsConfig,
      run_settings: runSettings,
      os: _os(),
      os_version: os_version(),
      bstack_json_found_in_pwd: bstack_json_found_in_pwd(),
      cypress_json_found_in_pwd: cypress_json_found_in_pwd(),
      cli_version: cli_details.version,
      cli_path: cli_details.path,
      npm_version: npm_version(),
      local_cypress_version: local_cypress_version(bsConfig),
      ci_environment: ci_environment(),
      event_timestamp: new Date().toLocaleString(),
      data: JSON.stringify(data),
      raw_args: JSON.stringify(args.raw_args),
      ...zipUploadDetails,
      ...args,
    },
  };

  const options = {
    headers: {
      "Content-Type": "text/json",
    },
    method: "POST",
    url: config.usageReportingUrl,
    body: payload,
    json: true,
    maxAttempts: 10, // (default) try 3 times
    retryDelay: 2000, // (default) wait for 2s before trying again
    retrySrategy: request.RetryStrategies.HTTPOrNetworkError, // (default) retry on 5xx or network errors
  };

  fileLogger.info(`Sending ${JSON.stringify(payload)} to ${config.usageReportingUrl}`);
  request(options, function (error, res, body) {
    if (error) {
      //write err response to file
      fileLogger.error(JSON.stringify(error));
      return;
    }
    // write response file
    let response = {
      attempts: res.attempts,
      statusCode: res.statusCode,
      body: body
    };
    fileLogger.info(`${JSON.stringify(response)}`);
  });
}

module.exports = {
  send,
  cli_version_and_path,
};
