'use strict';
const fs = require('fs-extra'),
  path = require('path'),
  mkdirp = require('mkdirp');

const logger = require('./logger').winstonLogger;

exports.isEmpty = function(path, cb) {
  fs.readdir(path, function(err, files) {
    if (err && 'ENOENT' != err.code) throw err;
    cb(!files || !files.length);
  });
}

exports.isDirectory = function(path, cb) {
  fs.stat(path, function(err, stats) {
    if (err && 'ENOENT' != err.code) throw err;
    if (err) {
      return cb(false)
    }
    cb(stats.isDirectory())
  })
}

exports.isFile = function(path, cb) {
  fs.stat(path, function(err, stats) {
    if (err && 'ENOENT' != err.code) throw err;
    if (err) {
      return cb(false)
    }
    cb(stats.isFile())
  })
}

exports.mkdir = function(dir, cb) {
  mkdirp(dir, '0755', function(err) {
    if (err) throw err;
    logger.info("Creating directory: ./" + path.relative(process.cwd(), dir));
    cb && cb()
  })
}

exports.write = function(f, message, cb) {
  message = message || 'Creating';
  fs.writeFile(f.path, f.file, function() {
    logger.info(message + " file: ./" + path.relative(process.cwd(), f.path));
    cb && cb()
  });
}

exports.fileExists = function(filePath, cb) {
  fs.access(filePath, fs.F_OK, (err) => {
    let exists = true;
    if (err) {
      exists = false;
    }

    cb && cb(exists)
  })
}
