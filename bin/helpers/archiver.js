
const fs = require('fs'),
  archiver = require('archiver'),
  logger = require("./logger"),
  glob = require("glob"),
  path = require('path');

const getFiles = (jsGlobs, basePath, cb) => {
  files = [];

  jsGlobs.forEach(function (item) {
    logger.log("Adding  " + item + " to zip"); 
    files = glob.sync(basePath + item)
  });

  files = files.map(file => path.relative(basePath, file))
  
  if (cb){
    cb(files);
  }

  return files;
}

const archiveSpecs = (runSettings, filePath) => {
  return new Promise(function (resolve, reject) {
    var output = fs.createWriteStream(filePath);

    var cypressJSONPath = runSettings.cypress + "/cypress.json"
    var cypressEnvJSONPath = runSettings.cypress + "/cypress.env.json"
    var cypressFolderPath = runSettings.cypress + "/cypress"
    var basePath = runSettings.cypress

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

    fileNames = [];

    // getFiles(runSettings.specs, basePath, (files) => {
    //   fileNames = fileNames.concat(files);
    // })

    // getFiles(runSettings.supports, basePath, (files) => {
    //   archive.append(JSON.stringify({"support": files}), {name: "cypress_helpers.json"})
    //   fileNames = fileNames.concat(files);
    // })

    // getFiles(runSettings.plugins, basePath, (files) => {
    //   fileNames = fileNames.concat(files);
    // })

    // getFiles(runSettings.fixtures, basePath, (files) => {
    //   fileNames = fileNames.concat(files);
    // })

    // fileNames.forEach(function(file) {
    //   archive.file(basePath + file, { name: file });  
    // });

    // Add cypress.json
    archive.file(cypressJSONPath, { name: "cypress.json" });  
    archive.file(cypressEnvJSONPath, { name: "cypress.env.json" });
    archive.directory(cypressFolderPath, false);

    archive.finalize();
  });
}

exports.archive = archiveSpecs
