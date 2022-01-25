'use strict'

const request = require('request');
const { inspect } = require('util');

const downloadBuildStacktrace = async (url) => {
	let tmpFilePath = path.join("a", "fileName");
  const writer = fs.createWriteStream(tmpFilePath);
	return new Promise(async (resolve, reject) => {
    request.get(url).on('response', function(response) {

      if(response.statusCode != 200) {
        reject();
      } else {
        //ensure that the user can call `then()` only when the file has
        //been downloaded entirely.
				console.log(`roshan1: the response is ${inspect(response)}`);
        response.pipe(writer);
        let error = null;
        writer.on('error', err => {
          error = err;
          writer.close();
          reject(err);
        });
        writer.on('close', async () => {
          if (!error) {
            await unzipFile("a", "fileName");
            fs.unlinkSync(tmpFilePath);
            resolve(true);
          }
          //no need to call the reject here, as it will have been called in the
          //'error' stream;
        });
      }
    });
  });
};

exports.downloadBuildStacktrace = downloadBuildStacktrace;