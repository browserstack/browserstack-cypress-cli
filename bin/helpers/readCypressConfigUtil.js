"use strict";
const path = require("path");
const fs = require("fs");
const cp = require('child_process');

const config = require('./config');
const constants = require("./constants");
const utils = require("./utils");
const logger = require('./logger').winstonLogger;
const util = require('util');
const { stderr } = require("process");

exports.detectLanguage = (cypress_config_filename) => {
    const extension = cypress_config_filename.split('.').pop()
    return constants.CYPRESS_V10_AND_ABOVE_CONFIG_FILE_EXTENSIONS.includes(extension) ? extension : 'js'
}

const convertTsConfig = (bsConfig, cypress_config_filepath, bstack_node_modules_path) => {
    return new Promise(function (resolve, reject) {

        const working_dir = path.dirname(cypress_config_filepath);
        const complied_js_dir = path.join(working_dir, config.compiledConfigJsDirName)
        if (fs.existsSync(complied_js_dir)) {
            fs.rmSync(complied_js_dir, { recursive: true })
        }
        fs.mkdirSync(complied_js_dir, { recursive: true })

        const typescript_path = path.join(bstack_node_modules_path, 'typescript', 'bin', 'tsc')
        logger.debug('Reading cypress config file with spawn and no node options');

        let scriptOutput = "";
        const nodeProcessCloseCallback = (code) => {
            if(code == 0) {
                logger.info(`Cypress Config File was successfully transpiled.`);
                resolve(scriptOutput);
            } else {
                logger.error(`Some error occurred while transpiling cypress config file. Error code ${code}.`);
                reject(`Some error occurred while transpiling cypress config file. Error code ${code}.`);
            }
        };
        const nodeProcessErrorCallback = (error) => {
            logger.error(`Some error occurred while transpiling cypress config file : %j`, error);
            reject(`Some error occurred while transpiling cypress config file. Error Description ${util.format('%j', error)}`);
        };
        const nodeProcessDataCallback = (data) => {
            logger.debug('STDOUT of tsc compilation: ' + data);
            scriptOutput += data.toString();
        };

        const MAX_OLD_SPACE_SIZE_IN_MB = 4096;
        const nodeProcess = cp.spawn(`node`, [typescript_path, `--outDir`, complied_js_dir, `--listEmittedFiles`, `true`, `--allowSyntheticDefaultImports`, `--module`, `commonjs`, `--declaration`, `false`, cypress_config_filepath], { cwd: working_dir, env: {...process.env, NODE_PATH: bstack_node_modules_path, NODE_OPTIONS: MAX_OLD_SPACE_SIZE_IN_MB} });

        nodeProcess.on('close', nodeProcessCloseCallback);
        nodeProcess.stderr.setEncoding('utf-8');
        nodeProcess.stderr.on('data', nodeProcessErrorCallback);
        nodeProcess.stdout.setEncoding('utf-8');
        nodeProcess.stdout.on('data', nodeProcessDataCallback);
    });
}

const getTranspiledCypressConfigPath = async (bsConfig, cypress_config_filepath, bstack_node_modules_path) => {

    const cypress_config_filename = bsConfig.run_settings.cypress_config_filename
    const working_dir = path.dirname(cypress_config_filepath);
    const complied_js_dir = path.join(working_dir, config.compiledConfigJsDirName)
    if (fs.existsSync(complied_js_dir)) {
        fs.rmSync(complied_js_dir, { recursive: true })
    }
    fs.mkdirSync(complied_js_dir, { recursive: true })

    let tsc_output;
    try {
        tsc_output = await convertTsConfig(bsConfig, cypress_config_filepath, bstack_node_modules_path);
    } catch (err) {
        // error while compiling ts files
        logger.debug(util.inspect(err));
        tsc_output = util.inspect(err)
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

exports.readCypressConfigFile = async (bsConfig) => {
    const cypress_config_filepath = path.resolve(bsConfig.run_settings.cypressConfigFilePath)
    try {
        const cypress_config_filename = bsConfig.run_settings.cypress_config_filename
        const bstack_node_modules_path = path.join(path.resolve(config.packageDirName), 'node_modules')
        const conf_lang = this.detectLanguage(cypress_config_filename)

        logger.debug(`cypress config path: ${cypress_config_filepath}`);

        if (conf_lang == 'js' || conf_lang == 'cjs') {
            return this.loadJsFile(cypress_config_filepath, bstack_node_modules_path)
        } else if (conf_lang === 'ts') {
            const compiled_cypress_config_filepath = await getTranspiledCypressConfigPath(bsConfig, cypress_config_filepath, bstack_node_modules_path)
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
            fs.rmSync(complied_js_dir, { recursive: true })
        }
    }
}
