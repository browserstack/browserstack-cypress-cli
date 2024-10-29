'use strict';
const config = require('./config.js');
const fs = require("fs"),
    path = require("path");

const archiver = require("archiver"),
  Constants = require('../helpers/constants'),
  logger = require("./logger").winstonLogger,
  utils = require('../helpers/utils');

const archiveSpecs = (runSettings, filePath, excludeFiles, md5data) => {
  return new Promise(function (resolve, reject) {
    if (md5data.zipUrlPresent) {
      logger.debug("Skipping test suite upload since BrowserStack already has your test suite that has not changed since the last run.");
      return resolve('Zipping not required');
    }
    var output = fs.createWriteStream(filePath);

    var cypressFolderPath = '';
    let cypressAppendFilesZipLocation = '';
    if (runSettings.home_directory) {
      cypressFolderPath = runSettings.home_directory;
      cypressAppendFilesZipLocation = runSettings.cypressZipStartLocation;
      if (cypressAppendFilesZipLocation !== '') {
        cypressAppendFilesZipLocation += '/';
      }
    } else {
      cypressFolderPath = path.dirname(runSettings.cypressConfigFilePath);
    }

    logger.info(`Creating tests.zip with files in ${cypressFolderPath}`);

    var archive = archiver('zip', {
      zlib: {level: 9}, // Sets the compression level.
    });

    archive.on('warning', function (err) {
      if (err.code === 'ENOENT') {
        logger.info(err);
      } else {
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
      reject(err);
    });

    archive.pipe(output);

    let ignoreFiles = utils.getFilesToIgnore(runSettings, excludeFiles);
    logger.debug(`Patterns ignored during zip ${ignoreFiles}`);
    archive.glob(`**/*.+(${Constants.allowedFileTypes.join("|")})`, { cwd: cypressFolderPath, matchBase: true, ignore: ignoreFiles, dot:true });

    let packageJSON = {};

    if (typeof runSettings.package_config_options === 'object') {
      Object.assign(packageJSON, runSettings.package_config_options);
    }

    if (typeof runSettings.npm_dependencies === 'object') {
      Object.assign(packageJSON, {
        devDependencies: runSettings.npm_dependencies,
      });
    }

    // Split mac and win configs
    let macPackageJSON = {};
    let winPackageJSON = {};
    Object.assign(macPackageJSON, packageJSON);
    Object.assign(winPackageJSON, packageJSON);

    if (typeof runSettings.npm_dependencies === 'object') {
      let macNpmDependencies = Object.assign({}, runSettings.npm_dependencies, runSettings.mac_npm_dependencies || {});
      let winNpmDependencies = Object.assign({}, runSettings.npm_dependencies, runSettings.win_npm_dependencies || {});

      Object.assign(macPackageJSON, {
        devDependencies: macNpmDependencies,
      });

      Object.assign(winPackageJSON, {
        devDependencies: winNpmDependencies,
      });
    }

    if (Object.keys(packageJSON).length > 0) {
      const macPackageJSONString = JSON.stringify(macPackageJSON, null, 4);
      const winPackageJSONString = JSON.stringify(winPackageJSON, null, 4);
      archive.append(macPackageJSONString, {name: `${cypressAppendFilesZipLocation}browserstack-mac-package.json`});
      archive.append(winPackageJSONString, {name: `${cypressAppendFilesZipLocation}browserstack-win-package.json`});
    }

    //Create copy of package.json
    if(fs.existsSync('package.json')){
      let originalPackageJson = JSON.parse(fs.readFileSync('package.json'));
      let originalPackageJsonString = JSON.stringify(originalPackageJson, null, 4);
      archive.append(originalPackageJsonString, {name: `${cypressAppendFilesZipLocation}userPackage.json`});
      logger.debug(`Created copy of package.json in ${config.packageDirName} folder`)
    }

    // do not add cypress.json if arg provided is false
    if (
      runSettings.cypress_config_file &&
      runSettings.cypress_config_filename !== 'false'
    ) {
      if (runSettings.cypressTestSuiteType === Constants.CYPRESS_V10_AND_ABOVE_TYPE) {
        let cypressConfigFileString = fs.readFileSync(runSettings.cypressConfigFilePath, {encoding: "utf-8"});
        for (const possibleCypressFileName of Constants.CYPRESS_CONFIG_FILE_NAMES) {
          if (path.extname(runSettings.cypress_config_filename) == path.extname(possibleCypressFileName)) {
            archive.append(cypressConfigFileString, {name: `${cypressAppendFilesZipLocation}${possibleCypressFileName}`});
            break;
          }
        }
      } else if (runSettings.cypressTestSuiteType === Constants.CYPRESS_V9_AND_OLDER_TYPE) {
        let cypressJSON = JSON.parse(fs.readFileSync(runSettings.cypressConfigFilePath));
        let cypressJSONString = JSON.stringify(cypressJSON, null, 4);
        archive.append(cypressJSONString, {name: `${cypressAppendFilesZipLocation}cypress.json`});
      }
    }

    archive.finalize();
  });
}

exports.archive = archiveSpecs
