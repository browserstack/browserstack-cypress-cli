const { expect } = require("chai");
const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require('sinon'),
  rewire = require('rewire');

const logger = require("../../../../bin/helpers/logger").winstonLogger;

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe('unzipFile', () => {
  let unzipFile;
  let decompressStub;
  let createReadStreamStub;
  let unzipperStub;
  let loggerStub;
  let pathJoinStub;
  let Constants;

  const filePath = '/some/path';
  const fileName = 'file.zip';

  beforeEach(() => {
    const unzipFileModule = rewire('../../../../bin/helpers/buildArtifacts');

    decompressStub = sinon.stub();
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
    unzipFileModule.__set__('decompress', decompressStub);
    unzipFileModule.__set__('fs.createReadStream', createReadStreamStub);
    unzipFileModule.__set__('unzipper', unzipperStub);
    unzipFileModule.__set__('logger', loggerStub);
    unzipFileModule.__set__('path.join', pathJoinStub);
    unzipFileModule.__set__('Constants', Constants);

    unzipFile = unzipFileModule.__get__('unzipFile');
  });

  it('should successfully unzip using decompress', async () => {
    decompressStub.resolves();

    await unzipFile(filePath, fileName);

    expect(decompressStub.calledWith(`${filePath}/${fileName}`, filePath)).to.be.true;
  });

});
