'use strict';
var config = require('../helpers/config');
var request = require('request')
var logger = require("../helpers/logger");
var Constants = require("../helpers/constants")
var fileHelpers = require('../helpers/fileHelpers');
var capabilityHelper = require("../helpers/capabilityHelper");


let updateConfig = function(args) {
  let bsConfigPath = process.cwd() + args.cf;
  logger.log(`Updating config from ${args.cf}`);

  var currentConfig = require(bsConfigPath);

  var configTemplate = require('../templates/configTemplate')()
  var newConfig = JSON.parse(configTemplate);

  function allDone() {
    logger.log(Constants.userMessages.CONFIG_FILE_CREATED);
  }

  capabilityHelper.validate(currentConfig).then(function (validatedConfig) {
    logger.log(`${currentConfig}`);

    for (const key in newConfig) {
      if (currentConfig[key] === undefined) {
        currentConfig[key] = newConfig[key]
      }
    }

    var EOL = require('os').EOL
    var file = [
      JSON.stringify(currentConfig, null, 4)
    ].join(EOL)

    var config = {
      file: file,
      path: bsConfigPath
    };

    fileHelpers.write(config, null, allDone);
  });
}

module.exports = updateConfig;
