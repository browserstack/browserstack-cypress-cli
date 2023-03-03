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
