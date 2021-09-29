'use strict'

const { isUndefined } = require('./utils');
const os = require('os');

let sessionTimes = {
  referenceTimes: {
    absoluteStartTime: Date.now()
  }, // Absolute times which needs to be used later to calculate logTimes
  logTimes: {}, // Time Difference in ms which we need to push to EDS
  eventTime: {}, // Time for particular events
};

const initTimeComponents = () => {
  sessionTimes = {referenceTimes: {absoluteStartTime: Date.now()}, logTimes: {}, eventTime: {}};
};

const markBlockStart = (blockName) => {
  sessionTimes.referenceTimes[blockName] = Date.now();
};

const markBlockEnd = (blockName) => {
  const startTime = sessionTimes.referenceTimes[blockName] || sessionTimes.referenceTimes.absoluteStartTime;
  markBlockDiff(blockName, startTime, Date.now());
};

const markBlockDiff = (blockName, startTime, stopTime) => {
  sessionTimes.logTimes[blockName] = stopTime - startTime;
}

const instrumentEventTime = (eventName) => {
  sessionTimes.eventTime[eventName] = new Date(new Date().toUTCString());
}

const getMacAdd = () => {
  const loopback = /(?:[0]{2}[:-]){5}[0]{2}/
  const interFaceList = os.networkInterfaces();
  for (let inter in interFaceList){
    for (const address of interFaceList[inter]) {
      if (loopback.test(address.mac) === false) {
        return {macAdress : address.mac}
      }
    }
  }
}

const getTimeComponents = () => {
  const data = convertDotToNestedObject(sessionTimes.logTimes);
  const mac = getMacAdd()
  return Object.assign(data, mac, sessionTimes.eventTime);
};

const convertDotToNestedObject = (dotNotationObject) => {
  let nestedObject = {};

  Object.keys(dotNotationObject).forEach((key) => {
    let dotKeys = key.split('.');
    let currentKey = nestedObject;
    for(let i = 0; i < dotKeys.length - 1; i++) {
      if (isUndefined(currentKey[dotKeys[i]])) {
        currentKey[dotKeys[i]] = {};
      } else if (Number.isInteger(currentKey[dotKeys[i]])) {
        currentKey[dotKeys[i]] = {total: currentKey[dotKeys[i]]};
      }
      currentKey = currentKey[dotKeys[i]];
    }
    if (isUndefined(currentKey[dotKeys[dotKeys.length - 1]]) || Number.isInteger(currentKey[dotKeys[dotKeys.length - 1]])) {
      currentKey[dotKeys[dotKeys.length - 1]] = dotNotationObject[key];
    } else {
      currentKey[dotKeys[dotKeys.length - 1]].total = dotNotationObject[key];
    }
  });

  return nestedObject;
};

module.exports = {
  initTimeComponents,
  instrumentEventTime,
  markBlockStart,
  markBlockEnd,
  markBlockDiff,
  getTimeComponents,
};
