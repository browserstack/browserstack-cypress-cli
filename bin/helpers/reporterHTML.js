const fs = require('fs'),
      path = require('path'),
      request = require('request'),
      logger = require('./logger').winstonLogger,
      utils = require("./utils"),
      Constants = require('./constants'),
      config = require("./config");

let templatesDir = path.join(__dirname, '../', 'templates');

function loadInlineCss() {
  return loadFile(path.join(templatesDir, 'assets', 'browserstack-cypress-report.css'));
}

function loadFile(fileName) {
  return fs.readFileSync(fileName, 'utf8');
}

function createBodyBuildHeader(report_data){
  let projectNameSpan = `<span class='project-name'> ${report_data.project_name} </span>`;
  let buildNameSpan = `<span class='build-name'> ${report_data.build_name} </span>`;
  let buildMeta = `<div class='build-meta'> ${buildNameSpan} ${projectNameSpan} </div>`;
  let buildLink = `<div class='build-link'> <a href='${report_data.build_url}' rel='noreferrer noopener' target='_blank'> View on BrowserStack </a> </div>`;
  let buildHeader = `<div class='build-header'> ${buildMeta} ${buildLink} </div>`;
  return buildHeader;
}

function createBodyBuildTable(report_data) {
  let specs = Object.keys(report_data.rows),
      specRow = '',
      specSessions = '',
      sessionBlocks = '',
      specData,
      specNameSpan,
      specPathSpan,
      specStats,
      specStatsSpan,
      specMeta,
      sessionStatus,
      sessionClass,
      sessionStatusIcon,
      sessionLink;

  specs.forEach((specName) => {
    specData = report_data.rows[specName];

    specNameSpan = `<span class='spec-name'> ${specName} </span>`;
    specPathSpan = `<span class='spec-path'> ${specData.path} </span>`;

    specStats = buildSpecStats(specData.meta);
    specStatsSpan = `<span class='spec-stats ${specStats.cssClass}'> ${specStats.label} </span>`;

    specMeta = `<div class='spec-meta'> ${specNameSpan} ${specPathSpan} ${specStatsSpan} </div>`;
    sessionBlocks = '';
    specData.sessions.forEach((specSession) => {

      sessionStatus = specSession.status;
      sessionClass = sessionStatus === 'passed' ? 'session-passed' : 'session-failed';
      sessionStatusIcon = sessionStatus === 'passed' ? "&#10004; " : "&#x2717; ";

      sessionLink = `<a href="${specSession.link}" rel="noreferrer noopener" target="_blank"> ${sessionStatusIcon} ${specSession.name} </a>`;

      sessionDetail = `<div class="session-detail ${sessionClass}"> ${sessionLink} </div>`;
      sessionBlocks = `${sessionBlocks} ${sessionDetail}`;
    });
    specSessions = `<div class='spec-sessions'> ${sessionBlocks} </div>`;
    specRow = `${specRow} <div class='spec-row'> ${specMeta} ${specSessions} </div>`;
  });


  return `<div class='build-table'> ${specRow} </div>`;
}

function buildSpecStats(specMeta) {
  let failedSpecs = specMeta.failed,
      passedSpecs = specMeta.passed,
      totalSpecs = specMeta.total,
      specStats = {};

  if (failedSpecs) {
    specStats.label = `${failedSpecs}/${totalSpecs} FAILED`;
    specStats.cssClass = 'spec-stats-failed';
  } else {
    specStats.label = `${passedSpecs}/${totalSpecs} PASSED`;
    specStats.cssClass = 'spec-stats-passed';
  }

  return specStats;
}

let reportGenerator = (bsConfig, buildId, args, rawArgs, cb) => {
  let options = {
    url: `${config.buildUrl}${buildId}/custom_report`,
    auth: {
      user: bsConfig.auth.username,
      password: bsConfig.auth.access_key,
    },
    headers: {
      'User-Agent': utils.getUserAgent(),
    },
  };

  return request.get(options, async function (err, resp, body) {
    let message = null;
    let messageType = null;
    let errorCode = null;
    let build;

    if (err) {
      message = err;
      messageType = Constants.messageTypes.ERROR;
      errorCode = 'api_failed_build_report';

      logger.error('Generating the build report failed.');
      logger.error(message);

      utils.sendUsageReport(bsConfig, args, message, messageType, errorCode, null, rawArgs);
      return;
    } else {
      try {
        build = JSON.parse(body);
      } catch (error) {
        build = null;
      }
    }

    if (resp.statusCode == 299) {
      messageType = Constants.messageTypes.INFO;
      errorCode = 'api_deprecated';

      if (build) {
        message = build.message;
        logger.info(message);
      } else {
        message = Constants.userMessages.API_DEPRECATED;
        logger.info(message);
      }
    } else if (resp.statusCode === 422) {
      messageType = Constants.messageTypes.ERROR;
      errorCode = 'api_failed_build_generate_report';
      try {
        response = JSON.parse(body);
        message = response.message;
      } catch (error) {
        logger.error(`Error generating the report: ${error}`);
        response = {message: message};
      }
      logger.error(response.message);
    } else if (resp.statusCode != 200) {
      messageType = Constants.messageTypes.ERROR;
      errorCode = 'api_failed_build_generate_report';

      if (build) {
        message = `${
          Constants.userMessages.BUILD_GENERATE_REPORT_FAILED.replace('<build-id>', buildId)
        } with error: \n${JSON.stringify(build, null, 2)}`;
        logger.error(message);
        if (build.message === 'Unauthorized') errorCode = 'api_auth_failed';
      } else {
        message = Constants.userMessages.BUILD_GENERATE_REPORT_FAILED.replace('<build-id>', buildId);
        logger.error(message);
      }
    } else {
      messageType = Constants.messageTypes.SUCCESS;
      message = `Report for build: ${buildId} was successfully created.`;
      await renderReportHTML(build);
      logger.info(message);
    }
    utils.sendUsageReport(bsConfig, args, message, messageType, errorCode, null, rawArgs);
    if (cb){
      cb();
    }
  });
}

async function renderReportHTML(report_data) {
  let resultsDir = 'results';
  let metaCharSet = `<meta charset="utf-8">`;
  let metaViewPort = `<meta name="viewport" content="width=device-width, initial-scale=1"> `;
  let pageTitle = `<title> BrowserStack Cypress Report </title>`;
  let inlineCss = `<style type="text/css"> ${loadInlineCss()} </style>`;
  let head = `<head> ${metaCharSet} ${metaViewPort} ${pageTitle} ${inlineCss} </head>`;
  let htmlOpenTag = `<!DOCTYPE HTML><html>`;
  let htmlClosetag = `</html>`;
  let bodyBuildHeader = createBodyBuildHeader(report_data);
  let bodyBuildTable = createBodyBuildTable(report_data);
  let bodyReporterContainer = `<div class='report-container'> ${bodyBuildHeader} ${bodyBuildTable} </div>`;
  let body = `<body> ${bodyReporterContainer} </body>`;
  let html = `${htmlOpenTag} ${head} ${body} ${htmlClosetag}`;


  if (!fs.existsSync(resultsDir)){
    fs.mkdirSync(resultsDir);
  }

  // Writing the JSON used in creating the HTML file.
  let reportData = await cypressReportData(report_data);
  fs.writeFileSync(
    `${resultsDir}/browserstack-cypress-report.json`,
    JSON.stringify(reportData),
    () => {
      if (err) {
        return logger.error(err);
      }
      logger.info("The JSON file is saved");
    }
  );

  // Writing the HTML file generated from the JSON data.
  fs.writeFileSync(`${resultsDir}/browserstack-cypress-report.html`, html, () => {
    if(err) {
      return logger.error(err);
    }
    logger.info("The HTML file was saved!");
  });
}

async function cypressReportData(report_data) {
  specFiles = Object.keys(report_data.rows);
  combinationPromises = [];
  for (let spec of specFiles) {
    let specSessions = report_data.rows[spec]["sessions"];
    if (specSessions.length > 0) {
      for (let combination of specSessions) {
        if(utils.isUndefined(report_data.cypress_version) || report_data.cypress_version < "6"){
          combinationPromises.push(generateCypressCombinationSpecReportDataWithoutConfigJson(combination));
        }else{
          combinationPromises.push(generateCypressCombinationSpecReportDataWithConfigJson(combination));
        }
      }
    }
  }
  await Promise.all(combinationPromises);
  return report_data;
}

function getConfigJsonResponse(combination) {
  return new Promise(async (resolve, reject) => {
    configJsonResponse = null;
    configJsonError = false
    request.get(combination.tests.config_json , function(err, resp, body) {
      if(err) {
        configJsonError = true;
        reject([configJsonResponse, configJsonError]);
      } else {
        if(resp.statusCode != 200) {
          configJsonError = true;
          reject([configJsonResponse, configJsonError]);
        } else {
          try {
            configJsonResponse = JSON.parse(body);
          } catch (err) {
            configJsonError = true
            reject([configJsonResponse, configJsonError]);
          }
        }
      }
      resolve([configJsonResponse, configJsonError]);
    }); 
  });
}

function getResultsJsonResponse(combination) {
  return new Promise(async (resolve, reject) => {
    resultsJsonResponse = null
    resultsJsonError = false;
    request.get(combination.tests.result_json , function(err, resp, body) {
      if(err) {
        resultsJsonError = true;
        reject([resultsJsonResponse, resultsJsonError]);
      } else {
        if(resp.statusCode != 200) {
          resultsJsonError = true;
          reject([resultsJsonResponse, resultsJsonError]);
        } else {
          try {
            resultsJsonResponse = JSON.parse(body);
          } catch (err) {
            resultsJsonError = true
            reject([resultsJsonResponse, resultsJsonError]);
          }
        }
      }
      resolve([resultsJsonResponse, resultsJsonError]);
    }); 
  });
}

function generateCypressCombinationSpecReportDataWithConfigJson(combination){
  return new Promise(async (resolve, reject) => {
      try {
        let configJsonError, resultsJsonError;
        let configJson, resultsJson;
        
        await Promise.all([getConfigJsonResponse(combination), getResultsJsonResponse(combination)]).then(function (successResult) {
          [[configJson, configJsonError], [resultsJson, resultsJsonError]]  = successResult;
        }).catch(function (failureResult) {
          [[configJson, configJsonError], [resultsJson, resultsJsonError]]  = failureResult;
        });

        if(resultsJsonError || configJsonError){
          resolve();
        }
        let tests = {};
        if(utils.isUndefined(configJson.tests) || utils.isUndefined(resultsJson.tests)){
          resolve();
        }
        configJson.tests.forEach((test) => {
          tests[test["clientId"]] = test;
        });
        resultsJson.tests.forEach((test) => {
          tests[test["clientId"]] = Object.assign(
            tests[test["clientId"]],
            test
          );
        });
        let sessionTests = [];
        Object.keys(tests).forEach((testId) => {
          sessionTests.push({
            name: tests[testId]["title"].pop(),
            status: tests[testId]["state"],
            duration: parseFloat(
              tests[testId]["attempts"].pop()["wallClockDuration"] / 1000
            ).toFixed(2),
          });
        });
        combination.tests = sessionTests;
        resolve(combination.tests);
      } catch (error) {
        process.exitCode = Constants.ERROR_EXIT_CODE;
        reject(error);
      }
  })
}

function generateCypressCombinationSpecReportDataWithoutConfigJson(combination){
  return new Promise(async (resolve, reject) => {
      try {
        let resultsJson ,resultsJsonError;
        await getResultsJsonResponse(combination).then(function (successResult) {
          [resultsJson, resultsJsonError] = successResult
        }).catch( function (failureResult) {
          [resultsJson, resultsJsonError] = failureResult
        })
        if(resultsJsonError || utils.isUndefined(resultsJsonResponse)){
          resolve();
        }
        let sessionTests = [];
        if(utils.isUndefined(resultsJson.tests)){
          resolve();
        }
        resultsJson.tests.forEach((test) => {
          durationKey = utils.isUndefined(test["attempts"]) ? test : test["attempts"].pop()
          sessionTests.push({
            name: test["title"].pop(),
            status: test["state"],
            duration: parseFloat(
              durationKey["wallClockDuration"] / 1000
            ).toFixed(2)
          })
        });
        combination.tests = sessionTests;
        resolve(combination.tests);
      } catch (error) {
        process.exitCode = Constants.ERROR_EXIT_CODE;
        reject(error);
      }
  })
}

exports.reportGenerator = reportGenerator;
