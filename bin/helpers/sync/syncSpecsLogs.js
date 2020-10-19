'use strict';
const request = require('request'),
      config = require('../config'),
      utils = require('../utils'),
      logger = require("../logger").syncCliLogger;

let printSpecsStatus = (bsConfig, buildId) => {
  new Promise((resolve, reject) => {
    poll(data, 2000, 10000).then(resolve(data));
  });
}

let poll = (interval, timeout) => {
  data = []

  return pollRecursive()
        .timeout(timeout)
        .catch(Promise.TimeoutError, function () {
          return false;
        });
}

let pollRecursive = () => {
  return signal() ? Promise.resolve(true) : Promise.delay(interval).then(pollRecursive);
}

let makeReqest = () => {
  let backOffFactor = 3; // 3 seconds
  let options = {
    url: `${config.buildUrl}${buildId}`,
    auth: {
      user: bsConfig.auth.username,
      password: bsConfig.auth.access_key
    },
    headers: {
      'Content-Type': 'application/json',
      "User-Agent": utils.getUserAgent(),
    }
  }
  request.post(options, function (err, resp, body) {
    if (err) {
      reject(err);
    } else {
      try {
        data = JSON.parse(body);
      } catch (error) {
        data = null;
      }
      if (resp.statusCode != 202) {
        if (data) {
          reject(`${Constants.userMessages.BUILD_FAILED} Error: ${build.message}`);
        } else {
          reject(Constants.userMessages.BUILD_FAILED);
        }
      } else {
        resolve(build);
      }
      resolve(build);

    }
  });
}

exports.printSpecsStatus = printSpecsStatus;
