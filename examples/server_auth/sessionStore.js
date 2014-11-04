var fs = require('fs');
var path = require('path');

function get(authType, callback) {
  var fileName = path.join(__dirname, 'tmp/' + authType + '.json');
  var podioOAuth = fs.readFile(fileName, 'utf8', function(err, data) {
    if (err) {
      if (err.errno !== 2) {    // skip file not found errors
        throw new Error('Reading from the sessionStore failed');
      }
    } else if (data.length > 0) {
      callback(JSON.parse(data));
    }
  });
}

function set(podioOAuth, authType, callback) {
  var fileName = path.join(__dirname, 'tmp/' + authType + '.json');

  if (/server|client|password/.test(authType) === false) {
    throw new Error('Invalid authType');
  }

  fs.writeFile(fileName, JSON.stringify(podioOAuth), 'utf8', function(err) {
    if (err) {
      throw new Error('Writing in the sessionStore failed');
    }

    if (typeof callback === 'function') {
      callback();
    }
  });
}

module.exports = {
  get: get,
  set: set
};