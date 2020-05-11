
const fs = require('fs'),
  archiver = require('archiver'),
  logger = require("./logger");

const archiveSpecs = (bsConfig, filePath) => {
  return new Promise(function (resolve, reject) {
    var output = fs.createWriteStream(filePath);

    var cypressFolderPath = bsConfig.run_settings.cypress_proj_dir

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

    var packageJSON = JSON.stringify({devDependencies: bsConfig.npm_dependencies}, null, 4);

    let allowedFileTypes = [ 'js', 'json', 'txt', 'ts' ]
    allowedFileTypes.forEach(fileType => {
      archive.glob(`**/*.${fileType}`, { cwd: cypressFolderPath, matchBase: true, ignore: 'node_modules/**' });
    });
    archive.append(packageJSON, { name: 'package.json' });

    archive.finalize();
  });
}

exports.archive = archiveSpecs
