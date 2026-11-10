'use strict';
const path = require('path');
const { expect } = require('chai');

const {
  isAllowedBrowserstackUrl,
  isPathInsideBase,
  isWellFormedJwt,
} = require('../../../../bin/helpers/securityValidation');

describe('securityValidation', () => {
  describe('isAllowedBrowserstackUrl', () => {
    it('accepts BrowserStack production and staging hosts', () => {
      expect(isAllowedBrowserstackUrl('https://api.browserstack.com')).to.be.true;
      expect(isAllowedBrowserstackUrl('https://api-cloud.browserstack.com/automate-frameworks/cypress/upload')).to.be.true;
      expect(isAllowedBrowserstackUrl('https://staging.bsstag.com')).to.be.true;
      expect(isAllowedBrowserstackUrl('https://browserstack.com')).to.be.true;
    });

    it('accepts localhost for local development', () => {
      expect(isAllowedBrowserstackUrl('http://localhost:3000')).to.be.true;
      expect(isAllowedBrowserstackUrl('http://127.0.0.1:8080')).to.be.true;
    });

    it('rejects arbitrary attacker hosts', () => {
      expect(isAllowedBrowserstackUrl('https://attacker.example')).to.be.false;
      expect(isAllowedBrowserstackUrl('https://evil.com')).to.be.false;
    });

    it('rejects look-alike / suffix-spoofing hosts', () => {
      // Not a real subdomain of browserstack.com — endsWith check uses a
      // leading dot so this must be rejected.
      expect(isAllowedBrowserstackUrl('https://browserstack.com.attacker.net')).to.be.false;
      expect(isAllowedBrowserstackUrl('https://notbrowserstack.com')).to.be.false;
      expect(isAllowedBrowserstackUrl('https://evilbrowserstack.com')).to.be.false;
    });

    it('rejects non-http(s) schemes and malformed input', () => {
      expect(isAllowedBrowserstackUrl('file:///etc/passwd')).to.be.false;
      expect(isAllowedBrowserstackUrl('ftp://api.browserstack.com')).to.be.false;
      expect(isAllowedBrowserstackUrl('not a url')).to.be.false;
      expect(isAllowedBrowserstackUrl('')).to.be.false;
      expect(isAllowedBrowserstackUrl(undefined)).to.be.false;
      expect(isAllowedBrowserstackUrl(null)).to.be.false;
    });
  });

  describe('isPathInsideBase', () => {
    const base = path.resolve('/tmp/project');

    it('accepts paths inside the base directory', () => {
      expect(isPathInsideBase('browserstack.json', base)).to.be.true;
      expect(isPathInsideBase('sub/dir/browserstack.json', base)).to.be.true;
      expect(isPathInsideBase(path.join(base, 'browserstack.json'), base)).to.be.true;
    });

    it('accepts the base directory itself', () => {
      expect(isPathInsideBase(base, base)).to.be.true;
    });

    it('rejects path traversal outside the base directory', () => {
      expect(isPathInsideBase('../../etc/passwd', base)).to.be.false;
      expect(isPathInsideBase('../outside/browserstack.json', base)).to.be.false;
      expect(isPathInsideBase('/etc/passwd', base)).to.be.false;
    });

    it('rejects a sibling directory that shares a name prefix', () => {
      // /tmp/project-evil must not be treated as inside /tmp/project.
      expect(isPathInsideBase('/tmp/project-evil/x.json', base)).to.be.false;
    });

    it('rejects empty / non-string input', () => {
      expect(isPathInsideBase('', base)).to.be.false;
      expect(isPathInsideBase(undefined, base)).to.be.false;
    });
  });

  describe('isWellFormedJwt', () => {
    it('accepts a structurally valid three-part token', () => {
      expect(isWellFormedJwt('aaa.bbb.ccc')).to.be.true;
      expect(isWellFormedJwt('eyJhbGci.eyJzdWIi.SflKxwRJ-abc_123')).to.be.true;
    });

    it('rejects tokens without exactly three parts', () => {
      expect(isWellFormedJwt('aaa.bbb')).to.be.false;
      expect(isWellFormedJwt('aaa.bbb.ccc.ddd')).to.be.false;
      expect(isWellFormedJwt('notajwt')).to.be.false;
    });

    it('rejects tokens with empty or invalid segments', () => {
      expect(isWellFormedJwt('aaa..ccc')).to.be.false;
      expect(isWellFormedJwt('aaa.b b.ccc')).to.be.false;
      expect(isWellFormedJwt('')).to.be.false;
      expect(isWellFormedJwt(undefined)).to.be.false;
    });
  });
});
