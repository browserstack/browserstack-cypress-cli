function log(message) {
  var timestamp = '[' + new Date().toLocaleString() + '] ';
  console.log(timestamp + " " + message);
}

function error(message) {
  var timestamp = '[' + new Date().toLocaleString() + '] ';
  console.log(timestamp + " [ERROR] " + message);
}

exports.log = log
exports.error = error
