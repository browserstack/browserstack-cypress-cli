const winston = require('winston'),
  fs = require("fs"),
  path = require("path");

const logDir = "log"; // directory path for logs
if (!fs.existsSync(logDir)) {
  // Create the directory if it does not exist
  fs.mkdirSync(logDir);
}

// Save transports to change log level dynamically
const transports = {
  loggerConsole: new winston.transports.Console({
    name: 'console.info',
    colorize: true,
    timestamp: function () {
      return `[${new Date().toLocaleString()}]`;
    },
    prettyPrint: true,
  }),
  syncLoggerConsole: new (winston.transports.Console)({
    formatter: (options) => {
      return  (options.message ? options.message : '');
    }
  }),
  loggerFile: new winston.transports.File({
    filename: path.join(logDir, "/usage.log"),
  }),
}

const winstonLoggerParams = {
  transports: [
    transports.loggerConsole,
  ],
};

const winstonSyncCliLoggerParams = {
  transports: [
    transports.syncLoggerConsole,
  ]
}

const winstonFileLoggerParams = {
  transports: [
    transports.loggerFile,
  ],
};

exports.winstonLogger = new winston.Logger(winstonLoggerParams);
exports.fileLogger = new winston.Logger(winstonFileLoggerParams);
exports.syncCliLogger = new winston.Logger(winstonSyncCliLoggerParams);

//Export transports to change log level
exports.transports = transports;
