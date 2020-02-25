'use strict';
var fileHelpers = require('../helpers/fileHelpers');
const Constants = require('../helpers/constants');
var logger = require("../helpers/logger");

module.exports = function init(args) {
  return createBrowserStackConfig(args)
}

function createBrowserStackConfig(args) {

  if (args.p) {
    var path_to_bsconf = args.p + "/browserstack.json";
  } else {
    var path_to_bsconf = "./browserstack.json";
  }

  var config = {
    file: require('../templates/configTemplate')(),
    path: path_to_bsconf
  };

  function allDone() {
    logger.log(Constants.userMessages.CONFIG_FILE_CREATED);
  }

  return fileHelpers.fileExists(config.path, function(exists){
    if (exists) {
      logger.error(Constants.userMessages.CONFIG_FILE_EXISTS);
    } else {
      fileHelpers.write(config, null, allDone);
    }
  })
}
