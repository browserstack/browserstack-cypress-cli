'use strict'
const request = require('request');

const downloadBuildStacktrace = async () => {
  let url = "https://automate-local.bsstag.com/s3-upload/cypress-dev-staging/s3.eu-central-1/70%%20cace12bc4d920ce6d7f647f66e4a3239e291d3/session_debug.log?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA2XUQHUQMLDK6KO4W%2F20220131%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20220131T084205Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=a4ae9498d370040276dbed5fce1ed69c59db0f1809050c52baa5372e5f43e952"
  return new Promise(async (resolve, reject) => {
    request.get(url).on('response', function (response) {
      if(response.statusCode == 200) {
        response.pipe(process.stdout);
        let error = null;
        process.stdout.on('error', (err) => {
          error = err;
          process.stdout.close();
          reject(err);
        });
        process.stdout.on('close', async () => {
          if(!error) {
            resolve("Build stacktrace downloaded successfully");
          }
        });
      } else {
        reject(response.statusCode);
      }
    });
  });
};

exports.downloadBuildStacktrace = downloadBuildStacktrace;
