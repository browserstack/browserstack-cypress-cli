#!/usr/bin/env node

const yargs = require('yargs')
var logger = require("./helpers/logger");
const Constants = require('./helpers/constants');

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
      .usage('usage: $0 init [options]')
      .options('p', {
        alias: 'path',
        default: false,
        description: Constants.cliMessages.INIT.DESC,
        type: 'string'
      })
      .help('help')
      .wrap(null)
      .argv

    if (checkCommands(yargs, argv, 1)) {
      return require('./commands/init')(argv);
    }
  })
  .command('build', Constants.cliMessages.BUILD.INFO, function(yargs) {
    argv = yargs
      .usage('usage: $0 info <buildId>')
      .demand(1, Constants.cliMessages.BUILD.DEMAND)
      .options('cf', {
        alias: 'config-file',
        describe: Constants.cliMessages.BUILD.DESC,
        default: '/browserstack.json',
        type: 'string',
        nargs: 1,
        demand: true,
        demand: Constants.cliMessages.BUILD.CONFIG_DEMAND
      })
      .help('help')
      .wrap(null)
      .argv
    if (checkCommands(yargs, argv, 1)) {
      logger.log(Constants.cliMessages.BUILD.DISPLAY + argv._[1]);
      return require('./commands/info')(argv);
    }
  })
  .command('run', Constants.cliMessages.RUN.INFO, function(yargs) {
    argv = yargs
      .usage('usage: $0 build')
      .options('cf', {
        alias: 'config-file',
        describe: Constants.cliMessages.RUN.DESC,
        default: '/browserstack.json',
        type: 'string',
        nargs: 1,
        demand: true,
        demand: Constants.cliMessages.RUN.CONFIG_DEMAND
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
