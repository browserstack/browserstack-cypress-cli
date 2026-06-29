// NOTE: DO NOT change the name or location of file, the execution of this file is invoked using fixed path
// helper file to load and read js modules
const fs = require('fs');
const config = require('./config');
const moduleName = process.argv[2];

const mod = require(moduleName)

if (fs.existsSync(config.configJsonFileName)) {
    fs.unlinkSync(config.configJsonFileName)
}

// write module in temporary json file
fs.writeFileSync(config.configJsonFileName, JSON.stringify(mod))

// Requiring the cypress config above executes its top-level requires, which
// includes the BrowserStack accessibility plugin when the user has wired it in.
// The plugin sets BROWSERSTACK_ACCESSIBILITY_PLUGIN_LOADED on load; surface that
// back to the parent CLI process via a temp flag file.
try {
    const accessibilityPluginLoaded = process.env.BROWSERSTACK_ACCESSIBILITY_PLUGIN_LOADED === 'true';
    fs.writeFileSync(
        config.accessibilityPluginFlagFileName,
        JSON.stringify({ accessibilityPluginLoaded })
    );
} catch (err) {
    // best-effort: detection falls back to "not loaded" if this fails
}
