const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require("sinon"),
  request = require("request");

const Constants = require("../../../../bin/helpers/constants"),
  logger = require("../../../../bin/helpers/logger").winstonLogger,
  testObjects = require("../../support/fixtures/testObjects");

const proxyquire = require("proxyquire").noCallThru();

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("build", () => {
  let bsConfig = testObjects.sampleBsConfig;
  let capsData = testObjects.sampleCapsData;

  var sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    getUserAgentStub = sandbox.stub().returns("random user-agent");
    capsStub = sandbox.stub().returns(Promise.resolve(capsData));
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
  });

  it("reject with error", () => {
    let requestStub = sandbox
      .stub(request, "post")
      .yields(new Error("random error"), null, null);

    const build = proxyquire("../../../../bin/helpers/build", {
      "../helpers/utils": {
        getUserAgent: getUserAgentStub,
      },
      "../helpers/capabilityHelper": {
        caps: capsStub,
      },
      request: { post: requestStub },
    });

    return build.createBuild(bsConfig, "random_zip_file")
      .then(function (data) {
        chai.assert.fail("Promise error");
      })
      .catch((error) => {
        sinon.assert.calledOnce(requestStub);
        sinon.assert.calledOnce(getUserAgentStub);
        chai.assert.equal(error.message, "random error");
      });
  });

  describe("handle API deprecated", () => {
    it("build is null", () => {
      let requestStub = sandbox
        .stub(request, "post")
        .yields(null, { statusCode: 299 }, null);

      const build = proxyquire("../../../../bin/helpers/build", {
        "../helpers/utils": {
          getUserAgent: getUserAgentStub,
        },
        "../helpers/capabilityHelper": {
          caps: capsStub,
        },
        request: { post: requestStub },
      });

      return build
        .createBuild(bsConfig, "random_zip_file")
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(requestStub);
          sinon.assert.calledOnce(getUserAgentStub);
          chai.assert.equal(error, Constants.userMessages.API_DEPRECATED);
        });
    });

    it("build is not null", () => {
      let build_message = "random message";
      let requestStub = sandbox
        .stub(request, "post")
        .yields(null, { statusCode: 299 }, JSON.stringify({ message: build_message }));

      const build = proxyquire("../../../../bin/helpers/build", {
        "../helpers/utils": {
          getUserAgent: getUserAgentStub,
        },
        "../helpers/capabilityHelper": {
          caps: capsStub,
        },
        request: { post: requestStub },
      });

      return build
        .createBuild(bsConfig, "random_zip_file")
        .then(function (data) {
          sinon.assert.calledOnce(requestStub);
          sinon.assert.calledOnce(getUserAgentStub);
          chai.assert.equal(data, "random message");
        })
        .catch((error) => {
          chai.assert.isNotOk(error, "Promise error");
        });
    });
  });

  describe("handle statusCode != 201", () => {
    it("build is null", () => {
      let requestStub = sandbox
        .stub(request, "post")
        .yields(null, { statusCode: 400 }, null);

      const build = proxyquire("../../../../bin/helpers/build", {
        "../helpers/utils": {
          getUserAgent: getUserAgentStub,
        },
        "../helpers/capabilityHelper": {
          caps: capsStub,
        },
        request: { post: requestStub },
      });

      return build
        .createBuild(bsConfig, "random_zip_file")
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(requestStub);
          sinon.assert.calledOnce(getUserAgentStub);
          chai.assert.equal(error, Constants.userMessages.BUILD_FAILED);
        });
    });

    it("build is not null", () => {
      let build_message = "random message";
      let requestStub = sandbox
        .stub(request, "post")
        .yields(
          null,
          { statusCode: 401 },
          JSON.stringify({ message: build_message })
        );

      const build = proxyquire("../../../../bin/helpers/build", {
        "../helpers/utils": {
          getUserAgent: getUserAgentStub,
        },
        "../helpers/capabilityHelper": {
          caps: capsStub,
        },
        request: { post: requestStub },
      });

      return build
        .createBuild(bsConfig, "random_zip_file")
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(requestStub);
          sinon.assert.calledOnce(getUserAgentStub);
          chai.assert.equal(error, `${Constants.userMessages.BUILD_FAILED} Error: ${build_message}`);
        });
    });
  });

  it("build created successfuly", () => {
    let build_id = "random build id";
    let build_message = "success"
    let requestStub = sandbox
      .stub(request, "post")
      .yields(
        null,
        { statusCode: 201 },
        JSON.stringify({ message: build_message, build_id: build_id })
      );

    const build = proxyquire("../../../../bin/helpers/build", {
      "../helpers/utils": {
        getUserAgent: getUserAgentStub,
      },
      "../helpers/capabilityHelper": {
        caps: capsStub,
      },
      request: { post: requestStub },
    });

    return build
      .createBuild(bsConfig, "random_zip_file")
      .then(function (data) {
        sinon.assert.calledOnce(requestStub);
        sinon.assert.calledOnce(getUserAgentStub);
        chai.assert.equal(data, `${build_message}! ${Constants.userMessages.BUILD_CREATED} with build id: ${build_id}`);
      })
      .catch((error) => {
        chai.assert.isNotOk(error, "Promise error");
      });
  });
});
