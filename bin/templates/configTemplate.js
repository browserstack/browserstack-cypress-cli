module.exports = function () {
  var config = {
    "auth": {
      "username": "<username>",
      "access_key": "<access-key>"
    },
    "browsers": [
      {
        "browser": "chrome",
        "os": "Windows 10",
        "versions": ["78", "77"]
      }
    ],
    "run_settings": {
      "cypress_proj_dir" : "/path/to/cypress.json",
      "project_name": "project-name",
      "build_name": "build-name",
      "parallels": "number of parallels to run",
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
