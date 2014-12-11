var VERSION = '1.1.0';

var _ = require('lodash');

var DEFAULT_API_URL = 'https://api.podio.com:443';

var utils = require('./utils');
var AuthLib = require('./auth');
var TransportLib = require('./transport');

var PlatformJS = function(authOptions, options) {
  this.VERSION = VERSION;

  utils._validateAuthOptions(authOptions);

  this.authType = authOptions.authType;
  this.clientId = authOptions.clientId;
  this.clientSecret = authOptions.clientSecret;

  this.apiURL = DEFAULT_API_URL;

  if (!_.isUndefined(options)) {
    if (!_.isUndefined(options.sessionStore)) {
      this.sessionStore = options.sessionStore;
      this.sessionStore.get(this.authType, function(podioOAuth) {
        this.authObject = podioOAuth;
      }.bind(this));
    }

    if (!_.isUndefined(options.apiURL)) {
      this.apiURL = options.apiURL;
    }
  }
};

PlatformJS.prototype = _.extend({}, AuthLib, TransportLib);

module.exports = PlatformJS;
