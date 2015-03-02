var transport = require('../lib/transport');
var PodioErrors = require('../lib/PodioErrors');
var sinon = require('sinon');
var _ = require('lodash');

describe('transport', function() {

  describe('_addRequestData', function() {

    it('should attach data as query for a get request and return the request object', function() {
      var newReq = {};
      var data = { authToken: 123 };
      var req = {
        query: sinon.spy(function(data) {
          return newReq;
        })
      };

      var result = transport._addRequestData(data, 'get', req);

      expect(req.query.calledOnce).toBe(true);
      expect(req.query.calledWithExactly(data)).toBe(true);
      expect(result).toEqual(newReq);
    });

    it('should attach data as body for a post request', function() {
      var data = { authToken: 123 };
      var req = {
        send: sinon.stub()
      };

      transport._addRequestData(data, 'post', req);

      expect(req.send.calledOnce).toBe(true);
      expect(req.send.calledWithExactly(data)).toBe(true);
    });

    it('should attach data as body for a put request', function() {
      var data = { authToken: 123 };
      var req = {
        send: sinon.stub()
      };

      transport._addRequestData(data, 'put', req);

      expect(req.send.calledOnce).toBe(true);
      expect(req.send.calledWithExactly(data)).toBe(true);
    });

  });

  describe('_addHeaders', function() {

    it('should set the auth header on the request object and return it', function() {
      var newReq = {};
      var host = {
        authObject: {
          accessToken: 123
        }
      };
      var req = {
        set: sinon.stub().returns(newReq)
      };

      var result = transport._addHeaders.call(host, req);

      expect(req.set.calledOnce).toBe(true);
      expect(req.set.calledWithExactly('Authorization', 'OAuth2 123')).toBe(true);
      expect(result).toEqual(newReq);
    });

  });

  describe('_addCORS', function() {

    it('should enable cookies for cross domain requests', function() {
      var host = {
        authType: 'client'
      };
      var req = {
        withCredentials: sinon.spy(function() {
          return req;
        })
      };

      expect(transport._addCORS.call(host, req)).toEqual(req);
      expect(req.withCredentials.calledOnce).toBe(true);
    });

    it('should not enable cookies if no client auth is used', function() {
      var host = {
        authType: 'server'
      };
      var req = {
        withCredentials: sinon.stub()
      };

      expect(transport._addCORS.call(host, req)).toEqual(req);
      expect(req.withCredentials.called).toBe(false);
    });

  });

  describe('_setOptions', function() {

    it('should set the application/x-www-form-urlencoded content type', function() {
      var req = {
        type: sinon.stub()
      };
      var options = {
        type: 'form'
      };

      transport._setOptions(options, req);

      expect(req.type.calledOnce).toBe(true);
      expect(req.type.calledWithExactly('form')).toBe(true);
    });

    it('should not call type on the request object if no type option is passed', function() {
      var req = {
        type: sinon.stub()
      };
      var options = {};

      transport._setOptions(options, req);

      expect(req.type.calledOnce).toBe(false);

    });

    it('should set the authorization header when basicAuth option is passed', function () {
      var req = {
        set: sinon.stub()
      };

      var options = {
        basicAuth: true
      };

      transport.clientId = '123';
      transport.clientSecret = 'abc';

      var basicAuth = 'Basic ' +
                      new Buffer(transport.clientId + ':' +
                      transport.clientSecret).toString('base64');

      transport._setOptions(options, req);

      expect(req.set.calledWithExactly('Authorization', basicAuth)).toBe(true);
    });

  });

  describe('_onResponse', function() {

    it('should call resolve and callback if response was a success', function() {
      var options = {
        resolve: sinon.stub(),
        reject: sinon.stub(),
        callback: sinon.stub()
      };
      var res = {
        body: {},
        ok: true
      };

      transport._onResponse(options, res)

      expect(options.resolve.calledOnce).toBe(true);
      expect(options.resolve.calledWithExactly(res.body)).toBe(true);
      expect(options.callback.calledOnce).toBe(true);
      expect(options.callback.calledWithExactly(res.body, res)).toBe(true);
    });

    it('should call reject and handle the error if response was a failure different from HTTP 401', function() {
      var host = {
        _handleTransportError: sinon.stub()
      };
      var options = {
        reject: sinon.stub(),
        requestParams: { url: 'http://url' }
      };
      var res = {
        ok: false,
        body: { error_description: 'Error occured' },
        status: '404'
      };
      var expectedArgs = {
        description: res.body.error_description,
        body: res.body,
        status: res.status,
        url: options.requestParams.url
      };

      transport._onResponse.call(host, options, res);

      expect(options.reject.calledOnce).toBe(true);
      expect(options.reject.calledWithExactly(expectedArgs)).toBe(true);
      expect(host._handleTransportError.calledOnce).toBe(true);
      expect(host._handleTransportError.calledWithExactly(options, res)).toBe(true);
    });

    it('should try to refresh token when the token expires with an HTTP 401', function() {
      var auth = {
        _refreshToken: sinon.stub().callsArg(0)
      };
      var host = {
        authObject: { refreshToken: 'abc1234' },
        _getAuth: sinon.stub().returns(auth),
        _onTokenRefreshed: sinon.stub()
      };
      var options = {
        requestParams: {},
        reject: function() {}
      };
      var response = {
        status: 401,
        body: {
          error_description: 'expired_token'
        },
        ok: false
      };

      transport._onResponse.call(host, options, response);

      expect(auth._refreshToken.calledOnce).toBe(true);
      expect(_.isFunction(auth._refreshToken.getCall(0).args[0])).toBe(true);
      expect(host._onTokenRefreshed.calledOnce).toBe(true);
      expect(host._onTokenRefreshed.calledWithExactly(options.requestParams, options)).toBe(true);
    });

    it('should handle the error if response was a HTTP 401 but not a token expiration', function() {
      var res = {
        ok: false,
        body: {},
        status: 401
      };
      var options = {
        requestParams: {},
        reject: function() {}
      };
      var host = {
        _handleTransportError: sinon.stub()
      };

      transport._onResponse.call(host, options, res);

      expect(host._handleTransportError.calledOnce).toBe(true);
    });

    it('should handle the error if response is a HTTP 401 with an expired token error, but the refresh token is missing', function() {
      var res = {
        ok: false,
        body: { error: 'invalid_token' },
        status: 401
      };
      var options = {
        requestParams: {},
        reject: function() {}
      };
      var host = {
        _handleTransportError: sinon.stub(),
        authObject: { authToken: 123 }
      };

      transport._onResponse.call(host, options, res);

      expect(host._handleTransportError.calledOnce).toBe(true);
    });

    it('should not throw any exceptions if silent option is set', function() {
      var host = {
        _handleTransportError: sinon.stub(),
        silent: true
      };
      var options = {
        reject: function() {},
        requestParams: { url: 'http://url' }
      };
      var res = {
        ok: false,
        body: { error_description: 'Error occured' },
        status: '404'
      };

      transport._onResponse.call(host, options, res);

      expect(host._handleTransportError.called).toBe(false);
    });

  });

  describe('_getRequestURI', function() {

    var host;

    beforeEach(function() {
      host = {
        apiURL: 'https://api.podio.com:443'
      };
    });

    it('should return the correct url with only path provided', function() {
      var path = '/test';
      var result = transport._getRequestURI.call(host, path);

      expect(result).toEqual('https://api.podio.com:443/test');
    });

    it('should return the correct url with both path and query provided', function() {
      var path = '/test?param=true';
      var result = transport._getRequestURI.call(host, path);

      expect(result).toEqual('https://api.podio.com:443/test?param=true');
    });

  });

  describe('_getPromise', function() {

    it('should substitute resolve and reject functions with previous requests promise in case a token had to be refreshed', function() {
      var options = {
        resolve: function() {},
        reject: function() {}
      };
      var callback = sinon.stub();

      transport._getPromise(options, callback);

      expect(callback.calledOnce).toBe(true);
      expect(callback.calledWithExactly(options.resolve, options.reject)).toBe(true);
    });

    it('should return a new promise if no resolve and reject functions are injected', function() {
      var callback = sinon.stub();

      var promise = transport._getPromise(null, callback);

      expect(_.isFunction(promise.then)).toBe(true);
      expect(callback.calledOnce).toBe(true);
      expect(callback.getCall(0).args.length).toEqual(2);
    });

  });

  describe('request', function() {

    var request, host, auth;

    beforeEach(function() {
      request = {
        get: sinon.spy(function() { return request; }),
        end: sinon.stub()
      };
      auth = {
        isAuthenticated: sinon.stub().returns(true)
      };
      host = {
        _getRequestURI: sinon.stub(),
        _getAuth: sinon.stub().returns(auth),
        _getRequestObject: sinon.stub().returns(request),
        _formatMethod: sinon.stub().returns('get'),
        _addRequestData: sinon.spy(function(data, method, req) {
          req.requestData = {};

          return req;
        }),
        _addHeaders: sinon.spy(function(req) {
          req.headers = {};

          return req;
        }),
        _addCORS: sinon.spy(function(req) {
          req.cors = {};

          return req;
        }),
        _setOptions: sinon.spy(function(options, req) {
          req.options = {};

          return req;
        }),
        _getPromise: sinon.stub().callsArg(1),
        _onResponse: function() {},
        apiURL: 'https://api.podio.com:443'
      }
    });

    afterEach(function() {
      host = request = null;
    });

    it('should call the correct method on the request object with a correct URL', function() {
      var path = '/test';
      var url = 'https://api.podio.com:443/test';

      host._getRequestURI = sinon.stub().returns(url);

      transport.request.call(host, 'GET', path, null, function(responseData) {});

      expect(host._getRequestURI.calledOnce).toBe(true);
      expect(host._getRequestURI.calledWithExactly(path)).toBe(true);
      expect(request.get.calledOnce).toBe(true);
      expect(request.get.calledWithExactly(url)).toBe(true);
    });

    it('should throw an exception if authentication has not been performed before', function() {
      var PodioForbiddenError = function(message, status, url) {
        this.message = message;
        this.status = status;
        this.url = url;
        this.name = 'PodioForbiddenError';
      };

      auth.isAuthenticated = sinon.stub().returns(false);

      expect(function() {
        transport.request.call(host, 'get', '/test', null, function(responseData) {});
      }).toThrow(new PodioForbiddenError('Authentication has not been performed'));
    });

    it('should call addRequestData, addHeaders, addCORS, setOptions with the request object and let them augment it', function() {
      var data = { data: true };

      transport.request.call(host, 'GET', '/test', data, function(responseData) {});

      expect(host._addRequestData.calledOnce).toBe(true);
      expect(host._addRequestData.calledWith(data, 'get')).toBe(true);
      expect(host._addHeaders.calledOnce).toBe(true);
      expect(host._addCORS.calledOnce).toBe(true);
      expect(host._setOptions.calledOnce).toBe(true);
      expect(request.end.getCall(0).thisValue).toEqual(request); // request has been augmented at this point
    });

    it('should call only addRequestData and setOptions with the request object when basicAuth is true and let them augment it', function() {
      var data = { data: true };

      transport.request.call(host, 'GET', '/test', data, function(responseData) {}, { basicAuth: true });

      expect(host._addRequestData.calledOnce).toBe(true);
      expect(host._addRequestData.calledWith(data, 'get')).toBe(true);
      expect(host._addHeaders.calledOnce).toBe(false);
      expect(host._addCORS.calledOnce).toBe(false);
      expect(host._setOptions.calledOnce).toBe(true);
      expect(request.end.getCall(0).thisValue).toEqual(request); // request has been augmented at this point
    });

    it('should not throw a PodioForbiddenError when basicAuth is true', function () {
      var data = { data: true };

      auth = {
        isAuthenticated: sinon.stub().returns(false)
      };

      host._getAuth = sinon.stub().returns(auth);

      expect(function() {
        transport.request.call(host, 'GET', '/test', data, function(responseData) {}, {basicAuth: true});
      }).not.toThrow(new PodioErrors.PodioForbiddenError('Authentication has not been performed'));
    });

    it('should pass resolve, reject and the callback into onResponse', function() {
      var resolve = function() {};
      var reject = function() {};
      var callback = function() {};

      _.extend(host, {
        _onResponse: sinon.stub(),
        _getPromise: sinon.stub().callsArgWith(1, resolve, reject)
      });

      request.end = sinon.stub().callsArg(0);

      transport.request.call(host, 'GET', '/test', null, callback);

      expect(request.end.calledOnce).toBe(true);
      expect(host._onResponse.calledOnce).toBe(true);
      expect(host._onResponse.getCall(0).args[0].resolve).toEqual(resolve);
      expect(host._onResponse.getCall(0).args[0].reject).toEqual(reject);
      expect(host._onResponse.getCall(0).args[0].callback).toEqual(callback);
    });

    it('should format the method passed', function() {
      transport.request.call(host, 'GET', '/test', null, function(responseData) {});

      expect(host._formatMethod.calledOnce).toBe(true);
    });

  });

  describe('uploadFile', function() {

    function getFullMocks() {
      var host;
      var req = {
        end: sinon.stub()
      };
      var field = { field: sinon.stub().returns(req) };
      var attach = { attach: sinon.stub().returns(field)};

      req.post = sinon.stub().returns(attach);

      host = {
        _getRequestObject: sinon.stub().returns(req),
        _addHeaders: sinon.stub().returns(req),
        _addCORS: sinon.stub().returns(req),
        _getPromise: sinon.stub(),
        apiURL: 'https://api.podio.com:443',
        authType: 'server'
      };

      return {
        host: host,
        req: req,
        attach: attach,
        field: field
      };
    }

    it('should raise an exception when called on the client', function() {
      var host = {
        authType: 'client',
        apiURL: 'https://api.podio.com:443'
      };

      expect(function() {
        transport.uploadFile.call(host);
      }).toThrow(new Error('File uploads are only supported on the server right now.'));
    });

    it('should assemble the url correctly', function() {
      var mocks = getFullMocks();

      transport.uploadFile.call(mocks.host);

      expect(mocks.req.post.calledOnce).toBe(true);
      expect(mocks.req.post.calledWithExactly('https://api.podio.com:443/file'));
    });

    it('it should assemble the body correctly', function() {
      var mocks = getFullMocks();
      var filePath = 'tmp/image.png';
      var fileName = 'image.png';

      transport.uploadFile.call(mocks.host, filePath, fileName);

      expect(mocks.attach.attach.calledOnce).toBe(true);
      expect(mocks.attach.attach.calledWithExactly('source', filePath)).toBe(true);
      expect(mocks.field.field.calledOnce).toBe(true);
      expect(mocks.field.field.calledWithExactly('filename', fileName)).toBe(true);
    });

    it('should add auth and CORS headers to the request', function() {
      var mocks = getFullMocks();

      transport.uploadFile.call(mocks.host);

      expect(mocks.host._addHeaders.calledOnce).toBe(true);
      expect(mocks.host._addHeaders.calledWithExactly(mocks.req)).toBe(true);
      expect(mocks.host._addCORS.calledOnce).toBe(true);
      expect(mocks.host._addCORS.calledWithExactly(mocks.req)).toBe(true);
    });

    it('should receive a promise, execute the request and call the response handler with options', function() {
      var mocks = getFullMocks();
      var resolve = function() {};
      var reject = function() {};
      var callback = function() {};
      var filePath = 'tmp/image.png';
      var fileName = 'image.png';
      var options = {};
      var requestOptions = {
        resolve: resolve,
        reject: reject,
        callback: callback,
        requestParams: {
          requestType: 'file',
          filePath: filePath,
          fileName: fileName
        }
      };

      mocks.req.end = sinon.stub().callsArg(0);
      mocks.host._getPromise = sinon.stub().callsArgWith(1, resolve, reject);
      mocks.host._onResponse = sinon.stub();

      transport.uploadFile.call(mocks.host, filePath, fileName, callback, options);

      expect(mocks.host._getPromise.calledOnce).toBe(true);
      expect(mocks.host._getPromise.getCall(0).args[0]).toBe(options);
      expect(_.isFunction(mocks.host._getPromise.getCall(0).args[1])).toBe(true);
      expect(mocks.req.end.calledOnce).toBe(true);
      expect(mocks.host._onResponse.calledOnce).toBe(true);
      expect(mocks.host._onResponse.calledWithExactly(requestOptions)).toBe(true);
    });

  });

  describe('_onTokenRefreshed', function() {

    function getHost() {
      return {
        request: sinon.stub(),
        uploadFile: sinon.stub()
      };
    }

    function getOptions() {
      return {
        callback: function() {},
        resolve: function() {},
        reject: function() {}
      };
    }

    it('should repeat a failed generic request with old parameters passed as options', function() {
      var host = getHost();
      var request = {
        requestType: 'generic',
        method: 'GET',
        path: '/tasks',
        data: {}
      };
      var options = getOptions();
      var resolveRejectOptions = {
        resolve: options.resolve,
        reject: options.reject
      };

      transport._onTokenRefreshed.call(host, request, options);

      expect(host.request.calledOnce).toBe(true);
      expect(host.request.calledWithExactly(request.method, request.path, request.data, options.callback, resolveRejectOptions));
      expect(host.uploadFile.called).toBe(false);
    });

    it('should repeat a file upload with old parameters passed as options', function() {
      var host = getHost();
      var options = getOptions();
      var request = {
        requestType: 'file',
        filePath: 'temp/image.png',
        fileName: 'image.png'
      };
      var resolveRejectOptions = {
        resolve: options.resolve,
        reject: options.reject
      };

      transport._onTokenRefreshed.call(host, request, options);

      expect(host.uploadFile.calledOnce).toBe(true);
      expect(host.uploadFile.calledWithExactly(request.filePath, request.fileName, options.callback, resolveRejectOptions)).toBe(true);
      expect(host.request.called).toBe(false);
    });

  });

  describe('_handleTransportError', function() {

    beforeEach(function() {
      sinon.spy(transport, '_handleTransportError');
    });

    afterEach(function() {
      transport._handleTransportError.restore();
    });

    it('should throw a PodioBadRequestError with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 400
      };

      expect(function() {
        transport._handleTransportError(options, response);
      }).toThrow(new Error());
      expect(transport._handleTransportError.exceptions[0].name).toEqual('PodioBadRequestError');
      expect(transport._handleTransportError.exceptions[0].message).toEqual(response.body);
      expect(transport._handleTransportError.exceptions[0].status).toEqual(response.status);
      expect(transport._handleTransportError.exceptions[0].url).toEqual(options.requestParams.url);
    });

    it('should throw a PodioAuthorizationError with the right parameters and clear the authentication', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 401
      };
      var auth = {
        _clearAuthentication: sinon.stub()
      };
      var host = {
        _getAuth: sinon.stub().returns(auth)
      };

      expect(function() {
        transport._handleTransportError.call(host, options, response)
      }).toThrow(new Error());
      expect(transport._handleTransportError.exceptions[0].name).toEqual('PodioAuthorizationError');
      expect(transport._handleTransportError.exceptions[0].message).toEqual(response.body);
      expect(transport._handleTransportError.exceptions[0].status).toEqual(response.status);
      expect(transport._handleTransportError.exceptions[0].url).toEqual(options.requestParams.url);
      expect(auth._clearAuthentication.calledOnce).toBe(true);
    });

    it('should throw a PodioForbiddenError with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 403
      };

      expect(function() {
        transport._handleTransportError(options, response);
      }).toThrow(new Error());
      expect(transport._handleTransportError.exceptions[0].name).toEqual('PodioForbiddenError');
      expect(transport._handleTransportError.exceptions[0].message).toEqual(response.body);
      expect(transport._handleTransportError.exceptions[0].status).toEqual(response.status);
      expect(transport._handleTransportError.exceptions[0].url).toEqual(options.requestParams.url);
    });

    it('should throw a PodioNotFoundError with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 404
      };

      expect(function() {
        transport._handleTransportError(options, response);
      }).toThrow(new Error());
      expect(transport._handleTransportError.exceptions[0].name).toEqual('PodioNotFoundError');
      expect(transport._handleTransportError.exceptions[0].message).toEqual(response.body);
      expect(transport._handleTransportError.exceptions[0].status).toEqual(response.status);
      expect(transport._handleTransportError.exceptions[0].url).toEqual(options.requestParams.url);
    });

    it('should throw a PodioConflictError with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 409
      };

      expect(function() {
        transport._handleTransportError(options, response);
      }).toThrow(new Error());
      expect(transport._handleTransportError.exceptions[0].name).toEqual('PodioConflictError');
      expect(transport._handleTransportError.exceptions[0].message).toEqual(response.body);
      expect(transport._handleTransportError.exceptions[0].status).toEqual(response.status);
      expect(transport._handleTransportError.exceptions[0].url).toEqual(options.requestParams.url);
    });

    it('should throw a PodioGoneError with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 410
      };

      expect(function() {
        transport._handleTransportError(options, response);
      }).toThrow(new Error());
      expect(transport._handleTransportError.exceptions[0].name).toEqual('PodioGoneError');
      expect(transport._handleTransportError.exceptions[0].message).toEqual(response.body);
      expect(transport._handleTransportError.exceptions[0].status).toEqual(response.status);
      expect(transport._handleTransportError.exceptions[0].url).toEqual(options.requestParams.url);
    });

    it('should throw a PodioRateLimitError with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 420
      };

      expect(function() {
        transport._handleTransportError(options, response);
      }).toThrow(new Error());
      expect(transport._handleTransportError.exceptions[0].name).toEqual('PodioRateLimitError');
      expect(transport._handleTransportError.exceptions[0].message).toEqual(response.body);
      expect(transport._handleTransportError.exceptions[0].status).toEqual(response.status);
      expect(transport._handleTransportError.exceptions[0].url).toEqual(options.requestParams.url);
    });

    it('should throw a PodioServerError with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 500
      };

      expect(function() {
        transport._handleTransportError(options, response);
      }).toThrow(new Error());
      expect(transport._handleTransportError.exceptions[0].name).toEqual('PodioServerError');
      expect(transport._handleTransportError.exceptions[0].message).toEqual(response.body);
      expect(transport._handleTransportError.exceptions[0].status).toEqual(response.status);
      expect(transport._handleTransportError.exceptions[0].url).toEqual(options.requestParams.url);
    });

    it('should throw a PodioUnavailableError 502 with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 502
      };

      expect(function() {
        transport._handleTransportError(options, response);
      }).toThrow(new Error());
      expect(transport._handleTransportError.exceptions[0].name).toEqual('PodioUnavailableError');
      expect(transport._handleTransportError.exceptions[0].message).toEqual(response.body);
      expect(transport._handleTransportError.exceptions[0].status).toEqual(response.status);
      expect(transport._handleTransportError.exceptions[0].url).toEqual(options.requestParams.url);
    });

    it('should throw a PodioUnavailableError 503 with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 503
      };

      expect(function() {
        transport._handleTransportError(options, response);
      }).toThrow(new Error());
      expect(transport._handleTransportError.exceptions[0].name).toEqual('PodioUnavailableError');
      expect(transport._handleTransportError.exceptions[0].message).toEqual(response.body);
      expect(transport._handleTransportError.exceptions[0].status).toEqual(response.status);
      expect(transport._handleTransportError.exceptions[0].url).toEqual(options.requestParams.url);
    });

    it('should throw a PodioUnavailableError 504 with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 504
      };

      expect(function() {
        transport._handleTransportError(options, response);
      }).toThrow(new Error());
      expect(transport._handleTransportError.exceptions[0].name).toEqual('PodioUnavailableError');
      expect(transport._handleTransportError.exceptions[0].message).toEqual(response.body);
      expect(transport._handleTransportError.exceptions[0].status).toEqual(response.status);
      expect(transport._handleTransportError.exceptions[0].url).toEqual(options.requestParams.url);
    });

    it('should throw a PodioError with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {}
      };

      expect(function() {
        transport._handleTransportError(options, response);
      }).toThrow(new Error());
      expect(transport._handleTransportError.exceptions[0].name).toEqual('PodioError');
      expect(transport._handleTransportError.exceptions[0].message).toEqual(response.body);
      expect(transport._handleTransportError.exceptions[0].status).toEqual(response.status);
      expect(transport._handleTransportError.exceptions[0].url).toEqual(options.requestParams.url);
    });

  });

  describe('_formatMethod', function() {

    it('should transform a method other than delete to lowercase', function() {
      var result = transport._formatMethod('GET');

      expect(result).toEqual('get');
    });

    it('should return del when delete is used as the method name', function() {
      var result = transport._formatMethod('DELETE');

      expect(result).toEqual('del');
    });

  });

});
