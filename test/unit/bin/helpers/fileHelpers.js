const chai = require('chai'),
  sinon = require('sinon'),
  expect = chai.expect,
  assert = chai.assert,
  chaiAsPromised = require('chai-as-promised'),
  fs = require('fs-extra'),
  fileHelpers = require('../../../../bin/helpers/fileHelpers');

const logger = require("../../../../bin/helpers/logger").winstonLogger,
  proxyquire = require("proxyquire").noCallThru();

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("fileHelpers", () => {
  var sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
  });

  it("callback fn is executed after file write", () => {
    let dataMock = 0;

    let callbackStub = sandbox.stub().callsFake(() => {
      dataMock = 1;
    });
    let writeFileStub = sandbox.stub().callsFake(() => {
      callbackStub();
    });

    const fileHelpers = proxyquire("../../../../bin/helpers/fileHelpers", {
      "fs-extra": {
        writeFile: writeFileStub,
      },
    });

    fileHelpers.write("./random_path", "writing successful", {}, callbackStub);
    sinon.assert.calledOnce(writeFileStub);
    expect(dataMock).to.eql(1);
  });

  it("callback fn is executed after file write", () => {
    let dataMock = 0;

    let callbackStub = sandbox.stub().callsFake(() => {
      dataMock = 1;
    });

    const fileExtraStub = sinon.stub(fs,'writeFile');
    fileExtraStub.yields(true);
    fileHelpers.write({path: "./random_path", file: "random"}, "writing successful", {}, callbackStub);
    
    sinon.assert.calledOnce(callbackStub);
    sinon.assert.calledOnce(fileExtraStub);
    expect(dataMock).to.eql(1);
  });

  it("callback fn is executed after fileExists returns error", () => {
    let dataMock = undefined;

    let callbackStub = sandbox.stub().callsFake((val) => {
      dataMock = val;
    });
    let accessStub = sandbox.stub().yields(new Error("random error"));

    const fileHelpers = proxyquire("../../../../bin/helpers/fileHelpers", {
      "fs-extra": {
        access: accessStub,
      },
    });

    fileHelpers.fileExists("./random_path", callbackStub);
    sinon.assert.calledOnce(accessStub);
    expect(dataMock).to.eql(false);
  });

  it("callback fn is executed after fileExists returns true", () => {
    let dataMock = undefined;

    let callbackStub = sandbox.stub().callsFake((val) => {
      dataMock = val;
    });
    let accessStub = sandbox.stub().yields();

    const fileHelpers = proxyquire("../../../../bin/helpers/fileHelpers", {
      "fs-extra": {
        access: accessStub,
      },
    });

    fileHelpers.fileExists("./random_path", callbackStub);
    sinon.assert.calledOnce(accessStub);
    expect(dataMock).to.eql(true);
  });

  it("deleteZip returns 0 on success", () => {
    let unlinkStub = sinon.stub(fs, 'unlinkSync').returns(true);

    let result = fileHelpers.deleteZip();
    sinon.assert.calledOnce(unlinkStub);
    assert.equal(result, 0);
    fs.unlinkSync.restore();
  });

  it("deleteZip returns 1 on failure", () => {
    let unlinkStub = sinon.stub(fs, 'unlinkSync').yields(new Error("random-error"));
    let result = fileHelpers.deleteZip();
    sinon.assert.calledOnce(unlinkStub);
    assert.equal(result, 1);
    fs.unlinkSync.restore();
  });
});
