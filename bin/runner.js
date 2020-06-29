#!/usr/bin/env node
'use strict';
const yargs = require('yargs'),
  logger = require("./helpers/logger").winstonLogger,
  Constants = require('./helpers/constants');

function checkCommands(yargs, argv, numRequired) {
  if (argv._.length < numRequired) {
    yargs.showHelp()
    return false
  }
  return true
}

var argv = yargs
  .usage('usage: $0 <command>')
  .alias('v', 'version')
  .describe('v', Constants.cliMessages.VERSION.INFO)
  .alias('h', 'help')
  .help('help')
  .showHelpOnFail(false, Constants.cliMessages.VERSION.HELP)
  .demand(1, Constants.cliMessages.VERSION.DEMAND)
  .command('init', Constants.cliMessages.INIT.INFO, function(yargs) {
    argv = yargs
      .usage("usage: $0 init [options]")
      .options({
        'p': {
          alias: "path",
          default: false,
          description: Constants.cliMessages.INIT.DESC,
          type: "string",
        },
        'disable-usage-reporting': {
          default: undefined,
          description: Constants.cliMessages.COMMON.DISABLE_USAGE_REPORTING,
          type: "boolean"
        },
      })
      .help("help")
      .wrap(null).argv;

    if (checkCommands(yargs, argv, 1)) {
      return require('./commands/init')(argv);
    }
  })
  .command('build-info', Constants.cliMessages.BUILD.INFO, function(yargs) {
    argv = yargs
      .usage('usage: $0 <buildId>')
      .demand(1, Constants.cliMessages.BUILD.DEMAND)
      .options({
        'cf': {
          alias: 'config-file',
          describe: Constants.cliMessages.BUILD.DESC,
          default: '/browserstack.json',
          type: 'string',
          nargs: 1,
          demand: true,
          demand: Constants.cliMessages.BUILD.CONFIG_DEMAND
        },
        'disable-usage-reporting': {
          default: undefined,
          description: Constants.cliMessages.COMMON.DISABLE_USAGE_REPORTING,
          type: "boolean"
        },
        'u': {
          alias: 'username',
          describe: Constants.cliMessages.COMMON.USERNAME,
          type: "string",
          default: undefined
        },
        'k': {
          alias: 'key',
          describe: Constants.cliMessages.COMMON.ACCESS_KEY,
          type: "string",
          default: undefined
        },
      })
      .help('help')
      .wrap(null)
      .argv
    if (checkCommands(yargs, argv, 1)) {
      logger.info(Constants.cliMessages.BUILD.INFO_MESSAGE + argv._[1]);
      return require('./commands/info')(argv);
    }
  })
  .command('build-stop', Constants.cliMessages.BUILD.STOP, function (yargs) {
    argv = yargs
      .usage('usage: $0 <buildId>')
      .demand(1, Constants.cliMessages.BUILD.DEMAND)
      .options({
        'cf': {
          alias: 'config-file',
          describe: Constants.cliMessages.BUILD.DESC,
          default: '/browserstack.json',
          type: 'string',
          nargs: 1,
          demand: true,
          demand: Constants.cliMessages.BUILD.CONFIG_DEMAND
        },
        'disable-usage-reporting': {
          default: undefined,
          description: Constants.cliMessages.COMMON.DISABLE_USAGE_REPORTING,
          type: "boolean"
        },
        'u': {
          alias: 'username',
          describe: Constants.cliMessages.COMMON.USERNAME,
          type: "string",
          default: undefined
        },
        'k': {
          alias: 'key',
          describe: Constants.cliMessages.COMMON.ACCESS_KEY,
          type: "string",
          default: undefined
        },
      })
      .help('help')
      .wrap(null)
      .argv
    if (checkCommands(yargs, argv, 1)) {
      logger.info(Constants.cliMessages.BUILD.STOP_MESSAGE + argv._[1]);
      return require('./commands/stop')(argv);
    }
  })
  .command('run', Constants.cliMessages.RUN.INFO, function(yargs) {
    argv = yargs
      .usage('usage: $0 run <options>')
      .options({
        'cf': {
          alias: 'config-file',
          describe: Constants.cliMessages.RUN.DESC,
          default: '/browserstack.json',
          type: 'string',
          nargs: 1,
          demand: true,
          demand: Constants.cliMessages.RUN.CONFIG_DEMAND
        },
        'disable-usage-reporting': {
          default: undefined,
          description: Constants.cliMessages.COMMON.DISABLE_USAGE_REPORTING,
          type: "boolean"
        },
        'p': {
          alias: 'parallels',
          describe: Constants.cliMessages.RUN.PARALLEL_DESC,
          type: "number",
          default: undefined
        },
        'u': {
          alias: 'username',
          describe: Constants.cliMessages.COMMON.USERNAME,
          type: "string",
          default: undefined
        },
        'k': {
          alias: 'key',
          describe: Constants.cliMessages.COMMON.ACCESS_KEY,
          type: "string",
          default: undefined
        },
        'b': {
          alias: 'build-name',
          describe: Constants.cliMessages.RUN.BUILD_NAME,
          type: "string",
          default: undefined
        }
      })
      .help('help')
      .wrap(null)
      .argv
    if (checkCommands(yargs, argv, 1)) {
      return require('./commands/runs')(argv);
    }
  })
  .help('help')
  .wrap(null)
  .argv
