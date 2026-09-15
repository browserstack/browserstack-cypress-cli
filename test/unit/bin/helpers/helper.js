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

  describe('getCiInfo', () => {
    const CI_VARS = ['CI', 'GITHUB_ACTIONS', 'GITHUB_SERVER_URL', 'GITHUB_REPOSITORY', 'GITHUB_RUN_ID', 'GITHUB_RUN_NUMBER', 'GITHUB_WORKFLOW', 'GITHUB_JOB', 'JENKINS_URL', 'JENKINS_HOME', 'BUILD_URL', 'JOB_NAME', 'BUILD_NUMBER'];
    let savedEnv = {};

    beforeEach(() => {
      CI_VARS.forEach((k) => {
        savedEnv[k] = process.env[k];
        delete process.env[k];
      });
    });

    afterEach(() => {
      CI_VARS.forEach((k) => {
        if (savedEnv[k] === undefined) delete process.env[k];
        else process.env[k] = savedEnv[k];
      });
      savedEnv = {};
    });

    const setGithubActionsEnv = () => {
      process.env.CI = 'true';
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_SERVER_URL = 'https://github.com';
      process.env.GITHUB_REPOSITORY = 'org/repo';
      process.env.GITHUB_RUN_ID = '27412345678';
      process.env.GITHUB_WORKFLOW = 'CI Workflow';
    };

    it('detects GitHub Actions with build_url and run-id build_number', () => {
      setGithubActionsEnv();
      const ciInfo = helper.getCiInfo();
      expect(ciInfo.name).to.eq('GitHub Actions');
      expect(ciInfo.build_url).to.eq('https://github.com/org/repo/actions/runs/27412345678');
      expect(ciInfo.build_number).to.eq('27412345678');
    });

    it('prefers GitHub Actions over leaked Jenkins env vars on self-hosted runners', () => {
      setGithubActionsEnv();
      process.env.JENKINS_HOME = '/var/lib/jenkins';
      const ciInfo = helper.getCiInfo();
      expect(ciInfo.name).to.eq('GitHub Actions');
      expect(ciInfo.build_url).to.eq('https://github.com/org/repo/actions/runs/27412345678');
    });

    it('detects Jenkins when no explicit CI marker is set', () => {
      process.env.JENKINS_URL = 'https://ci.internal/job/x';
      process.env.BUILD_URL = 'https://ci.internal/job/x/42/';
      process.env.JOB_NAME = 'x';
      process.env.BUILD_NUMBER = '42';
      const ciInfo = helper.getCiInfo();
      expect(ciInfo.name).to.eq('Jenkins');
      expect(ciInfo.build_url).to.eq('https://ci.internal/job/x/42/');
    });

    it('returns null when no CI is detected', () => {
      expect(helper.getCiInfo()).to.be.null;
    });
  });
});
