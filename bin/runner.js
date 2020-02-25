#!/usr/bin/env node

const yargs = require('yargs')
var logger = require("./helpers/logger");

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
  .describe('v', 'show version information')
  .alias('h', 'help')
  .help('help')
  .showHelpOnFail(false, "Specify --help for available options")
  .demand(1, 'Requires init, run or poll argument.')
  .command('init', 'create a browserstack.json file in the folder specified with the default configuration options.', function(yargs) {
    argv = yargs
      .usage('usage: $0 init [options]')
      .options('p', {
        alias: 'path',
        default: false,
        description: 'Init in a specified folder',
        type: 'string'
      })
      .help('help')
      .wrap(null)
      .argv

    if (checkCommands(yargs, argv, 1)) {
      return require('./commands/init')(argv);
    }
  })
  .command('build', 'Check status of your build.', function(yargs) {
    argv = yargs
      .usage('usage: $0 info <buildId>')
      .demand(1, 'Requires a build id.')
      .options('cf', {
        alias: 'config-file',
        describe: 'Path to BrowserStack config',
        default: '/browserstack.json',
        type: 'string',
        nargs: 1,
        demand: true,
        demand: 'config file is required'
      })
      .help('help')
      .wrap(null)
      .argv
    if (checkCommands(yargs, argv, 1)) {
      logger.log("Getting information for buildId " + argv._[1]);
      return require('./commands/info')(argv);
    }
  })
  .command('delete', 'Delete your build on BrowserStack', function(yargs) {
    argv = yargs
      .usage('usage: $0 delete <buildId>')
      .demand(1, 'Requires a build id.')
      .options('cf', {
        alias: 'config-file',
        describe: 'Path to BrowserStack config',
        default: '/browserstack.json',
        type: 'string',
        nargs: 1,
        demand: true,
        demand: 'config file is required'
      })
      .help('help')
      .wrap(null)
      .argv
    if (checkCommands(yargs, argv, 1)) {
      logger.log("Deleting a build with buildId " + argv._[1]);
      return require('./commands/delete')(argv);
    }
  })
  .command('run', 'Run your tests on BrowserStack.', function(yargs) {
    argv = yargs
      .usage('usage: $0 build')
      .options('cf', {
        alias: 'config-file',
        describe: 'Path to BrowserStack config',
        default: '/browserstack.json',
        type: 'string',
        nargs: 1,
        demand: true,
        demand: 'config file is required'
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
