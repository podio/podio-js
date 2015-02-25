var _ = require('lodash');
var URI = require('URIjs');
var request = require('superagent');

var OAuth = require('./PodioOAuth');
var PodioErrors = require('./PodioErrors');
var utils = require('./utils');

var AUTH_PATH = '/oauth/authorize';
var TOKEN_PATH = '/oauth/token';

module.exports = {
  _getUtils: function() {
    return utils;
  },

  isAuthenticated: function() {
    return (!_.isUndefined(this.authObject) && !_.isUndefined(this.authObject.accessToken)) || this._hasClientSideRedirect();
  },

  getAccessToken: function(authCode, redirectURL, callback) {
    if (this.authType !== 'server') {
      throw new Error('In authentication types other than server access token is delivered through a redirect');
    }

    this._authenticate({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: redirectURL
    }, function(responseData) {
      this._onAccessTokenAcquired(responseData, callback);
    }.bind(this));
  },

  hasAuthError: function() {
    if (this.authType !== 'client') {
      throw new Error('This method is not supported for other authentication types than client');
    }
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
      hostname: this._getUtils()._getDomain(this.apiURL),
      path: AUTH_PATH
    }).setQuery(query).toString();
  },

  authenticateWithCredentialsForOffering: function(username, password, offeringId, callback) {
    var requestData = {
      grant_type: 'password',
      username: username,
      password: password
    };

    if (offeringId) {
      requestData.offering_id = offeringId;
    }

    this._authenticate(requestData, function(responseData) {
      this._onAccessTokenAcquired(responseData, callback);
    }.bind(this));
  },

  authenticateWithActivationCodeForOffering: function(activationCode, offeringId, callback) {
    var requestData = {
      grant_type: 'activation_code',
      activation_code: activationCode
    };

    if (offeringId) {
      requestData.offering_id = offeringId;
    }

    this._authenticate(requestData, function(responseData) {
      this._onAccessTokenAcquired(responseData, callback);
    }.bind(this));
  },

  refreshAuthFromStore: function() {
    this._getAuthFromStore();
  },

  _getAuthFromStore: function() {
    this.sessionStore.get(this.authType, function(podioOAuth) {
      this.authObject = podioOAuth;
    }.bind(this));
  },

  _hasClientSideRedirect: function() {
    var params;

    if (this.authType !== 'client') {
      return false;
    } else {
      params = this._getUtils()._getHashParams();

      if (params.access_token) {
        this._onAccessTokenAcquired(params);
      }

      return !_.isUndefined(params.access_token);
    }
  },

  _onAccessTokenAcquired: function(responseData, callback) {
    this.authObject = new OAuth(responseData.access_token, responseData.refresh_token, responseData.expires_in, responseData.ref);

    if (!_.isUndefined(this.sessionStore)) {
      this.sessionStore.set(this.authObject, this.authType, callback);
    } else if (_.isFunction(callback)) {
      callback();
    }
  },

  _clearAuthentication: function() {
    delete this.authObject;

    if (!_.isUndefined(this.sessionStore)) {
      this.sessionStore.set({}, this.authType);
    }
  },

  _authenticate: function(requestData, callback) {
    var url = new URI({
      protocol: 'https',
      hostname: this._getUtils()._getDomain(this.apiURL),
      path: TOKEN_PATH
    }).toString();

    _.extend(requestData, {
      client_id: this.clientId,
      client_secret: this.clientSecret
    });

    this._authRequest(url, requestData, callback);
  },

  _authRequest: function(url, requestData, callback) {
    request.post(url).type('form').send(requestData).end(this._onAuthResponse.bind(this, callback, requestData.grant_type, url));
  },

  _onAuthResponse: function(callback, grantType, url, res) {
    if (res.ok) {
      callback(res.body);
    } else {
      throw new PodioErrors.PodioAuthorizationError('Authentication for ' + grantType + ' failed. Reason: ' + res.body.error_description, res.status, url);
    }
  },

  _refreshToken: function(callback) {
    var refreshToken = this.authObject.refreshToken;

    this._clearAuthentication();

    // no support for client-side token refresh in the API
    if (this.authType === 'client') {
      if (_.isFunction(this.onTokenWillRefresh)) {
        this.onTokenWillRefresh(callback);
      }

      return;
    }

    this._authenticate({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }, function(responseData) {
      this._onAccessTokenAcquired(responseData, callback);
    }.bind(this));
  }
};