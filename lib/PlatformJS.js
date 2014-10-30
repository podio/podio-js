(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'URIjs'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('underscore'), require('URIjs'));
  } else {
    root.PlatformJS = factory(root._, root.URI);
  }
}(this, function (_, URI) {

  var VERSION = '0.0.1';

  var DEFAULT_API_URL = 'https://api.podio.com:443';
  var AUTH_PATH = '/oauth/authorize';

  var utils = {
    _getHashParams: function() {
      var queryString = {};

      window.location.hash.substr(1).replace(
        new RegExp("([^?=&]+)(=([^&]*))?", "g"),
        function($0, $1, $2, $3) { queryString[$1] = $3; }
      );

      return queryString;
    },

    _validateAuthOptions: function(authOptions) {
      var props = ['authType', 'clientId'];
      var failedProp;

      if (_.isUndefined(authOptions)) {
        throw new Error('Authentication options are missing');
      }

      if (authOptions.authType !== 'client') {
        props.push('clientSecret');
      }

      failedProp = _.find(props, function(prop) { return _.isUndefined(authOptions[prop]); })

      if (failedProp) {
       throw new Error('Missing auth property ' + failedProp);
      }
    }
  };

  var oAuth = function(accessToken, refreshToken, expiresIn, ref) {
    if (_.isUndefined(accessToken)) {
      throw new Error('Access token is missing');
    }

    if (_.isUndefined(refreshToken)) {
      throw new Error('Refresh token is missing');
    }

    if (_.isUndefined(expiresIn)) {
      throw new Error('Expiration timestamp is missing');
    }

    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresIn = expiresIn;
    this.ref = ref;
  };

  var AuthLib = {
    isAuthenticated: function() {
      return !_.isUndefined(this.authObject) && !_.isUndefined(this.authObject.accessToken);
    },

    getAccessToken: function(authCode, redirectURL, callback) {

    },

    hasAuthError: function() {

    },

    getAuthError: function() {

    },

    getAuthorizationURL: function(redirectURL) {
      var domain = new URI(this.apiURL).domain();
      var query = {
        client_id: this.clientId,
        redirect_uri: redirectURL
      };

      switch(this.authType) {
        case 'server':
          query.response_type = 'code';
          break;
        case 'client':
          query.response_type = 'token';
          break;
        case 'password':
          throw new Error('Authorization URLs are not supported for password authentication');
          break;
      }

      return new URI({
        protocol: 'https',
        hostname: domain,
        path: AUTH_PATH
      }).setQuery(query).toString();
    },

    authenticateWithCredentials: function(username, password, callback) {
      
    }
  };

  var PlatformJS = function(authOptions, options) {
    this.VERSION = VERSION;

    this.utils._validateAuthOptions(authOptions);

    this.authType = authOptions.authType;
    this.clientId = authOptions.clientId;
    this.clientSecret = authOptions.clientSecret;

    this.apiURL = DEFAULT_API_URL;

    if (!_.isUndefined(options)) {
      if (!_.isUndefined(options.sessionStore)) {
        this.sessionStore = options.sessionStore;
        this.authObject = this.sessionStore.get(this.authType);
      }

      this.apiURL = options.apiURL;
    }
  };

  PlatformJS.prototype = _.extend({}, AuthLib, { utils: utils });

  return PlatformJS;

}));