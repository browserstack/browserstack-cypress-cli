'use strict';
const fileHelpers = require("../helpers/fileHelpers"),
  Constants = require("../helpers/constants"),
  logger = require("../helpers/logger").winstonLogger,
  util = require("../helpers/util");

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
    let message = Constants.userMessages.CONFIG_FILE_CREATED
    logger.info(message);
    util.sendUsageReport(null, args, message, Constants.messageTypes.SUCCESS, null);
  }

  return fileHelpers.fileExists(config.path, function(exists){
    if (exists) {
      let message = Constants.userMessages.CONFIG_FILE_EXISTS;
      logger.error(message);
      util.sendUsageReport(null, args, message, Constants.messageTypes.ERROR, 'bstack_json_already_exists');
    } else {
      fileHelpers.write(config, null, allDone);
    }
  })
}
