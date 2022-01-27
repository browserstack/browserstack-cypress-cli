'use strict'
const request = require('request');

const downloadBuildStacktrace = async (url) => {
	return new Promise(async (resolve, reject) => {
    request.get(url).on('data', (data) => {
      console.log(data.toString());
    }).on('error', (err) => {
      reject();
    }).on('end', () => {
      let terminalWidth = (process.stdout.columns) * 0.9;
      let lineSeparator = "\n" + "-".repeat(terminalWidth);
      console.log(lineSeparator)
      resolve();
    })
  });
};

exports.downloadBuildStacktrace = downloadBuildStacktrace;
