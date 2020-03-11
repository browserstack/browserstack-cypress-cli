
var fs = require('fs');
var archiver = require('archiver');
var request = require('request')
var config = require('./config');
var logger = require("./logger")
var glob = require("glob")
const path = require('path');


const getFiles = (jsGlobs, basePath, cb) => {
  files = [];

  jsGlobs.forEach(function (item) {
    logger.log("Adding  " + item + " to zip"); 
    files = glob.sync(basePath + item)
    // files.forEach(file => {
    //   fileNames.push(path.relative(basePath, file))
    // });
    // shortFiles = files.map(file => path.relative(basePath, file))
    // archive.append(JSON.stringify({"support": shortFiles}), {name: "cypress_helpers.json"})
  });

  files = files.map(file => path.relative(basePath, file))

  console.log(files);
  if (cb){
    console.log('calling callback');
    cb(files);
  }


  return files;
}

const archiveSpecs = (runSettings, filePath) => {
  return new Promise(function (resolve, reject) {
    var output = fs.createWriteStream(filePath);

    var cypressJSONPath = runSettings.cypress + "/cypress.json"
    var basePath = runSettings.cypress + "/cypress/"

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

    getFiles(runSettings.specs, basePath, (files) => {
      fileNames = fileNames.concat(files);
    })

    getFiles(runSettings.supports, basePath, (files) => {
      archive.append(JSON.stringify({"support": files}), {name: "cypress_helpers.json"})
      fileNames = fileNames.concat(files);
    })

    getFiles(runSettings.plugins, basePath, (files) => {
      fileNames = fileNames.concat(files);
    })

    getFiles(runSettings.fixtures, basePath, (files) => {
      fileNames = fileNames.concat(files);
    })

    fileNames.forEach(function(file) {
      archive.file(basePath + file, { name: file });  
    });

    // Add cypress.json
    archive.file(cypressJSONPath, { name: "cypress.json" });  

    archive.finalize();
  });
}

exports.archive = archiveSpecs
