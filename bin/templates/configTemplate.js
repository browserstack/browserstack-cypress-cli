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
        "versions": ["78", "77"]
      }
    ],
    "run_settings": {
      "cypress_proj_dir" : "/path/to/directory-that-contains-<cypress.json>-file",
      "project_name": "project-name",
      "build_name": "build-name",
      "parallels": "Here goes the number of parallels you want to run",
      "npm_dependencies": {
      }
    },
    "connection_settings": {
      "local": false,
      "local_identifier": null
    },
    "disable_usage_reporting": false
  }
  var EOL = require('os').EOL
  var file = [
    JSON.stringify(config, null, 4)
  ].join(EOL)
  return file
}
