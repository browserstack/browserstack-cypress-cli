'use strict';
var fileHelpers = require('../helpers/fileHelpers');

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
    console.log('\n' +
      'BrowserStack Config File created, you can now run \n' +
      'browserstack-cypress --config-file run\n'
    );
  }

  return fileHelpers.fileExists(config.path, function(exists){
    if (exists) {
      console.log('file already exists, delete the browserstack.json file manually. skipping...');
    } else {
      fileHelpers.write(config, null, allDone);
    }
  })
}
