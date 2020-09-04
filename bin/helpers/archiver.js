'use strict';
const fs = require("fs");

const archiver = require("archiver"),
  Constants = require('../helpers/constants'),
  logger = require("./logger").winstonLogger;

const archiveSpecs = (runSettings, filePath, excludeFiles) => {
  return new Promise(function (resolve, reject) {
    var output = fs.createWriteStream(filePath);

    var cypressFolderPath = runSettings.cypress_proj_dir;

    var archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });

    archive.on('warning', function (err) {
      if (err.code === 'ENOENT') {
        logger.info(err);
      } else {
        reject(err);
      }
    });

    output.on('close', function () {
      resolve("Zipping completed");
    });

    output.on('end', function () {
      logger.info('Data has been drained');
    });

    archive.on('error', function (err) {
      reject(err);
    });

    archive.pipe(output);

    let ignoreFiles = Constants.filesToIgnoreWhileUploading;

    // exclude files asked by the user
    // args will take precedence over config file
    if (!Utils.isUndefined(excludeFiles)) {
      ignoreFiles = ignoreFile.concat(Utils.fixCommaSeparatedString(excludeFiles).split(','));
    } else if (!Utils.isUndefined(runSettings.exclude)) {
      ignoreFiles = ignoreFile.concat(excludeFiles);
    }

    Constants.allowedFileTypes.forEach(fileType => {
      archive.glob(`**/*.${fileType}`, { cwd: cypressFolderPath, matchBase: true, ignore: ignoreFiles });
    });

    let packageJSON = {};

    if (typeof runSettings.package_config_options === 'object') {
      Object.assign(packageJSON, runSettings.package_config_options);
    }

    if (typeof runSettings.npm_dependencies === 'object') {
      Object.assign(packageJSON, {devDependencies: runSettings.npm_dependencies});
    }

    if (Object.keys(packageJSON).length > 0) {
      let packageJSONString = JSON.stringify(packageJSON, null, 4);
      archive.append(packageJSONString, { name: 'browserstack-package.json' });
    }

    archive.finalize();
  });
}

exports.archive = archiveSpecs
