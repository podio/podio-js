(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'URIjs', 'superagent', 'es6-promise'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('underscore'), require('URIjs'), require('superagent'), require('es6-promise'));
  } else {
    root.PlatformJS = factory(root._, root.URI, root.superagent, root.ES6Promise);
  }
}(this, function (_, URI, request, Promise) {

  var VERSION = '0.0.1';

  var DEFAULT_API_URL = 'https://api.podio.com:443';
  var AUTH_PATH = '/oauth/authorize';
  var TOKEN_PATH = '/oauth/token';

  Promise = Promise.Promise; // unwrap

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

    _getDomain: function(apiURL) {
      return new URI(apiURL).domain();
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
        redirect_uri: redirectURL
      }, function(responseData) {
        this._onAccessTokenAcquired(responseData, callback);
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
        hostname: this.utils._getDomain(this.apiURL),
        path: AUTH_PATH
      }).setQuery(query).toString();
    },

    authenticateWithCredentials: function(username, password, callback) {
      
    },

    _onAccessTokenAcquired: function(responseData, callback) {
      this.authObject = new OAuth(responseData.access_token, responseData.refresh_token, responseData.expires_in, responseData.ref);

      if (!_.isUndefined(this.sessionStore)) {
        this.sessionStore.set(this.authObject, this.authType, callback);
      } else {
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
        hostname: this.utils._getDomain(this.apiURL),
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
      this._authenticate({
        grant_type: 'refresh_token',
        refresh_token: this.authObject.refreshToken
      }, function(responseData) {
        this._onAccessTokenAcquired(responseData, callback);
      }.bind(this));
    }
  };

  var PodioErrors = {
    PodioBadRequestError: function(message, status, url) {
      this.message = message;
      this.status = status;
      this.url = url;
      this.name = 'PodioBadRequestError';
    },
    PodioAuthorizationError: function(message, status, url) {
      this.message = message;
      this.status = status;
      this.url = url;
      this.name = 'PodioAuthorizationError';
    },
    PodioForbiddenError: function(message, status, url) {
      this.message = message;
      this.status = status;
      this.url = url;
      this.name = 'PodioForbiddenError';
    },
    PodioNotFoundError: function(message, status, url) {
      this.message = message;
      this.status = status;
      this.url = url;
      this.name = 'PodioNotFoundError';
    },
    PodioConflictError: function(message, status, url) {
      this.message = message;
      this.status = status;
      this.url = url;
      this.name = 'PodioConflictError';
    },
    PodioGoneError: function(message, status, url) {
      this.message = message;
      this.status = status;
      this.url = url;
      this.name = 'PodioGoneError';
    },
    PodioRateLimitError: function(message, status, url) {
      this.message = message;
      this.status = status;
      this.url = url;
      this.name = 'PodioRateLimitError';
    },
    PodioServerError: function(message, status, url) {
      this.message = message;
      this.status = status;
      this.url = url;
      this.name = 'PodioServerError';
    },
    PodioUnavailableError: function(message, status, url) {
      this.message = message;
      this.status = status;
      this.url = url;
      this.name = 'PodioUnavailableError';
    },
    PodioError: function(message, status, url) {
      this.message = message;
      this.status = status;
      this.url = url;
      this.name = 'PodioError';
    }
  };
  
  var TransportLib = {
    _addRequestData: function(data, method, req) {
      switch(method) {
        case 'get':
          if (!_.isEmpty(data)) {
            req = req.query(data);
          }
          break;
        case 'post':
        case 'put':
          if (!_.isEmpty(data)) {
            req = req.send(data);
          }
          break;
      }

      return req;
    },

    _addHeaders: function(req) {
      req = req.set('Authorization', 'OAuth2 ' + this.authObject.accessToken);

      return req;
    },
    
    _handleTransportError: function(options, response) {
      var request = options.requestParams;
      var resolveRejectOptions;

      switch(status) {
        case 400:
          throw new PodioErrors.PodioBadRequestError(response.body, response.status, request.url);
          break;
        case 401:
          if (body.error === 'invalid_token') {
            if (this.authObject.refreshToken) {
              resolveRejectOptions = _.pick(options, 'resolve', 'reject');

              this._refreshToken(this.request.bind(request.method, request.path, request.data, options.callback, resolveRejectOptions));
            } else {
              this._clearAuthentication();
              throw new PodioErrors.PodioAuthorizationError(response.body, response.status, request.url);
            }
          }
          break;
        case 403:
          throw new PodioErrors.PodioForbiddenError(response.body, response.status, request.url);
          break;
        case 404:
          throw new PodioErrors.PodioForbiddenError(response.body, response.status, request.url);
          break;
        case 409:
          throw new PodioErrors.PodioConflictError(response.body, response.status, request.url);
          break
        case 410:
          throw new PodioErrors.PodioGoneError(response.body, response.status, request.url);
          break;
        case 420:
          throw new PodioErrors.PodioRateLimitError(response.body, response.status, request.url);
          break;
        case 500:
          throw new PodioErrors.PodioServerError(response.body, response.status, request.url);
          break;
        case 502:
        case 503:
        case 504:
          throw new PodioErrors.PodioUnavailableError(response.body, response.status, request.url);
          break;
        default:
          throw new PodioErrors.PodioError(response.body, response.status, request.url);
          break;
      }
    },

    _onResponse: function(options, res) {
      if (res.ok) {
        options.resolve(res.body);

        options.callback(res.body, res);
      } else {
        options.reject(res.body.error_description);

        this._handleTransportError(options, res);
      }
    },

    _getPromise: function(options, callback) {
      if (options && options.resolve && options.reject) {
        callback(options.resolve, options.reject);
      } else {
        return new Promise(callback);
      }
    },

    _getRequestObject: function() {
      return request;
    },

    request: function(method, path, data, callback, options) {
      var url = new URI(this.apiURL).path(path).toString();
      var request = this._getRequestObject();
      var req;

      if (!this.isAuthenticated()) {
        throw new Error('Authentication has not been performed');
      }

      method = method.toLowerCase();

      req = request[method](url);
      req = _.compose(this._addRequestData.bind(this, data, method), this._addHeaders.bind(this))(req);

      return this._getPromise(options, function(resolve, reject) {
        var options = {
          resolve: resolve,
          reject: reject,
          callback: callback || null,
          requestParams: {
            url: url,
            path: path,
            data: data,
            method: method
          }
        };

        req.end(this._onResponse.bind(this, options));
      }.bind(this));
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
        this.sessionStore.get(this.authType, function(podioOAuth) {
          this.authObject = podioOAuth;
        }.bind(this));
      }

      if (!_.isUndefined(options.apiURL)) {
        this.apiURL = options.apiURL;
      }
    }
  };

  PlatformJS.prototype = _.extend({}, AuthLib, TransportLib, { utils: utils });

  return PlatformJS;

}));