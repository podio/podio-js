var VERSION = '1.1.3';

var _ = require('lodash');

var DEFAULT_API_URL = 'https://api.podio.com:443';

var utils = require('./utils');
var GeneralLib = require('./general');
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
      this._getAuthFromStore();
    }

    if (_.isFunction(options.onTokenWillRefresh)) {
      this.onTokenWillRefresh = options.onTokenWillRefresh;
    }

    if (!_.isUndefined(options.apiURL)) {
      this.apiURL = options.apiURL;
    }
  }
};

PlatformJS.prototype = _.extend({}, AuthLib, TransportLib, GeneralLib);

module.exports = PlatformJS;
