'use strict'
const fs = require('fs'),
  request = require('request');

const downloadBuildStacktrace = async (url) => {
  let writer = fs.createWriteStream('a.txt');
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