
var fs = require('fs');
var archiver = require('archiver');
var request = require('request')
var config = require('./config');
var logger = require("./logger")


const archiveSpecs = (specs, filePath) => {
  return new Promise(function (resolve, reject) {
    var output = fs.createWriteStream(filePath);

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

    specs.forEach(function (item, index) {
      logger.log("Adding  " + item + " to zip");
      archive.glob(item);
    });

    archive.finalize();
  });
}

exports.archive = archiveSpecs
