"use strict";
const fs = require("fs");
const path = require("path");
const logger = require("./logger").winstonLogger;

exports.run = (basePath, comparePath) => {
  if (!basePath || !comparePath) {
    logger.debug("Skipping package difference check.");
  }

  let base;
  let compare;
  let isDiff = false;
  try {
    base = readModules(basePath);
    compare = readModules(comparePath);
  } catch (error) {
    logger.debug('Unable to process package difference');
    return isDiff;
  }
  
  Object.keys(base.deps).forEach((baseKey) => {
    if (baseKey in compare.deps) {
      if (base.deps[baseKey] !== compare.deps[baseKey]) {
        isDiff = true;
        return;
      }
    } else {
      isDiff = true;
      return;
    }
  });
  return isDiff;
};
const readModules = (location) => {
  const table = {};

  // Resolve package dependencies
  if (location.indexOf("package.json") !== -1) {
    const data = fs.readFileSync(location.replace(":dev", ""), "utf-8");
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      parsed = false;
    }
    if (!parsed) {
      return;
    }

    const depsKey =
      location.indexOf(":dev") !== -1 ? "devDependencies" : "dependencies";
    const deps = parsed[depsKey]
      ? parsed[depsKey]
      : parsed.dependencies || parsed.devDependencies;

    Object.keys(deps).forEach((key) => {
      deps[key] = deps[key].replace(/\^|~/g, "");
    });
    return {
      name: `${location} {${depsKey}}`,
      deps,
    };
  }

  fs.readdirSync(location)
    .filter((name) => name !== ".bin")
    .map((name) => {
      const pkg = path.join(location, name, "package.json");
      const exists = fs.existsSync(pkg);
      if (!exists) {
        return;
      }

      const data = fs.readFileSync(pkg, "utf-8");
      let parsed;

      try {
        parsed = JSON.parse(data);
      } catch (e) {
        parsed = false;
      }
      if (!parsed) {
        return;
      }

      table[name] = parsed.version;
    });
  return {
    name: location,
    deps: table,
  };
};
