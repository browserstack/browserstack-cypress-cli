'use strict';
const fs = require("fs");

const archiver = require("archiver"),
  logger = require("./logger").winstonLogger;

const archiveSpecs = (runSettings, filePath) => {
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

    let allowedFileTypes = [ 'js', 'json', 'txt', 'ts' ];
    allowedFileTypes.forEach(fileType => {
      archive.glob(`**/*.${fileType}`, { cwd: cypressFolderPath, matchBase: true, ignore: ['node_modules/**', 'package-lock.json', 'package.json', 'browserstack-package.json'] });
    });

    if (typeof runSettings.npm_dependencies === 'object') {
      var packageJSON = JSON.stringify({devDependencies: runSettings.npm_dependencies}, null, 4);
      archive.append(packageJSON, { name: 'browserstack-package.json' });
    }

    archive.finalize();
  });
}

exports.archive = archiveSpecs
