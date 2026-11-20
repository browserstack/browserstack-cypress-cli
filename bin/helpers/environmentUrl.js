'use strict';

// Internal, non-production only: BROWSERSTACK_ENV=preprod|staging points the cli at that
// environment's hosts, the same switch browserstack-binary (core/utils/environment-url.js) and
// browserstack-node-agent use. Unset, or any other value, keeps the production hosts.
const ENV_VAR = 'BROWSERSTACK_ENV';

const PREPROD_HOSTS = [
  ['api-cloud.browserstack.com', 'api-cloud-preprod.bsstag.com'],
  ['api.browserstack.com', 'api-preprod.bsstag.com'],
  ['automate.browserstack.com', 'automate-preprod.bsstag.com'],
  ['automation.browserstack.com', 'automation-preprod.bsstag.com'],
  ['collector-observability.browserstack.com', 'collector-observability-preprod.bsstag.com'],
  ['accessibility.browserstack.com', 'accessibility-preprod.bsstag.com'],
  ['grid.browserstack.com', 'grid-preprod.bsstag.com'],
];

const STAGING_HOSTS = [
  ['api-cloud.browserstack.com', 'api-cloud-devtestops.bsstag.com'],
  ['api.browserstack.com', 'apidevtestops.bsstag.com'],
  ['automate.browserstack.com', 'automate-devtestops.bsstag.com'],
  ['automation.browserstack.com', 'automation.bsstag.com'],
  ['collector-observability.browserstack.com', 'collector-observability-devtestops.bsstag.com'],
  ['accessibility.browserstack.com', 'accessibility.bsstag.com'],
  ['grid.browserstack.com', 'grid-devhst.bsstag.com'],
];

const getEnvironment = () => {
  const value = (process.env[ENV_VAR] || '').trim().toLowerCase();
  if (value === 'preprod' || value === 'pre-prod') return 'preprod';
  if (value === 'staging' || value === 'stag') return 'staging';
  return undefined;
};

// Swaps the host only (exact match), so paths, ports and query strings are kept and a host that
// merely contains a mapped name (e.g. app-automate.browserstack.com) is left alone.
const getEnvironmentUrl = (url) => {
  const env = getEnvironment();
  if (!env || typeof url !== 'string') return url;
  const hosts = env === 'preprod' ? PREPROD_HOSTS : STAGING_HOSTS;
  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    return url;
  }
  const match = hosts.find(([from]) => parsed.hostname === from);
  if (!match) return url;
  parsed.hostname = match[1];
  const result = parsed.toString();
  // URL.toString() adds a trailing slash to a bare origin; keep the caller's shape.
  return url.endsWith('/') ? result : result.replace(/\/$/, '');
};

module.exports = { ENV_VAR, getEnvironment, getEnvironmentUrl };
