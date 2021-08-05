'use strict';
const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require("sinon"),
  EventEmitter = require('events');

const logger = require("../../../../bin/helpers/logger").winstonLogger;

const rewire = require("rewire");

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;


describe("md5util", () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
  });

  context("folderStats", () => {
    let fakeEvent, globStub;
    const hashHelper = rewire("../../../../bin/helpers/hashUtil");

    beforeEach(() => {
      fakeEvent = new EventEmitter();
      globStub = sandbox.stub().returns(fakeEvent);
      hashHelper.__set__({
        glob: globStub,
      });
    });

    it("resolve with array of files ", () => {
      let folderStatsrewire = hashHelper.__get__('folderStats');
      process.nextTick(() => {
        fakeEvent.emit('match', { relative: "random_path_1", absolute: "random_path_1", stat: "random_stat_1" });
        fakeEvent.emit('end');
      })
      return folderStatsrewire({})
        .then((data) => {
          chai.assert.deepEqual(data, [{ relativePath: "random_path_1", absolutePath: "random_path_1", stats: "random_stat_1" }]);
          sinon.assert.calledOnce(globStub);
        })
        .catch((error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("reject with Error in getting files. error", () => {
      let folderStatsrewire = hashHelper.__get__('folderStats');
      process.nextTick(() => {
        fakeEvent.emit('error');
      })
      return folderStatsrewire({})
        .then((data) => {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(error, "Error in getting files.");
          sinon.assert.calledOnce(globStub);
        });
    });
  });

  context("hashFile", () => {
    let cryptoStub, digestStub, updateStub, fsStub, statsStub;
    const hashHelper = rewire("../../../../bin/helpers/hashUtil");

    beforeEach(() => {
      digestStub = sandbox.stub().returns("random_md5sum");
      updateStub = sandbox.stub().returns(null);
      statsStub = {
        isFile: () => {
          return true;
        }
      };
      cryptoStub = {
        createHash: () => {
          return {
            update: updateStub,
            digest: digestStub
          }
        }
      };
      fsStub = {
        events: {},
        on: (event, func) => {
          fsStub.events[event] = func
        },
        createReadStream: () => {
          return fsStub
        },
        pipe: () => {
          return fsStub
        },
        emit: (event, data) => {
          fsStub.events[event](data)
        }
      };
      hashHelper.__set__({
        crypto: cryptoStub,
        fs: fsStub,
      });
    });

    it("resolve with hash of the file", () => {
      let hashFileRewire = hashHelper.__get__('hashFile');
      process.nextTick(() => {
        fsStub.emit('end');
      });
      return hashFileRewire({relativePath: "random", absolutePath: "random", stats: statsStub})
        .then((data) => {
          chai.assert.equal(data, "random_md5sum");
          sinon.assert.calledOnce(updateStub);
          sinon.assert.calledOnce(digestStub);
        })
        .catch((error) => {
          console.log("error is ",error)
          chai.assert.fail("Promise error");
        });
    });
  });
});
