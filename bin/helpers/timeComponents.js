'use strict'

const { isUndefined } = require('./utils');

let sessionTimes = {
  referenceTimes: {
    absoluteStartTime: Date.now()
  }, // Absolute times which needs to be used later to calculate logTimes
  logTimes: {}, // Time Difference in ms which we need to push to EDS
};

const initTimeComponents = () => {
  sessionTimes = {referenceTimes: {absoluteStartTime: Date.now()}, logTimes: {}};
};

const markBlockStart = (blockName) => {
  sessionTimes.referenceTimes[blockName] = Date.now();
};

const markBlockEnd = (blockName) => {
  startTime = sessionTimes.referenceTimes[blockName] || sessionTimes.referenceTimes.absoluteStartTime;
  markBlockDiff(blockName, startTime, Date.now());
};

const getTimeComponents = (buildId) => {
  if (isUsageReportingDisabled() === "true") return undefined;

  const data = convertDotToNestedObject(sessionTimes.logTimes);

  return JSON.stringify(data);
};

const markBlockDiff = (blockName, startTime, stopTime) => {
  sessionTimes.logTimes[blockName] = stopTime - startTime;
}

const convertDotToNestedObject = (dotNotationObject) => {
  let nestedObject = {};
  Object.keys(dotNotationObject).forEach((key) => {
    let dotKeys = key.split('.');
    let currentKey = nestedObject;
    for(let i = 0; i < dotKeys.length - 1; i++) {
      if (isUndefined(currentKey[dotKeys[i]])) {
        currentKey[dotKeys[i]] = {};
      }
      currentKey = currentKey[dotKeys[i]];
    }
    currentKey[dotKeys[dotKeys.length - 1]] = dotNotationObject[key];
  });
};

const isUsageReportingDisabled = () => process.env.DISABLE_USAGE_REPORTING;

module.exports = {
  initTimeComponents,
  markBlockStart,
  markBlockEnd,
  getTimeComponents,
};
