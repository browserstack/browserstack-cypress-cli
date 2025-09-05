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

function resolveTsConfigPath(bsConfig, cypress_config_filepath) {
  const working_dir = path.dirname(cypress_config_filepath);
  
  // Priority order for finding tsconfig
  const candidates = [
    bsConfig.run_settings && bsConfig.run_settings.ts_config_file_path, // User specified
    path.join(working_dir, 'tsconfig.json'),    // Same directory as cypress config
    path.join(working_dir, '..', 'tsconfig.json'), // Parent directory
    path.join(process.cwd(), 'tsconfig.json')   // Project root
  ].filter(Boolean).map(p => path.resolve(p));
  
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      logger.debug(`Found tsconfig at: ${candidate}`);
      return candidate;
    }
  }
  
  return null;
}

function generateTscCommandAndTempTsConfig(bsConfig, bstack_node_modules_path, complied_js_dir, cypress_config_filepath) {
  const working_dir = path.dirname(cypress_config_filepath);
  const typescript_path = path.join(bstack_node_modules_path, 'typescript', 'bin', 'tsc');
  const tsc_alias_path = require.resolve('tsc-alias/dist/bin/index.js');
  
  // Smart tsconfig detection and validation
  const resolvedTsConfigPath = resolveTsConfigPath(bsConfig, cypress_config_filepath);
  let hasValidTsConfig = false;
  
  if (resolvedTsConfigPath) {
    try {
      // Validate the tsconfig is readable and valid JSON
      const tsConfigContent = fs.readFileSync(resolvedTsConfigPath, 'utf8');
      JSON.parse(tsConfigContent);
      hasValidTsConfig = true;
      logger.info(`Using existing tsconfig: ${resolvedTsConfigPath}`);
    } catch (error) {
      logger.warn(`Invalid tsconfig file: ${resolvedTsConfigPath}, falling back to default configuration. Error: ${error.message}`);
      hasValidTsConfig = false;
    }
  } else {
    logger.info('No tsconfig found, using default TypeScript configuration');
  }
  
  let tempTsConfig;
  
  if (hasValidTsConfig) {
    // Scenario 1: User has valid tsconfig - use extends approach
    tempTsConfig = {
      extends: resolvedTsConfigPath,
      compilerOptions: {
        // Force override critical parameters for BrowserStack compatibility
        "outDir": path.basename(complied_js_dir),
        "listEmittedFiles": true,
        // Ensure these are always set regardless of base tsconfig
        "allowSyntheticDefaultImports": true,
        "esModuleInterop": true
      },
      include: [cypress_config_filepath]
    };
  } else {
    // Scenario 2: No tsconfig or invalid tsconfig - create standalone with all basic parameters
    tempTsConfig = {
      compilerOptions: {
        // Preserve old command-line parameters for backwards compatibility
        "outDir": path.basename(complied_js_dir),
        "listEmittedFiles": true,
        "allowSyntheticDefaultImports": true,
        "module": "commonjs",
        "declaration": false,
        
        // Add essential missing parameters for robust compilation
        "target": "es2017",
        "moduleResolution": "node",
        "esModuleInterop": true,
        "allowJs": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "strict": false, // Avoid breaking existing code
        "noEmitOnError": false // Continue compilation even with errors
      },
      include: [cypress_config_filepath],
      exclude: ["node_modules", "dist", "build"]
    };
  }
  
  // Write the temporary tsconfig
  const tempTsConfigPath = path.join(working_dir, 'tsconfig.singlefile.tmp.json');
  fs.writeFileSync(tempTsConfigPath, JSON.stringify(tempTsConfig, null, 2));
  logger.info(`Temporary tsconfig created at: ${tempTsConfigPath}`);
  
  // Platform-specific command generation
  const isWindows = /^win/.test(process.platform);
  
  if (isWindows) {
    // Windows: Use && to chain commands, no space after SET
    const setNodePath = isWindows
      ? `set NODE_PATH=${bstack_node_modules_path}`
      : `NODE_PATH="${bstack_node_modules_path}"`;

    const tscCommand = `${setNodePath} && node "${typescript_path}" --project "${tempTsConfigPath}" && ${setNodePath} && node "${tsc_alias_path}" --project "${tempTsConfigPath}" --verbose`;
    logger.info(`TypeScript compilation command: ${tscCommand}`);
    return { tscCommand, tempTsConfigPath };
  } else {
    // Unix/Linux/macOS: Use ; to separate commands or && to chain
    const nodePathPrefix = `NODE_PATH=${bstack_node_modules_path}`;
    const tscCommand = `${nodePathPrefix} node "${typescript_path}" --project "${tempTsConfigPath}" && ${nodePathPrefix} node "${tsc_alias_path}" --project "${tempTsConfigPath}" --verbose`;
    logger.info(`TypeScript compilation command: ${tscCommand}`);
    return { tscCommand, tempTsConfigPath };
  }
}

exports.convertTsConfig = (bsConfig, cypress_config_filepath, bstack_node_modules_path) => {
    const cypress_config_filename = bsConfig.run_settings.cypress_config_filename
    const working_dir = path.dirname(cypress_config_filepath);
    const complied_js_dir = path.join(working_dir, config.compiledConfigJsDirName)
    if (fs.existsSync(complied_js_dir)) {
        fs.rmdirSync(complied_js_dir, { recursive: true })
    }
    fs.mkdirSync(complied_js_dir, { recursive: true })

    const { tscCommand, tempTsConfigPath } = generateTscCommandAndTempTsConfig(bsConfig, bstack_node_modules_path, complied_js_dir, cypress_config_filepath);

    let tsc_output
    try {
        logger.debug(`Running: ${tscCommand}`)
        tsc_output = cp.execSync(tscCommand, { cwd: working_dir })
    } catch (err) {
        // error while compiling ts files
        logger.debug(err.message);
        logger.debug(err.output.toString());
        tsc_output = err.output // if there is an error, tsc adds output of complilation to err.output key
    } finally {
        logger.debug(`Saved compiled js output at: ${complied_js_dir}`);
        logger.debug(`Finding compiled cypress config file in: ${complied_js_dir}`);

        // Clean up the temporary tsconfig file
        if (fs.existsSync(tempTsConfigPath)) {
            fs.unlinkSync(tempTsConfigPath);
            logger.debug(`Temporary tsconfig file removed: ${tempTsConfigPath}`);
        }

        if (tsc_output) {
            logger.debug(tsc_output.toString());
        }

        if (!tsc_output) {
            logger.error('No TypeScript compilation output available');
            return null;
        }

        const lines = tsc_output.toString().split('\n');
        let foundLine = null;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].indexOf(`${path.parse(cypress_config_filename).name}.js`) > -1) {
                foundLine = lines[i]
                break;
            }
        }
        if (foundLine === null) {
            logger.error(`No compiled cypress config found. There might some error running ${tscCommand} command`)
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
