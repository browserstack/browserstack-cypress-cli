'use strict';
const fileHelpers = require("../helpers/fileHelpers"),
  Constants = require("../helpers/constants"),
  logger = require("../helpers/logger").winstonLogger,
  utils = require("../helpers/utils"),
  util = require("util"),
  path = require('path');


function get_path(args) {
  if (args._.length > 1 && args.p) {
    let filename = args._[1];
    if (filename !== path.basename(filename)) {
      let message = Constants.userMessages.CONFLICTING_INIT_ARGUMENTS;
      logger.error(message);
      utils.sendUsageReport(null, args, message, Constants.messageTypes.ERROR, 'conflicting_path_json_init');
      return;
    }

    return path.join(args.p, filename);
  } else if (args.p) {
    return path.join(args.p, "browserstack.json");
  } else if (args._.length > 1) {
    return path.join(process.cwd(), args._[1]);
  }

  return path.join(process.cwd(), "browserstack.json");
}


module.exports = function init(args) {

  let path_to_json = get_path(args);
  if (path_to_json === undefined) return;

  let config = {
    file: require('../templates/configTemplate')(),
    path: path_to_json
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
