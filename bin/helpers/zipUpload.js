'use strict';

const request = require("request"),
  fs = require("fs");

const cliProgress = require('cli-progress');

const config = require("./config"),
  logger = require("./logger").winstonLogger,
  Constants = require("./constants"),
  utils = require("./utils");


const purgeUploadBar = (obj) => {
  obj.bar1.update(100, {
    speed: ((obj.size / (Date.now() - obj.startTime)) / 125).toFixed(2) //kbits per sec
  });
  obj.bar1.stop();
  clearInterval(obj.zipInterval);
}

const uploadSuits = (bsConfig, filePath, opts, obj) => {
  return new Promise(function (resolve, reject) {
    let uploadProgressBarErrorFlags = {
      noConnectionReportSent: false,
      unknownErrorReportSent: false
    };
    obj.startTime = Date.now();

    if (opts.urlPresent) {
      opts.cleanupMethod();
      return resolve({ [opts.md5ReturnKey]: opts.url });
    }
    if (!opts.archivePresent) {
      return resolve({});
    }

    let size = obj.size;

    // create new progress bar
    obj.bar1 = new cliProgress.SingleBar({
      format: `${filePath} [{bar}] {percentage}% | ETA: {eta}s | Speed: {speed} kbps | Duration: {duration}s [${(size / 1000000).toFixed(2)} MB]`
    });

    obj.bar1.start(100, 0, {
      speed: "N/A"
    });

    obj.bar1.on('start', () => {
    });

    obj.bar1.on('stop', () => {
    });

    let options = utils.generateUploadParams(bsConfig, filePath, opts.md5Data, opts.fileDetails)
    let responseData = null;
    var r = request.post(options, function (err, resp, body) {

      if (err) {
        reject({message: err, stacktrace: utils.formatRequest(err, resp, body)});
      } else {
        try {
          responseData = JSON.parse(body);
        } catch (e) {
          responseData = {};
        }
        if (resp.statusCode != 200) {
          if (resp.statusCode == 401) {
            if (responseData && responseData["error"]) {
              responseData["time"] = Date.now() - obj.startTime;
              return reject({message: responseData["error"], stacktrace: utils.formatRequest(err, resp, body)});
            } else {
              return reject({message: Constants.validationMessages.INVALID_DEFAULT_AUTH_PARAMS, stacktrace: utils.formatRequest(err, resp, body)});
            } 
          }
          if (!opts.propogateError){
            purgeUploadBar(obj);
            if (resp.statusCode == 413) {
              return resolve({warn: Constants.userMessages.NODE_MODULES_LIMIT_EXCEEDED.replace("%SIZE%", (size / 1000000).toFixed(2))});
            }
            return resolve({})
          }
          if(responseData && responseData["error"]){
            responseData["time"] = Date.now() - obj.startTime;
            reject({message: responseData["error"], stacktrace: utils.formatRequest(err, resp, body)});
          } else {
            if (resp.statusCode == 413) {
              reject({message: Constants.userMessages.ZIP_UPLOAD_LIMIT_EXCEEDED, stacktrace: utils.formatRequest(err, resp, body)});
            } else {
              reject({message: Constants.userMessages.ZIP_UPLOADER_NOT_REACHABLE, stacktrace: utils.formatRequest(err, resp, body)});
            }
          }
        } else {
          purgeUploadBar(obj);
          logger.info(`${opts.messages.uploadingSuccess} (${responseData[opts.md5ReturnKey]})`);
          opts.cleanupMethod();
          responseData["time"] = Date.now() - obj.startTime;
          resolve(responseData);
        }
      }
    });

    obj.zipInterval = setInterval(function () {
      const errorCode = 'update_upload_progress_bar_failed';
      try {
        if (r && r.req && r.req.connection) {
          let dispatched = r.req.connection._bytesDispatched;
          let percent = dispatched * 100.0 / size;
          obj.bar1.update(percent, {
            speed: ((dispatched / (Date.now() - obj.startTime)) / 125).toFixed(2) //kbits per sec
          });
        } else {
          if (!uploadProgressBarErrorFlags.noConnectionReportSent) {
            logger.debug(Constants.userMessages.NO_CONNECTION_WHILE_UPDATING_UPLOAD_PROGRESS_BAR);
            utils.sendUsageReport(
              bsConfig,
              null,
              Constants.userMessages.NO_CONNECTION_WHILE_UPDATING_UPLOAD_PROGRESS_BAR,
              Constants.messageTypes.WARNING,
              errorCode,
              null,
              null
            );
            uploadProgressBarErrorFlags.noConnectionReportSent = true;
          }
        }
      } catch (error) {
        if (!uploadProgressBarErrorFlags.unknownErrorReportSent) {
          logger.debug('Unable to determine progress.');
          logger.debug(error);
          utils.sendUsageReport(
            bsConfig,
            null,
            error.stack,
            Constants.messageTypes.WARNING,
            errorCode,
            null,
            null
          );
          uploadProgressBarErrorFlags.unknownErrorReportSent = true;
        }
      }
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

    var testZipUploadObj = {
      bar1: null,
      zipInterval: null,
      size: fs.existsSync(config.fileName) ? fs.lstatSync(config.fileName).size : 0,
      startTime: null
    }

    var npmPackageZipUploadObj = {
      bar1: null,
      zipInterval: null,
      size: fs.existsSync(config.packageFileName) ? fs.lstatSync(config.packageFileName).size : 0,
      startTime: null
    }

    let zipUpload = uploadSuits(bsConfig, config.fileName, zipOptions, testZipUploadObj);
    let npmPackageUpload = uploadSuits(bsConfig, config.packageFileName, npmOptions, npmPackageZipUploadObj);
    Promise.all([zipUpload, npmPackageUpload]).then(function (uploads) {
      uploads.forEach(upload => {
        if(upload.warn) {
          logger.warn(upload.warn);
        }
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
      testZipUploadObj.bar1 && purgeUploadBar(testZipUploadObj);
      npmPackageZipUploadObj.bar1 && purgeUploadBar(npmPackageZipUploadObj);
      logger.error(error.stacktrace)
      return reject(error.message);
    })
  })
}

exports.zipUpload = uploadCypressZip;
