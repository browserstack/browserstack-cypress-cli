'use strict';
const fs = require('fs-extra'),
  path = require('path');

const logger = require('./logger').winstonLogger,
  Constants = require('../helpers/constants'),
  process = require('process'),
  config = require('../helpers/config');

exports.write = function (f, message, args, cb) {
  message = message || 'Creating';
  fs.writeFile(f.path, f.file, function () {
    logger.info(message + ' file: ' + f.path);
    cb && cb(args);
  });
};

exports.fileExists = function (filePath, cb) {
  fs.access(filePath, fs.F_OK, (err) => {
    let exists = true;
    if (err) {
      exists = false;
    }
    cb && cb(exists);
  });
};

exports.deleteZip = () => {
  try {
    fs.unlinkSync(config.fileName);
    logger.info(Constants.userMessages.ZIP_DELETED);
    return 0;
  } catch (err) {
    logger.info(Constants.userMessages.ZIP_DELETE_FAILED);
    return 1;
  }
};

exports.deletePackageArchieve = (logging = true) => {
  try {
    delete process.env.CYPRESS_INSTALL_BINARY;
    fs.removeSync(config.packageFileName);
    fs.removeSync(config.packageDirName);
    if (logging) logger.info(Constants.userMessages.NPM_DELETED);
    return 0;
  } catch (err) {
    if (logging) logger.info(Constants.userMessages.NPM_DELETE_FAILED);
    logger.debug("Could not delete the dependency packages with error :", err);
    return 1;
  }
};

exports.dirExists = function (filePath, cb) {
  let exists = false;
  if (fs.existsSync(path.dirname(filePath), cb)) {
    exists = true;
  }
  cb && cb(exists);
};
