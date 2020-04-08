
const fs = require('fs'),
  archiver = require('archiver'),
  logger = require("./logger");

const archiveSpecs = (runSettings, filePath) => {
  return new Promise(function (resolve, reject) {
    var output = fs.createWriteStream(filePath);

    var cypressFolderPath = runSettings.cypress_proj_dir

    var archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });

    archive.on('warning', function (err) {
      if (err.code === 'ENOENT') {
        logger.log(err)
      } else {
        reject(err)
      }
    });

    output.on('close', function () {
      resolve("Zipping completed")
    });

    output.on('end', function () {
      logger.log('Data has been drained');
    });

    archive.on('error', function (err) {
      reject(err)
    });

    archive.pipe(output);

    archive.directory(cypressFolderPath, false);

    archive.finalize();
  });
}

exports.archive = archiveSpecs
