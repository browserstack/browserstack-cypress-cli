const winston = require('winston'),
  fs = require("fs"),
  path = require("path");

const logDir = "log"; // directory path for logs
if (!fs.existsSync(logDir)) {
  // Create the directory if it does not exist
  fs.mkdirSync(logDir);
}

const winstonLoggerParams = {
  transports: [
    new winston.transports.Console({
      name: 'console.info',
      colorize: true,
      timestamp: function () {
        return `[${new Date().toLocaleString()}]`;
      },
      prettyPrint: true,
    }),
  ],
};

const winstonSyncCliLoggerParams = {
  transports: [
    new (winston.transports.Console)({
      formatter: (options) => {
        return  (options.message ? options.message : '');
      }
    }),
  ]
}

const winstonFileLoggerParams = {
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "/usage.log"),
    }),
  ],
};

exports.winstonLogger = new winston.Logger(winstonLoggerParams);
exports.fileLogger = new winston.Logger(winstonFileLoggerParams);
exports.syncCliLogger = new winston.Logger(winstonSyncCliLoggerParams);
