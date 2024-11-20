const { default: axios } = require('axios');
const chai = require('chai'),
  chaiAsPromised = require('chai-as-promised'),
  sinon = require('sinon'),
  rewire = require('rewire');

const fs = require('fs'),
      path = require('path'),
      Constants = require("../../../../bin/helpers/constants"),
      logger = require("../../../../bin/helpers/logger").winstonLogger,
      testObjects = require("../../support/fixtures/testObjects")

const utils = require('../../../../bin/helpers/utils');
const reporterHTML = require('../../../../bin/helpers/reporterHTML');
chai.use(chaiAsPromised);
logger.transports['console.info'].silent = true;

describe('reporterHTML', () => {
  let sendUsageReportStub = null,
    axiosStub = null,
    formatRequestStub = null,
    getUserAgentStub = null;

  beforeEach(() => {
    getUserAgentStub = sinon.stub(utils, 'getUserAgent');
    sendUsageReportStub = sinon.stub(utils, 'sendUsageReport');
    axiosStub = sinon.stub(axios, 'get');
    formatRequestStub = sinon.stub(utils, 'formatRequest');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getReportResponse', () => {
    it('retrieve response from report url', () => {
      axiosStub.resolves({ status: 200, data: 'abc' });
      let rewireReporterHTML = rewire('../../../../bin/helpers/reporterHTML');
      let getReportResponse = rewireReporterHTML.__get__('getReportResponse');
      let unzipFileStub = sinon.stub();
      let writerStub = sinon.stub(fs, 'createWriteStream');
      let unlinkSyncStub = sinon.stub(fs, 'unlinkSync');
      let pathStub = sinon.stub(path, 'join');
      unzipFileStub.returns(true);
      rewireReporterHTML.__set__('unzipFile', unzipFileStub);
      pathStub.returns('abc/efg');
      writerStub.returns(true);
      unlinkSyncStub.returns(true);
      getReportResponse('abc', 'efg', 'url');
      sinon.assert.calledOnce(axiosStub);
      pathStub.restore();
    });
  });

  describe('calls API to generate report', () => {
    let args = testObjects.generateReportInputArgs,
      rawArgs = testObjects.generateReportInputRawArgs;
    (buildId = 'buildId'), (bsConfig = testObjects.sampleBsConfig);

    it('is deprecated, i.e. 299, does not have build message', () => {
      axiosStub.resolves({ status: 299 });
      let message = Constants.userMessages.API_DEPRECATED;
      let messageType = Constants.messageTypes.INFO;
      let errorCode = 'api_deprecated';

      reporterHTML.reportGenerator(bsConfig, buildId, args, rawArgs, {}).then(() => {
        sinon.assert.calledOnce(axiosStub);
        sinon.assert.calledOnce(getUserAgentStub);
        sinon.assert.calledOnceWithExactly(
          sendUsageReportStub,
          bsConfig,
          args,
          message,
          messageType,
          errorCode,
          {},
          rawArgs
        );
      });
    });

    it('is deprecated, i.e. 299', () => {
      let build = {
        buildId: buildId,
        message: 'API has been deprecated',
        rows: [],
      };
      axiosStub.resolves({ status: 299, data: build });
      let message = build.message;
      let messageType = Constants.messageTypes.INFO;
      let errorCode = 'api_deprecated';

      reporterHTML.reportGenerator(bsConfig, buildId, args, rawArgs, {}).then(() => {
        sinon.assert.calledOnce(axiosStub);
        sinon.assert.calledOnce(getUserAgentStub);
        sinon.assert.calledOnceWithExactly(
          sendUsageReportStub,
          bsConfig,
          args,
          message,
          messageType,
          errorCode,
          {},
          rawArgs
        );
      });
    });

    context('non 200 response', () => {
      it('422 status, build available but running, cannot generate report', () => {
        let build = {
          message: 'The report cannot be generated as the build is running',
        };
        axiosStub.resolves({ status: 422, data: build });
        let message = build.message;
        let messageType = Constants.messageTypes.ERROR;
        let errorCode = 'api_failed_build_generate_report';

        reporterHTML.reportGenerator(bsConfig, buildId, args, rawArgs, {}).then(() => {
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            bsConfig,
            args,
            message,
            messageType,
            errorCode,
            {},
            rawArgs
          );
        });
      });

      it('400 status, build available, cannot generate report', () => {
        let build = { buildId: buildId, message: 'success', rows: [] };
        axiosStub.resolves({ status: 400, data: build });
        let message = `${Constants.userMessages.BUILD_GENERATE_REPORT_FAILED.replace(
          '<build-id>',
          buildId
        )} with error: \n${JSON.stringify(build, null, 2)}`;
        let messageType = Constants.messageTypes.ERROR;
        let errorCode = 'api_failed_build_generate_report';

        reporterHTML.reportGenerator(bsConfig, buildId, args, rawArgs, {}).then(() => {
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            bsConfig,
            args,
            message,
            messageType,
            errorCode,
            {},
            rawArgs
          );
        });
      });

      it('user is unauthorized', () => {
        let build = { buildId: buildId, message: 'Unauthorized', rows: [] };
        let body = build;
        axiosStub.resolves({ status: 401, data: body });
        let message = `${Constants.userMessages.BUILD_GENERATE_REPORT_FAILED.replace(
          '<build-id>',
          buildId
        )} with error: \n${JSON.stringify(build, null, 2)}`;
        let messageType = Constants.messageTypes.ERROR;
        let errorCode = 'api_auth_failed';

        reporterHTML.reportGenerator(bsConfig, buildId, args, rawArgs, {}).then(() => {
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            bsConfig,
            args,
            message,
            messageType,
            errorCode,
            {},
            rawArgs
          );
        });
      });

      it('400 status, build not available, cannot generate report', () => {
        axiosStub.resolves({ status: 400 });
        let message = Constants.userMessages.BUILD_GENERATE_REPORT_FAILED.replace('<build-id>', buildId);
        let messageType = Constants.messageTypes.ERROR;
        let errorCode = 'api_failed_build_generate_report';

        reporterHTML.reportGenerator(bsConfig, buildId, args, rawArgs, {}).then(() => {
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(getUserAgentStub);
          sinon.assert.calledOnceWithExactly(
            sendUsageReportStub,
            bsConfig,
            args,
            message,
            messageType,
            errorCode,
            {},
            rawArgs
          );
        });
      });
    });

    it('200 response code', () => {
      let build = { buildId: buildId, message: 'success', rows: [] };
      axiosStub.resolves({ status: 200, data: 'abc' });
      let message = `Report for build: ${buildId} was successfully created.`;
      let messageType = Constants.messageTypes.SUCCESS;
      let errorCode = null;
      let rewireReporterHTML = rewire('../../../../bin/helpers/reporterHTML');
      let generateCypressBuildReportStub = sinon.stub();
      generateCypressBuildReportStub.returns(true);
      rewireReporterHTML.__set__('generateCypressBuildReport', generateCypressBuildReportStub);

      reporterHTML.reportGenerator(bsConfig, buildId, args, rawArgs, {});

      sinon.assert.calledOnce(axiosStub);
      sinon.assert.calledOnce(getUserAgentStub);
      sendUsageReportStub.calledOnceWithExactly(bsConfig, args, message, messageType, errorCode, {}, rawArgs);
    });
  });
});

describe("unzipFile", () => {
  var sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
  });

  it("calls unzip and resolves with success message", () => {
    let pathStub = sinon.stub(path, 'join');
    pathStub.calledOnceWith('abc','efg.txt');
    let decompressStub = sandbox.stub().returns(Promise.resolve("Unzipped the json and html successfully."));
    let rewireReporterHTML = rewire('../../../../bin/helpers/reporterHTML');
    rewireReporterHTML.__set__('decompress', decompressStub);
    let unzipFile = rewireReporterHTML.__get__('unzipFile')
    unzipFile('abc', 'efg');
  });

  it("calls unzip and rejects with error message on failure", () => {
    let pathStub = sinon.stub(path, 'join');
    pathStub.calledOnceWith('abc','efg.txt');
    let processStub = sinon.stub(process, 'exit');
    processStub.returns(Constants.ERROR_EXIT_CODE)
    let decompressStub = sandbox.stub().returns(Promise.reject("Error"));
    let rewireReporterHTML = rewire('../../../../bin/helpers/reporterHTML');
    rewireReporterHTML.__set__('decompress', decompressStub);
    let unzipFile = rewireReporterHTML.__get__('unzipFile')
    unzipFile('abc', 'efg');
  });
});

describe("generateCypressBuildReport", () => {
  var sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
  });

  it("calls cypress build report with report download url", () => {
    let pathStub = sinon.stub(path, 'join');
    let fileExistStub = sinon.stub(fs, 'existsSync');
    let rewireReporterHTML = rewire('../../../../bin/helpers/reporterHTML');
    let generateCypressBuildReport = rewireReporterHTML.__get__('generateCypressBuildReport')
    let getReportResponseStub = sinon.stub();
    getReportResponseStub.calledOnceWith('abc/efg', 'report.zip', 'url');
    rewireReporterHTML.__set__('getReportResponse', getReportResponseStub);
    pathStub.returns("abc/efg");
    fileExistStub.returns(true);
    generateCypressBuildReport({report_data: 'url'})
  });
});
