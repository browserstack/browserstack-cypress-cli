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
  "duration": null
}
let noWrap = false;
let terminalWidth = (process.stdout.columns) * 0.9;
let lineSeparator = Constants.syncCLI.DEFAULT_LINE_SEP;
if (!isNaN(terminalWidth)) lineSeparator = "\n" + "-".repeat(terminalWidth);

let  getOptions = (auth, build_id) => {
  return {
    url: `${config.buildUrl}${build_id}`,
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
    lineSeparator = Constants.syncCLI.DEFAULT_LINE_SEP;
  }
};

let printSpecsStatus = (bsConfig, buildDetails, rawArgs) => {
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
          if(err.status == 204) {
            reject(specSummary.exitCode);
          } else {
          utils.sendUsageReport(bsConfig, {}, `buildId: ${buildDetails.build_id}`, 'error', 'sync_cli_error', err, rawArgs);
          }
        }
        logger.info(lineSeparator);
        specSummary.duration =  endTime - startTime
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
        showSpecsStatus(body);
        return setTimeout(whilstCallback, timeout * n, null);
      case 204: // No data available, wait for some time and ask again
        n = 1
        return setTimeout(whilstCallback, timeout * n, null);
      case 200: // Build is completed.
        whileLoop = false;
        endTime = Date.now();
        showSpecsStatus(body);
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

let showSpecsStatus = (data) => {
  let specData = JSON.parse(data);
  specData.forEach(specDetails => {
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
  });
}

let printInitialLog = () => {
  winstonLogger.info(Constants.syncCLI.STARTUP_MESSAGE);
  logger.info(`\n${Constants.syncCLI.LOGS.INIT_LOG}`)
  logger.info(lineSeparator);
  n = Constants.syncCLI.INITIAL_DELAY_MULTIPLIER
}

let printSpecData = (data) => {
  let combination = getCombinationName(data["spec"]);
  let status = getStatus(data["spec"]["status"]);
  writeToTable(combination, data["path"], status)
  addSpecToSummary(data["path"], data["spec"]["status"], combination, data["session_id"])
}

let writeToTable = (combination, specName, status) => {
  stream.write([combination , ":", `${specName} ${status}`]);
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
    default:
      return chalk.blue(`[${status}]`);
  }
}

exports.printSpecsStatus = printSpecsStatus;
exports.getStackTraceUrl = getStackTraceUrl;
