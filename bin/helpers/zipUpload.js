'use strict';

const request = require("request"),
  fs = require("fs");

const cliProgress = require('cli-progress');

const config = require("./config"),
  logger = require("./logger").winstonLogger,
  Constants = require("./constants"),
  utils = require("./utils");

const uploadSuits = (bsConfig, filePath, opts) => {
  return new Promise(function (resolve, reject) {
    let startTime = Date.now();

    if (opts.urlPresent) {
      return resolve({ [opts.md5ReturnKey]: opts.url });
    }
    if (!opts.archivePresent) {
      return resolve({});
    }

    let size = fs.lstatSync(filePath).size;

    // create new progress bar
    let bar1 = new cliProgress.SingleBar({
      format: `${filePath} [{bar}] {percentage}% | ETA: {eta}s | Speed: {speed} kbps | Duration: {duration}s [${(size / 1000000).toFixed(2)} MB]`,
      hideCursor: true,
    });

    bar1.start(100, 0, {
      speed: "N/A"
    });

    bar1.on('start', () => {
    });

    bar1.on('stop', () => {
    });

    let options = utils.generateUploadParams(bsConfig, filePath, opts.md5Data, opts.fileDetails)
    let responseData = null;
    var r = request.post(options, function (err, resp, body) {
      clearInterval(q);

      if (err) {
        reject(err);
      } else {
        try {
          responseData = JSON.parse(body);
        } catch (e) {
          responseData = {};
        }
        if (resp.statusCode != 200) {
          if (resp.statusCode == 401) {
            if (responseData && responseData["error"]) {
              responseData["time"] = Date.now() - startTime;
              return reject(responseData["error"]);
            } else {
              return reject(Constants.validationMessages.INVALID_DEFAULT_AUTH_PARAMS);
            } 
          }
          if (!opts.propogateError){
            return resolve({});
          }
          if(responseData && responseData["error"]){
            responseData["time"] = Date.now() - startTime;
            reject(responseData["error"]);
          } else {
            if (resp.statusCode == 413) {
              reject(Constants.userMessages.ZIP_UPLOAD_LIMIT_EXCEEDED);
            } else {
              reject(Constants.userMessages.ZIP_UPLOADER_NOT_REACHABLE);
            }
          }
        } else {
          bar1.update(100, {
            speed: ((size / (Date.now() - startTime)) / 125).toFixed(2) //kbits per sec
          });
          bar1.stop();
          logger.info(`${opts.messages.uploadingSuccess} (${responseData[opts.md5ReturnKey]})`);
          opts.cleanupMethod();
          responseData["time"] = Date.now() - startTime;
          resolve(responseData);
        }
      }
    });

    var q = setInterval(function () {
      let dispatched = r.req.connection._bytesDispatched;
      let percent = dispatched * 100.0 / size;
      bar1.update(percent, {
        speed: ((dispatched / (Date.now() - startTime)) / 125).toFixed(2) //kbits per sec
      });
    }, 150);

  });
}


const uploadCypressZip = (bsConfig, md5data, packageData) => {
  return new Promise(function (resolve, reject) {
    let obj = {}
    const zipOptions = utils.generateUploadOptions('zip', md5data, packageData);
    const npmOptions = utils.generateUploadOptions('npm', md5data, packageData);

    if(zipOptions.urlPresent) logger.info(Constants.userMessages.SKIP_UPLOADING_TESTS);
    if(npmOptions.urlPresent) logger.info(Constants.userMessages.SKIP_UPLOADING_NPM_PACKAGES);

    if (!zipOptions.urlPresent && zipOptions.archivePresent) {
      logger.info(zipOptions.messages.uploading);
    }

    if (!npmOptions.urlPresent && npmOptions.archivePresent) {
      logger.info(npmOptions.messages.uploading);
    }

    let zipUpload = uploadSuits(bsConfig, config.fileName, zipOptions);
    let npmPackageUpload = uploadSuits(bsConfig, config.packageFileName, npmOptions);
    Promise.all([zipUpload, npmPackageUpload]).then(function (uploads) {
      uploads.forEach(upload => {
        if(upload.zip_url && upload.time) {
          upload.tests_upload_time = upload.time;
        } else if (upload.npm_package_url && upload.time) {
          upload.npm_package_upload_time = upload.time;
        }
        delete upload.time;
        Object.assign(obj, upload);
      });
      return resolve(obj);
    }).catch((error) => {
      return reject(error);
    })
  })
}

exports.zipUpload = uploadCypressZip;
