'use strict';

const path = require('path');

/**
 * Security validation helpers shared across the CLI.
 *
 * These guard the "untrusted edges" of the CLI:
 *  - override/response URLs that could redirect API traffic or uploads
 *    (APS-19010, APS-19011)
 *  - config-file paths that could escape the project directory (APS-19008)
 *
 * Kept dependency-free (stdlib only) so the logic can be unit tested without
 * pulling in the CLI's network/config stack.
 */

// Hosts the CLI is allowed to talk to for API / upload endpoints. Covers
// production, staging (bsstag.com) and local development. Anything else is
// treated as attacker-controlled and rejected.
const ALLOWED_HOST_SUFFIXES = ['.browserstack.com', '.bsstag.com'];
const ALLOWED_EXACT_HOSTS = ['browserstack.com', 'bsstag.com', 'localhost', '127.0.0.1', '::1'];

/**
 * Returns true if the given URL points at a BrowserStack (prod/staging) host or
 * localhost. Only http/https are accepted. Any parse failure returns false
 * (fail-closed).
 * @param {string} urlString
 * @returns {boolean}
 */
function isAllowedBrowserstackUrl(urlString) {
  if (typeof urlString !== 'string' || urlString.trim() === '') {
    return false;
  }
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch (e) {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (ALLOWED_EXACT_HOSTS.includes(host)) {
    return true;
  }
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

/**
 * Resolves a candidate path and asserts it stays inside baseDir. Used to stop
 * config-file path traversal (e.g. --config-file ../../outside/browserstack.json).
 * @param {string} candidatePath
 * @param {string} baseDir defaults to process.cwd()
 * @returns {boolean}
 */
function isPathInsideBase(candidatePath, baseDir) {
  if (typeof candidatePath !== 'string' || candidatePath === '') {
    return false;
  }
  const base = path.resolve(baseDir || process.cwd());
  const resolved = path.resolve(base, candidatePath);
  // Must be the base itself or a descendant (base + separator prefix).
  return resolved === base || resolved.startsWith(base + path.sep);
}

/**
 * Structural (NOT cryptographic) validation of a JWT: three non-empty
 * base64url segments. The CLI is not the token issuer and has no key to verify
 * the signature, so this only rejects obviously-malformed / MITM-swapped
 * garbage tokens. Defence-in-depth, not an integrity guarantee.
 * @param {string} token
 * @returns {boolean}
 */
function isWellFormedJwt(token) {
  if (typeof token !== 'string') {
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  return parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p));
}

module.exports = {
  isAllowedBrowserstackUrl,
  isPathInsideBase,
  isWellFormedJwt,
  ALLOWED_HOST_SUFFIXES,
  ALLOWED_EXACT_HOSTS,
};
