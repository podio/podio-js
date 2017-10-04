var _ = require('lodash');
var URI = require('URIjs');
var request = require('superagent');
var Promise = require('es6-promise');

Promise = Promise.Promise; // unwrap

var PodioErrors = require('./PodioErrors');
var auth = require('./auth');

module.exports = {
  _getAuth: function() {
    // we have the auth object mixed in
    return this;
  },

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

  _addCORS: function(req) {
    if (this.authType === 'client') {
      req = req.withCredentials();
    }

    return req;
  },

  _setOptions: function(options, req) {
    if (options.type && options.type === 'form') {
      req.type('form');
    }

    if (options.basicAuth) {
      req.set(
        'Authorization',
        'Basic ' + new Buffer(this.clientId + ':' + this.clientSecret).toString('base64')
      );
    }

    return req;
  },

  _onTokenRefreshed: function(request) {
    if (request.requestType === 'generic') {
      return this.request(request.method, request.path, request.data);
    } else if (request.requestType === 'file') {
      return this.uploadFile(request.filePath, request.fileName);
    }
  },

  _handleTransportError: function(options, response) {
    var request = options.requestParams;

    if (!response || !response.body) {
      return new PodioErrors.PodioError(null, null, request.url);
    }

    switch(response.status) {
      case 400:
        return new PodioErrors.PodioBadRequestError(response.body, response.status, request.url);
      case 401:
        this._getAuth()._clearAuthentication();
        return new PodioErrors.PodioAuthorizationError(response.body, response.status, request.url);
      case 403:
        return new PodioErrors.PodioForbiddenError(response.body, response.status, request.url);
      case 404:
        return new PodioErrors.PodioNotFoundError(response.body, response.status, request.url);
      case 409:
        return new PodioErrors.PodioConflictError(response.body, response.status, request.url);
      case 410:
        return new PodioErrors.PodioGoneError(response.body, response.status, request.url);
      case 420:
        return new PodioErrors.PodioRateLimitError(response.body, response.status, request.url);
      case 500:
        return new PodioErrors.PodioServerError(response.body, response.status, request.url);
      case 502:
      case 503:
      case 504:
        return new PodioErrors.PodioUnavailableError(response.body, response.status, request.url);
      default:
        return new PodioErrors.PodioError(response.body, response.status, request.url);
    }
  },

  _onResponse: function(options, err, res) {
    if (res && res.ok === true && !err) {
      options.resolve(res.body);
    } else {
      var isStatus401 = res && res.status === 401;
      var hasResBody = res && res.body;
      var isInvalidOrExpiredToken = (hasResBody && (res.body.error === 'invalid_token' || res.body.error_description === 'expired_token'));
      var hasRefreshToken = this.authObject && this.authObject.refreshToken;

      if (isStatus401 && isInvalidOrExpiredToken && hasRefreshToken) {

        this._getAuth()._refreshToken(function (err, response) {
          if (err !== null) {
            options.reject(this._handleTransportError(options, response));
          }

          if (_.isFunction(this.afterTokenRefreshed)) {
            this.afterTokenRefreshed(response);
          }

          this._onTokenRefreshed(options.requestParams).then(function (response) {
            options.resolve(response);
          }, function (err) {
            options.reject(err);
          })
        }.bind(this));
      } else {
        options.reject(this._handleTransportError(options, res));
      }
    }
  },

  _getRequestObject: function() {
    return request;
  },

  _formatMethod: function(method) {
    method = method.toLowerCase();

    if (method === 'delete') {
      return 'del';
    } else {
      return method;
    }
  },

  _getRequestURI: function(path) {
    var parsed = URI.parse(path);
    var uri = new URI(this.apiURL);

    uri.path(parsed.path);

    if (!_.isUndefined(parsed.query)) {
      uri.query(parsed.query);
    }

    return uri.toString();
  },

  request: function(method, path, data, options) {
    var url = this._getRequestURI(path);
    var request = this._getRequestObject();
    var req;

    if ((!options || !options.basicAuth) && !this.authObject) {
      return new Promise(function (resolve, reject) {
        reject(new PodioErrors.PodioForbiddenError('Authentication has not been performed'))
      });
    }

    method = this._formatMethod(method);

    req = request[method](url);

    if (options && options.basicAuth) {
      req = _.compose(
        this._addRequestData.bind(this, data, method),
        this._setOptions.bind(this, options || {})
      )(req);
    } else {
      req = _.compose(
        this._addRequestData.bind(this, data, method),
        this._addHeaders.bind(this),
        this._addCORS.bind(this),
        this._setOptions.bind(this, options || {})
      )(req);
    }

    return new Promise(function(resolve, reject) {
      var options = {
        resolve: resolve,
        reject: reject,
        requestParams: {
          requestType: 'generic',
          url: url,
          path: path,
          data: data,
          method: method
        }
      };

      req.end(this._onResponse.bind(this, options));
    }.bind(this));
  },

  uploadFile: function(filePath, fileName) {
    var url = new URI(this.apiURL).path('/file').toString();
    var req;

    if (!_.include(['server', 'password'], this.authType)) {
      return new Promise(function(resolve, reject) {
        reject(new PodioErrors.PodioError('File uploads are only supported on the server right now.'));
      });
    }

    req = this._getRequestObject().post(url).attach('source', filePath).field('filename', fileName);

    req = _.compose(this._addHeaders.bind(this), this._addCORS.bind(this))(req);

    return new Promise(function(resolve, reject) {
      var options = {
        resolve: resolve,
        reject: reject,
        requestParams: {
          requestType: 'file',
          filePath: filePath,
          fileName: fileName
        }
      };

      req.end(this._onResponse.bind(this, options));
    }.bind(this));
  }
};
