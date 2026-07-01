"use strict";
const path = require("path");
const fs = require("fs");
const cp = require('child_process');

const config = require('./config');
const constants = require("./constants");
const utils = require("./utils");
const logger = require('./logger').winstonLogger;

const parsedCypressConfigCache = new Map();

// Defense-in-depth: reject file paths containing shell metacharacters.
// This guards against command injection even if execFileSync is ever
// replaced with a shell-based exec in the future.
//
// Note: backslash (\) is intentionally NOT included here because it is a
// legitimate path separator on Windows (e.g. C:\Users\me\cypress.config.js).
// The actual security boundary is execFileSync (no shell), not this regex.
const DANGEROUS_PATH_CHARS = /[;"`$|&(){}]/;

function validateFilePath(filepath) {
    if (DANGEROUS_PATH_CHARS.test(filepath)) {
        throw new Error(
            `Invalid cypress config file path: "${filepath}" contains disallowed characters. ` +
            'File paths must not include shell metacharacters such as ; " ` $ | & ( ) { }'
        );
    }
}

exports.validateFilePath = validateFilePath;

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
        "esModuleInterop": true,
        // Force a clean, self-contained JS emit even when the extended tsconfig
        // (common in NX / monorepo setups) sets options that suppress or redirect
        // the JS output. Without these overrides, base options such as
        // noEmit / emitDeclarationOnly / composite / noEmitOnError leave the
        // compiled cypress config missing, surfacing as
        // "Cypress config file not found at: ...tmpBstackCompiledJs/..." (SDK-6463).
        "noEmit": false,
        "emitDeclarationOnly": false,
        "composite": false,
        "declaration": false,
        "declarationMap": false,
        "noEmitOnError": false,
        "incremental": false
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

    // Use '&' (unconditional) instead of '&&' between tsc and tsc-alias so the alias
    // rewrite ALWAYS runs even when tsc exits non-zero. tsc returns a non-zero exit
    // code on any type error (very common when a single config file is compiled out of
    // its normal monorepo project context), which with '&&' would skip tsc-alias and
    // leave path aliases (e.g. @org/lib) un-rewritten -> the compiled config fails to
    // require -> "Cypress config file not found" (SDK-6463). convertTsConfig already
    // tolerates tsc errors by parsing the emitted-files output.
    const tscCommand = `${setNodePath} && node "${typescript_path}" --project "${tempTsConfigPath}" & ${setNodePath} && node "${tsc_alias_path}" --project "${tempTsConfigPath}" --verbose`;
    logger.info(`TypeScript compilation command: ${tscCommand}`);
    return { tscCommand, tempTsConfigPath };
  } else {
    // Unix/Linux/macOS: Use ';' (unconditional) between tsc and tsc-alias so the alias
    // rewrite ALWAYS runs even when tsc exits non-zero (type errors are common when a
    // single config file is compiled out of its monorepo context). With '&&', a tsc
    // error would skip tsc-alias and leave path aliases (e.g. @org/lib) un-rewritten,
    // making the compiled config impossible to require (SDK-6463). convertTsConfig
    // already tolerates tsc errors by parsing the emitted-files output.
    const nodePathPrefix = `NODE_PATH=${bstack_node_modules_path}`;
    const tscCommand = `${nodePathPrefix} node "${typescript_path}" --project "${tempTsConfigPath}" ; ${nodePathPrefix} node "${tsc_alias_path}" --project "${tempTsConfigPath}" --verbose`;
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
    // Security: validate file path to reject shell metacharacters (defense-in-depth)
    validateFilePath(cypress_config_filepath);

    // UX: surface a clear error if the cypress config file is missing.
    // (This is purely a UX check — the security boundary is execFileSync above
    // plus the metacharacter regex; existsSync alone would NOT prevent injection.)
    if (!fs.existsSync(cypress_config_filepath)) {
        throw new Error(`Cypress config file not found at: ${cypress_config_filepath}`);
    }

    const require_module_helper_path = path.join(__dirname, 'requireModule.js')

    // Security fix: use execFileSync instead of execSync to avoid shell interpolation.
    // execFileSync spawns the process directly without a shell, so user-controlled
    // values in cypress_config_filepath cannot break out into shell commands.
    const execOptions = {
        env: Object.assign({}, process.env, { NODE_PATH: bstack_node_modules_path })
    };
    const args = [require_module_helper_path, cypress_config_filepath];

    // Remove any stale detection flag from a crashed prior run so we never read an
    // outdated value if the child fails to write a fresh one.
    if (fs.existsSync(config.accessibilityPluginFlagFileName)) {
        try {
            fs.unlinkSync(config.accessibilityPluginFlagFileName)
        } catch (e) { /* best-effort */ }
    }

    logger.debug(`Running: node ${args.map(a => '"' + a + '"').join(' ')} (via execFileSync, NODE_PATH=${bstack_node_modules_path})`);
    cp.execFileSync('node', args, execOptions);

    const cypress_config = JSON.parse(fs.readFileSync(config.configJsonFileName).toString())
    if (fs.existsSync(config.configJsonFileName)) {
        fs.unlinkSync(config.configJsonFileName)
    }

    // Propagate accessibility-plugin detection (written by requireModule.js in the
    // child process) back into the parent process via an env var. We set it
    // explicitly to 'true'/'false' only when the config was actually required, so
    // callers can distinguish a definitive result from "could not read".
    try {
        if (fs.existsSync(config.accessibilityPluginFlagFileName)) {
            const flag = JSON.parse(fs.readFileSync(config.accessibilityPluginFlagFileName).toString());
            process.env.BROWSERSTACK_ACCESSIBILITY_PLUGIN_LOADED = (flag && flag.accessibilityPluginLoaded) ? 'true' : 'false';
            fs.unlinkSync(config.accessibilityPluginFlagFileName);
        }
    } catch (err) {
        logger.debug(`Unable to read accessibility plugin detection flag: ${err.message}`);
    }

    return cypress_config
}

exports.readCypressConfigFile = (bsConfig) => {
    const cypress_config_filepath = path.resolve(bsConfig.run_settings.cypressConfigFilePath)

    // Return the memoized parse if this exact config was already read in this run.
    if (parsedCypressConfigCache.has(cypress_config_filepath)) {
        logger.debug(`Using memoized cypress config for: ${cypress_config_filepath}`);
        return parsedCypressConfigCache.get(cypress_config_filepath);
    }

    try {
        const cypress_config_filename = bsConfig.run_settings.cypress_config_filename
        const bstack_node_modules_path = path.join(path.resolve(config.packageDirName), 'node_modules')
        const conf_lang = this.detectLanguage(cypress_config_filename)

        logger.debug(`cypress config path: ${cypress_config_filepath}`);

        let parsedConfig;
        if (conf_lang == 'js' || conf_lang == 'cjs') {
            parsedConfig = this.loadJsFile(cypress_config_filepath, bstack_node_modules_path)
        } else if (conf_lang === 'ts') {
            const compiled_cypress_config_filepath = this.convertTsConfig(bsConfig, cypress_config_filepath, bstack_node_modules_path)
            parsedConfig = this.loadJsFile(compiled_cypress_config_filepath, bstack_node_modules_path)
        }

        // Cache only successful parses so a later call can retry on failure.
        if (parsedConfig !== undefined) {
            parsedCypressConfigCache.set(cypress_config_filepath, parsedConfig);
        }
        return parsedConfig;
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
        // Guaranteed cleanup of the accessibility-plugin detection flag file, even
        // if loadJsFile threw before its own read/unlink of the flag.
        if (fs.existsSync(config.accessibilityPluginFlagFileName)) {
            try {
                fs.unlinkSync(config.accessibilityPluginFlagFileName)
            } catch (cleanupErr) {
                logger.debug(`Unable to remove accessibility plugin flag file: ${cleanupErr.message || cleanupErr}`);
            }
        }
    }
}
