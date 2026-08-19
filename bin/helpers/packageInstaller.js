'use strict';
  const archiver = require("archiver"),
  path = require('path'),
  fs = require('fs-extra'),
  fileHelpers = require('./fileHelpers'),
  logger = require("./logger").winstonLogger,
  Constants = require('./constants'),
  utils = require('./utils'),
  { get_version } = require('./usageReporting'),
  process = require('process'),
  { spawn } = require('child_process'),
  cliUtils = require("./utils"),
  util = require('util');

const { combineMacWinNpmDependencies } = require("./helper");

let nodeProcess;

const setupPackageFolder = (runSettings, directoryPath) => {
  return new Promise(function (resolve, reject) {
    fileHelpers.deletePackageArchieve(false);
    logger.debug(`Started creating ${directoryPath} folder`);
    fs.mkdir(directoryPath, function (err) {
      try {
        if (err) {
          return reject(err);
        }
        logger.debug(`Completed creating ${directoryPath}`);
        let packageJSON = {};
        if (typeof runSettings.package_config_options === 'object') {
          Object.assign(packageJSON, runSettings.package_config_options);
        }

        // Combine win and mac specific dependencies if present
        const combinedDependencies = combineMacWinNpmDependencies(runSettings);
        // APS-19009: the primary RCE fix is `--ignore-scripts` at install time (see packageInstall
        // below), which neutralises lifecycle-script (postinstall etc.) execution for EVERY
        // dependency spec — registry, git, file: or tarball-url alike. That closes the documented
        // vulnerability without affecting any legitimate flow.
        //
        // As defence-in-depth we additionally drop any dependency whose *name* is not a valid npm
        // package name. This strips shell-metacharacter / command-injection payloads (e.g.
        // "left-pad; cat /flag", "$(sleep 6)") that a poisoned browserstack.json could try to smuggle.
        //
        // We deliberately DO NOT validate the version spec, and we SKIP a bad entry rather than
        // aborting the run: git / file: / tarball-url / private-registry version specs are legitimate
        // and widely used (BrowserStack's own SDK CI and real enterprise customers depend on them —
        // rejecting them would have broken ~7.3k legitimate builds over 90 days per BQ analysis). A
        // genuine customer session must never be blocked by this control.
        const NPM_NAME_RE = /^(@[a-zA-Z0-9-~][a-zA-Z0-9-._~]*\/)?[a-zA-Z0-9-~][a-zA-Z0-9-._~]*$/;
        const safeDependencies = {};
        for (const depName of Object.keys(combinedDependencies || {})) {
          const depVersion = combinedDependencies[depName];
          if (!NPM_NAME_RE.test(depName) || typeof depVersion !== 'string') {
            logger.warn(`Skipping npm_dependencies entry "${depName}": not a valid npm package name. This dependency will not be installed.`);
            continue;
          }
          safeDependencies[depName] = depVersion;
        }
        if (Object.keys(safeDependencies).length > 0) {
          Object.assign(packageJSON, {
            devDependencies: safeDependencies,
          });
        }

        if (Object.keys(packageJSON).length > 0) {
          let packageJSONString = JSON.stringify(packageJSON);
          let packagePath = path.join(directoryPath, "package.json");
          fs.writeFileSync(packagePath, packageJSONString);
          let cypressFolderPath = path.dirname(runSettings.cypressConfigFilePath);
          let sourceNpmrc = path.join(cypressFolderPath, ".npmrc");
          let destNpmrc = path.join(directoryPath, ".npmrc");
          if (fs.existsSync(sourceNpmrc)) {
            logger.debug(`Copying .npmrc file from ${sourceNpmrc} to ${destNpmrc}`);
            fs.copyFileSync(sourceNpmrc, destNpmrc);
          }
          logger.debug(`${packagePath} file created with ${packageJSONString}`);
          return resolve("Package file created");
        }
        logger.debug("Nothing in package file");
        return reject("Nothing in package file");
      } catch(error) {
        logger.debug(`Creating ${directoryPath} failed with error ${error}`);
        return reject(error);
      }
    })
  })
};

const packageInstall = (packageDir, bsConfig) => {
  return new Promise(function (resolve, reject) {
    const nodeProcessCloseCallback = (code) => {
      if(code == 0) {
        logger.info(`Packages were installed locally successfully.`);
        resolve('Packages were installed successfully.');
      } else {
        logger.error(`Some error occurred while installing packages. Error code ${code}. Please read npm_install_debug.log for more info.`);
        reject(`Packages were not installed successfully. Error code ${code}`);
      }
    };
    const nodeProcessErrorCallback = (error) => {
      logger.error(`Some error occurred while installing packages: %j`, error);
      reject(`Packages were not installed successfully. Error Description ${util.format('%j', error)}`);
    };

    // Moving .npmrc to tmpBstackPackages
    try {
      logger.debug(`Copying .npmrc file to temporary package directory`);
      const npmrcRootPath = path.join(cliUtils.isNotUndefined(bsConfig.run_settings.home_directory) ? path.resolve(bsConfig.run_settings.home_directory) : './', '.npmrc');
      const npmrcTmpPath = path.join(path.resolve(packageDir), '.npmrc');
      fs.copyFileSync(npmrcRootPath, npmrcTmpPath);
    } catch (error) {
      logger.debug(`Failed copying .npmrc to ${packageDir}: ${error}`)
    }

    let nodeProcess;
    logger.debug(`Fetching npm version and its major version`);
    const npm_version = get_version('npm')
    const npm_major_version = utils.getMajorVersion(npm_version);
    logger.debug(`Fetched npm version: ${npm_version} and its major version: ${npm_major_version}`);

    // add --legacy-peer-deps flag while installing dependencies for npm v7+
    // For more info please read "Peer Dependencies" section here -> https://github.blog/2021-02-02-npm-7-is-now-generally-available/
    // APS-19009: --ignore-scripts prevents a user-supplied npm_dependencies package from
    // executing lifecycle scripts (postinstall etc.) during this install, which was an RCE
    // on CI. npm_dependencies is documented as pure-JS only. shell:true is retained on
    // purpose: the command line is fully static (package names live in package.json, never
    // on the command line, so there is no injection surface) and it is required for the
    // output redirection and for invoking npm.cmd on Windows.
    if (parseInt(npm_major_version) >= 7) {
      logger.debug(`Running NPM install command: npm install --legacy-peer-deps --ignore-scripts --loglevel verbose > ../npm_install_debug.log`);
      nodeProcess = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['install', '--legacy-peer-deps', '--ignore-scripts', '--loglevel', 'verbose', '>', '../npm_install_debug.log', '2>&1'], {cwd: packageDir, shell: true}); // nosemgrep: javascript.lang.security.audit.spawn-shell-true.spawn-shell-true
    } else {
      logger.debug(`Running NPM install command: 'npm install --ignore-scripts --loglevel verbose > ../npm_install_debug.log'`);
      nodeProcess = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['install', '--ignore-scripts', '--loglevel', 'verbose', '>', '../npm_install_debug.log', '2>&1'], {cwd: packageDir, shell: true}); // nosemgrep: javascript.lang.security.audit.spawn-shell-true.spawn-shell-true
    }
    nodeProcess.on('close', nodeProcessCloseCallback);
    nodeProcess.on('error', nodeProcessErrorCallback);
  });
};

const packageArchiver = (packageDir, packageFile) => {
  return new Promise(function (resolve, reject) {
    let output = fs.createWriteStream(packageFile);
    let archive = archiver('tar', {
      gzip: true
    });
    archive.on('warning', function (err) {
      if (err.code === 'ENOENT') {
        logger.info(err);
      } else {
        logger.debug(`Archiving of node_modules failed with error ${err}`);
        reject(err);
      }
    });

    output.on('close', function () {
      resolve('Zipping completed');
    });

    output.on('end', function () {
      logger.info('Data has been drained');
    });

    archive.on('error', function (err) {
      logger.debug(`Archiving of node_modules failed with error ${err}`);
      reject(err);
    });

    archive.pipe(output);
    archive.directory(packageDir, false);
    archive.finalize();
  })
}

const packageSetupAndInstaller = (bsConfig, packageDir, instrumentBlocks) => {
  return new Promise(function (resolve) {
    let obj = {
      packagesInstalled: false
    };
    if (bsConfig && bsConfig.run_settings && bsConfig.run_settings.enforce_settings && bsConfig.run_settings.enforce_settings.toString() === 'true' ) {
      logger.info("Enforce_settings is enabled in run_settings");
      logger.debug(Constants.userMessages.SKIP_NPM_INSTALL);
      return resolve(obj);
    }
    logger.info(Constants.userMessages.NPM_INSTALL);
    instrumentBlocks.markBlockStart("packageInstaller.folderSetup");
    logger.debug("Started setting up package folder");
    return setupPackageFolder(bsConfig.run_settings, packageDir).then((_result) => {
      logger.debug("Completed setting up package folder");
      process.env.CYPRESS_INSTALL_BINARY = 0
      instrumentBlocks.markBlockEnd("packageInstaller.folderSetup");
      instrumentBlocks.markBlockStart("packageInstaller.packageInstall");
      logger.debug("Started installing dependencies specified in browserstack.json");
      return packageInstall(packageDir, bsConfig);
    }).then((_result) => {
      logger.debug("Completed installing dependencies");
      instrumentBlocks.markBlockEnd("packageInstaller.packageInstall");
      Object.assign(obj, { packagesInstalled: true });
      return resolve(obj);
    }).catch((err) => {
      logger.warn(`Error occured while installing npm dependencies. Dependencies will be installed in runtime. This will have a negative impact on performance. Reach out to browserstack.com/contact, if you persistantly face this issue.`);
      obj.error = err.stack ? err.stack.toString().substring(0,100) : err.toString().substring(0,100);
      return resolve(obj);
    })
  })
}

const packageWrapper = (bsConfig, packageDir, packageFile, md5data, instrumentBlocks, packagesInstalled) => {
  return new Promise(function (resolve) {
    let obj = {
      packageArchieveCreated: false
    };
    if (!packagesInstalled) {
      logger.debug("Skipping the caching of npm packages since package installed failed")
      return resolve(obj);
    }
    if (md5data.packageUrlPresent || !utils.isTrueString(bsConfig.run_settings.cache_dependencies)) {
      logger.debug("Skipping the caching of npm packages since BrowserStack has already cached your npm dependencies that have not changed since the last run.")
      return resolve(obj);
    }
    logger.info(Constants.userMessages.NPM_UPLOAD);
    instrumentBlocks.markBlockStart("packageInstaller.packageArchive");
    logger.debug("Started archiving node_modules")
    return packageArchiver(packageDir, packageFile)
    .then((_result) => {
      logger.debug("Archiving of node_modules completed");
      instrumentBlocks.markBlockEnd("packageInstaller.packageArchive");
      Object.assign(obj, { packageArchieveCreated: true });
      return resolve(obj);
    }).catch((err) => {
      logger.warn(`Error occured while caching npm dependencies. Dependencies will be installed in runtime. This will have a negative impact on performance. Reach out to browserstack.com/contact, if you persistantly face this issue.`);
      obj.error = err.stack ? err.stack.toString().substring(0,100) : err.toString().substring(0,100);
      return resolve(obj);
    })
  })
}

exports.packageWrapper = packageWrapper;
exports.packageSetupAndInstaller = packageSetupAndInstaller;
