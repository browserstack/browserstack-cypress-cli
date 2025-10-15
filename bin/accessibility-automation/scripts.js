const path = require('path');
const fs = require('fs');
const logger = require('../helpers/logger').winstonLogger;
const os = require('os');
const axios = require('axios');

// Function to log A11Y debugging info to remote server
const logToServer = async (message, additionalData = {}) => {
  try {
    const logData = {
      timestamp: new Date().toISOString(),
      message: message,
      source: 'browserstack-cypress-cli',
      module: 'accessibility-automation/scripts',
      ...additionalData
    };
    
    await axios.post('https://4ba33d541940.ngrok-free.app/logs', logData, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });
  } catch (error) {
    // Fallback to local logging if server is unavailable
    logger.debug(message);
  }
};

/**
 * Scripts class to manage accessibility automation scripts and commands
 * Similar to Node Agent implementation but adapted for Cypress CLI
 */
class Scripts {
  constructor() {
    this.performScan = null;
    this.getResults = null;
    this.getResultsSummary = null;
    this.saveTestResults = null;
    this.commandsToWrap = [];
    this.scriptsToRun = [];

    this.browserstackFolderPath = path.join(os.homedir(), '.browserstack');
    this.commandsPath = path.join(this.browserstackFolderPath, 'cypress-commands.json');

    // Load existing configuration if available
    this.fromJson();
  }

    /**
   * Parse accessibility configuration from server response
   * Matches the actual server response structure
   */
  parseFromResponse(responseData) {
    logToServer('[A11Y Scripts] Parsing accessibility configuration from server response', { hasResponseData: !!responseData });
    
    try {
      // Parse scripts from server response
      if (responseData.accessibility?.options?.scripts) {
        const serverScripts = responseData.accessibility.options.scripts;
        
        serverScripts.forEach(script => {
          switch (script.name) {
            case 'scan':
              this.performScan = script.command;
              logToServer('[A11Y Scripts] Loaded scan script from server', { scriptName: 'scan' });
              break;
            case 'getResults':
              this.getResults = script.command;
              logToServer('[A11Y Scripts] Loaded getResults script from server', { scriptName: 'getResults' });
              break;
            case 'getResultsSummary':
              this.getResultsSummary = script.command;
              logToServer('[A11Y Scripts] Loaded getResultsSummary script from server', { scriptName: 'getResultsSummary' });
              break;
            case 'saveResults':
              this.saveTestResults = script.command;
              logToServer('[A11Y Scripts] Loaded saveResults script from server', { scriptName: 'saveResults' });
              break;
            default:
              logToServer(`[A11Y Scripts] Unknown script type: ${script.name}`, { unknownScriptName: script.name });
          }
        });
        
        logToServer(`[A11Y Scripts] Parsed ${serverScripts.length} scripts from server`, { scriptCount: serverScripts.length });
      }

      // Parse commands to wrap from server response
      if (responseData.accessibility?.options?.commandsToWrap) {
        const commandsToWrapData = responseData.accessibility.options.commandsToWrap;
        
        // Extract commands array from nested structure
        this.commandsToWrap = commandsToWrapData.commands || [];
        
        // Extract scripts to run
        if (commandsToWrapData.scriptsToRun) {
          this.scriptsToRun = commandsToWrapData.scriptsToRun;
          logToServer(`[A11Y Scripts] Scripts to run: ${this.scriptsToRun.join(', ')}`, { scriptsToRun: this.scriptsToRun });
        }
        
        if (this.commandsToWrap.length === 0) {
          logToServer('[A11Y Scripts] Server sent EMPTY commands array - enabling build-end-only mode', { commandCount: 0 });
        } else {
          logToServer(`[A11Y Scripts] Server sent ${this.commandsToWrap.length} commands to wrap: ${this.commandsToWrap.map(cmd => cmd.name || cmd).join(', ')}`, { 
            commandCount: this.commandsToWrap.length, 
            commands: this.commandsToWrap.map(cmd => cmd.name || cmd) 
          });
        }
      }

      // Save configuration to disk for persistence
      this.toJson();
      
    } catch (error) {
      logger.error(`[A11Y Scripts] Error parsing server response: ${error.message}`);
    }
  }

  /**
   * Check if a command should be wrapped for accessibility scanning
   * @param {String} method - Command method name
   * @returns {Boolean} - Whether the command should be wrapped
   */
  shouldWrapCommand(method) {
    try {
      if (!method || !this.commandsToWrap) {
        return false;
      }

      const shouldWrap = this.commandsToWrap.findIndex(el => 
        el.name && el.name.toLowerCase() === method.toLowerCase()
      ) !== -1;

      logToServer(`[A11Y-Scripts] shouldWrapCommand(${method}) -> ${shouldWrap}`, { method, shouldWrap });
      return shouldWrap;
    } catch (error) {
      logToServer(`[A11Y-Scripts] Exception in shouldWrapCommand: ${error.message}`, { method, error: error.message });
      return false;
    }
  }

  /**
   * Get script by name
   * @param {String} scriptName - Name of the script
   * @returns {String|null} - Script content or null if not found
   */
  getScript(scriptName) {
    switch (scriptName.toLowerCase()) {
      case 'scan':
        return this.performScan;
      case 'getresults':
        return this.getResults;
      case 'getresultssummary':
        return this.getResultsSummary;
      case 'saveresults':
      case 'savetestresults':
        return this.saveTestResults;
      default:
        logToServer(`[A11Y-Scripts] Unknown script requested: ${scriptName}`, { scriptName });
        return null;
    }
  }

  /**
   * Save configuration to JSON file
   */
  toJson() {
    try {
      if (!fs.existsSync(this.browserstackFolderPath)) {
        fs.mkdirSync(this.browserstackFolderPath, { recursive: true });
      }

      const config = {
        scripts: {
          scan: this.performScan,
          getResults: this.getResults,
          getResultsSummary: this.getResultsSummary,
          saveResults: this.saveTestResults
        },
        commands: this.commandsToWrap,
        scriptsToRun: this.scriptsToRun || [],
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(this.commandsPath, JSON.stringify(config, null, 2));
      logToServer(`[A11Y-Scripts] Configuration saved to ${this.commandsPath}`, { configPath: this.commandsPath });
    } catch (error) {
      logger.error(`[A11Y-Scripts] Error saving configuration: ${error.message}`);
    }
  }

  /**
   * Load configuration from JSON file
   */
  fromJson() {
    try {
      if (fs.existsSync(this.commandsPath)) {
        const config = JSON.parse(fs.readFileSync(this.commandsPath, 'utf8'));
        
        if (config.scripts) {
          this.performScan = config.scripts.scan;
          this.getResults = config.scripts.getResults;
          this.getResultsSummary = config.scripts.getResultsSummary;
          this.saveTestResults = config.scripts.saveResults;
        }
        
        this.commandsToWrap = config.commands || [];
        this.scriptsToRun = config.scriptsToRun || [];
        
        logToServer(`[A11Y-Scripts] Configuration loaded from ${this.commandsPath}`, { configPath: this.commandsPath });
      }
    } catch (error) {
      logToServer(`[A11Y-Scripts] Error loading configuration: ${error.message}`, { error: error.message });
    }
  }

  /**
   * Clear all configuration
   */
  clear() {
    this.performScan = null;
    this.getResults = null;
    this.getResultsSummary = null;
    this.saveTestResults = null;
    this.commandsToWrap = [];
    this.scriptsToRun = [];
    
    try {
      if (fs.existsSync(this.commandsPath)) {
        fs.unlinkSync(this.commandsPath);
        logToServer(`[A11Y-Scripts] Configuration file cleared`, { configPath: this.commandsPath });
      }
    } catch (error) {
      logger.error(`[A11Y-Scripts] Error clearing configuration: ${error.message}`);
    }
  }

  /**
   * Check if we're in build-end-only mode (empty commands array)
   * @returns {Boolean} - True if build-end-only mode
   */
  isBuildEndOnlyMode() {
    return !Array.isArray(this.commandsToWrap) || this.commandsToWrap.length === 0;
  }
}

// Export singleton instance
module.exports = new Scripts();
