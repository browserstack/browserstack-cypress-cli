const logger = require("./logger").winstonLogger,
  Constants = require("./constants"),
  Util = require("./util");

const caps = (bsConfig, zip) => {
  return new Promise(function (resolve, reject) {
    let user = bsConfig.auth.username
    let password =  bsConfig.auth.access_key

    if (!user || !password) reject(Constants.validationMessages.INCORRECT_AUTH_PARAMS);

    var obj = new Object();

    // Browser list
    let osBrowserArray = [];
    bsConfig.browsers.forEach(element => {
      osBrowser = element.os + "-" + element.browser
      element.versions.forEach(version => {
        osBrowserArray.push(osBrowser + version);
      });
    });
    obj.devices = osBrowserArray
    if (obj.devices.length == 0) reject(Constants.validationMessages.EMPTY_BROWSER_LIST);
    logger.info(`Browser list: ${osBrowserArray.toString()}`);

    // Test suite
    obj.test_suite = zip.zip_url.split("://")[1]
    if (!obj.test_suite || 0 === obj.test_suite.length) reject("Test suite is empty");
    logger.info(`Test suite: bs://${obj.test_suite}`);

    // Local
    obj.local = false;
    if (bsConfig.connection_settings.local === true) obj.local = true;
    logger.info(`Local is set to: ${obj.local}`);

    // Local Identifier
    obj.localIdentifier = null;
    if (obj.local === true && (bsConfig.connection_settings.localIdentifier || bsConfig.connection_settings.local_identifier))
    {
      obj.localIdentifier = bsConfig.connection_settings.localIdentifier || bsConfig.connection_settings.local_identifier;
      logger.log(`Local Identifier is set to: ${obj.localIdentifier}`);
    }

    // Project name
    obj.project = bsConfig.run_settings.project || bsConfig.run_settings.project_name;
    if (!obj.project) logger.log(`Project name is: ${obj.project}`);

    // Build name
    obj.customBuildName = bsConfig.run_settings.customBuildName || bsConfig.run_settings.build_name;
    if (obj.customBuildName) logger.log(`Build name is: ${obj.customBuildName}`);

    //callback url
    obj.callbackURL = bsConfig.run_settings.callback_url
    if (obj.callbackURL) logger.info(`callback url is : ${obj.callbackURL}`);

    //projectNotifyURL
    obj.projectNotifyURL = bsConfig.run_settings.project_notify_URL
    if (obj.projectNotifyURL) logger.info(`Project notify URL is: ${obj.projectNotifyURL}`);

    obj.parallels = bsConfig.run_settings.parallels;
    if (obj.parallels) logger.info(`Parallels limit specified: ${obj.parallels}`);

    var data = JSON.stringify(obj);
    resolve(data);
  })
}

const validate = (bsConfig, args) => {
  return new Promise(function(resolve, reject){
    if (!bsConfig) reject(Constants.validationMessages.EMPTY_BROWSERSTACK_JSON);

    if (!bsConfig.auth) reject(Constants.validationMessages.INCORRECT_AUTH_PARAMS);

    if (!bsConfig.browsers || bsConfig.browsers.length === 0) reject(Constants.validationMessages.EMPTY_BROWSER_LIST);

    if (!bsConfig.run_settings) reject(Constants.validationMessages.EMPTY_RUN_SETTINGS);

    if(!bsConfig.run_settings.cypress_proj_dir) reject(Constants.validationMessages.EMPTY_SPEC_FILES);

    // validate parallels specified in browserstack.json if parallels are not specified via arguments
    if (Util.isUndefined(args.parallels) && !Util.isParallelValid(bsConfig.run_settings.parallels)) reject(Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);

    // if parallels specified via arguments validate only parallels specified in arguments
    if (!Util.isUndefined(args.parallels) && !Util.isParallelValid(args.parallels)) reject(Constants.validationMessages.INVALID_PARALLELS_CONFIGURATION);

    resolve(Constants.validationMessages.VALIDATED);
  });
}

module.exports = {
  caps,
  validate
}
