'use strict';
const fs = require("fs");

const archiver = require("archiver"),
  logger = require("./logger").winstonLogger,
  path = require('path');

const archiveSpecs = (runSettings, filePath) => {
  return new Promise(function (resolve, reject) {
    var output = fs.createWriteStream(filePath);

    var cypressFolderPath = path.dirname(runSettings.cypressConfigFilePath);

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

    let allowedFileTypes = [ 'js', 'json', 'txt', 'ts', 'feature', 'features', 'pdf', 'jpg', 'jpeg', 'png', 'zip' ];
    allowedFileTypes.forEach(fileType => {
      archive.glob(`**/*.${fileType}`, { cwd: cypressFolderPath, matchBase: true, ignore: ['**/node_modules/**', './node_modules/**', 'package-lock.json', 'package.json', 'browserstack-package.json', 'tests.zip', 'cypress.json'] });
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

    // do not add cypress.json if arg provided is false
    if (runSettings.cypress_config_file && runSettings.cypress_config_filename !== 'false') {
      let cypressJSON = JSON.parse(fs.readFileSync(runSettings.cypressConfigFilePath));
      let cypressJSONString = JSON.stringify(cypressJSON, null, 4);
      archive.append(cypressJSONString, { name: 'cypress.json' });
    }

    archive.finalize();
  });
}

exports.archive = archiveSpecs
