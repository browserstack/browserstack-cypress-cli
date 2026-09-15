var config = require('./config.json');

config.env = process.env.BSTACK_CYPRESS_NODE_ENV || "production";

if(config.env !== "production") {
  // load config based on env
  require('custom-env').env(config.env);

  config.uploadUrl = process.env.UPLOAD_URL;
  config.rails_host = process.env.RAILS_HOST;
  config.dashboardUrl = process.env.DASHBOARD_URL;
  config.usageReportingUrl = process.env.USAGE_REPORTING_URL;
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
