const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  fs = require('fs'),
  sinon = require('sinon');

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

    it("handle cypress version passed", () => {
      let zip_url = "bs://<random>";
      let cypress_version = "version"
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
          cypress_version: cypress_version
        },
        connection_settings: {
          local: true
        }
      };
      return capabilityHelper
        .caps(bsConfig, { zip_url: zip_url })
        .then(function (data) {
          chai.assert.equal(JSON.parse(JSON.parse(data).run_settings).cypress_version, cypress_version);
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
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
        run_settings: {
          cypress_version: "cypress_version"
        },
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

    context("specs and env from run_setting", () => {
      it("sets specs list is present", () => {
        let specsList = "spec1,spec2";
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
            specs: specsList
          },
        };

        return capabilityHelper
          .caps(bsConfig, { zip_url: zip_url })
          .then(function (data) {
            let parsed_data = JSON.parse(JSON.parse(data).run_settings);
            chai.assert.equal(parsed_data.specs, specsList);
            chai.assert.equal(parsed_data.env, undefined);
          })
          .catch((error) => {
            chai.assert.fail("Promise error");
          });
      });

      it("sets env list is present", () => {
        let envList = "env1=value1,env2=value2";
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
            env: envList
          },
        };

        return capabilityHelper
          .caps(bsConfig, { zip_url: zip_url })
          .then(function (data) {
            let parsed_data = JSON.parse(JSON.parse(data).run_settings);
            chai.assert.equal(parsed_data.env, envList);
            chai.assert.equal(parsed_data.specs, undefined);
          })
          .catch((error) => {
            chai.assert.fail("Promise error");
          });
      });

      it("sets both specs and env list is present", () => {
        let specsList = "spec1,spec2";
        let envList = "env1=value1,env2=value2";
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
            specs: specsList,
            env: envList
          },
        };

        return capabilityHelper
          .caps(bsConfig, { zip_url: zip_url })
          .then(function (data) {
            let parsed_data = JSON.parse(JSON.parse(data).run_settings);
            chai.assert.equal(parsed_data.specs, specsList);
            chai.assert.equal(parsed_data.env, envList);
          })
          .catch((error) => {
            chai.assert.fail("Promise error");
          });
      });

      it("both specs and env list is not present", () => {
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
          },
        };

        return capabilityHelper
          .caps(bsConfig, { zip_url: zip_url })
          .then(function (data) {
            let parsed_data = JSON.parse(JSON.parse(data).run_settings);
            chai.assert.equal(parsed_data.specs, undefined);
            chai.assert.equal(parsed_data.env, undefined);
          })
          .catch((error) => {
            chai.assert.fail("Promise error");
          });
      });
    });

    context("headless in run_settings", () => {
      it("sets headless if false", () => {
        let headless = false;
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
            headless: headless
          },
        };

        return capabilityHelper
          .caps(bsConfig, { zip_url: zip_url })
          .then(function (data) {
            let parsed_data = JSON.parse(JSON.parse(data).run_settings);
            chai.assert.equal(parsed_data.headless, headless);
            chai.assert.equal(parsed_data.env, undefined);
          })
          .catch((error) => {
            chai.assert.fail("Promise error");
          });
      });

      it("sets headless if string false", () => {
        let headless = "false";
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
            headless: headless
          },
        };

        return capabilityHelper
          .caps(bsConfig, { zip_url: zip_url })
          .then(function (data) {
            let parsed_data = JSON.parse(JSON.parse(data).run_settings);
            chai.assert.equal(parsed_data.headless, headless);
            chai.assert.equal(parsed_data.env, undefined);
          })
          .catch((error) => {
            chai.assert.fail("Promise error");
          });
      });

      it("does not set headless if true", () => {
        let headless = true;
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
            headless: headless
          },
        };

        return capabilityHelper
          .caps(bsConfig, { zip_url: zip_url })
          .then(function (data) {
            let parsed_data = JSON.parse(data);
            chai.assert.equal(parsed_data.headless, undefined);
            chai.assert.equal(parsed_data.env, undefined);
          })
          .catch((error) => {
            chai.assert.fail("Promise error");
          });
      });

      it("does not set headless if truthy", () => {
        let headless = "enable";
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
            headless: headless
          },
        };

        return capabilityHelper
          .caps(bsConfig, { zip_url: zip_url })
          .then(function (data) {
            let parsed_data = JSON.parse(data);
            chai.assert.equal(parsed_data.headless, undefined);
            chai.assert.equal(parsed_data.env, undefined);
          })
          .catch((error) => {
            chai.assert.fail("Promise error");
          });
      });
    });
  });

  describe("validate", () => {

    describe("validate parallels specified in bsconfig and arguments", () => {
      beforeEach(() => {
        //Stub for cypress json validation
        sinon.stub(fs, 'existsSync').returns(true);
        sinon.stub(fs, 'readFileSync').returns("{}");

        bsConfig = {
          auth: {},
          browsers: [
            {
              browser: "chrome",
              os: "Windows 10",
              versions: ["78", "77"],
            },
          ],
          run_settings: {
            cypress_proj_dir: "random path",
            cypressConfigFilePath: "random path"
          },
        };
      });

      afterEach(() => {
        fs.existsSync.restore();
        fs.readFileSync.restore();
      });

      it("validate parallels present in arguments (not a number) when specified (valid) in bsconfig run_settings", () => {
        bsConfig.run_settings.parallels = 10;
        return capabilityHelper
          .validate(bsConfig, { parallels: 'cypress' })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(error, Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);
          });
      });

      it("validate parallels present in arguments (float) when specified (valid) in bsconfig run_settings", () => {
        bsConfig.run_settings.parallels = 10;
        return capabilityHelper
          .validate(bsConfig, { parallels: '1.234' })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(error, Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);
          });
      });

      it("validate parallels present in arguments (negative value < -1) when specified (valid) in bsconfig run_settings", () => {
        bsConfig.run_settings.parallels = 10;
        return capabilityHelper
          .validate(bsConfig, { parallels: -200 })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(error, Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);
          });
      });

      it("validate parallels present in arguments (zero) when specified (valid) in bsconfig run_settings", () => {
        bsConfig.run_settings.parallels = 10;
        return capabilityHelper
          .validate(bsConfig, { parallels: 0 })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(error, Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);
          });
      });

      it("validate parallels present in arguments (not a number) when not specified in bsconfig run_settings", () => {
        return capabilityHelper
          .validate(bsConfig, { parallels: 'cypress' })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(error, Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);
          });
      });

      it("validate parallels present in arguments (float) when not specified in bsconfig run_settings", () => {
        return capabilityHelper
          .validate(bsConfig, { parallels: '1.234' })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(error, Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);
          });
      });

      it("validate parallels present in arguments (negative value < -1) when not specified in bsconfig run_settings", () => {
        return capabilityHelper
          .validate(bsConfig, { parallels: -200 })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(error, Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);
          });
      });

      it("validate parallels present in arguments (zero) when specified not in bsconfig run_settings", () => {
        return capabilityHelper
          .validate(bsConfig, { parallels: 0 })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(error, Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);
          });
      });

      it("validate parallels present in bsconfig run settings (not a number) when not specified in arguments", () => {

        bsConfig.run_settings.parallels = "cypress";

        return capabilityHelper
          .validate(bsConfig, { parallels: undefined })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(error, Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);
          });
      });

      it("validate parallels present in bsconfig run settings (float) when not specified in arguments", () => {
        bsConfig.run_settings.parallels = "1.234";

        return capabilityHelper
          .validate(bsConfig, { parallels: undefined })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(error, Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);
          });
      });

      it("validate parallels present in bsconfig run settings (negative value < -1) when not specified in arguments", () => {
        bsConfig.run_settings.parallels = -200;

        return capabilityHelper
          .validate(bsConfig, { parallels: undefined })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(error, Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);
          });
      });

      it("validate parallels present in bsconfig run settings (zero value) when not specified in arguments", () => {
        bsConfig.run_settings.parallels = -200;

        return capabilityHelper
          .validate(bsConfig, { parallels: undefined })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(error, Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);
          });
      });

      it("should return true for valid parallels (positive) present in bsconfig if arguments are undefined", () => {
        bsConfig.run_settings.parallels = 10;

        return capabilityHelper
          .validate(bsConfig, { parallels: undefined })
          .then(function (data) {
            chai.assert.deepEqual(data, {});
          });
      });

      it("should return true for valid parallels (-1) present in bsconfig if arguments are undefined", () => {
        bsConfig.run_settings.parallels = -1;

        return capabilityHelper
          .validate(bsConfig, { parallels: undefined })
          .then(function (data) {
            chai.assert.deepEqual(data, {});
          });
      });

      it("should return true for valid parallels (positive) present in arguments if bsconfig parallels are undefined", () => {

        return capabilityHelper
          .validate(bsConfig, { parallels: 200 })
          .then(function (data) {
            chai.assert.deepEqual(data, {});
          });
      });

      it("should return true for valid parallels (-1) present in arguments if bsconfig parallels are undefined", () => {

        return capabilityHelper
          .validate(bsConfig, { parallels: -1 })
          .then(function (data) {
            chai.assert.deepEqual(data, {});
          });
      });

      it("should return true for valid parallels (-1) present in arguments even if bsconfig parallels are not valid", () => {
        bsConfig.run_settings.parallels = "not valid";

        return capabilityHelper
          .validate(bsConfig, { parallels: -1 })
          .then(function (data) {
            chai.assert.deepEqual(data, {});
          });
      });

      it("should return true for valid parallels (-1) present in arguments if bsconfig parallels are also valid", () => {
        bsConfig.run_settings.parallels = "10";

        return capabilityHelper
          .validate(bsConfig, { parallels: -1 })
          .then(function (data) {
            chai.assert.deepEqual(data, {});
          });
      });
    });

    it("validate bsConfig", () => {
      let bsConfig = undefined;
      return capabilityHelper
        .validate(bsConfig, { parallels: undefined })
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
        .validate(bsConfig, { parallels: undefined })
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

    it("validate default bsConfig.auth", () => {
      bsConfig = {
        auth: {
          username: "<Your BrowserStack username>",
          access_key: "<Your BrowserStack access key>"
        }
      };
      return capabilityHelper
        .validate(bsConfig, { parallels: undefined })
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(
            error,
            Constants.validationMessages.INVALID_DEFAULT_AUTH_PARAMS
          );
        });
    });

    it("validate bsConfig.browsers", () => {
      let bsConfig = {
        auth: {},
        browsers: [],
      };
      return capabilityHelper
        .validate(bsConfig, { parallels: undefined })
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
        .validate(bsConfig, { parallels: undefined })
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
        .validate(bsConfig, { parallels: undefined })
        .then(function (data) {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(
            error,
            Constants.validationMessages.EMPTY_CYPRESS_PROJ_DIR
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
        .validate(bsConfig, { parallels: undefined })
        .then(function (data) {
          chai.assert.equal(data, Constants.validationMessages.VALIDATED);
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
        });
    });
    describe("validate cypress.json", () => {
      beforeEach(() => {
        bsConfig = {
          auth: {},
          browsers: [
            {
              browser: "chrome",
              os: "Windows 10",
              versions: ["78", "77"],
            },
          ],
          run_settings: {
            cypress_proj_dir: "random path",
            cypressConfigFilePath: "random path",
            cypressProjectDir: "random path"
          },
        };
      });
      it("validate cypress json is present", () => {
        //Stub for cypress json validation
        sinon.stub(fs, 'existsSync').returns(false);

        return capabilityHelper
          .validate(bsConfig, { parallels: undefined })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(
              error,
              Constants.validationMessages.INVALID_CYPRESS_CONFIG_FILE
            );
            fs.existsSync.restore();
          });
      });

      it("validate cypress json is valid", () => {
        //Stub for cypress json validation
        sinon.stub(fs, 'existsSync').returns(true);
        sinon.stub(fs, 'readFileSync').returns("{invalid}");

        return capabilityHelper
          .validate(bsConfig, { parallels: undefined })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(
              error,
              Constants.validationMessages.INVALID_CYPRESS_JSON
            );
            fs.existsSync.restore();
            fs.readFileSync.restore();
          });
      });

      it("validate baseUrl is set to localhost and local is not set to true", () => {
        //Stub for cypress json validation
        sinon.stub(fs, 'existsSync').returns(true);
        sinon.stub(fs, 'readFileSync').returns('{ "baseUrl": "http://localhost:3000"}');

        return capabilityHelper
          .validate(bsConfig, { parallels: undefined })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(
              error,
              Constants.validationMessages.LOCAL_NOT_SET.replace("<baseUrlValue>", "http://localhost:3000")
            );
            fs.existsSync.restore();
            fs.readFileSync.restore();
          });
      });

      it("validate integrationFolder is set and is accessible from cypress_proj_dir", () => {
        //Stub for cypress json validation
        sinon.stub(fs, 'existsSync').returns(true);
        sinon.stub(fs, 'readFileSync').returns('{ "integrationFolder": "/absolute/path"}');

        return capabilityHelper
          .validate(bsConfig, { parallels: undefined })
          .then(function (data) {
            chai.assert.fail("Promise error");
          })
          .catch((error) => {
            chai.assert.equal(
              error,
              Constants.validationMessages.INCORRECT_DIRECTORY_STRUCTURE
            );

            fs.existsSync.restore();
            fs.readFileSync.restore();
          });
      });

      context("cypress config file set to false", () => {
        beforeEach(function() {
          readFileSpy = sinon.stub(fs, 'readFileSync');
          jsonParseSpy = sinon.stub(JSON, 'parse');
        });

        afterEach(function() {
          readFileSpy.restore();
          jsonParseSpy.restore();
        });

        it("does not validate with cypress config filename set to false", () => {
          // sinon.stub(fs, 'existsSync').returns(false);
          bsConfig.run_settings.cypressConfigFilePath = 'false';
          bsConfig.run_settings.cypress_config_filename = 'false';

          return capabilityHelper
            .validate(bsConfig, {})
            .then(function (data) {
              sinon.assert.notCalled(readFileSpy);
              sinon.assert.notCalled(jsonParseSpy);
            })
            .catch((error) => {
              chai.assert.equal(
                error,
                Constants.validationMessages.INCORRECT_DIRECTORY_STRUCTURE
              );
            });
        })
      });
    });
  });
});
