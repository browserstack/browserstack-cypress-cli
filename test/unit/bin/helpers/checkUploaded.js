'use strict';
const { default: axios } = require("axios");
const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require("sinon");

const logger = require("../../../../bin/helpers/logger").winstonLogger,
  testObjects = require("../../support/fixtures/testObjects");

const rewire = require("rewire");

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("checkUploaded", () => {
  let bsConfig = testObjects.sampleBsConfig;

  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
  });

  context("checkUploadedMd5", () => {
    let checkSpecsMd5Stub, checkPackageMd5Stub, instrumentBlocks;
    beforeEach(() => {
      checkSpecsMd5Stub = sandbox.stub().returns(Promise.resolve("random_md5sum"));
      checkPackageMd5Stub = sandbox.stub().returns("random_md5sum");
      instrumentBlocks = {
        markBlockStart: sinon.stub(),
        markBlockEnd: sinon.stub()
      }
    });

    it("resolves with zipUrlPresent false due to axios error", () => {
      let axiosStub = sandbox
        .stub(axios, "post")
        .resolves(new Error("random error"));

      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        axios: { post: axiosStub },
        checkSpecsMd5: checkSpecsMd5Stub
      });
      let checkUploadedMd5rewire = checkUploaded.__get__('checkUploadedMd5');
      return checkUploadedMd5rewire(bsConfig, {}, instrumentBlocks)
        .then((data) => {
          chai.assert.equal(data.zip_md5sum, 'random_md5sum');
          chai.assert.equal(data.zipUrlPresent, false);
          chai.assert.equal(data.packageUrlPresent, false);
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(checkSpecsMd5Stub);
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolves with zipUrlPresent false and packageUrlPresent false due to checkSpecsMd5 error", () => {
      let axiosStub = sandbox
        .stub(axios, "post")
        .resolves(new Error("random error"));
      let checkSpecsMd5ErrorStub = sandbox.stub().returns(Promise.reject({message: "test error", stack: "test error stack"}));

      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        axios: { post: axiosStub },
        checkSpecsMd5: checkSpecsMd5ErrorStub
      });
      let checkUploadedMd5rewire = checkUploaded.__get__('checkUploadedMd5');
      return checkUploadedMd5rewire(bsConfig, {}, instrumentBlocks)
        .then((data) => {
          chai.assert.equal(data.zipUrlPresent, false);
          chai.assert.equal(data.packageUrlPresent, false);
          chai.assert.equal(data.error, "test error stack");
          sinon.assert.notCalled(axiosStub);
          sinon.assert.calledOnce(checkSpecsMd5ErrorStub);
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolves with zipUrlPresent false and packageUrlPresent false due to parsing error", () => {
      let axiosStub = sandbox
      .stub(axios, "post")
      .resolves({ status: 200 , data: '{"zipUrl":"bs://random_hashid}'});

      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        axios: { post: axiosStub },
        checkSpecsMd5: checkSpecsMd5Stub
      });
      let checkUploadedMd5rewire = checkUploaded.__get__('checkUploadedMd5');
      return checkUploadedMd5rewire(bsConfig, {}, instrumentBlocks)
        .then((data) => {
          chai.assert.equal(data.zipUrlPresent, false);
          chai.assert.equal(data.packageUrlPresent, false);
          chai.assert.equal(data.zip_md5sum, "random_md5sum");
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(checkSpecsMd5Stub);
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolves with zipUrlPresent true and zip url", () => {
      let axiosStub = sandbox
        .stub(axios, "post")
        .resolves({ status: 200 , data: {"zipUrl":"bs://random_hashid"} });

      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        axios: { post: axiosStub },
        checkSpecsMd5: checkSpecsMd5Stub
      });
      let checkUploadedMd5rewire = checkUploaded.__get__('checkUploadedMd5');
      return checkUploadedMd5rewire(bsConfig, {}, instrumentBlocks)
        .then((data) => {
          chai.assert.deepEqual(data, { zip_md5sum: 'random_md5sum', zipUrlPresent: true, packageUrlPresent: false, zipUrl: 'bs://random_hashid' })
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(checkSpecsMd5Stub);
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolves with zipUrlPresent true, packageUrlPresent true, zip url, and packge url", () => {
      let axiosStub = sandbox
        .stub(axios, "post")
        .resolves({ status: 200 , data: {"zipUrl":"bs://random_hashid", "npmPackageUrl":"bs://random_hashid2"}});

      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        axios: { post: axiosStub },
        checkSpecsMd5: checkSpecsMd5Stub,
        checkPackageMd5: checkPackageMd5Stub
      });
      let checkUploadedMd5rewire = checkUploaded.__get__('checkUploadedMd5');
      bsConfig.run_settings.cache_dependencies = true
      return checkUploadedMd5rewire(bsConfig, {}, instrumentBlocks)
        .then((data) => {
          chai.assert.deepEqual(data, { zip_md5sum: 'random_md5sum', npm_package_md5sum: 'random_md5sum', zipUrlPresent: true, packageUrlPresent: true, zipUrl: 'bs://random_hashid', npmPackageUrl: 'bs://random_hashid2' })
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(checkSpecsMd5Stub);
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolves with zipUrlPresent false as not found in db", () => {
      let axiosStub = sandbox
        .stub(axios, "post")
        .resolves({ status: 404 , data: {"message":"zip_url for md5sum random_md5sum not found."}});

      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        axios: { post: axiosStub },
        checkSpecsMd5: checkSpecsMd5Stub,
        checkPackageMd5: checkPackageMd5Stub
      });
      let checkUploadedMd5rewire = checkUploaded.__get__('checkUploadedMd5');
      bsConfig.run_settings.cache_dependencies = false
      return checkUploadedMd5rewire(bsConfig, {}, instrumentBlocks)
        .then((data) => {
          chai.assert.deepEqual(data, { zip_md5sum: 'random_md5sum', zipUrlPresent: false, packageUrlPresent: false, })
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(checkSpecsMd5Stub);
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolves with zipUrlPresent and packageUrlPresent false if force-upload enabled and cache_dependencies disabled", () => {
      let axiosStub = sandbox
        .stub(axios, "post")
        .resolves({ status: 404 , data: '{"message":"zip_url for md5sum random_md5sum not found."}'});

      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        axios: { post: axiosStub },
        checkSpecsMd5: checkSpecsMd5Stub,
        checkPackageMd5: checkPackageMd5Stub
      });
      let checkUploadedMd5rewire = checkUploaded.__get__('checkUploadedMd5');
      bsConfig.run_settings.cache_dependencies = false
      return checkUploadedMd5rewire(bsConfig, {"force-upload": true}, instrumentBlocks)
        .then((data) => {
          chai.assert.deepEqual(data, { zipUrlPresent: false, packageUrlPresent: false })
          sinon.assert.notCalled(axiosStub);
          sinon.assert.notCalled(checkSpecsMd5Stub);
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolves with zipUrlPresent false and packageUrlPresent false if force-upload enabled and cache_dependencies enabled", () => {
      let axiosStub = sandbox
        .stub(axios, "post")
        .resolves({ status: 200 , data: '{"npmPackageUrl":"bs://random_hashid2"}'});

      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        axios: { post: axiosStub },
        checkSpecsMd5: checkSpecsMd5Stub,
        checkPackageMd5: checkPackageMd5Stub
      });
      let checkUploadedMd5rewire = checkUploaded.__get__('checkUploadedMd5');
      bsConfig.run_settings.cache_dependencies = true
      return checkUploadedMd5rewire(bsConfig, {"force-upload": true}, instrumentBlocks)
        .then((data) => {
          chai.assert.deepEqual(data, { zipUrlPresent: false, packageUrlPresent: false })
          sinon.assert.notCalled(axiosStub);
          sinon.assert.notCalled(checkSpecsMd5Stub);
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolves with zipUrlPresent false and packageUrlPresent false if diabled from rails", () => {
      let axiosStub = sandbox
        .stub(axios, "post")
        .resolves( { status: 200 , data: {"disableNpmSuiteCache": true, "disableTestSuiteCache": true }});

      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        axios: { post: axiosStub },
        checkSpecsMd5: checkSpecsMd5Stub,
        checkPackageMd5: checkPackageMd5Stub
      });
      let checkUploadedMd5rewire = checkUploaded.__get__('checkUploadedMd5');
      bsConfig.run_settings.cache_dependencies = true
      return checkUploadedMd5rewire(bsConfig, {}, instrumentBlocks)
        .then((data) => {
          chai.assert.deepEqual(data, { zipUrlPresent: false, packageUrlPresent: false })
          sinon.assert.calledOnce(axiosStub);
          sinon.assert.calledOnce(checkSpecsMd5Stub);
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });
  });

  context("checkSpecsMd5", () => {
    let cryptoStub, checkPackageMd5Stub, digestStub, updateStub, pathStub, fsStub;
    beforeEach(() => {
      checkPackageMd5Stub = sandbox.stub().returns("random_md5sum")
      digestStub = sandbox.stub().returns("random_md5sum");
      updateStub = sandbox.stub().returns(null);
      pathStub = {
        dirname: sandbox.stub().returns(null)
      };
      fsStub = {
        readFileSync: sandbox.stub().returns('{}')
      }
      cryptoStub = {
        createHash: () => {
          return {
            update: updateStub,
            digest: digestStub
          }
        }
      };
    });

    it("resolves early due to force upload", () => {
      let hashElementstub = sandbox.stub().returns(Promise.resolve("random_md5sum"));
      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        hashHelper: { hashWrapper: hashElementstub },
        crypto: cryptoStub,
        path: pathStub,
        checkPackageMd5: checkPackageMd5Stub
      });
      let checkSpecsMd5Rewire = checkUploaded.__get__('checkSpecsMd5');
      let args = {
        exclude: "random_files",
        "force-upload": true
      }
      return checkSpecsMd5Rewire(bsConfig.run_settings, args)
        .then((data) => {
          chai.assert.equal(data, 'force-upload')
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("reject due to error in hashing", () => {
      let hashElementErrorstub = sandbox.stub().returns(Promise.reject({message: "test error", stack: "test error stack"}));
      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        hashHelper: { hashWrapper: hashElementErrorstub },
        crypto: cryptoStub,
        path: pathStub,
        checkPackageMd5: checkPackageMd5Stub
      });
      let checkSpecsMd5Rewire = checkUploaded.__get__('checkSpecsMd5');
      let args = {
        exclude: "random_files",
      }
      return checkSpecsMd5Rewire(bsConfig.run_settings, args)
        .then((_data) => {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(error.message, 'test error')
        });
    });

    it("resolves with md5 value", () => {
      let hashElementstub = sandbox.stub().returns(Promise.resolve("random_md5sum"));
      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        hashHelper: { hashWrapper: hashElementstub },
        crypto: cryptoStub,
        path: pathStub,
        checkPackageMd5: checkPackageMd5Stub,
        fs: fsStub
      });
      let checkSpecsMd5Rewire = checkUploaded.__get__('checkSpecsMd5');
      let args = {
        exclude: "random_files"
      }
      return checkSpecsMd5Rewire(bsConfig.run_settings, args)
        .then((data) => {
          chai.assert.equal(data, 'random_md5sum')
          sinon.assert.calledOnce(hashElementstub);
          sinon.assert.calledOnce(digestStub);
          sinon.assert.calledTwice(updateStub);
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolves with md5 value including config file", () => {
      let hashElementstub = sandbox.stub().returns(Promise.resolve("random_md5sum"));
      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        hashHelper: { hashWrapper: hashElementstub },
        crypto: cryptoStub,
        path: pathStub,
        checkPackageMd5: checkPackageMd5Stub,
        fs: fsStub
      });
      let checkSpecsMd5Rewire = checkUploaded.__get__('checkSpecsMd5');
      let args = {
        exclude: "random_files"
      }
      bsConfig.run_settings.cypress_config_file = "random/path"
      return checkSpecsMd5Rewire(bsConfig.run_settings, args)
        .then((data) => {
          chai.assert.equal(data, 'random_md5sum')
          sinon.assert.calledOnce(hashElementstub);
          sinon.assert.calledOnce(digestStub);
          sinon.assert.calledThrice(updateStub);
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });
  });

  context("checkPackageMd5", () => {
    let cryptoStub, checkPackageMd5Stub, digestStub, updateStub, pathStub, fsStub, utilStub;
    beforeEach(() => {
      checkPackageMd5Stub = sandbox.stub().returns("random_md5sum")
      digestStub = sandbox.stub().returns("random_md5sum");
      updateStub = sandbox.stub().returns(null);
      utilStub = {
        sortJsonKeys : sandbox.stub().returns('{}')
      }
      pathStub = {
        dirname: sandbox.stub().returns(null),
        join: sandbox.stub().returns(null)
      };
      fsStub = {
        readFileSync: sandbox.stub().returns('{}'),
        existsSync: sandbox.stub().returns(true)
      }
      cryptoStub = {
        createHash: () => {
          return {
            update: updateStub,
            digest: digestStub
          }
        }
      };
    });

    it("resolves early due to force upload", () => {
      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        crypto: cryptoStub,
        path: pathStub,
        fs: fsStub,
        utils: utilStub
      });
      let checkPackageMd5Rewire = checkUploaded.__get__('checkPackageMd5');
      let run_settings = {
        package_config_options: {
          "name": "test"
        },
        npm_dependencies: {
          "random-package-1": "1.2.3",
          "random-package-2": "1.2.4"
        }
      };
      return chai.assert.equal(checkPackageMd5Rewire(run_settings), 'random_md5sum');
    });
  });
});
