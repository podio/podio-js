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

    return req;
  },
  
  _onTokenRefreshed: function(request, options) {
    var resolveRejectOptions = _.pick(options, 'resolve', 'reject');

    if (request.requestType === 'generic') {
      this.request(request.method, request.path, request.data, options.callback, resolveRejectOptions);
    } else if (request.requestType === 'file') {
      this.uploadFile(request.filePath, request.fileName, options.callback, resolveRejectOptions);
    }
  },

  _handleTransportError: function(options, response) {
    var request = options.requestParams;

    switch(response.status) {
      case 400:
        throw new PodioErrors.PodioBadRequestError(response.body, response.status, request.url);
        break;
      case 401:
        this._getAuth()._clearAuthentication();
        throw new PodioErrors.PodioAuthorizationError(response.body, response.status, request.url);
        break;
      case 403:
        throw new PodioErrors.PodioForbiddenError(response.body, response.status, request.url);
        break;
      case 404:
        throw new PodioErrors.PodioNotFoundError(response.body, response.status, request.url);
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

      if (!_.isNull(options.callback)) {
        options.callback(res.body, res);
      }
    } else {
      options.reject({ description: res.body.error_description, body: res.body, status: res.status, url: options.requestParams.url});

      if (res.status === 401 && (res.body.error === 'invalid_token' || res.body.error_description === 'expired_token') && this.authObject.refreshToken) {
        this._getAuth()._refreshToken(this._onTokenRefreshed.bind(this, options.requestParams, options));
      } else if (this.silent !== true) {
        this._handleTransportError(options, res);
      }
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

  _formatMethod: function(method) {
    method = method.toLowerCase();

    if (method === 'delete') {
      return 'del';
    } else {
      return method;
    }
  },

  request: function(method, path, data, callback, options) {
    var url = new URI(this.apiURL).path(path).toString();
    var request = this._getRequestObject();
    var req;

    if (!this._getAuth().isAuthenticated()) {
      throw new PodioErrors.PodioForbiddenError('Authentication has not been performed');
    }

    method = this._formatMethod(method);

    req = request[method](url);
    req = _.compose(this._addRequestData.bind(this, data, method), this._addHeaders.bind(this), this._addCORS.bind(this), this._setOptions.bind(this, options || {}))(req);

    return this._getPromise(options, function(resolve, reject) {
      var options = {
        resolve: resolve,
        reject: reject,
        callback: callback || null,
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

  uploadFile: function(filePath, fileName, callback, options) {
    var url = new URI(this.apiURL).path('/file').toString();
    var req;

    if (!_.include(['server', 'password'], this.authType)) {
      throw new Error('File uploads are only supported on the server right now.');
    }

    req = this._getRequestObject().post(url).attach('source', filePath).field('filename', fileName);

    req = _.compose(this._addHeaders.bind(this), this._addCORS.bind(this))(req);

    return this._getPromise(options, function(resolve, reject) {
      var options = {
        resolve: resolve,
        reject: reject,
        callback: callback || null,
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