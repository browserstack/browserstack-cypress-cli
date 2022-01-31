'use strict'
const request = require('request');

const downloadBuildStacktrace = async (url) => {
  return new Promise(async (resolve, reject) => {
    request.get(url).on('response', function (response) {
      if(response.statusCode == 200) {
        response.pipe(process.stdout);
        let error = null;
        process.stdout.on('error', (err) => {
          error = err;
          process.stdout.close();
          reject(response.statusCode);
        });
        process.stdout.on('close', async () => {
          if(!error) {
            resolve("Build stacktrace downloaded successfully");
          }
        });
      } else {
        reject(response.statusCode);
      }
    }).on('end', () => {
      resolve("Build stacktrace downloaded successfully");
    });
  });
};

exports.downloadBuildStacktrace = downloadBuildStacktrace;
