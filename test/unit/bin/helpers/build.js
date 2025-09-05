const { default: axios } = require("axios");
const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require("sinon");

const Constants = require("../../../../bin/helpers/constants"),
  logger = require("../../../../bin/helpers/logger").winstonLogger,
  testObjects = require("../../support/fixtures/testObjects"),
  formatRequest = require("../../../../bin/helpers/utils").formatRequest;

const proxyquire = require("proxyquire").noCallThru();

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("build", () => {
  let bsConfig = testObjects.sampleBsConfig;
  let capsData = testObjects.sampleCapsData;

  var sandbox;
  var getUserAgentStub;
  var capsStub;

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
    let axiosStub = sandbox
      .stub(axios, "post")
      .rejects(new Error("random error"));

    const build = proxyquire("../../../../bin/helpers/build", {
      "../helpers/utils": {
        getUserAgent: getUserAgentStub,
        formatRequest,
      },
      "../helpers/capabilityHelper": {
        caps: capsStub,
      },
    });

    return build.createBuild(bsConfig, "random_zip_file")
      .then(function (data) {
        chai.assert.fail("Promise error");
      })
      .catch((error) => {
        sinon.assert.calledOnce(axiosStub);
        sinon.assert.calledOnce(getUserAgentStub);
        chai.assert.equal(error.message, "random error");
      });
  });

  describe("handle API deprecated", () => {
    it("build is null", () => {
      let axiosStub = sandbox
        .stub(axios, "post")
        .resolves({ status: 299 });

      const build = proxyquire("../../../../bin/helpers/build", {
        "../helpers/utils": {
          getUserAgent: getUserAgentStub,
          formatRequest,
        },
        "../helpers/capabilityHelper": {
          caps: capsStub,
        },
      });

      return build
        .createBuild(bsConfig, "random_zip_file")
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(getUserAgentStub);
          chai.assert.equal(error, Constants.userMessages.API_DEPRECATED);
        });
    });

    it("build is not null", () => {
      let build_message = "random message";
      let axiosStub = sandbox
        .stub(axios, "post")
        .resolves({ status: 299, data: { message: build_message} });

      const build = proxyquire("../../../../bin/helpers/build", {
        "../helpers/utils": {
          getUserAgent: getUserAgentStub,
        },
        "../helpers/capabilityHelper": {
          caps: capsStub,
        },
      });

      return build
        .createBuild(bsConfig, "random_zip_file")
        .then(function (data) {
          sinon.assert.calledOnce(axiosStub);
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
      let axiosStub = sandbox
        .stub(axios, "post")
        .resolves({ status: 400 });

      const build = proxyquire("../../../../bin/helpers/build", {
        "../helpers/utils": {
          getUserAgent: getUserAgentStub,
          formatRequest,
        },
        "../helpers/capabilityHelper": {
          caps: capsStub,
        },
      });

      return build
        .createBuild(bsConfig, "random_zip_file")
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(getUserAgentStub);
          chai.assert.equal(error, Constants.userMessages.BUILD_FAILED);
        });
    });

    it("build is not null", () => {
      let build_message = "random message";
      let axiosStub = sandbox
        .stub(axios, "post")
        .resolves(
          { status: 401, data: { message: build_message }}
        );

      const build = proxyquire("../../../../bin/helpers/build", {
        "../helpers/utils": {
          getUserAgent: getUserAgentStub,
          formatRequest,
        },
        "../helpers/capabilityHelper": {
          caps: capsStub,
        },
      });

      return build
        .createBuild(bsConfig, "random_zip_file")
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(getUserAgentStub);
          chai.assert.equal(error, `${Constants.userMessages.BUILD_FAILED} Error: ${build_message}`);
        });
    });
  });

  it("build created successfuly", () => {
    let build_id = "random build id";
    let build_message = "success"
    let axiosData = { message: build_message, build_id: build_id };
    let axiosStub = sandbox
      .stub(axios, "post")
      .resolves({ status: 201, data: axiosData });

    let dashboardUrl = "dashboard-url";

    const build = proxyquire("../../../../bin/helpers/build", {
      "../helpers/utils": {
        getUserAgent: getUserAgentStub,
        formatRequest,
      },
      "../helpers/capabilityHelper": {
        caps: capsStub,
      },
      "./config": {
        dashboardUrl: dashboardUrl,
      }, 
    });

    return build
      .createBuild(bsConfig, "random_zip_file")
      .then(function (data) {
        sinon.assert.calledOnce(axiosStub);
        sinon.assert.calledOnce(getUserAgentStub);
        chai.assert.equal(data, `${axiosData}`);
      })
      .catch((error) => {
        chai.assert.isNotOk(error, "Promise error");
      });
  });
});
