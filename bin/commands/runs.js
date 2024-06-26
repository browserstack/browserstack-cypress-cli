'use strict';
const path = require('path');

const archiver = require("../helpers/archiver"),
  zipUploader = require("../helpers/zipUpload"),
  build = require("../helpers/build"),
  logger = require("../helpers/logger").winstonLogger,
  config = require("../helpers/config"),
  capabilityHelper = require("../helpers/capabilityHelper"),
  Constants = require("../helpers/constants"),
  utils = require("../helpers/utils"),
  fileHelpers = require("../helpers/fileHelpers"),
  getInitialDetails = require('../helpers/getInitialDetails').getInitialDetails,
  syncRunner = require("../helpers/syncRunner"),
  checkUploaded = require("../helpers/checkUploaded"),
  packageInstaller = require("../helpers/packageInstaller"),
  reportGenerator = require('../helpers/reporterHTML').reportGenerator,
  {initTimeComponents, instrumentEventTime, markBlockStart, markBlockEnd, getTimeComponents} = require('../helpers/timeComponents'),
  downloadBuildArtifacts = require('../helpers/buildArtifacts').downloadBuildArtifacts,
  downloadBuildStacktrace = require('../helpers/downloadBuildStacktrace').downloadBuildStacktrace,
  updateNotifier = require('update-notifier'),
  pkg = require('../../package.json'),
  packageDiff = require('../helpers/package-diff');
const { getStackTraceUrl } = require('../helpers/sync/syncSpecsLogs');

const { 
  launchTestSession, 
  setEventListeners,
  setTestObservabilityFlags, 
  runCypressTestsLocally, 
  printBuildLink
} = require('../testObservability/helper/helper');


const { 
  createAccessibilityTestRun,
  setAccessibilityEventListeners,
  checkAccessibilityPlatform,
  supportFileCleanup
} = require('../accessibility-automation/helper');
const { isTurboScaleSession, getTurboScaleGridDetails, patchCypressConfigFileContent, atsFileCleanup } = require('../helpers/atsHelper');

module.exports = function run(args, rawArgs) {

  markBlockStart('preBuild');
  // set debug mode (--cli-debug)
  utils.setDebugMode(args);

  let bsConfigPath = utils.getConfigPath(args.cf);
  logger.debug(`browserstack.json path : ${bsConfigPath}`);
  //Delete build_results.txt from log folder if already present.
  initTimeComponents();
  instrumentEventTime("cliStart")
  markBlockStart('deleteOldResults');
  utils.deleteResults();
  markBlockEnd('deleteOldResults');

  markBlockStart('validateBstackJson');
  logger.debug('Started browserstack.json validation');
  return utils.validateBstackJson(bsConfigPath).then(async function (bsConfig) {
    markBlockEnd('validateBstackJson');
    logger.debug('Completed browserstack.json validation');
    markBlockStart('setConfig');
    logger.debug('Started setting the configs');

    // set cypress config filename
    utils.setCypressConfigFilename(bsConfig, args);
    
    /* 
      Set testObservability & browserstackAutomation flags
    */
    const [isTestObservabilitySession, isBrowserstackInfra] = setTestObservabilityFlags(bsConfig);
    const checkAccessibility = checkAccessibilityPlatform(bsConfig);
    const isAccessibilitySession = bsConfig.run_settings.accessibility || checkAccessibility;
    const turboScaleSession = isTurboScaleSession(bsConfig);
    Constants.turboScaleObj.enabled = turboScaleSession;

    utils.setUsageReportingFlag(bsConfig, args.disableUsageReporting);

    utils.setDefaults(bsConfig, args);

    // accept the username from command line or env variable if provided
    utils.setUsername(bsConfig, args);

    // accept the access key from command line or env variable if provided
    utils.setAccessKey(bsConfig, args);

    let buildReportData = (turboScaleSession || !isBrowserstackInfra) ? null : await getInitialDetails(bsConfig, args, rawArgs);

    // accept the build name from command line if provided
    utils.setBuildName(bsConfig, args);

    if(isBrowserstackInfra) {
      // set cypress test suite type
      utils.setCypressTestSuiteType(bsConfig);

      // set cypress geo location
      utils.setGeolocation(bsConfig, args);

      // set timezone
      utils.setTimezone(bsConfig, args);

      // set spec timeout
      utils.setSpecTimeout(bsConfig, args);
    }
    
    // accept the specs list from command line if provided
    utils.setUserSpecs(bsConfig, args);

    // accept the env list from command line and set it
    utils.setTestEnvs(bsConfig, args);

    // set build tag caps
    utils.setBuildTags(bsConfig, args);

    /* 
      Send build start to Observability
    */
    if(isTestObservabilitySession) {
      await launchTestSession(bsConfig, bsConfigPath);
      utils.setO11yProcessHooks(null, bsConfig, args, null, buildReportData);
    }
    
    // accept the system env list from bsconf and set it
    utils.setSystemEnvs(bsConfig);

    if(isBrowserstackInfra) {
      //accept the local from env variable if provided
      utils.setLocal(bsConfig, args);

      //set network logs
      utils.setNetworkLogs(bsConfig);

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

      // add cypress dependency if missing
      utils.setCypressNpmDependency(bsConfig);

      if (isAccessibilitySession && isBrowserstackInfra) {
        await createAccessibilityTestRun(bsConfig);
      }

      if (turboScaleSession) {
        // Local is only required in case user is running on trial grid and wants to access private website.
        // Even then, it will be spawned separately via browserstack-cli ats connect-grid command and not via browserstack-cypress-cli
        // Hence whenever running on ATS, need to make local as false
        bsConfig.connection_settings.local = false;

        const gridDetails = await getTurboScaleGridDetails(bsConfig, args, rawArgs);

        if (gridDetails && Object.keys(gridDetails).length > 0) {
          Constants.turboScaleObj.gridDetails = gridDetails;
          Constants.turboScaleObj.gridUrl = gridDetails.cypressUrl;
          Constants.turboScaleObj.uploadUrl = gridDetails.cypressUrl + '/upload';
          Constants.turboScaleObj.buildUrl = gridDetails.cypressUrl + '/build';

          logger.debug(`Automate TurboScale Grid URL set to ${gridDetails.url}`);

          patchCypressConfigFileContent(bsConfig);
        } else {
          process.exitCode = Constants.ERROR_EXIT_CODE;
          return;
        }
      }
    }

    const { packagesInstalled } = !isBrowserstackInfra ? false : await packageInstaller.packageSetupAndInstaller(bsConfig, config.packageDirName, {markBlockStart, markBlockEnd});

    if(isBrowserstackInfra) {
      // set node version
      utils.setNodeVersion(bsConfig, args);

      //set browsers
      await utils.setBrowsers(bsConfig, args);

      //set config (--config)
      utils.setConfig(bsConfig, args);

      // set sync/async mode (--async/--sync)
      utils.setCLIMode(bsConfig, args);

      // set other cypress configs e.g. reporter and reporter-options
      utils.setOtherConfigs(bsConfig, args);
    }

    markBlockEnd('setConfig');
    logger.debug("Completed setting the configs");

    if(!isBrowserstackInfra) {
      return runCypressTestsLocally(bsConfig, args, rawArgs);
    }

    // Validate browserstack.json values and parallels specified via arguments
    markBlockStart('validateConfig');
    logger.debug("Started configs validation");
    return capabilityHelper.validate(bsConfig, args).then(function (cypressConfigFile) {
      if(process.env.BROWSERSTACK_TEST_ACCESSIBILITY) {
        setAccessibilityEventListeners(bsConfig);
      }
      if(process.env.BS_TESTOPS_BUILD_COMPLETED) {
        // setEventListeners(bsConfig);
      }
      markBlockEnd('validateConfig');
      logger.debug("Completed configs validation");
      markBlockStart('preArchiveSteps');
      logger.debug("Started pre-archive steps");

      //get the number of spec files
      markBlockStart('getNumberOfSpecFiles');
      let specFiles = utils.getNumberOfSpecFiles(bsConfig, args, cypressConfigFile, turboScaleSession);
      markBlockEnd('getNumberOfSpecFiles');

      bsConfig['run_settings']['video_config'] = utils.getVideoConfig(cypressConfigFile, bsConfig);

      // return the number of parallels user specified
      let userSpecifiedParallels = utils.getParallels(bsConfig, args);

      // accept the number of parallels
      utils.setParallels(bsConfig, args, specFiles.length);

      // set record feature caps
      utils.setRecordCaps(bsConfig, args, cypressConfigFile);

      // set the interactive debugging capability
      utils.setInteractiveCapability(bsConfig);

      // warn if specFiles cross our limit
      utils.warnSpecLimit(bsConfig, args, specFiles, rawArgs, buildReportData);
      markBlockEnd('preArchiveSteps');
      logger.debug("Completed pre-archive steps");
      markBlockStart('zip');
      logger.debug("Checking if test suite zip and dependencies is already available on browserstack");
      markBlockStart('zip.checkAlreadyUploaded');
      return checkUploaded.checkUploadedMd5(bsConfig, args, {markBlockStart, markBlockEnd}).then(function (md5data) {
        markBlockEnd('zip.checkAlreadyUploaded');
        logger.debug("Completed checking if test suite zip and dependencies already uploaded");

        logger.debug("Started caching npm dependencies.");
        markBlockStart('zip.packageInstaller');
        return packageInstaller.packageWrapper(bsConfig, config.packageDirName, config.packageFileName, md5data, {markBlockStart, markBlockEnd}, packagesInstalled).then(function (packageData) {
          logger.debug("Completed caching npm dependencies.")
          markBlockEnd('zip.packageInstaller');

          // Archive the spec files
          logger.debug("Started archiving test suite");
          markBlockStart('zip.archive');
          return archiver.archive(bsConfig.run_settings, config.fileName, args.exclude, md5data).then(async function (data) {
            logger.debug("Completed archiving test suite");
            markBlockEnd('zip.archive');

            let test_zip_size = utils.fetchZipSize(path.join(process.cwd(), config.fileName));
            let npm_zip_size = utils.fetchZipSize(path.join(process.cwd(), config.packageFileName));
            let node_modules_size = await utils.fetchFolderSize(path.join(process.cwd(), "node_modules"));

            if (Constants.turboScaleObj.enabled) {
              // Note: Calculating md5 here for turboscale force-upload so that we don't need to re-calculate at hub         
              let zip_md5sum = await checkUploaded.checkSpecsMd5(bsConfig.run_settings, args, {markBlockStart, markBlockEnd});
              let npm_package_md5sum = await checkUploaded.checkPackageMd5(bsConfig.run_settings);
              Object.assign(md5data, { npm_package_md5sum });
              Object.assign(md5data, { zip_md5sum });
            }
            
            //Package diff
            let isPackageDiff = false;
            if(!md5data.zipUrlPresent){
              isPackageDiff = packageDiff.run(`package.json`, `${config.packageDirName}/package.json`);
              logger.debug(`Package difference was ${isPackageDiff ? `found` : `not found`}`);
            }
            
            // Uploaded zip file
            logger.debug("Started uploading the test suite zip");
            logger.debug("Started uploading the node_module zip");
            markBlockStart('zip.zipUpload');
            return zipUploader.zipUpload(bsConfig, md5data, packageData).then(async function (zip) {
              logger.debug("Completed uploading the test suite zip");
              logger.debug("Completed uploading the node_module zip");
              markBlockEnd('zip.zipUpload');
              markBlockEnd('zip');

              if (process.env.BROWSERSTACK_TEST_ACCESSIBILITY === 'true') {
                supportFileCleanup();
              }

              if (turboScaleSession) {
                atsFileCleanup(bsConfig);
              }

              // Set config args for enforce_settings
              if ( !utils.isUndefinedOrFalse(bsConfig.run_settings.enforce_settings) ) {
                markBlockStart('setEnforceSettingsConfig');
                logger.debug('Started setting the configs');
                utils.setEnforceSettingsConfig(bsConfig, args);
                logger.debug('Completed setting the configs');
                markBlockEnd('setEnforceSettingsConfig');
              }
              // Create build
              //setup Local Testing
              markBlockStart('localSetup');
              logger.debug("Started setting up BrowserStack Local connection");
              let bs_local = await utils.setupLocalTesting(bsConfig, args, rawArgs, buildReportData);
              logger.debug('Completed setting up BrowserStack Local connection');
              markBlockEnd('localSetup');
              logger.debug("Started build creation");
              markBlockStart('createBuild');
              return build.createBuild(bsConfig, zip).then(function (data) {
                markBlockEnd('preBuild');
                markBlockStart('buildProcessing');
                logger.debug("Completed build creation");
                markBlockEnd('createBuild');
                markBlockEnd('total');
                utils.setProcessHooks(data.build_id, bsConfig, bs_local, args, buildReportData);
                if(isTestObservabilitySession) {
                  utils.setO11yProcessHooks(data.build_id, bsConfig, bs_local, args, buildReportData);
                }
                let message = `${data.message}! ${Constants.userMessages.BUILD_CREATED} with build id: ${data.build_id}`;
                let dashboardLink = `${Constants.userMessages.VISIT_DASHBOARD} ${data.dashboard_url}`;
                buildReportData = { 'build_id': data.build_id, 'parallels': userSpecifiedParallels, ...buildReportData }
                utils.exportResults(data.build_id, `${config.dashboardUrl}${data.build_id}`);
                if ((utils.isUndefined(bsConfig.run_settings.parallels) && utils.isUndefined(args.parallels)) || (!utils.isUndefined(bsConfig.run_settings.parallels) && bsConfig.run_settings.parallels == Constants.cliMessages.RUN.DEFAULT_PARALLEL_MESSAGE)) {
                  logger.warn(Constants.userMessages.NO_PARALLELS);
                }

                if (bsConfig.run_settings.cypress_version && bsConfig.run_settings.cypress_version !== data.cypress_version) {
                  if (bsConfig.run_settings.cypress_version.toString().match(Constants.LATEST_VERSION_SYNTAX_REGEX)) {
                    let versionMessage = utils.latestSyntaxToActualVersionMessage(bsConfig.run_settings.cypress_version, data.cypress_version, data.framework_upgrade_message);
                    logger.info(versionMessage);
                  } else {
                    let versionMessage = utils.versionChangedMessage(bsConfig.run_settings.cypress_version, data.cypress_version, data.framework_upgrade_message);
                    logger.warn(versionMessage);
                  }
                }

                if (!args.disableNpmWarning && bsConfig.run_settings.npm_dependencies && Object.keys(bsConfig.run_settings.npm_dependencies).length <= 0) {
                  logger.warn(Constants.userMessages.NO_NPM_DEPENDENCIES);
                  logger.warn(Constants.userMessages.NO_NPM_DEPENDENCIES_READ_MORE);
                }


                if (args.sync) {
                  logger.debug("Started polling build status from BrowserStack");
                  syncRunner.pollBuildStatus(bsConfig, data, rawArgs, buildReportData).then(async (exitCode) => {
                    markBlockEnd('buildProcessing');
                    markBlockStart('postBuild');
                    logger.debug("Completed polling of build status");

                    // stop the Local instance
                    if (!turboScaleSession) await utils.stopLocalBinary(bsConfig, bs_local, args, rawArgs, buildReportData);

                    // waiting for 5 secs for upload to complete (as a safety measure)
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    // download build artifacts
                    if (exitCode != Constants.BUILD_FAILED_EXIT_CODE && !turboScaleSession) {
                      if (utils.nonEmptyArray(bsConfig.run_settings.downloads)) {
                        logger.debug("Downloading build artifacts");
                        await downloadBuildArtifacts(bsConfig, data.build_id, args, rawArgs, buildReportData);
                      }

                      // Generate custom report!
                      reportGenerator(bsConfig, data.build_id, args, rawArgs, buildReportData, function(){
                        utils.sendUsageReport(bsConfig, args, `${message}\n${dashboardLink}`, Constants.messageTypes.SUCCESS, null, buildReportData, rawArgs);
                        markBlockEnd('postBuild');
                        utils.handleSyncExit(exitCode, data.dashboard_url);
                      });
                    } else if(!turboScaleSession){
                      let stacktraceUrl = getStackTraceUrl();
                      downloadBuildStacktrace(stacktraceUrl).then((message) => {
                        utils.sendUsageReport(bsConfig, args, message, Constants.messageTypes.SUCCESS, null, buildReportData, rawArgs);
                      }).catch((err) => {
                        let message = `Downloading build stacktrace failed with statuscode: ${err}. Please visit ${data.dashboard_url} for additional details.`;
                        logger.error(message);
                        utils.sendUsageReport(bsConfig, args, message, Constants.messageTypes.ERROR, null, buildReportData, rawArgs);
                      }).finally(() =>{
                        let terminalWidth = (process.stdout.columns) * 0.9;
                        let lineSeparator = "\n" + "-".repeat(terminalWidth);
                        logger.info(Constants.userMessages.BUILD_FAILED_ERROR)
                        process.exitCode = Constants.BUILD_FAILED_EXIT_CODE;
                      });
                    }
                  });
                } else if (utils.nonEmptyArray(bsConfig.run_settings.downloads && !turboScaleSession)) {
                  logger.info(Constants.userMessages.ASYNC_DOWNLOADS.replace('<build-id>', data.build_id));
                }

                logger.info(message);
                logger.info(dashboardLink);
                if(!args.sync) {
                  logger.info(Constants.userMessages.EXIT_SYNC_CLI_MESSAGE.replace("<build-id>",data.build_id));
                  printBuildLink(false);
                }
                let dataToSend = {
                  time_components: getTimeComponents(),
                  unique_id: utils.generateUniqueHash(),
                  package_error: utils.checkError(packageData),
                  checkmd5_error: utils.checkError(md5data),
                  build_id: data.build_id,
                  test_zip_size: test_zip_size,
                  npm_zip_size: npm_zip_size,
                  node_modules_size: node_modules_size,
                  test_suite_zip_upload: md5data.zipUrlPresent ? 0 : 1,
                  package_zip_upload: md5data.packageUrlPresent ? 0 : 1
                };
                if(dataToSend.test_suite_zip_upload === 1 ){
                  dataToSend['is_package_diff'] = isPackageDiff;
                }

                if (!md5data.zipUrlPresent && zip.tests_upload_time) {
                  dataToSend.test_suite_zip_size = parseFloat((test_zip_size / 1024).toFixed(2));
                  dataToSend.test_suite_zip_upload_avg_speed = parseFloat(((test_zip_size * 1000) / (1024 * zip.tests_upload_time)).toFixed(2));
                };

                if (!md5data.packageUrlPresent && zip.npm_package_upload_time) {
                  dataToSend.npm_package_zip_size = parseFloat((npm_zip_size / 1024).toFixed(2));
                  dataToSend.npm_package_zip_upload_avg_speed = parseFloat(((npm_zip_size * 1000) / (1024 * zip.npm_package_upload_time)).toFixed(2));
                };

                if (zip.tests_upload_time || zip.npm_package_upload_time) {
                  dataToSend.time_components.zip.zipUploadSplit = {
                    tests_upload_time: zip.tests_upload_time,
                    npm_package_upload_time: zip.npm_package_upload_time,
                  }
                }

                if (bsConfig && bsConfig.connection_settings) {
                  if (bsConfig.connection_settings.local_mode) {
                    dataToSend.local_mode = bsConfig.connection_settings.local_mode;
                  }
                  if (bsConfig.connection_settings.usedAutoLocal) {
                    dataToSend.used_auto_local = bsConfig.connection_settings.usedAutoLocal;
                  }
                }
                buildReportData = { ...buildReportData, ...dataToSend };
                utils.sendUsageReport(bsConfig, args, `${message}\n${dashboardLink}`, Constants.messageTypes.SUCCESS, null, buildReportData, rawArgs);
                return;
              }).catch(async function (err) {
                if (err && err.toString().includes('browserstack.geoLocation')) {
                  err = err.replace(/browserstack.geoLocation/g, 'geolocation');
                }
                // Build creation failed
                logger.error(err);
                // stop the Local instance
                await utils.stopLocalBinary(bsConfig, bs_local, args, rawArgs, buildReportData);

                utils.sendUsageReport(bsConfig, args, err, Constants.messageTypes.ERROR, 'build_failed', buildReportData, rawArgs);
                process.exitCode = Constants.ERROR_EXIT_CODE;
              });
            }).catch(function (err) {
              // Zip Upload failed | Local Start failed
              logger.error(err);
              if(err === Constants.userMessages.LOCAL_START_FAILED){
                utils.sendUsageReport(bsConfig, args, `${err}\n${Constants.userMessages.LOCAL_START_FAILED}`, Constants.messageTypes.ERROR, 'local_start_failed', buildReportData, rawArgs);
              } else {
                logger.error(Constants.userMessages.ZIP_UPLOAD_FAILED);
                fileHelpers.deleteZip();
                utils.sendUsageReport(bsConfig, args, `${err}\n${Constants.userMessages.ZIP_UPLOAD_FAILED}`, Constants.messageTypes.ERROR, 'zip_upload_failed', buildReportData, rawArgs);
                try {
                  fileHelpers.deletePackageArchieve();
                } catch (err) {
                  utils.sendUsageReport(bsConfig, args, Constants.userMessages.NPM_DELETE_FAILED, Constants.messageTypes.ERROR, 'npm_deletion_failed', buildReportData, rawArgs);
                }
              }
              process.exitCode = Constants.ERROR_EXIT_CODE;
            });
          }).catch(function (err) {
            // Zipping failed
            logger.error(err);
            logger.error(Constants.userMessages.FAILED_TO_ZIP);
            utils.sendUsageReport(bsConfig, args, `${err}\n${Constants.userMessages.FAILED_TO_ZIP}`, Constants.messageTypes.ERROR, 'zip_creation_failed', buildReportData, rawArgs);
            try {
              fileHelpers.deleteZip();
            } catch (err) {
              utils.sendUsageReport(bsConfig, args, Constants.userMessages.ZIP_DELETE_FAILED, Constants.messageTypes.ERROR, 'zip_deletion_failed', buildReportData, rawArgs);
            }
            try {
              fileHelpers.deletePackageArchieve();
            } catch (err) {
              utils.sendUsageReport(bsConfig, args, Constants.userMessages.NPM_DELETE_FAILED, Constants.messageTypes.ERROR, 'npm_deletion_failed', buildReportData, rawArgs);
            }
            process.exitCode = Constants.ERROR_EXIT_CODE;
          });
        }).catch(function (err) {
          // package installer failed
          logger.error(err);
          logger.error(Constants.userMessages.FAILED_CREATE_NPM_ARCHIVE);
          utils.sendUsageReport(bsConfig, args, Constants.userMessages.FAILED_CREATE_NPM_ARCHIVE, Constants.messageTypes.ERROR, 'npm_package_archive_failed', buildReportData, rawArgs);
          try {
            fileHelpers.deletePackageArchieve();
          } catch (err) {
            utils.sendUsageReport(bsConfig, args, Constants.userMessages.NPM_DELETE_FAILED, Constants.messageTypes.ERROR, 'npm_deletion_failed', buildReportData, rawArgs);
          }
          process.exitCode = Constants.ERROR_EXIT_CODE;
        });
      }).catch(function (err) {
        // md5 check failed
        logger.error(err);
        logger.error(Constants.userMessages.FAILED_MD5_CHECK);
        utils.sendUsageReport(bsConfig, args, Constants.userMessages.MD5_CHECK_FAILED, Constants.messageTypes.ERROR, 'zip_already_uploaded_failed', buildReportData, rawArgs);
        process.exitCode = Constants.ERROR_EXIT_CODE;
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
      utils.sendUsageReport(bsConfig, args, `${err}\n${Constants.validationMessages.NOT_VALID}`, Constants.messageTypes.ERROR, error_code, buildReportData, rawArgs);
      process.exitCode = Constants.ERROR_EXIT_CODE;
    });
  }).catch(function (err) {
    logger.error(err);
    utils.setUsageReportingFlag(null, args.disableUsageReporting);
    let bsJsonData = utils.readBsConfigJSON(bsConfigPath);
    utils.sendUsageReport(bsJsonData, args, err.message, Constants.messageTypes.ERROR, utils.getErrorCodeFromErr(err), null, rawArgs);
    process.exitCode = Constants.ERROR_EXIT_CODE;
  }).finally(function(){
    const notifier = updateNotifier({
      pkg,
      updateCheckInterval: 1000 * 60 * 60 * 24 * 7,
    });

    // Checks for update on first run.
    // Set lastUpdateCheck to 0 to spawn the check update process as notifier sets this to Date.now() for preventing
    // the check untill one interval period. It runs once.
    if (!notifier.disabled && Date.now() - notifier.config.get('lastUpdateCheck') < 50) {
      notifier.config.set('lastUpdateCheck', 0);
      notifier.check();
    }

    // Set the config update as notifier clears this after reading.
    if (notifier.update && notifier.update.current !== notifier.update.latest) {
      notifier.config.set('update', notifier.update);
      notifier.notify({isGlobal: true});
    }
  });
}
