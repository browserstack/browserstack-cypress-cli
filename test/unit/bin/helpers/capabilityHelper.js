const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised");

const capabilityHelper = require("../../../../bin/helpers/capabilityHelper"),
  Constants = require("../../../../bin/helpers/constants"),
  logger = require("../../../../bin/helpers/logger").winstonLogger;

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("capabilityHelper.js", () => {

  describe("caps", () => {
    it("handle missing auth params", () => {
      let zip_url = "bs://<random_id>";
      let incorrectBsConfig = {};
      return capabilityHelper
        .caps(incorrectBsConfig, { zip_url: zip_url })
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(error, Constants.validationMessages.INCORRECT_AUTH_PARAMS);
        });
    });

    it("handle missing browsers", () => {
      let zip_url = "bs://<random_id>";
      let incorrectBsConfig = {
        auth: {
          username: "random",
          access_key: "random",
        }
      };
      return capabilityHelper
        .caps(incorrectBsConfig, { zip_url: zip_url })
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(error, Constants.validationMessages.EMPTY_BROWSER_LIST);
        });
    });

    it("handle empty test_suite", () => {
      let zip_url = undefined;
      let incorrectBsConfig = {
        auth: {
          username: "random",
          access_key: "random",
        },
        browsers: [
          {
            browser: "chrome",
            os: "Windows 10",
            versions: ["78", "77"],
          },
        ],
      };
      return capabilityHelper
        .caps(incorrectBsConfig, { zip_url: zip_url })
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(error, "Test suite is empty");
        });
    });

    it("handle local set to true", () => {
      let zip_url = "bs://<random>";
      let bsConfig = {
        auth: {
          username: "random",
          access_key: "random",
        },
        browsers: [
          {
            browser: "chrome",
            os: "Windows 10",
            versions: ["78", "77"],
          },
        ],
        connection_settings: {
          local: true
        }
      };
      return capabilityHelper
        .caps(bsConfig, { zip_url: zip_url })
        .then(function (data) {
          chai.assert.equal(JSON.parse(data).local, true);
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("handle local set to false", () => {
      let zip_url = "bs://<random>";
      let bsConfig = {
        auth: {
          username: "random",
          access_key: "random",
        },
        browsers: [
          {
            browser: "chrome",
            os: "Windows 10",
            versions: ["78", "77"],
          },
        ],
        connection_settings: {
          local: false,
        },
      };
      return capabilityHelper
        .caps(bsConfig, { zip_url: zip_url })
        .then(function (data) {
          chai.assert.equal(JSON.parse(data).local, false);
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("handle local_identifier set", () => {
      let zip_url = "bs://<random>";
      let bsConfig = {
        auth: {
          username: "random",
          access_key: "random",
        },
        browsers: [
          {
            browser: "chrome",
            os: "Windows 10",
            versions: ["78", "77"],
          },
        ],
        connection_settings: {
          local: true,
          local_identifier: "abc"
        },
      };
      return capabilityHelper
        .caps(bsConfig, { zip_url: zip_url })
        .then(function (data) {
          let parsed_data = JSON.parse(data);
          chai.assert.equal(parsed_data.local, true);
          chai.assert.equal(parsed_data.localIdentifier, "abc");
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("handle local_identifier not set", () => {
      let zip_url = "bs://<random>";
      let bsConfig = {
        auth: {
          username: "random",
          access_key: "random",
        },
        browsers: [
          {
            browser: "chrome",
            os: "Windows 10",
            versions: ["78", "77"],
          },
        ],
        connection_settings: {
          local: true,
        },
      };
      return capabilityHelper
        .caps(bsConfig, { zip_url: zip_url })
        .then(function (data) {
          let parsed_data = JSON.parse(data);
          chai.assert.equal(parsed_data.local, true);
          chai.assert.equal(parsed_data.localIdentifier, null);
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("handle default vars for run_settings", () => {
      let zip_url = "bs://<random>";
      let bsConfig = {
        auth: {
          username: "random",
          access_key: "random",
        },
        browsers: [
          {
            browser: "chrome",
            os: "Windows 10",
            versions: ["78", "77"],
          },
        ],
      };
      return capabilityHelper
        .caps(bsConfig, { zip_url: zip_url })
        .then(function (data) {
          let parsed_data = JSON.parse(data);
          chai.assert.equal(parsed_data.project, "project-name");
          chai.assert.equal(parsed_data.customBuildName, "build-name");
          chai.assert.equal(parsed_data.callbackURL, null);
          chai.assert.equal(parsed_data.callbackURL, null);
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("handle run_settings", () => {
      let zip_url = "bs://<random>";
      let bsConfig = {
        auth: {
          username: "random",
          access_key: "random",
        },
        browsers: [
          {
            browser: "chrome",
            os: "Windows 10",
            versions: ["78", "77"],
          },
        ],
        run_settings: {
          project_name: "sample project",
          build_name: "sample build",
          callback_url: "random url",
          project_notify_URL: "random url",
        },
      };
      return capabilityHelper
        .caps(bsConfig, { zip_url: zip_url })
        .then(function (data) {
          let parsed_data = JSON.parse(data);
          chai.assert.equal(parsed_data.project, "sample project");
          chai.assert.equal(parsed_data.customBuildName, "sample build");
          chai.assert.equal(parsed_data.callbackURL, "random url");
          chai.assert.equal(parsed_data.callbackURL, "random url");
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
        });
    });
  });

  describe("validate", () => {
    it("validate bsConfig", () => {
      let bsConfig = undefined;
      return capabilityHelper
        .validate(bsConfig)
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(error, Constants.validationMessages.EMPTY_BROWSERSTACK_JSON);
        });
    });

    it("validate bsConfig.auth", () => {
      bsConfig = {};
      return capabilityHelper
        .validate(bsConfig)
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(
            error,
            Constants.validationMessages.INCORRECT_AUTH_PARAMS
          );
        });
    });

    it("validate bsConfig.browsers", () => {
      let bsConfig = {
        auth: {},
        browsers: [],
      };
      return capabilityHelper
        .validate(bsConfig)
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(
            error,
            Constants.validationMessages.EMPTY_BROWSER_LIST
          );
        });
    });

    it("validate bsConfig.run_settings", () => {
      let bsConfig = {
        auth: {},
        browsers: [
          {
            browser: "chrome",
            os: "Windows 10",
            versions: ["78", "77"],
          },
        ],
      };
      return capabilityHelper
        .validate(bsConfig)
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(
            error,
            Constants.validationMessages.EMPTY_RUN_SETTINGS
          );
        });
    });

    it("validate bsConfig.run_settings.cypress_proj_dir", () => {
      let bsConfig = {
        auth: {},
        browsers: [
          {
            browser: "chrome",
            os: "Windows 10",
            versions: ["78", "77"],
          },
        ],
        run_settings: {},
      };

      return capabilityHelper
        .validate(bsConfig)
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(
            error,
            Constants.validationMessages.EMPTY_SPEC_FILES
          );
        });
    });

    it("resolve with proper message", () => {
      let bsConfig = {
        auth: {},
        browsers: [
          {
            browser: "chrome",
            os: "Windows 10",
            versions: ["78", "77"],
          },
        ],
        run_settings: {
          cypress_proj_dir: "random path"
        },
      };
      capabilityHelper
        .validate(bsConfig)
        .then(function (data) {
          chai.assert.equal(data, Constants.validationMessages.VALIDATED);
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
        });
    });
  });
});
