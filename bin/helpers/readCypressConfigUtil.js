"use strict";
const path = require("path");
const fs = require("fs");
const cp = require('child_process');

const config = require('./config');
const constants = require("./constants");
const utils = require("./utils");
const logger = require('./logger').winstonLogger;

exports.detectLanguage = (cypress_config_filename) => {
    const extension = cypress_config_filename.split('.').pop()
    return constants.CYPRESS_V10_AND_ABOVE_CONFIG_FILE_EXTENSIONS.includes(extension) ? extension : 'js'
}

exports.convertTsConfig = (bsConfig, cypress_config_filepath, bstack_node_modules_path) => {
    const cypress_config_filename = bsConfig.run_settings.cypress_config_filename
    const working_dir = path.dirname(cypress_config_filepath);
    const complied_js_dir = path.join(working_dir, config.compiledConfigJsDirName)
    if (fs.existsSync(complied_js_dir)) {
        fs.rmdirSync(complied_js_dir, { recursive: true })
    }
    fs.mkdirSync(complied_js_dir, { recursive: true })

    const typescript_path = path.join(bstack_node_modules_path, 'typescript', 'bin', 'tsc')

    let tsc_command = `NODE_PATH=${bstack_node_modules_path} node "${typescript_path}" --outDir "${complied_js_dir}" --listEmittedFiles true --allowSyntheticDefaultImports --module commonjs --declaration false "${cypress_config_filepath}"`

    if (/^win/.test(process.platform)) {
        tsc_command = `set NODE_PATH=${bstack_node_modules_path}&& node "${typescript_path}" --outDir "${complied_js_dir}" --listEmittedFiles true --allowSyntheticDefaultImports --module commonjs --declaration false "${cypress_config_filepath}"`
    }

    
    let tsc_output
    try {
        logger.debug(`Running: ${tsc_command}`)
        tsc_output = cp.execSync(tsc_command, { cwd: working_dir })
    } catch (err) {
        // error while compiling ts files
        logger.debug(err.message);
        logger.debug(err.output.toString());
        tsc_output = err.output // if there is an error, tsc adds output of complilation to err.output key
    } finally {
        logger.debug(`Saved compiled js output at: ${complied_js_dir}`);
        logger.debug(`Finding compiled cypress config file in: ${complied_js_dir}`);

        const lines = tsc_output.toString().split('\n');
        let foundLine = null;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].indexOf(`${path.parse(cypress_config_filename).name}.js`) > -1) {
                foundLine = lines[i]
                break;
            }
        }
        if (foundLine === null) {
            logger.error(`No compiled cypress config found. There might some error running ${tsc_command} command`)
            return null
        } else {
            const compiled_cypress_config_filepath = foundLine.split('TSFILE: ').pop()
            logger.debug(`Found compiled cypress config file: ${compiled_cypress_config_filepath}`);
            return compiled_cypress_config_filepath
        }
    }
}

exports.loadJsFile =  (cypress_config_filepath, bstack_node_modules_path) => {
    const require_module_helper_path = path.join(__dirname, 'requireModule.js')
    let load_command = `NODE_PATH="${bstack_node_modules_path}" node "${require_module_helper_path}" "${cypress_config_filepath}"`
    if (/^win/.test(process.platform)) {
        load_command = `set NODE_PATH=${bstack_node_modules_path}&& node "${require_module_helper_path}" "${cypress_config_filepath}"`
    }
    logger.debug(`Running: ${load_command}`)
    cp.execSync(load_command)
    const cypress_config = JSON.parse(fs.readFileSync(config.configJsonFileName).toString())
    if (fs.existsSync(config.configJsonFileName)) {
        fs.unlinkSync(config.configJsonFileName)
    }
    return cypress_config
}

exports.readCypressConfigFile = (bsConfig) => {
    const cypress_config_filepath = path.resolve(bsConfig.run_settings.cypressConfigFilePath)
    try {
        const cypress_config_filename = bsConfig.run_settings.cypress_config_filename
        const bstack_node_modules_path = path.join(path.resolve(config.packageDirName), 'node_modules')
        const conf_lang = this.detectLanguage(cypress_config_filename)

        logger.debug(`cypress config path: ${cypress_config_filepath}`);

        if (conf_lang == 'js' || conf_lang == 'cjs') {
            return this.loadJsFile(cypress_config_filepath, bstack_node_modules_path)
        } else if (conf_lang === 'ts') {
            const compiled_cypress_config_filepath = this.convertTsConfig(bsConfig, cypress_config_filepath, bstack_node_modules_path)
            return this.loadJsFile(compiled_cypress_config_filepath, bstack_node_modules_path)
        }
    } catch (error) {
        const errorMessage = `Error while reading cypress config: ${error.message}`
        const errorCode = 'cypress_config_file_read_failed'
        logger.error(errorMessage)
        utils.sendUsageReport(
            bsConfig,
            null,
            errorMessage,
            constants.messageTypes.WARNING,
            errorCode,
            null,
            null
        )
    } finally {
        const working_dir = path.dirname(cypress_config_filepath)
        const complied_js_dir = path.join(working_dir, config.compiledConfigJsDirName)
        if (fs.existsSync(complied_js_dir)) {
            fs.rmdirSync(complied_js_dir, { recursive: true })
        }
    }
}
