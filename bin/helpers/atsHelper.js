// TODO: confirm if we need to add command line args. if yes then decide priority

const logger = require("./logger").winstonLogger;

exports.isTurboScaleSession = (bsConfig) => {
  // env var will override config
  if (process.env.BROWSERSTACK_TURBOSCALE && process.env.BROWSERSTACK_TURBOSCALE === 'true') {
    return true;
  }

  if (bsConfig.run_settings && bsConfig.run_settings.turboScale) {
    return true;
  }

  return false;
};

exports.getTurboScaleOptions = (bsConfig) => {
  if (bsConfig.run_settings && bsConfig.run_settings.turboScaleOptions) {
    return bsConfig.run_settings.turboScaleOptions;
  }

  return {};
};

exports.getTurboScaleGridName = (bsConfig) => {
  // env var will override config
  if (process.env.BROWSERSTACK_TURBOSCALE_GRID_NAME) {
    return process.env.BROWSERSTACK_TURBOSCALE_GRID_NAME;
  }

  if (bsConfig.run_settings && bsConfig.run_settings.turboScaleOptions && bsConfig.run_settings.turboScaleOptions.gridName) {
    return bsConfig.run_settings.turboScaleOptions.gridName;
  }

  return 'NO_GRID_NAME_PASSED';
};

exports.getTurboScaleGridDetails = async (bsConfig) => {
  try {
    const gridName = this.getTurboScaleGridName(bsConfig);
    // TODO: update request making logic
    const response = await this.nodeRequest('GET', `${turboScaleConstants.API_ENDPOINT}/grids/${gridName}`, {}, bsConfig);

    return JSON.parse(response.data);
  } catch (err) {
    logger.error(`Failed to find TurboScale Grid: ${err}: ${err.stack}`);
  }
};



ATSGridName = getTurboScaleGridName(bsConfig);
