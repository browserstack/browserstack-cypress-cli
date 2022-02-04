'use strict';
  const archiver = require("archiver"),
  path = require('path'),
  fs = require('fs-extra'),
  fileHelpers = require('./fileHelpers'),
  logger = require("./logger").winstonLogger,
  Constants = require('./constants'),
  process = require('process'),
  utils = require('./utils'),
  { spawn } = require('child_process');

let nodeProcess;

const setupPackageFolder = (runSettings, directoryPath) => {
  return new Promise(function (resolve, reject) {
    fileHelpers.deletePackageArchieve(false);
    fs.mkdir(directoryPath, function (err) {
      try {
        if (err) {
          return reject(err);
        }
        let packageJSON = {};
        if (typeof runSettings.package_config_options === 'object') {
          Object.assign(packageJSON, runSettings.package_config_options);
        }

        if (typeof runSettings.npm_dependencies === 'object') {
          Object.assign(packageJSON, {
            devDependencies: runSettings.npm_dependencies,
          });
        }

        if (Object.keys(packageJSON).length > 0) {
          let packageJSONString = JSON.stringify(packageJSON);
          let packagePath = path.join(directoryPath, "package.json");
          fs.writeFileSync(packagePath, packageJSONString);
          let cypressFolderPath = path.dirname(runSettings.cypressConfigFilePath);
          let sourceNpmrc = path.join(cypressFolderPath, ".npmrc");
          let destNpmrc = path.join(directoryPath, ".npmrc");
          if (fs.existsSync(sourceNpmrc)) {
            fs.copyFileSync(sourceNpmrc, destNpmrc);
          }
          return resolve("Package file created");
        }
        return reject("Nothing in package file");
      } catch(error) {
        return reject(error);
      }
    })
  })
};

const packageInstall = (packageDir) => {
  return new Promise(function (resolve, reject) {
    const nodeProcessCloseCallback = (code) => {
      if(code == 0) {
        resolve('Packages were installed successfully.');
      } else {
        reject('Packages were not installed successfully.');
      }
    };
    const nodeProcessErrorCallback = (error) => {
      logger.error(`Some error occurred while installing packages: ${error}`);
      reject(`Packages were not installed successfully.`);
    };
    nodeProcess = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['install'], {cwd: packageDir});
    nodeProcess.on('close', nodeProcessCloseCallback);
    nodeProcess.on('error', nodeProcessErrorCallback);
  });
};

const packageArchiver = (packageDir, packageFile) => {
  return new Promise(function (resolve, reject) {
    let output = fs.createWriteStream(packageFile);
    let archive = archiver('tar', {
      gzip: true
    });
    archive.on('warning', function (err) {
      if (err.code === 'ENOENT') {
        logger.info(err);
      } else {
        reject(err);
      }
    });

    output.on('close', function () {
      resolve('Zipping completed');
    });

    output.on('end', function () {
      logger.info('Data has been drained');
    });

    archive.on('error', function (err) {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(packageDir, false);
    archive.finalize();
  })
}

const packageWrapper = (bsConfig, packageDir, packageFile, md5data, instrumentBlocks) => {
  return new Promise(function (resolve) {
    let obj = {
      packageArchieveCreated: false
    };
    if (md5data.packageUrlPresent || !utils.isTrueString(bsConfig.run_settings.cache_dependencies)) {
      return resolve(obj);
    }
    logger.info(Constants.userMessages.NPM_INSTALL_AND_UPLOAD);
    instrumentBlocks.markBlockStart("packageInstaller.folderSetup");
    return setupPackageFolder(bsConfig.run_settings, packageDir).then((_result) => {
      process.env.CYPRESS_INSTALL_BINARY = 0
      instrumentBlocks.markBlockEnd("packageInstaller.folderSetup");
      instrumentBlocks.markBlockStart("packageInstaller.packageInstall");
      return packageInstall(packageDir);
    }).then((_result) => {
      instrumentBlocks.markBlockEnd("packageInstaller.packageInstall");
      instrumentBlocks.markBlockStart("packageInstaller.packageArchive");
      return packageArchiver(packageDir, packageFile);
    }).then((_result) => {
      instrumentBlocks.markBlockEnd("packageInstaller.packageArchive");
      Object.assign(obj, { packageArchieveCreated: true });
      return resolve(obj);
    }).catch((err) => {
      obj.error = err.stack ? err.stack.toString().substring(0,100) : err.toString().substring(0,100);
      return resolve(obj);
    })
  })
}

exports.packageWrapper = packageWrapper;
