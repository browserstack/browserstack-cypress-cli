"use strict";
const path = require("path");
const fs = require("fs");
const { execSync } = require('child_process');

const config = require('./config');
const constants = require("./constants");
const logger = require('./logger').winstonLogger;

const detectLanguage = (cypress_config_filename) => {
    const extension = cypress_config_filename.split('.').pop()
    return constants.CYPRESS_V10_AND_ABOVE_CONFIG_FILE_EXTENSIONS.includes(extension) ? extension : 'js'
}

exports.readCypressConfigFile = (bsConfig) => {
    try {
        const cypress_config_filepath = path.resolve(bsConfig.run_settings.cypressConfigFilePath)
        const cypress_config_filename = bsConfig.run_settings.cypress_config_filename
        const bstack_node_modules_path = `${path.resolve(config.packageDirName)}/node_modules`
        const conf_lang = detectLanguage(cypress_config_filename)
        const require_module_helper_path = `${__dirname}/requireModule.js`

        logger.debug(`cypress config path: ${cypress_config_filepath}`);

        if (conf_lang == 'js' || conf_lang == 'cjs') {
            execSync(`NODE_PATH=${bstack_node_modules_path} node ${require_module_helper_path} ${cypress_config_filepath}`)
            const cypress_config = JSON.parse(fs.readFileSync(config.configJsonFileName).toString())
            if (fs.existsSync(config.configJsonFileName)) {
                fs.unlinkSync(config.configJsonFileName)
            }
            return cypress_config
        }
    } catch (error) {
        logger.error(`Error while reading cypress config: ${error.message}`)
        // TODO: Add instrumention if error occurred
    }
}
