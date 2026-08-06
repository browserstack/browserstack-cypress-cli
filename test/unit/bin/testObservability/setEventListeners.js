'use strict';
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const fs = require('fs');
const os = require('os');
const path = require('path');

const o11yHelper = require('../../../../bin/testObservability/helper/helper');
const a11yHelper = require('../../../../bin/accessibility-automation/helper');
const baseHelper = require('../../../../bin/helpers/helper');

// Regression guard for SDK-7121: the support-file instrumentation MUST land
// synchronously. runs.js calls setEventListeners(bsConfig) and then proceeds
// immediately to md5 hashing + zip archiving. When the injection was deferred to
// an async glob callback, it raced the archive — a lost race shipped an
// un-instrumented suite, and md5 caching made it sticky, so the new Automate
// dashboard (TRA) received zero test events.
describe('SDK-7121 synchronous support-file instrumentation', () => {
  let tmpDir, supportPath, cwdStub, getSupportFilesStub;

  const setupTmpProject = () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk7121-'));
    fs.mkdirSync(path.join(tmpDir, 'cypress', 'support'), { recursive: true });
    supportPath = path.join(tmpDir, 'cypress', 'support', 'e2e.js');
    fs.writeFileSync(supportPath, '// user original support file\n');
    cwdStub = sinon.stub(process, 'cwd').returns(tmpDir);
  };

  afterEach(() => {
    if (cwdStub) cwdStub.restore();
    if (getSupportFilesStub) getSupportFilesStub.restore();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    cwdStub = getSupportFilesStub = tmpDir = undefined;
  });

  describe('testObservability setEventListeners', () => {
    beforeEach(() => {
      setupTmpProject();
      process.env.BS_TESTOPS_BUILD_COMPLETED = 'true';
      // non-magic path -> glob.sync resolves the exact file
      getSupportFilesStub = sinon.stub(baseHelper, 'getSupportFiles').returns({
        supportFile: '/cypress/support/e2e.js',
        cleanupParams: {}
      });
    });

    it('injects the observability require synchronously before returning', () => {
      o11yHelper.setEventListeners({ run_settings: {} });
      // Read exactly as md5/archive would — synchronously, right after the call.
      const content = fs.readFileSync(supportPath, 'utf-8');
      expect(content).to.include('browserstack-cypress-cli/bin/testObservability/cypress');
    });

    it('does not double-inject when called twice (idempotent)', () => {
      o11yHelper.setEventListeners({ run_settings: {} });
      o11yHelper.setEventListeners({ run_settings: {} });
      const content = fs.readFileSync(supportPath, 'utf-8');
      const occurrences = content.split('browserstack-cypress-cli/bin/testObservability/cypress').length - 1;
      expect(occurrences).to.equal(1);
    });
  });

  describe('accessibility setAccessibilityEventListeners (glob-pattern branch)', () => {
    beforeEach(() => {
      setupTmpProject();
      // magic pattern -> exercises the glob.sync branch fixed for SDK-7121
      getSupportFilesStub = sinon.stub(baseHelper, 'getSupportFiles').returns({
        supportFile: '/cypress/support/**/*.js',
        cleanupParams: {}
      });
    });

    it('injects the accessibility require synchronously before returning', () => {
      a11yHelper.setAccessibilityEventListeners({ run_settings: {} });
      const content = fs.readFileSync(supportPath, 'utf-8');
      expect(content).to.include('browserstack-cypress-cli/bin/accessibility-automation/cypress');
    });
  });
});
