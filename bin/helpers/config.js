var config = require('./config.json');
const { isAllowedBrowserstackUrl } = require('./securityValidation');

config.env = process.env.BSTACK_CYPRESS_NODE_ENV || "production";

// Only honour an env-var URL override if it points at a BrowserStack
// (prod/staging) host or localhost. Without this allowlist an attacker who can
// set CI env vars (BSTACK_CYPRESS_NODE_ENV + RAILS_HOST/UPLOAD_URL/...) could
// redirect all API calls — including Basic Auth credentials and the tests.zip
// upload — to their own server (APS-19010). Invalid overrides fall back to the
// production defaults from config.json.
const applyUrlOverride = (envValue, currentValue, label) => {
  if (envValue === undefined || envValue === null || envValue === "") {
    return currentValue;
  }
  if (isAllowedBrowserstackUrl(envValue)) {
    return envValue;
  }
  // eslint-disable-next-line no-console
  console.warn(`Ignoring ${label} override "${envValue}": only *.browserstack.com, *.bsstag.com or localhost URLs are allowed.`);
  return currentValue;
};

if(config.env !== "production") {
  // load config based on env
  require('custom-env').env(config.env);

  config.uploadUrl = applyUrlOverride(process.env.UPLOAD_URL, config.uploadUrl, "UPLOAD_URL");
  config.rails_host = applyUrlOverride(process.env.RAILS_HOST, config.rails_host, "RAILS_HOST");
  config.dashboardUrl = applyUrlOverride(process.env.DASHBOARD_URL, config.dashboardUrl, "DASHBOARD_URL");
  config.usageReportingUrl = applyUrlOverride(process.env.USAGE_REPORTING_URL, config.usageReportingUrl, "USAGE_REPORTING_URL");
}

config.cypress_v1 = `${config.rails_host}/automate/cypress/v1`;
config.cypress_v2 = `${config.rails_host}/automate/cypress/v2`;
config.buildUrl = `${config.cypress_v1}/builds/`;
config.buildUrlV2 = `${config.cypress_v2}/builds/`;
config.buildStopUrl = `${config.cypress_v1}/builds/stop/`;
config.checkMd5sum = `${config.cypress_v1}/md5sumcheck/`;
config.getInitialDetails = `${config.cypress_v1}/get_initial_details/`;
config.fileName = "tests.zip";
config.packageFileName = "bstackPackages.tar.gz";
config.packageDirName = "tmpBstackPackages";
config.retries = 5;
config.networkErrorExitCode = 2;
config.compiledConfigJsDirName = 'tmpBstackCompiledJs';
config.configJsonFileName = 'tmpCypressConfig.json';
// Temp file used to surface, from the child process that requires the cypress
// config, whether the BrowserStack accessibility plugin was loaded by it.
config.accessibilityPluginFlagFileName = 'tmpA11yPluginLoaded.json';

// turboScale
config.turboScaleMd5Sum = `${config.turboScaleUrl}/md5sumcheck`;
config.turboScaleBuildsUrl = `${config.turboScaleUrl}/builds`;

module.exports = config;
