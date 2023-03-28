'use strict';
const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require("sinon"),
  fs = require('fs'),
  request = require("request");

const logger = require("../../../../bin/helpers/logger").winstonLogger,
  constant = require('../../../../bin/helpers/constants'),
  formatRequest = require('../../../../bin/helpers/utils').formatRequest;

const rewire = require("rewire"),
  cliProgress = require('cli-progress');

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;

describe("zipUpload", () => {
  let sandbox;

  let barStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    barStub = {
      start: sinon.stub(),
      stop: sinon.stub(),
      update: sinon.stub(),
      on: sinon.stub(),
    }

    sinon.stub(cliProgress, 'SingleBar').returns(barStub);
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
  });

  context("uploadSuits", () => {
    let utilsStub, loggerStub;
    let bsConfig = {}
    let filePath = "random/path";
    const zipUploader = rewire("../../../../bin/helpers/zipUpload");
    beforeEach(() => {
      utilsStub = {
        generateUploadParams: sinon.stub().returns({}),
        formatRequest,
      };
      loggerStub = {
        info: sandbox.stub().returns(null),
        error: sandbox.stub().returns(null),
      };
      sinon.stub(fs, 'lstatSync').returns({ size: 123 });
    });

    afterEach(() => {
      fs.lstatSync.restore();
    });

    it("reject with error", () => {
      let requestStub = sandbox
        .stub(request, "post")
        .yields(new Error("test error"), null, null);

      zipUploader.__set__({
        request: { post: requestStub },
        utils: utilsStub,
        logger: loggerStub
      });
      let uploadSuitsrewire = zipUploader.__get__('uploadSuits');
      let opts = {
        archivePresent: true,
        messages: {}
      }
      let obj = {
        bar1: null,
        zipInterval: null,
        size: 0,
        startTime: null
      }
      return uploadSuitsrewire(bsConfig, filePath, opts, obj)
        .then((_data) => {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(error.message.message, "test error");
        });
    });

    it("resolve with url if already present", () => {
      let uploadSuitsrewire = zipUploader.__get__('uploadSuits');
      let opts = {
        urlPresent: true,
        md5ReturnKey: 'returnKey',
        url: 'bs://random_hash',
        cleanupMethod: sinon.stub().returns(null)
      }
      let obj = {
        bar1: null,
        zipInterval: null,
        size: 0,
        startTime: null
      }
      return uploadSuitsrewire(bsConfig, filePath, opts, obj)
        .then((data) => {
          chai.assert.deepEqual(data, {returnKey: 'bs://random_hash'});
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolve with url if archive not present", () => {
      let uploadSuitsrewire = zipUploader.__get__('uploadSuits');
      let opts = {
        archivePresent: false,
      }
      let obj = {
        bar1: null,
        zipInterval: null,
        size: 0,
        startTime: null
      }
      return uploadSuitsrewire(bsConfig, filePath, opts, obj)
        .then((data) => {
          chai.assert.deepEqual(data, {});
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolve with nothing if parsing error", () => {
      let requestStub = sandbox
        .stub(request, "post")
        .yields(null, { statusCode: 200 }, '{ random: "test }');

      zipUploader.__set__({
        request: { post: requestStub },
        utils: utilsStub,
        logger: loggerStub
      });
      let uploadSuitsrewire = zipUploader.__get__('uploadSuits');
      let opts = {
        cleanupMethod: sinon.stub().returns(null),
        archivePresent: true,
        messages: {}
      }
      let obj = {
        bar1: null,
        zipInterval: null,
        size: 0,
        startTime: null
      }
      return uploadSuitsrewire(bsConfig, filePath, opts, obj)
        .then((data) => {
          chai.assert.hasAllKeys(data, ["time"]);
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("resolve with message if statusCode = 200", () => {
      let requestStub = sandbox
        .stub(request, "post")
        .yields(null, { statusCode: 200 }, JSON.stringify({ zip_url: "zip_url" }));

      zipUploader.__set__({
        request: { post: requestStub },
        utils: utilsStub,
        logger: loggerStub
      });
      let uploadSuitsrewire = zipUploader.__get__('uploadSuits');
      let opts = {
        cleanupMethod: sinon.stub().returns(null),
        archivePresent: true,
        messages: {}
      }
      let obj = {
        bar1: null,
        zipInterval: null,
        size: 0,
        startTime: null
      }
      return uploadSuitsrewire(bsConfig, filePath, opts, obj)
        .then((data) => {
          chai.assert.hasAllKeys(data, ["zip_url", "time"]);
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("reject with returned message if auth failed with message", () => {
      let requestStub = sandbox
        .stub(request, "post")
        .yields(null, { statusCode: 401 }, JSON.stringify({ error: "auth failed" }));

      zipUploader.__set__({
        request: { post: requestStub },
        utils: utilsStub,
        logger: loggerStub
      });
      let uploadSuitsrewire = zipUploader.__get__('uploadSuits');
      let opts = {
        archivePresent: true,
        messages: {}
      }
      let obj = {
        bar1: null,
        zipInterval: null,
        size: 0,
        startTime: null
      }
      return uploadSuitsrewire(bsConfig, filePath, opts, obj)
        .then((_data) => {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(error.message, "auth failed");
        });
    });

    it("reject with predefined message if auth failed without message", () => {
      let requestStub = sandbox
        .stub(request, "post")
        .yields(null, { statusCode: 401 }, JSON.stringify({ }));

      zipUploader.__set__({
        request: { post: requestStub },
        utils: utilsStub,
        logger: loggerStub
      });
      let uploadSuitsrewire = zipUploader.__get__('uploadSuits');
      let opts = {
        archivePresent: true,
        messages: {}
      }
      let obj = {
        bar1: null,
        zipInterval: null,
        size: 0,
        startTime: null
      }
      return uploadSuitsrewire(bsConfig, filePath, opts, obj)
        .then((_data) => {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(error.message, constant.validationMessages.INVALID_DEFAULT_AUTH_PARAMS);
        });
    });

    it("resolve with nothing if request error but no propogation", () => {
      let requestStub = sandbox
        .stub(request, "post")
        .yields(null, { statusCode: 402 }, JSON.stringify({ }));

      zipUploader.__set__({
        request: { post: requestStub },
        utils: utilsStub,
        logger: loggerStub
      });
      let uploadSuitsrewire = zipUploader.__get__('uploadSuits');
      let opts = {
        archivePresent: true,
        messages: {},
        propogateError: false
      }
      let obj = {
        bar1: null,
        zipInterval: null,
        size: 0,
        startTime: null
      }
      return uploadSuitsrewire(bsConfig, filePath, opts, obj)
        .then((data) => {
          chai.assert.deepEqual(data, {});
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("reject with error if request error", () => {
      let requestStub = sandbox
        .stub(request, "post")
        .yields(null, { statusCode: 402 }, JSON.stringify({ error: "test error" }));

      zipUploader.__set__({
        request: { post: requestStub },
        utils: utilsStub,
        logger: loggerStub
      });
      let uploadSuitsrewire = zipUploader.__get__('uploadSuits');
      let opts = {
        archivePresent: true,
        messages: {},
        propogateError: true
      }
      let obj = {
        bar1: null,
        zipInterval: null,
        size: 0,
        startTime: null
      }
      return uploadSuitsrewire(bsConfig, filePath, opts, obj)
        .then((_data) => {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.deepEqual(error.message, "test error");
        });
    });

    it("reject with limit exceeded error", () => {
      let requestStub = sandbox
        .stub(request, "post")
        .yields(null, { statusCode: 413 }, JSON.stringify({ }));

      zipUploader.__set__({
        request: { post: requestStub },
        utils: utilsStub,
        logger: loggerStub
      });
      let uploadSuitsrewire = zipUploader.__get__('uploadSuits');
      let opts = {
        archivePresent: true,
        messages: {},
        propogateError: true
      }
      let obj = {
        bar1: null,
        zipInterval: null,
        size: 0,
        startTime: null
      }
      return uploadSuitsrewire(bsConfig, filePath, opts, obj)
        .then((_data) => {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.deepEqual(error.message, constant.userMessages.ZIP_UPLOAD_LIMIT_EXCEEDED);
        });
    });

    it("reject with not reachable error", () => {
      let requestStub = sandbox
        .stub(request, "post")
        .yields(null, { statusCode: 414 }, JSON.stringify({ }));

      zipUploader.__set__({
        request: { post: requestStub },
        utils: utilsStub,
        logger: loggerStub
      });
      let uploadSuitsrewire = zipUploader.__get__('uploadSuits');
      let opts = {
        archivePresent: true,
        messages: {},
        propogateError: true
      }
      let obj = {
        bar1: null,
        zipInterval: null,
        size: 0,
        startTime: null
      }
      return uploadSuitsrewire(bsConfig, filePath, opts, obj)
        .then((_data) => {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.deepEqual(error.message, constant.userMessages.ZIP_UPLOADER_NOT_REACHABLE);
        });
    });
  });

  context("uploadCypressZip", () => {
    let utilsStub, uploadSuitsStub, uploadSuitsErrorStub;
    const zipUploader = rewire("../../../../bin/helpers/zipUpload");
    beforeEach(() => {
      utilsStub = {
        generateUploadOptions: sinon.stub().returns({})
      };
      uploadSuitsStub = sandbox.stub().returns(Promise.resolve({zip_url: 'zip_url'}));
    });

    it("resolve with test suit", () => {
      let purgeUploadBarStub = sandbox.stub().returns(true);
      zipUploader.__set__({
        utils: utilsStub,
        uploadSuits: uploadSuitsStub,
        purgeUploadBar: purgeUploadBarStub
      });
      let uploadCypressZiprewire = zipUploader.__get__('uploadCypressZip');
      let bsConfig = {}
      let md5data = {};
      let packageData = {
      }
      return uploadCypressZiprewire(bsConfig, md5data, packageData)
        .then((data) => {
          chai.assert.deepEqual(data, {zip_url: 'zip_url'});
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
      });
    });

    it("reject with error while uploading suit", () => {
      let uploadSuitsErrorStub = sandbox.stub().returns(Promise.reject({message: "test error", stacktrace: "stacktrace error"}));
      let purgeUploadBarStub = sandbox.stub().returns(true);
      zipUploader.__set__({
        utils: utilsStub,
        uploadSuits: uploadSuitsErrorStub,
        purgeUploadBar: purgeUploadBarStub,
      });
      let uploadCypressZiprewire = zipUploader.__get__('uploadCypressZip');
      let bsConfig = {}
      let md5data = {};
      let packageData = {
      }
      return uploadCypressZiprewire(bsConfig, md5data, packageData)
        .then((_data) => {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(error, "test error");
      });
    });
  });
});
