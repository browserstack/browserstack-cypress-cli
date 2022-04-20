'use strict';
const chai = require("chai"),
  chaiAsPromised = require("chai-as-promised"),
  sinon = require("sinon"),
  fs = require('fs-extra'),
  path = require('path'),
  cp = require('child_process');

const logger = require("../../../../bin/helpers/logger").winstonLogger,
fileHelpers = require("../../../../bin/helpers/fileHelpers");

const rewire = require("rewire");

chai.use(chaiAsPromised);
logger.transports["console.info"].silent = true;


describe("packageInstaller", () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
  });

  context("setupPackageFolder", () => {
    let fileHelpersStub, fsmkdirStub, fsmkdirErrorStub, fswriteFileSyncStub, fsexistsSyncStub, fscopyFileSyncStub, pathdirnameStub, pathjoinStub, pathJoinErrorStub;
    const packageInstaller = rewire("../../../../bin/helpers/packageInstaller");
    beforeEach(() => {
      fileHelpersStub = sandbox.stub(fileHelpers, "deletePackageArchieve").returns(null);
      fsmkdirStub = sandbox.stub(fs, "mkdir").yields(null);
      fswriteFileSyncStub = sandbox.stub(fs, "writeFileSync").returns(null);
      fsexistsSyncStub = sandbox.stub(fs, "existsSync").returns(true);
      fscopyFileSyncStub = sandbox.stub(fs, "copyFileSync").returns(null);
      pathdirnameStub = sandbox.stub(path, "dirname").returns(null);
      pathjoinStub = sandbox.stub(path, "join").returns(null);
    });

    it("should reject if nothing in package.json", () => {
      packageInstaller.__set__({
        fileHelpers: {deletePackageArchieve: fileHelpersStub},
        fs: {mkdir: fsmkdirStub}
      });
      let setupPackageFolderrewire = packageInstaller.__get__('setupPackageFolder');
      let runSettings = {};
      let directoryPath = "/random/path";
      return setupPackageFolderrewire(runSettings, directoryPath)
        .then((_data) => {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(fsmkdirStub);
          sinon.assert.calledOnce(fileHelpersStub);
          chai.assert.equal(error, "Nothing in package file");
        });
    });

    it("should reject if error in any step", () => {
      pathjoinStub.restore();
      let error = new Error("test error");
      pathJoinErrorStub = sandbox.stub(path, "join").throws(error);
      packageInstaller.__set__({
        fileHelpers: {deletePackageArchieve: fileHelpersStub},
        fs: {mkdir: fsmkdirStub},
        path: {join: pathJoinErrorStub}
      });
      let setupPackageFolderrewire = packageInstaller.__get__('setupPackageFolder');
      let runSettings = {
        package_config_options: {
          "name": "test"
        },
        npm_dependencies: {
          "random-package-1": "1.2.3",
          "random-package-2": "1.2.4"
        }
      };
      let directoryPath = "/random/path";
      return setupPackageFolderrewire(runSettings, directoryPath)
        .then((_data) => {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          chai.assert.equal(error.message, "test error");
        });
    });

    it("should reject if directory creation fails", () => {
      fsmkdirStub.restore();
      fsmkdirErrorStub = sandbox.stub(fs, "mkdir").yields("test error");
      packageInstaller.__set__({
        fileHelpers: {deletePackageArchieve: fileHelpersStub},
        fs: {mkdir: fsmkdirErrorStub}
      });
      let setupPackageFolderrewire = packageInstaller.__get__('setupPackageFolder');
      let runSettings = {};
      let directoryPath = "/random/path";
      return setupPackageFolderrewire(runSettings, directoryPath)
        .then((_data) => {
          chai.assert.fail("Promise error");
        })
        .catch((error) => {
          sinon.assert.calledOnce(fileHelpersStub);
          chai.assert.equal(error, "test error");
        });
    });

    it("should create folder with required files if npmrc exists", () => {
      packageInstaller.__set__({
        fileHelpers: {deletePackageArchieve: fileHelpersStub},
        fs: {
          mkdir: fsmkdirStub,
          writeFileSync: fswriteFileSyncStub,
          existsSync: fsexistsSyncStub,
          copyFileSync: fscopyFileSyncStub
        },
        path: {
          dirname: pathdirnameStub,
          join: pathjoinStub
        }
      });
      let setupPackageFolderrewire = packageInstaller.__get__('setupPackageFolder');
      let runSettings = {
        package_config_options: {
          "name": "test"
        },
        npm_dependencies: {
          "random-package-1": "1.2.3",
          "random-package-2": "1.2.4"
        }
      };
      let packageCreated = JSON.stringify({
        "name": "test",
        "devDependencies": {
          "random-package-1": "1.2.3",
          "random-package-2": "1.2.4"
        }
      })
      let directoryPath = "/random/path";
      return setupPackageFolderrewire(runSettings, directoryPath)
        .then((data) => {
          sinon.assert.calledOnce(fsmkdirStub);
          sinon.assert.calledOnce(fileHelpersStub);
          sinon.assert.calledOnce(fswriteFileSyncStub);
          sinon.assert.calledOnce(fsexistsSyncStub);
          sinon.assert.calledOnce(fscopyFileSyncStub);
          sinon.assert.calledOnce(pathdirnameStub);
          sinon.assert.calledThrice(pathjoinStub);
          sinon.assert.calledWith(fswriteFileSyncStub, null, packageCreated);
          chai.assert.equal(data, "Package file created");
        })
        .catch((_error) => {
          console.log(_error)
          chai.assert.fail("Promise error");
        });
    });

    it("should create folder with required files if npmrc doesn't exists", () => {
      fsexistsSyncStub.restore();
      let fsexistsSyncFAlseStub = sandbox.stub(fs, "existsSync").returns(false);
      packageInstaller.__set__({
        fileHelpers: {deletePackageArchieve: fileHelpersStub},
        fs: {
          mkdir: fsmkdirStub,
          writeFileSync: fswriteFileSyncStub,
          existsSync: fsexistsSyncFAlseStub,
          copyFileSync: fscopyFileSyncStub
        },
        path: {
          dirname: pathdirnameStub,
          join: pathjoinStub
        }
      });
      let setupPackageFolderrewire = packageInstaller.__get__('setupPackageFolder');
      let runSettings = {
        package_config_options: {
          "name": "test"
        },
        npm_dependencies: {
          "random-package-1": "1.2.3",
          "random-package-2": "1.2.4"
        }
      };
      let packageCreated = JSON.stringify({
        "name": "test",
        "devDependencies": {
          "random-package-1": "1.2.3",
          "random-package-2": "1.2.4"
        }
      })
      let directoryPath = "/random/path";
      return setupPackageFolderrewire(runSettings, directoryPath)
        .then((data) => {
          sinon.assert.calledOnce(fsmkdirStub);
          sinon.assert.calledOnce(fileHelpersStub);
          sinon.assert.calledOnce(fswriteFileSyncStub);
          sinon.assert.calledOnce(fsexistsSyncFAlseStub);
          sinon.assert.notCalled(fscopyFileSyncStub);
          sinon.assert.calledOnce(pathdirnameStub);
          sinon.assert.calledThrice(pathjoinStub);
          sinon.assert.calledWith(fswriteFileSyncStub, null, packageCreated);
          chai.assert.equal(data, "Package file created");
        })
        .catch((_error) => {
          console.log(_error)
          chai.assert.fail("Promise error");
        });
    });
  });

  context("packageInstall", () => {
    const packageInstaller = rewire("../../../../bin/helpers/packageInstaller");

    it("should call npm install on directory and resolve if spawn is closed successfully", () => {
      let spawnStub = sandbox.stub(cp, 'spawn').returns({
        on: (_close, nodeProcessCloseCallback) => {
          nodeProcessCloseCallback(0);
        }
      });
      packageInstaller.__set__({
        nodeProcess: {},
        spawn: spawnStub
      });
      let packageInstallrewire = packageInstaller.__get__('packageInstall');
      let directoryPath = "/random/path";
      return packageInstallrewire(directoryPath)
      .then((data) => {
        console.log(data);
        chai.assert.equal(data, "Packages were installed successfully.")
        spawnStub.restore();
      })
      .catch((_error) => {
        chai.assert.fail(`Promise error ${_error}`);
      });
    });

    it("should call npm install on directory and reject if spawn is not closed successfully", () => {
      let spawnStub = sandbox.stub(cp, 'spawn').returns({
        on: (_close, nodeProcessCloseCallback) => {
          nodeProcessCloseCallback(1);
        }
      });
      packageInstaller.__set__({
        nodeProcess: {},
        spawn: spawnStub
      });
      let packageInstallrewire = packageInstaller.__get__('packageInstall');
      let directoryPath = "/random/path";
      return packageInstallrewire(directoryPath)
      .then((_data) => {
        spawnStub.restore();
        chai.assert.fail("Promise error");
      })
      .catch((error) => {
        spawnStub.restore();
        chai.assert.equal(error, "Packages were not installed successfully. Error code 1")
      });
    });
  });

  context("packageArchiver", () => {
    let fsStub, archiverStub, winstonLoggerInfoStub;
    let directoryPath = "/random/path";
    let packageFile = "/random/path/to/file";
    const packageInstaller = rewire("../../../../bin/helpers/packageInstaller");
    beforeEach(() => {
      fsStub = {
        events: {},
        on: (event, func) => {
          fsStub.events[event] = func
        },
        createWriteStream: () => {
          return fsStub
        },
        pipe: () => {
          return fsStub
        },
        emit: (event, data) => {
          fsStub.events[event](data)
        }
      };
      archiverStub = {
        events: {},
        on: (event, func) => {
          fsStub.events[event] = func
        },
        pipe: () => {
          return fsStub
        },
        directory: () => {
          return fsStub
        },
        finalize: () => {
          archiverStub.emit("warning", {code: "ENOENT"});
          fsStub.emit("end");
          fsStub.emit("close");
        },
        emit: (event, data) => {
          fsStub.events[event](data)
        }
      };
      winstonLoggerInfoStub = sinon.stub().returns(null);
    });

    it("should retun if zipping complete with ENOENT warning", () => {
      packageInstaller.__set__({
        fs: fsStub,
        archiver: () => {
          return archiverStub;
        },
        logger: {
          info: winstonLoggerInfoStub,
          debug: winstonLoggerInfoStub
        }
      });
      let packageArchiverrewire = packageInstaller.__get__('packageArchiver');
      return packageArchiverrewire(directoryPath, packageFile)
        .then((data) => {
          chai.assert.equal(data, "Zipping completed")
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("should reject if error in archiver", () => {
      archiverStub.finalize = () => {archiverStub.emit("error", "test error")}
      packageInstaller.__set__({
        fs: fsStub,
        archiver: () => {
          return archiverStub;
        }
      });
      let packageArchiverrewire = packageInstaller.__get__('packageArchiver');
      return packageArchiverrewire(directoryPath, packageFile)
        .then((_data) => {
          chai.assert.fail("Promise error"); 
        })
        .catch((error) => {
          chai.assert.equal(error, "test error")
        });
    });

    it("should reject if archiver warning other then ENOENT", () => {
      archiverStub.finalize = () => {archiverStub.emit("warning", {message: "test error"})}
      packageInstaller.__set__({
        fs: fsStub,
        archiver: () => {
          return archiverStub;
        }
      });
      let packageArchiverrewire = packageInstaller.__get__('packageArchiver');
      return packageArchiverrewire(directoryPath, packageFile)
        .then((_data) => {
          chai.assert.fail("Promise error"); 
        })
        .catch((error) => {
          chai.assert.equal(error.message, "test error")
        });
    });
  });

  context("packageWrapper", () => {
    let setupPackageFolderStub, setupPackageFolderErrorStub, setupPackageInstallStub, setupPackageArchiverStub;
    let packageDir = "/random/path";
    let packageFile = "/random/path/to/file";
    const packageInstaller = rewire("../../../../bin/helpers/packageInstaller");
    beforeEach(() => {
      setupPackageFolderStub = sandbox.stub().returns(Promise.resolve("random"));
      setupPackageInstallStub = sandbox.stub().returns(Promise.resolve("random"));
      setupPackageArchiverStub = sandbox.stub().returns(Promise.resolve("random"));
    });

    it("should return if feature not enabled", () => {
      let packageWrapperrewire = packageInstaller.__get__('packageWrapper');
      let bsConfig = {
        run_settings: {
          cache_dependencies: false
        }
      };
      let md5data = {};
      let instrumentBlocks = {
        markBlockStart: sinon.stub(),
        markBlockEnd: sinon.stub()
      }
      return packageWrapperrewire(bsConfig, packageDir, packageFile, md5data, instrumentBlocks)
        .then((data) => {
          chai.assert.deepEqual(data, {packageArchieveCreated: false});
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("should resolve with package exist if all step are successful", () => {
      packageInstaller.__set__({
        setupPackageFolder: setupPackageFolderStub,
        packageInstall:setupPackageInstallStub,
        packageArchiver: setupPackageArchiverStub
      });
      let packageWrapperrewire = packageInstaller.__get__('packageWrapper');
      let bsConfig = {
        run_settings: {
          cache_dependencies: true
        }
      };
      let md5data = {};
      let instrumentBlocks = {
        markBlockStart: sinon.stub(),
        markBlockEnd: sinon.stub()
      }
      return packageWrapperrewire(bsConfig, packageDir, packageFile, md5data, instrumentBlocks)
        .then((data) => {
          chai.assert.deepEqual(data, {packageArchieveCreated: true});
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });

    it("should reject with error if issue in any step", () => {
      setupPackageFolderErrorStub = sandbox.stub().returns(Promise.reject({message: "test error", stack: "test error stack"}));
      packageInstaller.__set__({
        setupPackageFolder: setupPackageFolderErrorStub,
        packageInstall:setupPackageInstallStub,
        packageArchiver: setupPackageArchiverStub
      });
      let packageWrapperrewire = packageInstaller.__get__('packageWrapper');
      let bsConfig = {
        run_settings: {
          cache_dependencies: true
        }
      };
      let md5data = {};
      let instrumentBlocks = {
        markBlockStart: sinon.stub(),
        markBlockEnd: sinon.stub()
      }
      return packageWrapperrewire(bsConfig, packageDir, packageFile, md5data, instrumentBlocks)
        .then((data) => {
          chai.assert.deepEqual(data, { packageArchieveCreated: false, error: 'test error stack' });
        })
        .catch((_error) => {
          chai.assert.fail("Promise error");
        });
    });
  });
});
