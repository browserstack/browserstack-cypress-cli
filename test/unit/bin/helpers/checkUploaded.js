'use strict';
const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require("sinon"),
  request = require("request");

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
    let checkSpecsMd5Stub;
    beforeEach(() => {
      checkSpecsMd5Stub = sandbox.stub().returns(Promise.resolve("random_md5sum"));
    });

    it("resolves with zipUrlPresent false due to request error", () => {
      let requestStub = sandbox
        .stub(request, "post")
        .yields(new Error("random error"), null, null);

      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        request: { post: requestStub },
        checkSpecsMd5: checkSpecsMd5Stub
      });
      let checkUploadedMd5rewire = checkUploaded.__get__('checkUploadedMd5');

      return checkUploadedMd5rewire(bsConfig, {})
        .then(function (data) {
          chai.assert.equal(data.md5sum, 'random_md5sum');
          chai.assert.equal(data.zipUrlPresent, false);
          sinon.assert.calledOnce(requestStub);
          sinon.assert.calledOnce(checkSpecsMd5Stub);
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolves with zipUrlPresent true and zip url", () => {
      let requestStub = sandbox
        .stub(request, "post")
        .yields(null, { statusCode: 200 }, '{"zipUrl":"bs://random_hashid"}');

      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        request: { post: requestStub },
        checkSpecsMd5: checkSpecsMd5Stub
      });
      let checkUploadedMd5rewire = checkUploaded.__get__('checkUploadedMd5');

      return checkUploadedMd5rewire(bsConfig, {})
        .then(function (data) {
          chai.assert.deepEqual(data, { md5sum: 'random_md5sum', zipUrlPresent: true, zipUrl: 'bs://random_hashid' })
          sinon.assert.calledOnce(requestStub);
          sinon.assert.calledOnce(checkSpecsMd5Stub);
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolves with zipUrlPresent false as not found in db", () => {
      let requestStub = sandbox
        .stub(request, "post")
        .yields(null, { statusCode: 404 }, '{"message":"zip_url for md5sum random_md5sum not found."}');

      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        request: { post: requestStub },
        checkSpecsMd5: checkSpecsMd5Stub
      });
      let checkUploadedMd5rewire = checkUploaded.__get__('checkUploadedMd5');

      return checkUploadedMd5rewire(bsConfig, {})
        .then(function (data) {
          chai.assert.deepEqual(data, { md5sum: 'random_md5sum', zipUrlPresent: false })
          sinon.assert.calledOnce(requestStub);
          sinon.assert.calledOnce(checkSpecsMd5Stub);
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolves with zipUrlPresent false if force-upload enabled", () => {
      let requestStub = sandbox
        .stub(request, "post")
        .yields(null, { statusCode: 404 }, '{"message":"zip_url for md5sum random_md5sum not found."}');

      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        request: { post: requestStub },
        checkSpecsMd5: checkSpecsMd5Stub
      });
      let checkUploadedMd5rewire = checkUploaded.__get__('checkUploadedMd5');

      return checkUploadedMd5rewire(bsConfig, {"force-upload": true})
        .then(function (data) {
          chai.assert.deepEqual(data, { zipUrlPresent: false })
          sinon.assert.notCalled(requestStub);
          sinon.assert.notCalled(checkSpecsMd5Stub);
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
        });
    });
  });

  context("checkSpecsMd5", () => {
    let cryptoStub, digestStub, updateStub, pathStub, fsStub;
    beforeEach(() => {
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

    it("resolves with md5 value without adding config_file and package.json", () => {
      let hashElementstub = sandbox.stub().returns(Promise.resolve("random_md5sum"));
      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        hashHelper: { hashWrapper: hashElementstub },
        crypto: cryptoStub,
        path: pathStub
      });
      let checkSpecsMd5Rewire = checkUploaded.__get__('checkSpecsMd5');

      return checkSpecsMd5Rewire(bsConfig.run_settings, "random_files")
        .then(function (data) {
          chai.assert.equal(data, 'random_md5sum')
          sinon.assert.calledOnce(hashElementstub);
          sinon.assert.calledOnce(digestStub);
          sinon.assert.calledOnce(updateStub);
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolves with md5 value adding config_file and package.json", () => {
      let hashElementstub = sandbox.stub().returns(Promise.resolve("random_md5sum"));
      const checkUploaded = rewire("../../../../bin/helpers/checkUploaded");
      checkUploaded.__set__({
        hashHelper: { hashWrapper: hashElementstub },
        crypto: cryptoStub,
        path: pathStub,
        fs: fsStub
      });
      let checkSpecsMd5Rewire = checkUploaded.__get__('checkSpecsMd5');
      let run_settings = {
        package_config_options: {random: "value"},
        cypress_config_file: "random/path"
      }

      return checkSpecsMd5Rewire(run_settings, "random_files")
        .then(function (data) {
          chai.assert.equal(data, 'random_md5sum')
          sinon.assert.calledOnce(hashElementstub);
          sinon.assert.calledOnce(digestStub);
          sinon.assert.calledThrice(updateStub);
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
        });
    });
  });
});
