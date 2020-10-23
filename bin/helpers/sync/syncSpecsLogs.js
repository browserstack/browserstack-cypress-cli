"use strict";
const request = require("request"),
  config = require("../config"),
  utils = require("../utils"),
  logger = require("../logger").syncCliLogger,
  async = require('async'),
  Constants = require("../constants"),
  tableStream = require('table').createStream,
  chalk = require('chalk');

let whileLoop = true, whileTries = 40, options, timeout = 3000, n = 10, tableConfig, stream, startTime, endTime;
let specSummary = {
  "specs": [],
  "duration": null
}


let  getOptions = (auth, build_id) => {
  return {
    url: `${config.buildUrl}${build_id}`,
    auth: {
      user: auth.username,
      password: auth.access_key
    },
    headers: {
      "Content-Type": "application/json",
      "User-Agent": utils.getUserAgent()
    }
  };
}

let getTableConfig = () => {
  return {
    border: getBorderConfig(),
    singleLine: true,
    columns: {
      0: { alignment: 'right' }
    },
    columnDefault: {
      width: 50
    },
    columnCount: 2
  };
}

let getBorderConfig = () => {
  return {
    topBody: `-`,
    topJoin: ``,
    topLeft: ``,
    topRight: ``,

    bottomBody: `-`,
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

let printSpecsStatus = (bsConfig, buildDetails) => {
  return new Promise((resolve, reject) => {
    options = getOptions(bsConfig.auth, buildDetails.build_id)
    tableConfig = getTableConfig();
    stream = tableStream(tableConfig);

    async.whilst(
      function() { // condition for loop
        return whileLoop;
      },
      function(callback) { // actual loop
        whileProcess(callback)
      },
      function(err, result) { // when loop ends
        specSummary.duration =  endTime - startTime
        logger.info();
        resolve(specSummary)
      }
    );
  });
};

let whileProcess = (whilstCallback) => {
  request.post(options, function(error, response, body) {
    if (error) {
      return whilstCallback(error);
    }
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
        return whilstCallback(null, body);
      default:
        whileLoop = false;
        return whilstCallback({ status: response.statusCode, message: body });
    }
  });
}

let showSpecsStatus = (data) => {
  let specData = JSON.parse(data);
  specData.forEach(specDetails => {
    if (specDetails == "created") {
      printInitialLog();
    } else {
      printSpecData(JSON.parse(specDetails))
    }
  });
}

let printInitialLog = () => {
  startTime = Date.now();
  logger.info(Constants.syncCLI.LOGS.INIT_LOG)
  n = Constants.syncCLI.INITIAL_DELAY_MULTIPLIER
}

let printSpecData = (data) => {
  let combination = getCombinationName(data["spec"]);
  let status = getStatus(data["spec"]["status"]);
  writeToTable(combination, data["path"], status)
  addSpecToSummary(data["path"], data["spec"]["status"], combination, data["session_id"])
}

let writeToTable = (combination, specName, status) => {
  stream.write([combination + ":", `${specName} ${status}`]);
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
  return `${spec["os"]} ${spec["osVersion"]} / ${spec["browser"]} ${spec["browserVersion"]}`
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
