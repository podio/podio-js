var VERSION = require('../package.json').version;

var _ = require('lodash');

var DEFAULT_API_URL = 'https://api.podio.com:443';

var utils = require('./utils');
var GeneralLib = require('./general');
var AuthLib = require('./auth');
var TransportLib = require('./transport');

var PodioJS = function(authOptions, options) {
  this.VERSION = VERSION;

  utils._validateAuthOptions(authOptions);

  this.authType = authOptions.authType;
  this.clientId = authOptions.clientId;
  this.clientSecret = authOptions.clientSecret;
  this.projectId = authOptions.projectId;

  this.apiURL = DEFAULT_API_URL;

  if (!_.isUndefined(options)) {
    if (!_.isUndefined(options.sessionStore)) {
      this.sessionStore = options.sessionStore;
      this.refreshAuthFromStore();
    }

    if (_.isFunction(options.onTokenWillRefresh)) {
      this.onTokenWillRefresh = options.onTokenWillRefresh;
    }

    if (_.isFunction(options.afterTokenRefreshed)) {
      this.afterTokenRefreshed = options.afterTokenRefreshed;
    }

    if (!_.isUndefined(options.apiURL)) {
      this.apiURL = options.apiURL;
    }
    
    if(options.enablePushService) {
      _.extend(this, require('./push'));
    }
  }
};

PodioJS.prototype = _.extend({}, AuthLib, TransportLib, GeneralLib);


module.exports = PodioJS;
