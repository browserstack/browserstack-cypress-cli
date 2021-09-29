'use strict';
const archiver = require("../helpers/archiver"),
  zipUploader = require("../helpers/zipUpload"),
  build = require("../helpers/build"),
  logger = require("../helpers/logger").winstonLogger,
  config = require("../helpers/config"),
  capabilityHelper = require("../helpers/capabilityHelper"),
  Constants = require("../helpers/constants"),
  utils = require("../helpers/utils"),
  fileHelpers = require("../helpers/fileHelpers"),
  syncRunner = require("../helpers/syncRunner"),
  checkUploaded = require("../helpers/checkUploaded"),
  reportGenerator = require('../helpers/reporterHTML').reportGenerator,
  {initTimeComponents, instrumentEventTime, markBlockStart, markBlockEnd, getTimeComponents} = require('../helpers/timeComponents'),
  downloadBuildArtifacts = require('../helpers/buildArtifacts').downloadBuildArtifacts;

module.exports = function run(args) {
  let bsConfigPath = utils.getConfigPath(args.cf);
  //Delete build_results.txt from log folder if already present.
  initTimeComponents();
  instrumentEventTime("cliStart")
  markBlockStart('deleteOldResults');
  utils.deleteResults();
  markBlockEnd('deleteOldResults');

  markBlockStart('validateBstackJson');
  return utils.validateBstackJson(bsConfigPath).then(function (bsConfig) {
    markBlockEnd('validateBstackJson');
    markBlockStart('setConfig');
    utils.setUsageReportingFlag(bsConfig, args.disableUsageReporting);

    utils.setDefaults(bsConfig, args);

    // accept the username from command line or env variable if provided
    utils.setUsername(bsConfig, args);

    // accept the access key from command line or env variable if provided
    utils.setAccessKey(bsConfig, args);

    // accept the build name from command line if provided
    utils.setBuildName(bsConfig, args);

    // set cypress config filename
    utils.setCypressConfigFilename(bsConfig, args);

    // accept the specs list from command line if provided
    utils.setUserSpecs(bsConfig, args);

    // accept the env list from command line and set it
    utils.setTestEnvs(bsConfig, args);

    // accept the system env list from bsconf and set it
    utils.setSystemEnvs(bsConfig);

    //accept the local from env variable if provided
    utils.setLocal(bsConfig, args);

    // set Local Mode (on-demand/ always-on)
    utils.setLocalMode(bsConfig, args);

    //accept the local identifier from env variable if provided
    utils.setLocalIdentifier(bsConfig, args);

    // set Local Config File
    utils.setLocalConfigFile(bsConfig, args);

    // run test in headed mode
    utils.setHeaded(bsConfig, args);

    // set the no-wrap
    utils.setNoWrap(bsConfig, args);

    // set other cypress configs e.g. reporter and reporter-options
    utils.setOtherConfigs(bsConfig, args);
    markBlockEnd('setConfig');

    // Validate browserstack.json values and parallels specified via arguments
    markBlockStart('validateConfig');
    return capabilityHelper.validate(bsConfig, args).then(function (cypressJson) {
      markBlockEnd('validateConfig');
      markBlockStart('preArchiveSteps');
      //get the number of spec files
      let specFiles = utils.getNumberOfSpecFiles(bsConfig, args, cypressJson);

      // accept the number of parallels
      utils.setParallels(bsConfig, args, specFiles.length);

      // warn if specFiles cross our limit
      utils.warnSpecLimit(bsConfig, args, specFiles);
      markBlockEnd('preArchiveSteps');
      markBlockStart('checkAlreadyUploaded');
      return checkUploaded.checkUploadedMd5(bsConfig, args).then(function (md5data) {
        markBlockEnd('checkAlreadyUploaded');

        // Archive the spec files
        markBlockStart('zip');
        markBlockStart('zip.archive');
        return archiver.archive(bsConfig.run_settings, config.fileName, args.exclude, md5data).then(function (data) {
          markBlockEnd('zip.archive');

          // Uploaded zip file
          markBlockStart('zip.zipUpload');
          return zipUploader.zipUpload(bsConfig, config.fileName, md5data).then(async function (zip) {
            markBlockEnd('zip.zipUpload');
            markBlockEnd('zip');
            // Create build

            //setup Local Testing
            markBlockStart('localSetup');
            let bs_local = await utils.setupLocalTesting(bsConfig, args);
            markBlockEnd('localSetup');
            markBlockStart('createBuild');
            return build.createBuild(bsConfig, zip).then(function (data) {
              markBlockEnd('createBuild');
              markBlockEnd('total');
              let message = `${data.message}! ${Constants.userMessages.BUILD_CREATED} with build id: ${data.build_id}`;
              let dashboardLink = `${Constants.userMessages.VISIT_DASHBOARD} ${data.dashboard_url}`;
              utils.exportResults(data.build_id, `${config.dashboardUrl}${data.build_id}`);
              if ((utils.isUndefined(bsConfig.run_settings.parallels) && utils.isUndefined(args.parallels)) || (!utils.isUndefined(bsConfig.run_settings.parallels) && bsConfig.run_settings.parallels == Constants.cliMessages.RUN.DEFAULT_PARALLEL_MESSAGE)) {
                logger.warn(Constants.userMessages.NO_PARALLELS);
              }

              if (bsConfig.run_settings.cypress_version && bsConfig.run_settings.cypress_version !== data.cypress_version) {
                if (bsConfig.run_settings.cypress_version.toString().match(Constants.LATEST_VERSION_SYNTAX_REGEX)) {
                  let versionMessage = utils.latestSyntaxToActualVersionMessage(bsConfig.run_settings.cypress_version, data.cypress_version);
                  logger.info(versionMessage);
                } else {
                  let versionMessage = utils.versionChangedMessage(bsConfig.run_settings.cypress_version, data.cypress_version);
                  logger.warn(versionMessage);
                }
              }

              if (!args.disableNpmWarning && bsConfig.run_settings.npm_dependencies && Object.keys(bsConfig.run_settings.npm_dependencies).length <= 0) {
                logger.warn(Constants.userMessages.NO_NPM_DEPENDENCIES);
                logger.warn(Constants.userMessages.NO_NPM_DEPENDENCIES_READ_MORE);
              }

              if (args.sync) {
                syncRunner.pollBuildStatus(bsConfig, data).then(async (exitCode) => {

                  // stop the Local instance
                  await utils.stopLocalBinary(bsConfig, bs_local, args);

                  // waiting for 5 secs for upload to complete (as a safety measure)
                  await new Promise(resolve => setTimeout(resolve, 5000));

                  // download build artifacts
                  if (utils.nonEmptyArray(bsConfig.run_settings.downloads)) {
                    await downloadBuildArtifacts(bsConfig, data.build_id, args);
                  }

                  // Generate custom report!
                  reportGenerator(bsConfig, data.build_id, args, function(){
                    utils.sendUsageReport(bsConfig, args, `${message}\n${dashboardLink}`, Constants.messageTypes.SUCCESS, null);
                    utils.handleSyncExit(exitCode, data.dashboard_url);
                  });
                });
              } else if (utils.nonEmptyArray(bsConfig.run_settings.downloads)) {
                logger.info(Constants.userMessages.ASYNC_DOWNLOADS.replace('<build-id>', data.build_id));
              }

              logger.info(message);
              logger.info(dashboardLink);
              if(!args.sync) logger.info(Constants.userMessages.EXIT_SYNC_CLI_MESSAGE.replace("<build-id>", data.build_id));
              let dataToSend = {
                time_components: getTimeComponents(),
                unique_id: utils.generateUniqueHash(),
                build_id: data.build_id,
              };
              if (bsConfig && bsConfig.connection_settings) {
                if (bsConfig.connection_settings.local_mode) {
                  dataToSend.local_mode = bsConfig.connection_settings.local_mode;
                }
                if (bsConfig.connection_settings.usedAutoLocal) {
                  dataToSend.used_auto_local = bsConfig.connection_settings.usedAutoLocal;
                }
              }
              utils.sendUsageReport(bsConfig, args, `${message}\n${dashboardLink}`, Constants.messageTypes.SUCCESS, null, dataToSend);
              return;
            }).catch(async function (err) {
              // Build creation failed
              logger.error(err);
              // stop the Local instance
              await utils.stopLocalBinary(bsConfig, bs_local, args);

              utils.sendUsageReport(bsConfig, args, err, Constants.messageTypes.ERROR, 'build_failed');
            });
          }).catch(function (err) {
            // Zip Upload failed | Local Start failed
            logger.error(err);
            if(err === Constants.userMessages.LOCAL_START_FAILED){
              utils.sendUsageReport(bsConfig, args, `${err}\n${Constants.userMessages.LOCAL_START_FAILED}`, Constants.messageTypes.ERROR, 'local_start_failed');
            } else {
              logger.error(Constants.userMessages.ZIP_UPLOAD_FAILED);
              fileHelpers.deleteZip();
              utils.sendUsageReport(bsConfig, args, `${err}\n${Constants.userMessages.ZIP_UPLOAD_FAILED}`, Constants.messageTypes.ERROR, 'zip_upload_failed');
            }
          });
        }).catch(function (err) {
          // Zipping failed
          logger.error(err);
          logger.error(Constants.userMessages.FAILED_TO_ZIP);
          utils.sendUsageReport(bsConfig, args, `${err}\n${Constants.userMessages.FAILED_TO_ZIP}`, Constants.messageTypes.ERROR, 'zip_creation_failed');
          try {
            fileHelpers.deleteZip();
          } catch (err) {
            utils.sendUsageReport(bsConfig, args, Constants.userMessages.ZIP_DELETE_FAILED, Constants.messageTypes.ERROR, 'zip_deletion_failed');
          }
        });
      }).catch(function (err) {
        // md5 check failed
        logger.error(err);
        logger.error(Constants.userMessages.FAILED_MD5_CHECK);
        utils.sendUsageReport(bsConfig, args, Constants.userMessages.MD5_CHECK_FAILED, Constants.messageTypes.ERROR, 'zip_already_uploaded_failed');
      });
    }).catch(function (err) {
      // browerstack.json is not valid
      logger.error(err);

      // display browserstack.json is not valid only if validation of browserstack.json field has failed, otherwise display just the error message
      // If parallels specified in arguments are invalid do not display browserstack.json is invalid message
      if (utils.isJSONInvalid(err, args)) {
        logger.error(Constants.validationMessages.NOT_VALID);
      }

      let error_code = utils.getErrorCodeFromMsg(err);
      utils.sendUsageReport(bsConfig, args, `${err}\n${Constants.validationMessages.NOT_VALID}`, Constants.messageTypes.ERROR, error_code);
    });
  }).catch(function (err) {
    logger.error(err);
    utils.setUsageReportingFlag(null, args.disableUsageReporting);
    utils.sendUsageReport(null, args, err.message, Constants.messageTypes.ERROR, utils.getErrorCodeFromErr(err));
  });
}
