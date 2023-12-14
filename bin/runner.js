#!/usr/bin/env node
'use strict';
const yargs = require('yargs'),
  logger = require("./helpers/logger").winstonLogger,
  Constants = require('./helpers/constants'),
  { disableUsageReportingOptions, commonBuildOptions, runOptions } = require('./helpers/runnerArgs');


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
    let rawArgv = process.argv.slice(2);
    argv = yargs
      .usage("usage: $0 init [filename] [options]")
      .options({
        ...disableUsageReportingOptions,
        'p': {
          alias: "path",
          default: false,
          description: Constants.cliMessages.INIT.DESC,
          type: "string",
        },
      })
      .help("help")
      .wrap(null).argv;

    if (checkCommands(yargs, argv, 1)) {
      return require('./commands/init')(argv, rawArgv);
    }
  })
  .command('build-info', Constants.cliMessages.BUILD.INFO, function(yargs) {
    let rawArgv = process.argv.slice(2);
    argv = yargs
      .usage('usage: $0 <buildId>')
      .demand(1, Constants.cliMessages.BUILD.DEMAND)
      .options({
        ...commonBuildOptions,
      })
      .help('help')
      .wrap(null)
      .argv
    if (checkCommands(yargs, argv, 1)) {
      logger.info(Constants.cliMessages.BUILD.INFO_MESSAGE + argv._[1]);
      return require('./commands/info')(argv, rawArgv);
    }
  })
  .command('build-stop', Constants.cliMessages.BUILD.STOP, function (yargs) {
    let rawArgv = process.argv.slice(2);
    argv = yargs
      .usage('usage: $0 <buildId>')
      .demand(1, Constants.cliMessages.BUILD.DEMAND)
      .options({
        ...commonBuildOptions,
      })
      .help('help')
      .wrap(null)
      .argv
    if (checkCommands(yargs, argv, 1)) {
      logger.info(Constants.cliMessages.BUILD.STOP_MESSAGE + argv._[1]);
      return require('./commands/stop')(argv, rawArgv);
    }
  })
  .command('run', Constants.cliMessages.RUN.INFO, function(yargs) {
    let rawArgv = process.argv.slice(2);
    argv = yargs
      .usage('usage: $0 run <options>')
      .options({
        ...runOptions,
      })
      .help('help')
      .wrap(null)
      .argv
    if (checkCommands(yargs, argv, 1)) {
      return require('./commands/runs')(argv, rawArgv);
    }
  })
  .command('generate-report', Constants.cliMessages.GENERATE_REPORT.INFO, function(yargs) {
    let rawArgv = process.argv.slice(2);
    argv = yargs
      .usage('usage: $0 generate-report <buildId>')
      .demand(1, Constants.cliMessages.BUILD.DEMAND)
      .options({
        ...commonBuildOptions,
      })
      .help('help')
      .wrap(null)
      .argv
    if (checkCommands(yargs, argv, 1)) {
      logger.info(Constants.cliMessages.BUILD.INFO_MESSAGE + argv._[1]);
      return require('./commands/generateReport')(argv, rawArgv);
    }
  })
  .command('generate-downloads', Constants.cliMessages.GENERATE_DOWNLOADS.INFO, function(yargs) {
    let rawArgv = process.argv.slice(2);
    argv = yargs
      .usage('usage: $0 generate-downloads <buildId>')
      .demand(1, Constants.cliMessages.BUILD.DEMAND)
      .options({
        ...commonBuildOptions,
      })
      .help('help')
      .wrap(null)
      .argv
    if (checkCommands(yargs, argv, 1)) {
      logger.info(Constants.cliMessages.BUILD.INFO_MESSAGE + argv._[1]);
      return require('./commands/generateDownloads')(argv, rawArgv);
    }
  })
  .help('help')
  .wrap(null)
  .argv
