'use strict';
const request = require('request'),
      config = require('../config'),
      utils = require('../utils'),
      logger = require("../logger").syncCliLogger;

let printSpecsStatus = (bsConfig, buildId) => {
  new Promise((resolve, reject) => {
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
  });
}

exports.printSpecsStatus = printSpecsStatus;
