'use strict';
var config = require('../helpers/config');
var request = require('request')
var logger = require("../helpers/logger");
var Constant = require("../helpers/constants")

module.exports = function info(args) {
  return buildInfo(args)
}

function buildInfo(args) {
  let bsConfigPath = process.cwd() + args.cf;
  logger.log(`Reading config from ${args.cf}`);
  var bsConfig = require(bsConfigPath);

  let buildId = args._[1]

  let options = {
    url: config.buildUrl + buildId,
    method: 'GET',
    auth: {
      user: bsConfig.auth.username,
      password: bsConfig.auth.access_key
    }
  }

  request(options, function (err, resp, body) {
    if (err) {
      logger.log(Constant.userMessages.BUILD_INFO_FAILED);
    } else {
      let  build = null
      try {
        build = JSON.parse(body)
      } catch (error) {
        build = null
      }
      
      if (resp.statusCode != 200) {
        if (build) {
          logger.error(`${Constant.userMessages.BUILD_INFO_FAILED} with error: \n${JSON.stringify(build, null, 2)}`);
        } else {
          logger.error(Constant.userMessages.BUILD_INFO_FAILED);
        }
      } else if(resp.statusCode == 299) {
        if(build) {
          logger.log(build.message);  
        } else {
          logger.log(Constants.userMessages.API_DEPRECATED);
        }
      } else {
        logger.log(`Build info for build id: \n ${JSON.stringify(build, null, 2)}`)
      }
    }
  })    
}
