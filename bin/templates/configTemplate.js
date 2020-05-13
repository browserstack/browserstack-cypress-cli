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
      "cypress_proj_dir" : "/dir/to/cypress.json",
      "project": "project-name",
      "customBuildName": "build-name",
      "npm_dependencies": {
      }
    },
    "connection_settings": {
      "local": false,
      "localIdentifier": null
    },
  }
  var EOL = require('os').EOL
  var file = [
    JSON.stringify(config, null, 4)
  ].join(EOL)
  return file
}
