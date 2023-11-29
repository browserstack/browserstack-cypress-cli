const Constants = require('./constants');

const usernameOptions = {
  'u': {
    alias: 'username',
    describe: Constants.cliMessages.COMMON.USERNAME,
    type: "string",
    default: undefined
  },
}

const accessKeyOptions = {
  'k': {
    alias: 'key',
    describe: Constants.cliMessages.COMMON.ACCESS_KEY,
    type: "string",
    default: undefined
  },
}

const configFileOptions = {
  'cf': {
    alias: 'config-file',
    describe: Constants.cliMessages.COMMON.CONFIG_FILE_PATH,
    default: 'browserstack.json',
    type: 'string',
    nargs: 1,
    demand: true,
    demand: Constants.cliMessages.COMMON.CONFIG_DEMAND
  },
}

const debugModeOptions = {
  'cli-debug': {
    default: false,
    describe: Constants.cliMessages.COMMON.DEBUG,
    type: "boolean"
  },
}

exports.disableUsageReportingOptions = {
  'disable-usage-reporting': {
    default: undefined,
    description: Constants.cliMessages.COMMON.DISABLE_USAGE_REPORTING,
    type: "boolean"
  },
}

exports.commonBuildOptions = {
  ...configFileOptions,
  ...this.disableUsageReportingOptions,
  ...usernameOptions,
  ...accessKeyOptions,
  ...debugModeOptions,
}

exports.runOptions = {
  ...this.commonBuildOptions,
  'ccf': {
    alias: 'cypress-config-file',
    describe: Constants.cliMessages.RUN.CYPRESS_DESC,
    default: './cypress.json',
    type: 'string',
    nargs: 1,
    demand: true,
    demand: Constants.cliMessages.RUN.CYPRESS_CONFIG_DEMAND
  },
  'gl': {
    alias: 'geolocation',
    describe: Constants.cliMessages.RUN.CYPRESS_GEO_LOCATION,
    default: undefined,
    type: 'string'
  },
  'p': {
    alias: ['parallels', 'parallel'],
    describe: Constants.cliMessages.RUN.PARALLEL_DESC,
    type: "number",
    default: undefined
  },
  'b': {
    alias: ['build-name', 'ci-build-id'],
    describe: Constants.cliMessages.RUN.BUILD_NAME,
    type: "string",
    default: undefined
  },
  'e': {
    alias: 'exclude',
    describe: Constants.cliMessages.RUN.EXCLUDE,
    type: "string",
    default: undefined
  },
  's': {
    alias: ['specs', 'spec'],
    describe: Constants.cliMessages.RUN.SPECS_DESCRIPTION,
    type: "string",
    default: undefined
  },
  'env': {
    describe: Constants.cliMessages.RUN.ENV_DESCRIPTION,
    type: "string",
    default: undefined
  },
  't': {
    alias: ['specTimeout'],
    default: undefined,
    describe: Constants.cliMessages.RUN.SPEC_TIMEOUT,
    type: "string"
  },
  'disable-npm-warning': {
    default: false,
    description: Constants.cliMessages.COMMON.NO_NPM_WARNING,
    type: "boolean"
  },
  'sync': {
    default: true,
    describe: Constants.cliMessages.RUN.SYNC_DESCRIPTION,
    type: "boolean"
  },
  'async': {
    default: false,
    describe: Constants.cliMessages.RUN.ASYNC_DESCRIPTION,
    type: "boolean"
  },
  'force-upload': {
    default: false,
    describe: Constants.cliMessages.COMMON.FORCE_UPLOAD,
    type: "boolean"
  },
  'headed': {
    default: false,
    describe: Constants.cliMessages.RUN.HEADED,
    type: "boolean"
  },
  'local': {
    describe: Constants.cliMessages.RUN.LOCAL,
    type: "boolean"
  },
  'local-identifier': {
    describe: Constants.cliMessages.RUN.LOCAL_IDENTIFIER,
    type: "string"
  },
  'local-mode': {
    describe: Constants.cliMessages.RUN.LOCAL_MODE,
    type: "string"
  },
  'local-config-file': {
    describe: Constants.cliMessages.RUN.LOCAL_CONFIG_FILE,
    type: "string"
  },
  'no-wrap': {
    default: false,
    describe: Constants.cliMessages.RUN.SYNC_NO_WRAP,
    type: "boolean"
  },
  'browser': {
    describe: Constants.cliMessages.RUN.BROWSER_DESCRIPTION,
    type: "string",
    default: undefined
  },
  'c': {
    alias: 'config',
    describe: Constants.cliMessages.RUN.CONFIG_DESCRIPTION,
    type: "string",
    default: undefined
  },
  'r': {
    alias: 'reporter',
    default: undefined,
    describe: Constants.cliMessages.RUN.REPORTER,
    type: "string"
  },
  'o': {
    alias: 'reporter-options',
    default: undefined,
    describe: Constants.cliMessages.RUN.REPORTER_OPTIONS,
    type: "string"
  },
  'record': {
    describe: Constants.cliMessages.RUN.RECORD,
    type: "boolean"
  },
  'record-key': {
    default: undefined,
    describe: Constants.cliMessages.RUN.RECORD_KEY,
    type: "string"
  },
  'projectId': {
    default: undefined,
    describe: Constants.cliMessages.RUN.PROJECT_ID,
    type: "string"
  },
  'nv': {
    alias: ['node-version', 'nodeVersion'],
    default: undefined,
    describe: Constants.cliMessages.RUN.NODE_VERSION,
    type: "string"
  },
  'build-tag': {
    default: undefined,
    describe: Constants.cliMessages.RUN.BUILD_TAG,
    type: "string"
  }
}
