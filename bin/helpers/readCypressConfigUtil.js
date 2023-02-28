"use strict";
const path = require("path");
const fs = require("fs");
const execSync = require("child_process").execSync;

const logger = require('./logger').winstonLogger;

const isUndefined = value => (value === undefined || value === null);

exports.getCypressConfigDir = (bsConfig) => {
    let directoryPath;
    directoryPath = !isUndefined(bsConfig.run_settings.cypress_proj_dir) ? bsConfig.run_settings.cypress_proj_dir :  process.cwd()
    if (directoryPath.endsWith("/")) {
        directoryPath = directoryPath.slice(0,-1)
    }
    return path.join(directoryPath, bsConfig.run_settings.cypressConfigFilePath)
}

exports.readCypressConfigFile = (bsConfig) => {
    // TODO: test for mjs file
    try {
        let cypress_conf_dir = this.getCypressConfigDir(bsConfig)
        logger.debug(`cypress config path: ${cypress_conf_dir}`);
        const cypress_config_filename = bsConfig.run_settings.cypress_config_filename

        const conf_lang = this.detectLanguage(cypress_conf_dir, cypress_config_filename)
        if (conf_lang == 'ts') {
            cypress_conf_dir = this.convertTsConfig(bsConfig, cypress_conf_dir)
        }
        logger.debug(`complete cypress config file path: ${cypress_conf_dir}`)
        // Perform actions
        const cypress_config = require(cypress_conf_dir)
        return cypress_config
    } catch (error) {
        logger.error(`Error while reading cypress config: ${error.message}`)
        // TODO: handle this error properly
    }
}

exports.detectLanguage = (projectRoot, cypress_config_filename) => {
    // for (let extension of ['ts', 'mts']) {
    //     if (fs.existsSync(path.join(projectRoot, `cypress.config.${extension}`))) {
    //         return 'ts'
    //     }
    // }
    // for (let extension of ['js', 'cjs', 'mjs']) {
    //     if (fs.existsSync(path.join(projectRoot, `cypress.config.${extension}`))) {
    //       return 'js'
    //     }
    // }
    // return 'js' // Default to js
    // TODO: remove old code and throw error instead of returning js
    const extension = cypress_config_filename.split('.').pop()
    return ['ts', '.mts', 'js', 'cjs', 'mjs'].includes(extension) ? extension : 'js'
}

exports.convertTsConfig = (bsConfig, cypress_conf_dir) => {
    const cypress_config_filename = bsConfig.run_settings.cypress_config_filename
    const working_dir = path.dirname(cypress_conf_dir);
    const complied_js_dir = path.join(working_dir, 'tmpBstackCompiledJs')
    const tsconfig_path = path.join(working_dir, 'tsconfig.json')
    execSync('rm -rf tmpBstackCompiledJs', { cwd: working_dir })
    execSync('mkdir tmpBstackCompiledJs', { cwd: working_dir }) // TODO: delete the dir once
    let tsc_command = `npx tsc --outDir ${complied_js_dir} --listEmittedFiles true`
    if (!fs.existsSync(tsconfig_path)) {
        tsc_command = `${tsc_command} ${cypress_config_filename}`
    }
    let tsc_output
    try {
        logger.debug(`Running: ${tsc_command}`)
        tsc_output = execSync(tsc_command, { cwd: working_dir })
    } catch (err) {
        // error while compiling ts files
        logger.debug(err.message);
        logger.debug(err.output.toString());
        tsc_output = err.output // if there is an error, tsc adds output of complilation to err.output key
    } finally {
        logger.debug(`Saved compiled js output at: ${complied_js_dir}`);
        logger.debug(`Finding compiled cypress config file: ${complied_js_dir}`);
        const lines = tsc_output.toString().split('\n');
        let foundLine = null;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].indexOf(path.parse(cypress_config_filename).name) > -1) {
                foundLine = lines[i]
                break;
            }
        }
        if (foundLine === null) {
            logger.error(`No compiled cypress config found. There might some error running ${tsc_command} command`)
            return null
            // TODO: exit
        } else {
            const cypress_config_file_path = foundLine.split('TSFILE: ').pop()
            logger.debug(`Found compiled cypress config file: ${cypress_config_file_path}`);
            return cypress_config_file_path
        }
    }
}
