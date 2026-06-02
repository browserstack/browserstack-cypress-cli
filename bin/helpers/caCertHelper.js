'use strict';

/*
 * SDK-5953: trust a customer-provided CA certificate for SSL-inspecting corporate
 * proxies (Zscaler, Netskope, Forcepoint).
 *
 * Resolution order for the cert path:
 *   1. env BROWSERSTACK_EXTRA_CA_CERTS   (consistency with the other SDKs)
 *   2. browserstack.json connection_settings.proxyCaCertificate
 *   3. browserstack.json top-level proxyCaCertificate
 *
 * The CLI makes outbound HTTPS via axios across many files (some through an
 * HttpsProxyAgent when a proxy is set, some direct). Rather than patch every
 * axios call, we patch `tls.createSecureContext` once and `addCACert` the
 * customer cert — this MERGES it with Node's default roots (never replaces them,
 * so non-intercepted endpoints still validate) and is honored by every TLS
 * connection (axios default agent AND the HttpsProxyAgent tunnel). We also export
 * NODE_EXTRA_CA_CERTS so any child Node processes trust the same cert.
 *
 * Never throws — a misconfigured cert must not break the customer's run.
 */

const tls = require('tls');
const fs = require('fs');
const logger = require('./logger').winstonLogger;

let _patched = false;

function _log(level, msg) {
  try { if (logger && typeof logger[level] === 'function') { logger[level](msg); } } catch (e) { /* ignore */ }
}

function resolveCaCertPath(bsConfig) {
  let p = process.env.BROWSERSTACK_EXTRA_CA_CERTS;
  const cs = (bsConfig && bsConfig.connection_settings) || {};
  if ((!p || !p.trim()) && cs.proxyCaCertificate) { p = cs.proxyCaCertificate; }
  if ((!p || !p.trim()) && bsConfig && bsConfig.proxyCaCertificate) { p = bsConfig.proxyCaCertificate; }
  if (!p || !String(p).trim()) { return null; }
  p = String(p).trim();
  try {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) { return p; }
    _log('warn', `proxyCaCertificate: path does not exist or is not a file, falling back to system trust store: ${p}`);
  } catch (e) {
    _log('warn', `proxyCaCertificate: failed to stat cert path ${p}: ${e.message}`);
  }
  return null;
}

function setupCaCertificate(bsConfig) {
  if (_patched) { return; }
  try {
    const certPath = resolveCaCertPath(bsConfig);
    if (!certPath) { return; }
    const caPem = fs.readFileSync(certPath, 'utf8');

    const originalCreateSecureContext = tls.createSecureContext;
    tls.createSecureContext = function (options = {}) {
      const context = originalCreateSecureContext(options);
      try { context.context.addCACert(caPem); } catch (e) { /* best-effort merge */ }
      return context;
    };

    if (!process.env.NODE_EXTRA_CA_CERTS) {
      process.env.NODE_EXTRA_CA_CERTS = certPath;
    }

    _patched = true;
    _log('info', `proxyCaCertificate: trusting custom CA from ${certPath} (merged with system roots).`);
  } catch (e) {
    _log('warn', `proxyCaCertificate: setup failed, falling back to system trust store: ${e.message}`);
  }
}

module.exports = { resolveCaCertPath, setupCaCertificate };
