'use strict';
const fileHelpers = require("../helpers/fileHelpers"),
  Constants = require("../helpers/constants"),
  logger = require("../helpers/logger").winstonLogger,
  utils = require("../helpers/utils"),
  util = require("util"),
  path = require('path');

module.exports = function init(args) {
  if (args.p) {
    var path_to_bsconf = path.join(args.p + "/browserstack.json");
  } else {
    var path_to_bsconf = "./browserstack.json";
  }

  var config = {
    file: require('../templates/configTemplate')(),
    path: path_to_bsconf
  };

  return fileHelpers.dirExists(config.path, function(dirExists){
    if (dirExists) {
      fileHelpers.fileExists(config.path, function(exists){
        if (exists) {
          let message = Constants.userMessages.CONFIG_FILE_EXISTS;
          logger.error(message);
          utils.sendUsageReport(null, args, message, Constants.messageTypes.ERROR, 'bstack_json_already_exists');
        } else {
          fileHelpers.write(config, null, args, utils.configCreated);
        }
      });
    } else {
      let message = util.format(Constants.userMessages.DIR_NOT_FOUND, path.dirname(config.path));
      logger.error(message);
      utils.sendUsageReport(null, args, message, Constants.messageTypes.ERROR, 'path_to_init_not_found');
    }
  });
}
