'use strict';
const fs = require('fs-extra'),
  path = require('path');

const logger = require('./logger').winstonLogger;

exports.write = function(f, message, cb) {
  message = message || 'Creating';
  fs.writeFile(f.path, f.file, function() {
    logger.info(message + " file: ./" + path.relative(process.cwd(), f.path));
    cb && cb()
  });
}

exports.fileExists = function(filePath, cb) {
  let exists = true;
  fs.access(filePath, fs.F_OK, (err) => {
    if (err) {
      exists = false;
    }
  })
  cb && cb(exists);
}
