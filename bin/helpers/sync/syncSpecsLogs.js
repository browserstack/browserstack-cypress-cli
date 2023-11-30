"use strict";
const request = require("request"),
  config = require("../config"),
  utils = require("../utils"),
  logger = require("../logger").syncCliLogger,
  winstonLogger = require("../logger").winstonLogger,
  async = require('async'),
  Constants = require("../constants"),
  tableStream = require('table').createStream,
  chalk = require('chalk');

let whileLoop = true, whileTries = config.retries, options, timeout = 3000, n = 2, tableConfig, stream, endTime, startTime = Date.now(), buildStarted = false;
let specSummary = {
  "buildError": null,
  "specs": [],
  "duration": null,
  "parallels": null,
  "cliDuration": null,
  "customErrorsToPrint": []
}

let noWrap = false;
let terminalWidth = (process.stdout.columns) * 0.9;
let lineSeparator = Constants.syncCLI.DEFAULT_LINE_SEP;
if (!isNaN(terminalWidth)) lineSeparator = "\n" + "-".repeat(terminalWidth);

let getOptions = (auth, build_id) => {
  const options = {
    url: `${config.buildUrlV2}${build_id}`,
    auth: {
      user: auth.username,
      password: auth.access_key
    },
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": utils.getUserAgent()
    }
  };

  if (Constants.turboScaleObj.enabled) {
    options.url = `${config.turboScaleBuildsUrl}/${build_id}`;
  }

  return options;
}

let getTableConfig = (termWidth) => {
  let centerWidth = Math.ceil(termWidth * 0.01),
      leftWidth = Math.floor(termWidth * 0.75),
      colWidth = Math.floor(termWidth * 0.2);

  // Do not autosize on terminal's width if no-wrap provided
  if (noWrap || isNaN(termWidth)) {
    centerWidth = 1;
    leftWidth = 100;
    colWidth = 30;
  }

  return {
    border: getBorderConfig(),
    columns: {
      1: {alignment: 'center', width: centerWidth},
      2: {alignment: 'left', width: leftWidth}
    },
    columnDefault: {
      width: colWidth,
    },
    columnCount: 3,
  };
}

let getBorderConfig = () => {
  return {
    topBody: ``,
    topJoin: ``,
    topLeft: ``,
    topRight: ``,

    bottomBody: ``,
    bottomJoin: ``,
    bottomLeft: ``,
    bottomRight: ``,

    bodyLeft: ``,
    bodyRight: ``,
    bodyJoin: ``,

    joinBody: ``,
    joinLeft: ``,
    joinRight: ``,
    joinJoin: ``
  }
}

let setNoWrapParams = () => {
  noWrap = (process.env.SYNC_NO_WRAP && (process.env.SYNC_NO_WRAP === 'true'));
  // Do not show the separator based on terminal width if no-wrap provided.
  if (noWrap) {
    winstonLogger.debug("no-wrap is set to true, showing the default line separator irrespective of terminal width");
    lineSeparator = Constants.syncCLI.DEFAULT_LINE_SEP;
  } else {
    winstonLogger.debug("no-wrap set to false, showing line separator based on terminal width.");
  }
};

let printSpecsStatus = (bsConfig, buildDetails, rawArgs, buildReportData) => {
  setNoWrapParams();
  return new Promise((resolve, reject) => {
    options = getOptions(bsConfig.auth, buildDetails.build_id)
    tableConfig = getTableConfig(terminalWidth);
    stream = tableStream(tableConfig);

    async.whilst(
      function test(callback) { // condition for loop
        callback(null, whileLoop);
      },
      function iter(callback) { // actual loop
        whileProcess(callback)
      },
      function(err, result) { // when loop ends
        if (err) {
          winstonLogger.debug(`Error while fetching spec status :`, err);
          if(err.status == 204) {
            reject(specSummary.exitCode);
          } else {
          utils.sendUsageReport(bsConfig, {}, `buildId: ${buildDetails.build_id}`, 'error', 'sync_cli_error', { ...err , ...buildReportData}, rawArgs);
          }
        }
        logger.info(lineSeparator);
        specSummary.cliDuration =  endTime - startTime
        resolve(specSummary);
      }
    );
  });
};

let whileProcess = (whilstCallback) => {
  request.post(options, function(error, response, body) {
    if (error) {
      whileTries -= 1;
      if (whileTries === 0) {
        whileLoop = false;
        endTime = Date.now();
        specSummary.exitCode = config.networkErrorExitCode;
        return whilstCallback({ status: 504, message: "Tries limit reached" }); //Gateway Timeout
      } else {
        n = 2
        return setTimeout(whilstCallback, timeout * n, null);
      }
    }

    whileTries = config.retries; // reset to default after every successful request

    switch (response.statusCode) {
      case 202: // get data here and print it
        n = 2
        showSpecsStatus(body, 202);
        return setTimeout(whilstCallback, timeout * n, null);
      case 204: // No data available, wait for some time and ask again
        n = 1
        return setTimeout(whilstCallback, timeout * n, null);
      case 200: // Build is completed.
        whileLoop = false;
        endTime = Date.now();
        showSpecsStatus(body, 200);
        return specSummary.exitCode == Constants.BUILD_FAILED_EXIT_CODE ? 
        whilstCallback({ status: 204, message: "No specs ran in the build"} ) : whilstCallback(null, body);
      default:
        whileLoop = false;
        return whilstCallback({ status: response.statusCode, message: body });
    }
  });
}

let getStackTraceUrl = () => {
  return specSummary.buildError
}

let showSpecsStatus = (data, statusCode) => {
  let specData = JSON.parse(data);
  specData["specData"].forEach(specDetails => {
    if (specDetails.type === Constants.CYPRESS_CUSTOM_ERRORS_TO_PRINT_KEY) {
      addCustomErrorToPrint(specDetails);
    } else {
      if (specDetails == "created") {
        return;
      } else if (specDetails["stacktrace_url"]) {
        specSummary.exitCode = Constants.BUILD_FAILED_EXIT_CODE;
        specSummary.buildError = specDetails["stacktrace_url"]
        winstonLogger.error(chalk.red(specDetails["message"]));
      } else {
        if(!buildStarted) {
          buildStarted = true
          printInitialLog();
        }
        printSpecData(JSON.parse(specDetails));
      }
    }
  });
  if ( statusCode != 200 ) return; 
  // Below block is for printing build details, return if non 200 status code
  if ("buildData" in specData) {
    const buildDetails = specData.buildData;
    const totalDuration = (utils.isUndefined(buildDetails.duration)) ? "-" : buildDetails.duration.total_duration
    const parallels = (utils.isUndefined(buildDetails.parallels)) ? "-" : buildDetails.parallels
    specSummary.duration = totalDuration;
    specSummary.parallels = parallels;
  } else {
    logger.debug(`Build details not sent`)
  }
}

let printInitialLog = () => {
  winstonLogger.info(Constants.syncCLI.STARTUP_MESSAGE);
  logger.info(`\n${Constants.syncCLI.LOGS.INIT_LOG}`)
  logger.info(lineSeparator);
  n = Constants.syncCLI.INITIAL_DELAY_MULTIPLIER
}

let printSpecData = (data) => {
  let combination = getCombinationName(data["spec"]);
  let status = data["spec"]["status"];
  let statusMark = getStatus(status);
  writeToTable(combination, data["path"], status, statusMark)
  addSpecToSummary(data["path"], status, combination, data["session_id"])
}

let writeToTable = (combination, specName, status, statusMark) => {
  stream.write([combination , ":", `${specName} ${statusMark} [${status}]`]);
}

let addCustomErrorToPrint = (error_object) => {
  if (error_object["should_be_unique"]) {
    for (const error of specSummary.customErrorsToPrint) {
      if (error.id === error_object.id) {
        return;
      }
    }
  }
  specSummary.customErrorsToPrint.push(error_object);
}

let addSpecToSummary = (specName, status, combination, session_id) => {
  // Format for part 3: {specName: 'spec1.failed.js', status: 'Failed', combination: 'Win 10 / Chrome 78', sessionId: '3d3rdf3r...'},
  specSummary["specs"].push({
    "specName": specName,
    "status": status,
    "combination": combination,
    "sessionId": session_id
  })
}

let getCombinationName = (spec) => {
  return `${utils.capitalizeFirstLetter(spec['browser'])} ${spec['browserVersion']} (${spec['os']} ${spec['osVersion']})`;
}

let getStatus = (status) => {
  switch(status) {
    case "passed":
      return chalk.green("✔");
    case "failed":
      return chalk.red("✘");
    case "passed_with_skipped":
      return chalk.blueBright("✔");
    default:
      return chalk.blue(`[${status}]`);
  }
}

exports.printSpecsStatus = printSpecsStatus;
exports.getStackTraceUrl = getStackTraceUrl;
