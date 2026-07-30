'use strict';
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const fs = require('fs');
const os = require('os');
const path = require('path');

const o11yHelper = require('../../../../bin/testObservability/helper/helper');
const baseHelper = require('../../../../bin/helpers/helper');

// Regression guard for SDK-7121: the TRA support-file injection MUST land
// synchronously. runs.js calls setEventListeners(bsConfig) and then proceeds
// immediately to md5 hashing + zip archiving. When the injection was deferred to
// an async glob callback, it raced the archive — a lost race shipped an
// un-instrumented suite, and md5 caching made it sticky, so the new Automate
// dashboard (TRA) received zero test events.
describe('testObservability setEventListeners', () => {
  let tmpDir, cwdStub, getSupportFilesStub;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk7121-'));
    fs.mkdirSync(path.join(tmpDir, 'cypress', 'support'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'cypress', 'support', 'e2e.js'), '// user original support file\n');

    cwdStub = sinon.stub(process, 'cwd').returns(tmpDir);
    getSupportFilesStub = sinon.stub(baseHelper, 'getSupportFiles').returns({
      supportFile: '/cypress/support/e2e.js',
      cleanupParams: {}
    });
  });

  afterEach(() => {
    cwdStub.restore();
    getSupportFilesStub.restore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('injects the observability require synchronously before returning', () => {
    o11yHelper.setEventListeners({ run_settings: {} });

    // Read exactly as md5/archive would — synchronously, right after the call.
    const content = fs.readFileSync(path.join(tmpDir, 'cypress', 'support', 'e2e.js'), 'utf-8');
    expect(content).to.include("browserstack-cypress-cli/bin/testObservability/cypress");
  });
});
