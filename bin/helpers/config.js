var config = {};
config.env = "prod";
var hosts = {
    prod: {
        uploadUrl: `https://api-cloud.browserstack.com/automate-frameworks/cypress/upload`,
        rails_host: `https://api.browserstack.com`
    }
};
config.uploadUrl = hosts[config.env].uploadUrl;
config.rails_host = hosts[config.env].rails_host;
config.cypress_v1 = `${config.rails_host}/automate/cypress/v1`;
config.buildUrl = `${config.cypress_v1}/builds/`;
config.buildStopUrl = `${config.cypress_v1}/builds/stop/`;
config.usageReportingUrl = `https://eds.browserstack.com:443/send_event_cy_internal`;
config.fileName = "tests.zip";

module.exports = config;
