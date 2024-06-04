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
});