'use strict';
var config = require('../helpers/config');
var request = require('request')
var logger = require("../helpers/logger");

module.exports = function info(args) {
  return buildDelete(args)
}

function buildDelete(args) {
  let bsConfigPath = process.cwd() + args.cf;
  logger.log(`Reading browserstack.json from ${args.cf}`);
  var bsConfig = require(bsConfigPath);

  let buildId = args._[1]

  let options = {
    url: config.buildUrl + buildId,
    method: 'DELETE',
    auth: {
      user: bsConfig.auth.username,
      password: bsConfig.auth.access_key
    }    
  }

  request(options, function (err, resp, body) {
    if (err) {
      logger.log("Failed to delete build");
    } else {
      let build = JSON.parse(body)
      if (resp.statusCode != 200) {
        logger.log(`Build deletion failed with error: \n ${JSON.stringify(build, null, 2)}`);
      } else {
        logger.log(`Build deleted with build id: \n ${JSON.stringify(build, null, 2)}`);
      }
    }
  })    
}
