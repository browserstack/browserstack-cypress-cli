module.exports = function () {
  var config = {
    "auth": {
      "username": "<Your BrowserStack username>",
      "access_key": "<Your BrowserStack access key>"
    },
    "browsers": [
      {
        "browser": "chrome",
        "os": "Windows 10",
        "versions": ["latest", "latest-1"]
      },
      {
        "browser": "firefox",
        "os": "Windows 10",
        "versions": ["latest", "latest-1"]
      },
      {
        "browser": "edge",
        "os": "Windows 10",
        "versions": ["latest", "latest-1"]
      },
      {
        "browser": "chrome",
        "os": "OS X Mojave",
        "versions": ["latest", "latest-1"]
      },
      {
        "browser": "firefox",
        "os": "OS X Mojave",
        "versions": ["latest", "latest-1"]
      },
      {
        "browser": "edge",
        "os": "OS X Mojave",
        "versions": ["latest", "latest-1"]
      },
      {
        "browser": "chrome",
        "os": "OS X Catalina",
        "versions": ["latest", "latest-1"]
      },
      {
        "browser": "firefox",
        "os": "OS X Catalina",
        "versions": ["latest", "latest-1"]
      },
      {
        "browser": "edge",
        "os": "OS X Catalina",
        "versions": ["latest", "latest-1"]
      }
    ],
    "run_settings": {
      "cypress_config_file" : "/path/to/<cypress config file>.json",
      "project_name": "project-name",
      "build_name": "build-name",
      "exclude": [],
      "parallels": "Number of parallels you want to run",
      "npm_dependencies": {
      },
      "package_config_options": {
      },
      "headless": true
    },
    "connection_settings": {
      "local": false,
      "local_identifier": null,
      "local_mode": null,
      "local_config_file": null
    },
    "disable_usage_reporting": false
  }
  var EOL = require('os').EOL
  var file = [
    JSON.stringify(config, null, 4)
  ].join(EOL)
  return file
}
