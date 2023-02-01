"use strict";
const path = require("path");
const fs = require("fs");
const exec = require("child_process").exec;
const execSync = require("child_process").execSync;

const isUndefined = value => (value === undefined || value === null);

exports.getCypressConfigDir = (bsConfig) => {
    let directoryPath;
    try {
        directoryPath = !isUndefined(bsConfig.run_settings.cypress_proj_dir) ? bsConfig.run_settings.cypress_proj_dir :  process.cwd();
        console.log(`--> dir_path: ${directoryPath}`)
        if (directoryPath.endsWith("/")) {
            directoryPath = directoryPath.slice(0,-1);
        }
    } catch (error) {
        console.log(`---> Error: ${error}`)
    }
    return path.join(directoryPath, bsConfig.run_settings.cypressConfigFilePath)
} 

exports.readCypressConfig = (bsConfig) => {
    try {
        let cypress_conf_dir = this.getCypressConfigDir(bsConfig)
        console.log(`---> Cypress conf dir: ${cypress_conf_dir}`)
        const conf_lang = this.detectLanguage(path.dirname(cypress_conf_dir))
        console.log(`---> Detected lang: ${conf_lang}`)
        if (conf_lang == 'ts') {
            cypress_conf_dir = this.convertTsConfig(cypress_conf_dir)
            // cypress_conf_dir = path.join(path.dirname(cypress_conf_dir), 'cypress.config.js')
        }
        console.log(`---> Got cypress converted conf dir: ${cypress_conf_dir}`)
        // Perform actions
        const cypress_config = require(cypress_conf_dir)
        console.log(`---> bsconf: ${JSON.stringify(cypress_config)}`)
    } catch (error) {
        console.log(`---> Got error reading cypress config file: ${JSON.stringify(error)}`)
    }
}

exports.detectLanguage = (projectRoot) => {
    for (let extension of ['ts', 'mts']) {
        if (fs.existsSync(path.join(projectRoot, `cypress.config.${extension}`))) {
            return 'ts'
        }
    }
    for (let extension of ['js', 'cjs', 'mjs']) {
        if (fs.existsSync(path.join(projectRoot, `cypress.config.${extension}`))) {
          return 'js'
        }
    }
    return 'js' // Default to js
}

exports.convertTsConfig = (cypress_conf_dir) => {
    const working_dir = path.dirname(cypress_conf_dir);
    const ts_working_dir = path.join(working_dir, 'tsWorkingDir')
    const tsconfig_path = path.join(working_dir, 'tsconfig.json') // TODO: find tsconfig if cypress.config.ts and tsconfig not in same location
    execSync('rm -rf tsWorkingDir', {cwd: working_dir})
    execSync('mkdir tsWorkingDir', {cwd: working_dir})
    console.log(`---> 123: ${working_dir}`)
    let tsc_command = `npx tsc --outDir ${ts_working_dir} --listEmittedFiles true`;
    if (!fs.existsSync(tsconfig_path)) {
        tsc_command = `${tsc_command} cypress.config.ts`
    }
    try {
        let stdout = execSync(tsc_command, { cwd: working_dir }).toString()
        console.log(stdout)
        const lines = stdout.split('\n');
        let foundLine = null;
        for(let i =0; i < lines.length; i++) {
            if(lines[i].indexOf("cypress.config.") > -1){
                foundLine = lines[i]
                break;
            }
        }
        console.log(foundLine)
        return foundLine.split('TSFILE: ').pop()
    } catch (err) {
        console.log("output",err)
        console.log("sdterr",err.stderr.toString())
    }
}
