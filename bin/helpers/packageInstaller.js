'use strict';
const npm = require('global-npm'),
  archiver = require("archiver"),
  path = require('path'),
  fs = require('fs-extra'),
  fileHelpers = require('./fileHelpers'),
  Constants = require('./constants'),
  process = require('process'),
  utils = require('./utils');

const setupPackageFolder = (runSettings, directoryPath) => {
  return new Promise(function (resolve, reject) {
    fileHelpers.deletePackageArchieve();
    fs.mkdir(directoryPath, (err) => {
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
        return resolve("package file created");
      }
      return reject("Nothing in package file");
    })
  })
};

const packageInstall = (packageDir) => {
  return new Promise(function (resolve, reject) {
    let savedPrefix = null;
    let npmLoad = Constants.packageInstallerOptions.npmLoad
    const installCallback = (err, result) => {
      npm.prefix = savedPrefix;
      if (err) {
        return reject(err);
      }
      resolve(result);
    };
    const loadCallback = (err) => {
      if (err) {
        return reject(err);
      }
      savedPrefix = npm.prefix;
      npm.prefix = packageDir;
      npm.commands.install(packageDir, [], installCallback);
    };
    npm.load(npmLoad, loadCallback);
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

const packageWrappper = (bsConfig, packageDir, packageFile, md5data, instrumentBlocks) => {
  return new Promise(function (resolve) {
    let obj = {
      packageArchieveCreated: false
    };
    if (md5data.packageUrlPresent || !utils.isTrueString(bsConfig.run_settings.local_npm_install)) {
      return resolve(obj);
    }
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
      obj.error = err.stack.substring(0,100)
      return resolve(obj);
    })
  })
}

exports.packageWrappper = packageWrappper;
