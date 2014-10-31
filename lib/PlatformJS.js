(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'URIjs', 'superagent'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('underscore'), require('URIjs'), require('superagent'));
  } else {
    root.PlatformJS = factory(root._, root.URI, root.superagent);
  }
}(this, function (_, URI, request) {

  var VERSION = '0.0.1';

  var DEFAULT_API_URL = 'https://api.podio.com:443';
  var AUTH_PATH = '/oauth/authorize';
  var TOKEN_PATH = '/oauth/token';

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
    },

    _getDomain: function() {
      return new URI(this.apiURL).domain();
    }
  };

  var OAuth = function(accessToken, refreshToken, expiresIn, ref) {
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
      if (this.authType !== 'server') {
        throw new Error('In authentication types other than server access token is delivered through a redirect');
      }

      this._authenticate({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_url: redirectURL
      }, function(responseData) {
        this._onAccessTokenAcquired(responseData);
        callback();
      }.bind(this));
    },

    hasAuthError: function() {

    },

    getAuthError: function() {

    },

    getAuthorizationURL: function(redirectURL) {
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
        hostname: this.utils._getDomain(),
        path: AUTH_PATH
      }).setQuery(query).toString();
    },

    authenticateWithCredentials: function(username, password, callback) {
      
    },

    _onAccessTokenAcquired: function(responseData) {
      this.authObject = new OAuth(responseData.access_token, responseData.refresh_token, responseData.expires_in, responseData.ref);

      if (!_.isUndefined(this.sessionStore)) {
        this.sessionStore.set(this.authObject, this.authType);
      }
    },

    _authenticate: function(requestData, callback) {
      var url = new URI({
        protocol: 'https',
        hostname: this.utils._getDomain(),
        path: TOKEN_PATH
      }).toString();

      _.extend(requestData, {
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      this._authRequest(url, requestData, callback);
    },

    _authRequest: function(url, requestData, callback) {
      request.post(url).send(requestData).end(this._onAuthResponse.bind(this, callback, requestData.grant_type));
    },

    _onAuthResponse: function(callback, grantType, res) {
      if (res.ok) {
        callback(res.body);
      } else {
        throw new Error('Authentication for ' + grantType + ' failed');
      }
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