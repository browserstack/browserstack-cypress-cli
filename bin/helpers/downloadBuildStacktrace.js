'use strict';
const { default: axios } = require('axios');
const { setAxiosProxy } = require('./helper');

const downloadBuildStacktrace = async (url, bsConfig) => {
  const axiosConfig = {
    auth: {
      username: bsConfig.auth.username,
      password: bsConfig.auth.access_key
    },
    responseType: 'stream',
  };
  setAxiosProxy(axiosConfig);

  return new Promise(async (resolve, reject) => {
    try {
      const response = await axios.get(url, axiosConfig);
      if (response.status === 200) {
        response.data.pipe(process.stdout);
        let error = null;
        process.stdout.on('error', (err) => {
          error = err;
          process.stdout.close();
          reject(response.status);
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
