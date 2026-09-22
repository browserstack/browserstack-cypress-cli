const { expect } = require("chai");
const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require('sinon'),
  rewire = require('rewire');

const logger = require("../../../../bin/helpers/logger").winstonLogger;

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe.skip('unzipFile', () => {
  let unzipFile;
  let AdmZipStub;
  let extractAllToAsyncStub;
  let createReadStreamStub;
  let unzipperStub;
  let loggerStub;
  let pathJoinStub;
  let Constants;

  const filePath = '/some/path';
  const fileName = 'file.zip';

  beforeEach(() => {
    const unzipFileModule = rewire('../../../../bin/helpers/buildArtifacts');

    extractAllToAsyncStub = sinon.stub().resolves();
    AdmZipStub = sinon.stub().returns({ extractAllToAsync: extractAllToAsyncStub });
    createReadStreamStub = sinon.stub();
    unzipperStub = {
      Extract: sinon.stub(),
    };
    loggerStub = { debug: sinon.stub() };
    pathJoinStub = sinon.stub().returns(`${filePath}/${fileName}`);

    Constants = {
      userMessages: {
        BUILD_ARTIFACTS_UNZIP_FAILURE: 'Unzip failed',
      },
    };

    // Injecting the dependencies
    unzipFileModule.__set__('AdmZip', AdmZipStub);
    unzipFileModule.__set__('fs.createReadStream', createReadStreamStub);
    unzipFileModule.__set__('unzipper', unzipperStub);
    unzipFileModule.__set__('logger', loggerStub);
    unzipFileModule.__set__('path.join', pathJoinStub);
    unzipFileModule.__set__('Constants', Constants);

    unzipFile = unzipFileModule.__get__('unzipFile');
  });

  it('should successfully unzip using adm-zip', async () => {
    await unzipFile(filePath, fileName);

    expect(AdmZipStub.calledWith(`${filePath}/${fileName}`)).to.be.true;
    expect(extractAllToAsyncStub.calledWith(filePath, true)).to.be.true;
  });

});
