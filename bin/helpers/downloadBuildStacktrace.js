'use strict';
const { default: axios } = require('axios');

const downloadBuildStacktrace = async (url) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axios.get(url, { responseType: 'stream' });
      if (response.status === 200) {
        response.data.pipe(process.stdout);
        let error = null;
        process.stdout.on('error', (err) => {
          error = err;
          process.stdout.close();
          reject(response.statusCode);
        });
        process.stdout.on('close', async () => {
          if (!error) {
            resolve('Build stacktrace downloaded successfully');
          }
        });
      }
    } catch (error) {
      reject(error.response.status);
    }
  });
};

exports.downloadBuildStacktrace = downloadBuildStacktrace;
