'use strict';

const fs = require("fs");

const cliProgress = require('cli-progress');
const { default: axios } = require("axios");
const FormData = require("form-data");

const config = require("./config"),
  logger = require("./logger").winstonLogger,
  Constants = require("./constants"),
  utils = require("./utils");

const { setAxiosProxy } = require('./helper');

const purgeUploadBar = (obj) => {
  obj.bar1.update(100, {
    speed: ((obj.size / (Date.now() - obj.startTime)) / 125).toFixed(2) //kbits per sec
  });
  obj.bar1.stop();
}

const uploadSuits = (bsConfig, filePath, opts, obj) => {
  return new Promise(async function (resolve, reject) {
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
    try {
      const formData = new FormData();
      formData.append("file", fs.createReadStream(filePath));
      formData.append("filetype", opts.fileDetails.filetype);
      formData.append("filename", opts.fileDetails.filename);
      formData.append("zipMd5sum", opts.md5Data ? opts.md5Data : '');

      const axiosConfig = {
        auth: {
          username: options.auth.user,
          password: options.auth.password
        },
        headers: options.headers,
        onUploadProgress: (progressEvent) => {
          let percent = parseInt(Math.floor((progressEvent.loaded * 100) / progressEvent.total));
          obj.bar1.update(percent, {
            speed: ((progressEvent.bytes / (Date.now() - obj.startTime)) / 125).toFixed(2) //kbits per sec
          });
        },
      };
      setAxiosProxy(axiosConfig);

      const response = await axios.post(options.url, formData, axiosConfig);
      responseData = response.data;
      purgeUploadBar(obj)
      logger.info(`${opts.messages.uploadingSuccess} (${responseData[opts.md5ReturnKey]})`);
      opts.cleanupMethod();
      responseData["time"] = Date.now() - obj.startTime;
      resolve(responseData);
    } catch (error) {
      let responseData = null;
      if(error.response){
        responseData = error.response.data;
        if (error.response.status === 401) {
          if (responseData && responseData.error) {
            responseData.time = Date.now() - obj.startTime;
            return reject({message: responseData.error, stacktrace: utils.formatRequest(responseData.error, error.response, responseData)});
          } else {
            return reject({message: Constants.validationMessages.INVALID_DEFAULT_AUTH_PARAMS, stacktrace: utils.formatRequest(error.response.statusText, error.response, responseData)});
          } 
        }
        if (!opts.propogateError){
          purgeUploadBar(obj);
          if (error.response.status === 413) {
            return resolve({warn: Constants.userMessages.NODE_MODULES_LIMIT_EXCEEDED.replace("%SIZE%", (size / 1000000).toFixed(2))});
          }
          return resolve({})
        }
        if(responseData && responseData["error"]){
          responseData["time"] = Date.now() - obj.startTime;
          reject({message: responseData["error"], stacktrace: utils.formatRequest(error.response.statusText, error.response, responseData)});
        } else {
          if (error.response.status === 413) {
            reject({message: Constants.userMessages.ZIP_UPLOAD_LIMIT_EXCEEDED, stacktrace: utils.formatRequest(error.response.statusText, error.response, responseData)});
          } else {
            reject({message: Constants.userMessages.ZIP_UPLOADER_NOT_REACHABLE, stacktrace: utils.formatRequest(error.response.statusText, error.response, responseData)});
          }
        }
        reject({message: error.response, stacktrace: utils.formatRequest(error.response.statusText, error.response, error.response.data)});
      } else {
        reject({})
      }
    }
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
