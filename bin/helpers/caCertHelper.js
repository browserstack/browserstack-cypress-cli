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

// Convert a DER (binary) certificate Buffer to a PEM string (base64, 64-char lines).
function derToPem(der) {
  const b64 = der.toString('base64').replace(/(.{64})/g, '$1\n');
  return `-----BEGIN CERTIFICATE-----\n${b64}${b64.endsWith('\n') ? '' : '\n'}-----END CERTIFICATE-----\n`;
}

// Read a customer CA Buffer into an array of PEM cert strings, supporting BOTH PEM
// (single or multi-cert bundle) and DER (binary) — any extension (.pem/.crt/.cer/.der).
function loadCaCertsAsPem(buf) {
  if (buf.includes('-----BEGIN CERTIFICATE-----')) {
    return buf.toString('utf8').match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [];
  }
  return [derToPem(buf)]; // DER (binary) single cert
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
    const buf = fs.readFileSync(certPath);
    const isPem = buf.includes('-----BEGIN CERTIFICATE-----');
    const pemCerts = loadCaCertsAsPem(buf);
    if (!pemCerts.length) {
      _log('warn', `proxyCaCertificate: no certificate found in ${certPath}; falling back to system trust store.`);
      return;
    }

    const originalCreateSecureContext = tls.createSecureContext;
    tls.createSecureContext = function (options = {}) {
      const context = originalCreateSecureContext(options);
      // addCACert one cert at a time so multi-cert bundles are all trusted.
      for (const pem of pemCerts) {
        try { context.context.addCACert(pem); } catch (e) { /* best-effort merge */ }
      }
      return context;
    };

    // NODE_EXTRA_CA_CERTS must be a PEM file for child Node processes: reuse the
    // customer's path when it's already PEM, else write a PEM-converted copy (Node
    // can't load a raw DER file through that var).
    if (!process.env.NODE_EXTRA_CA_CERTS) {
      let nodeExtra = certPath;
      if (!isPem) {
        const os = require('os');
        const path = require('path');
        // Fresh owner-only temp dir (random name) + 0600 + O_EXCL/O_NOFOLLOW: a predictable
        // path in a world-writable tmpdir would let a local attacker pre-plant or symlink-race
        // the file the process is about to TRUST as a CA.
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browserstack_sdk_ca_'));
        nodeExtra = path.join(tmpDir, 'ca.pem');
        const fd = fs.openSync(nodeExtra, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW || 0), 0o600);
        try {
          fs.writeFileSync(fd, pemCerts.join(''));
        } finally {
          fs.closeSync(fd);
        }
      }
      process.env.NODE_EXTRA_CA_CERTS = nodeExtra;
    }

    _patched = true;
    _log('info', `proxyCaCertificate: trusting custom CA from ${certPath} (merged with system roots).`);
  } catch (e) {
    _log('warn', `proxyCaCertificate: setup failed, falling back to system trust store: ${e.message}`);
  }
}

module.exports = { resolveCaCertPath, setupCaCertificate, loadCaCertsAsPem, derToPem };
