'use strict';
const glob = require('readdir-glob'),
  Constants = require('./constants'),
  crypto = require('crypto'),
  fs = require('fs');

const hashWrapper = (options, instrumentBlocks) => {
  instrumentBlocks.markBlockStart("checkAlreadyUploaded.md5Stats");
  return folderStats(options).then((files) => {
    instrumentBlocks.markBlockEnd("checkAlreadyUploaded.md5Stats");
    instrumentBlocks.markBlockStart("checkAlreadyUploaded.md5Batch");
    return batchHashFile(files);
  }).then((hashes) => {
    const combinedHash = crypto.createHash(Constants.hashingOptions.algo);
    hashes.forEach((hash) => combinedHash.update(hash));
    instrumentBlocks.markBlockEnd("checkAlreadyUploaded.md5Batch");
    return combinedHash.digest(Constants.hashingOptions.encoding);
  });
}

const folderStats = (options) => {
  return new Promise((resolve, reject) => {
    let readDirOptions = {};
    Object.assign(readDirOptions, Constants.readDirOptions, options)
    let globber = glob(readDirOptions.cwd || '.', readDirOptions);
    let files = [];
    globber.on('match', (fileMatch) => {
      files.push({relativePath: fileMatch.relative, absolutePath: fileMatch.absolute, stats: fileMatch.stat})
    });
    globber.on('error', (_err) => {
      reject("Error in getting files.");
    });
    globber.on('end', (_) => {
      resolve(files);
    });
  });
}

const batchHashFile = (fileBatch) => {
  return Promise.resolve(fileBatch).then((files) => {
    files = Array(Math.ceil(files.length / Constants.hashingOptions.parallel)).fill([]).map((_, index) => index * Constants.hashingOptions.parallel).map(begin => files.slice(begin, begin + Constants.hashingOptions.parallel));
    files = files.map((batch) => {
      return (res) => Promise.all(batch.map(hashFile)).then((data) => res.concat(data));
    });
    let hash = files.reduce((acc, curr) => acc.then(curr), Promise.resolve([]));
    return hash;
  });
};

const hashFile = (file) => {
  return new Promise((resolve) => {
    let { relativePath, absolutePath, stats } = file;
    const hash = crypto.createHash(Constants.hashingOptions.algo);
    hash.update(relativePath);
    if (stats.isFile()) {
      const f = fs.createReadStream(absolutePath);
      f.on('end', () => {
        const hashedValue = hash.digest(Constants.hashingOptions.encoding);
        return resolve(hashedValue);
      });
      f.pipe(hash, { end: false });
    } else {
      // paths like empty directories.
      const hashedValue = hash.digest(Constants.hashingOptions.encoding);
      return resolve(hashedValue);
    }
  });
};

exports.hashWrapper = hashWrapper;
