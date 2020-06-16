const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require("sinon"),
  request = require("request"),
  fs = require("fs");

const Constants = require("../../../../bin/helpers/constants"),
  logger = require("../../../../bin/helpers/logger").winstonLogger,
  testObjects = require("../../support/fixtures/testObjects");

const proxyquire = require("proxyquire").noCallThru();

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("zipUpload", () => {
  let bsConfig = testObjects.sampleBsConfig;

  var sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    getUserAgentStub = sandbox.stub().returns("random user-agent");
    createReadStreamStub = sandbox.stub(fs, "createReadStream");
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
  });

  it("reject with error", () => {
    let requestStub = sandbox
      .stub(request, "post")
      .yields(new Error("random error"), null, null);

    const zipUploader = proxyquire("../../../../bin/helpers/zipUpload", {
      "./utils": {
        getUserAgent: getUserAgentStub,
      },
      request: { post: requestStub },
    });

    return zipUploader
      .zipUpload(bsConfig, "./random_file_path")
      .then(function (data) {
        chai.assert.fail("Promise error");
      })
      .catch((error) => {
        sinon.assert.calledOnce(requestStub);
        sinon.assert.calledOnce(getUserAgentStub);
        sinon.assert.calledOnce(createReadStreamStub);
        chai.assert.equal(error.message, "random error");
      });
  });

  it("reject with error (if error present in response) if statusCode != 200", () => {
    let error = "non 200 code";

    let requestStub = sandbox
      .stub(request, "post")
      .yields(null, { statusCode: 401 }, JSON.stringify({ error: error }));

    const zipUploader = proxyquire("../../../../bin/helpers/zipUpload", {
      "./utils": {
        getUserAgent: getUserAgentStub,
      },
      request: { post: requestStub },
    });

    return zipUploader
      .zipUpload(bsConfig, "./random_file_path")
      .then(function (data) {
        chai.assert.fail("Promise error");
      })
      .catch((error) => {
        sinon.assert.calledOnce(requestStub);
        sinon.assert.calledOnce(getUserAgentStub);
        sinon.assert.calledOnce(createReadStreamStub);
        chai.assert.equal(error, "non 200 code");
      });
  });

  it("reject with message if statusCode != 200 and error not in response", () => {
    let requestStub = sandbox
      .stub(request, "post")
      .yields(
        null,
        { statusCode: 401 },
        JSON.stringify({ message: "random message" })
      );

    const zipUploader = proxyquire("../../../../bin/helpers/zipUpload", {
      "./utils": {
        getUserAgent: getUserAgentStub,
      },
      request: { post: requestStub },
    });

    return zipUploader
      .zipUpload(bsConfig, "./random_file_path")
      .then(function (data) {
        chai.assert.fail("Promise error");
      })
      .catch((error) => {
        sinon.assert.calledOnce(requestStub);
        sinon.assert.calledOnce(getUserAgentStub);
        sinon.assert.calledOnce(createReadStreamStub);
        chai.assert.equal(
          error,
          Constants.userMessages.ZIP_UPLOADER_NOT_REACHABLE
        );
      });
  });

  it("resolve with message if statusCode = 200", () => {
    let zip_url = "uploaded zip url";
    let requestStub = sandbox
      .stub(request, "post")
      .yields(null, { statusCode: 200 }, JSON.stringify({ zip_url: zip_url }));

    const zipUploader = proxyquire("../../../../bin/helpers/zipUpload", {
      "./utils": {
        getUserAgent: getUserAgentStub,
      },
      request: { post: requestStub },
    });

    return zipUploader
      .zipUpload(bsConfig, "./random_file_path")
      .then(function (data) {
        sinon.assert.calledOnce(requestStub);
        sinon.assert.calledOnce(getUserAgentStub);
        sinon.assert.calledOnce(createReadStreamStub);
        chai.assert.equal(data.zip_url, zip_url);
      })
      .catch((error) => {
        chai.assert.isNotOk(error, "Promise error");
      });
  });
});
