const { getEnvironmentUrl } = require('../helpers/environmentUrl');

// BROWSERSTACK_ENV=preprod|staging (internal only) swaps the host; production when unset.
exports.API_URL = getEnvironmentUrl('https://accessibility.browserstack.com/api');
