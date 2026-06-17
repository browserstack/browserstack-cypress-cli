'use strict';
const path = require('path');

const chai = require('chai'),
  expect = chai.expect,
  fs = require('fs');


const helper = require('../../../../bin/helpers/helper');
const logger = require('../../../../bin/helpers/logger').winstonLogger
logger.transports['console.info'].silent = true;

describe('helper', () => {
  describe('checkAndTruncateVCSInfo', () => {
    it("when commit_message is less than 64 KB", () => {
      let gitMetaData = {
        'commit_message': "This string is less than 64 KB"
      };
      expect(helper.checkAndTruncateVCSInfo(gitMetaData).commit_message).to.eq('This string is less than 64 KB');
    });

    it("when commit_message is null", () => {
      let gitMetaData = {
        'commit_message': null
      };
      expect(helper.checkAndTruncateVCSInfo(gitMetaData).commit_message).to.be.null;
    });

    it("when commit_message is greater than 64 KB", () => {
      const filePath = path.join(__dirname, '../../../test_files/large_commit_message.txt');
      const commitMessage = fs.readFileSync(filePath, 'utf8');

      let gitMetaData = {
        'commit_message': commitMessage
      };

      const truncatedVCSInfo = helper.checkAndTruncateVCSInfo(gitMetaData)
      expect(helper.getSizeOfJsonObjectInBytes(truncatedVCSInfo)).to.be.lessThanOrEqual(64 * 1024);
    });
  });

  describe('getBuildDetails', () => {
    let originalBuildNameEnv, originalProjectNameEnv;

    beforeEach(() => {
      originalBuildNameEnv = process.env.BROWSERSTACK_BUILD_NAME;
      originalProjectNameEnv = process.env.BROWSERSTACK_PROJECT_NAME;
      delete process.env.BROWSERSTACK_BUILD_NAME;
      delete process.env.BROWSERSTACK_PROJECT_NAME;
    });

    afterEach(() => {
      if (originalBuildNameEnv === undefined) delete process.env.BROWSERSTACK_BUILD_NAME;
      else process.env.BROWSERSTACK_BUILD_NAME = originalBuildNameEnv;
      if (originalProjectNameEnv === undefined) delete process.env.BROWSERSTACK_PROJECT_NAME;
      else process.env.BROWSERSTACK_PROJECT_NAME = originalProjectNameEnv;
    });

    // SDK-6431: explicit build_name from config must win over CI-derived
    // BROWSERSTACK_BUILD_NAME so the new dashboard (TestHub) matches Automate.
    it('prefers run_settings.build_name over BROWSERSTACK_BUILD_NAME env var', () => {
      process.env.BROWSERSTACK_BUILD_NAME = 'Bamboo-42#10';
      const bsConfig = { run_settings: { build_name: 'sanity' }, testObservabilityOptions: {} };
      expect(helper.getBuildDetails(bsConfig, true).buildName).to.eq('sanity');
    });

    it('prefers testObservabilityOptions.buildName over the env var', () => {
      process.env.BROWSERSTACK_BUILD_NAME = 'Bamboo-42#10';
      const bsConfig = { run_settings: { build_name: 'sanity' }, testObservabilityOptions: { buildName: 'obs-build' } };
      expect(helper.getBuildDetails(bsConfig, true).buildName).to.eq('obs-build');
    });

    it('falls back to BROWSERSTACK_BUILD_NAME env var when no build_name is configured', () => {
      process.env.BROWSERSTACK_BUILD_NAME = 'ci-build-99';
      const bsConfig = { run_settings: {}, testObservabilityOptions: {} };
      expect(helper.getBuildDetails(bsConfig, true).buildName).to.eq('ci-build-99');
    });

    it('prefers run_settings.project_name over BROWSERSTACK_PROJECT_NAME env var', () => {
      process.env.BROWSERSTACK_PROJECT_NAME = 'ci-project';
      const bsConfig = { run_settings: { project_name: 'my-project' }, testObservabilityOptions: {} };
      expect(helper.getBuildDetails(bsConfig, true).projectName).to.eq('my-project');
    });
  });
});
