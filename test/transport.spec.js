var transport = require('../lib/transport');
var PodioErrors = require('../lib/PodioErrors');
var sinon = require('sinon');
var _ = require('lodash');

var Promise = require('es6-promise');
Promise = Promise.Promise; // unwrap

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
        reject: sinon.stub()
      };

      var res = {
        body: {},
        ok: true
      };

      transport._onResponse(options, null, res);

      expect(options.resolve.calledOnce).toBe(true);
      expect(options.resolve.calledWithExactly(res.body)).toBe(true);
    });

    it('should call reject and handle the error if response was a failure different from HTTP 401', function() {
      var options = {
        reject: sinon.stub(),
        requestParams: { url: 'http://url' }
      };

      var res = {
        ok: false,
        body: { error_description: 'Error occured' },
        status: 404,
        err: {}
      };

      transport._onResponse.call(transport, options, res.err, res);

      var expectedError = new PodioErrors.PodioNotFoundError(res.body, res.status, options.requestParams.url);

      expect(options.reject.calledOnce).toBe(true);
      expect(options.reject.calledWithExactly(expectedError)).toBe(true);
    });

    it('should try to refresh token when the token expires with an HTTP 401', function() {
      var response = {
        status: 401,
        body: {
          error_description: 'expired_token'
        },
        ok: false,
        err: {} // superagent error
      };

      var options = {
        requestParams: {},
        resolve: sinon.stub(),
        reject: sinon.stub()
      };

      var podioAuthorizationError = new PodioErrors.PodioAuthorizationError(response.body, response.status, '');

      var auth = {
        _refreshToken: sinon.stub().callsArg(0),
        _clearAuthentication: sinon.stub()
      };

      var host = {
        authObject: {
          refreshToken: 'abc1234'
        },
        _getAuth: sinon.stub().returns(auth),
        _onTokenRefreshed: sinon.stub().returns(new Promise(function(){})),
        _handleTransportError: sinon.spy(function () {
          auth._clearAuthentication();

          return podioAuthorizationError;
        }),
        afterTokenRefreshed: sinon.stub()
      };

      transport._onResponse.call(host, options, response.err, response);

      expect(auth._clearAuthentication.calledOnce).toBe(true);
      expect(auth._refreshToken.calledOnce).toBe(true);
      expect(_.isFunction(auth._refreshToken.getCall(0).args[0])).toBe(true);
      expect(host._onTokenRefreshed.calledOnce).toBe(true);
      expect(host._onTokenRefreshed.calledWithExactly(options.requestParams)).toBe(true);
      expect(host.afterTokenRefreshed.calledOnce).toBe(true);
    });

    it('should handle the error if response was a HTTP 401 but not a token expiration', function() {
      var res = {
        ok: false,
        body: {},
        status: 401,
        err: new Error()
      };
      var options = {
        requestParams: {},
        reject: sinon.stub()
      };
      var host = {
        _handleTransportError: sinon.stub()
      };

      transport._onResponse.call(host, options, new PodioErrors.PodioAuthorizationError(), res);

      expect(host._handleTransportError.calledOnce).toBe(true);
      expect(options.reject.calledOnce).toBe(true);
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

      transport._onResponse.call(host, options, new PodioErrors.PodioAuthorizationError(), res);

      expect(host._handleTransportError.calledOnce).toBe(true);
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
    });

    it('should throw an exception if authentication has not been performed before', function(done) {
      var PodioForbiddenError = function(message, status, url) {
        this.message = message;
        this.status = status;
        this.url = url;
        this.name = 'PodioForbiddenError';
      };

      auth.isAuthenticated = sinon.stub().returns(false);

      transport.request.call(host, 'get', '/test').then(function(){}, function (err) {
        expect(err).toEqual(new PodioForbiddenError('Authentication has not been performed'));

        done();
      });
    });

    it('should call addRequestData, addHeaders, addCORS, setOptions with the request object and let them augment it', function() {
      var data = { data: true };

      host.authObject = {};
      transport.request.call(host, 'GET', '/test', data);

      expect(host._addRequestData.calledOnce).toBe(true);
      expect(host._addRequestData.calledWith(data, 'get')).toBe(true);
      expect(host._addHeaders.calledOnce).toBe(true);
      expect(host._addCORS.calledOnce).toBe(true);
      expect(host._setOptions.calledOnce).toBe(true);
      expect(request.end.getCall(0).thisValue).toEqual(request); // request has been augmented at this point
    });

    it('should call only addRequestData and setOptions with the request object when basicAuth is true and let them augment it', function() {
      var data = { data: true };

      transport.request.call(host, 'GET', '/test', data, { basicAuth: true });

      expect(host._addRequestData.calledOnce).toBe(true);
      expect(host._addRequestData.calledWith(data, 'get')).toBe(true);
      expect(host._addHeaders.called).toBe(false);
      expect(host._addCORS.called).toBe(false);
      expect(host._setOptions.calledOnce).toBe(true);
      expect(request.end.getCall(0).thisValue).toEqual(request); // request has been augmented at this point
    });

    it('should format the method passed', function() {
      host.authObject = {};
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

    it('should raise an exception when called on the client', function(done) {
      var host = {
        authType: 'client',
        apiURL: 'https://api.podio.com:443'
      };

      transport.uploadFile.call(host).then(function () {}, function (err) {
        expect(err).toEqual(new PodioErrors.PodioError('File uploads are only supported on the server right now.'));

        done();
      });
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

  });

  describe('_onTokenRefreshed', function() {

    it('should repeat a failed generic request with old parameters passed as options', function() {
      var host = {
        request: sinon.stub(),
        uploadFile: sinon.stub()
      };

      var request = {
        requestType: 'generic',
        method: 'GET',
        path: '/tasks',
        data: {}
      };

      transport._onTokenRefreshed.call(host, request);

      expect(host.request.calledOnce).toBe(true);
      expect(host.request.calledWithExactly(request.method, request.path, request.data));
      expect(host.uploadFile.called).toBe(false);
    });

    it('should repeat a file upload with old parameters passed as options', function() {
      var host = {
        request: sinon.stub(),
        uploadFile: sinon.stub()
      };

      var request = {
        requestType: 'file',
        filePath: 'temp/image.png',
        fileName: 'image.png'
      };

      transport._onTokenRefreshed.call(host, request);

      expect(host.uploadFile.calledOnce).toBe(true);
      expect(host.uploadFile.calledWithExactly(request.filePath, request.fileName)).toBe(true);
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

      var expectedError = new PodioErrors.PodioBadRequestError(response.body, response.status, options.requestParams.url);
      expect(transport._handleTransportError(options, response)).toEqual(expectedError);
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

      var expectedError = new PodioErrors.PodioAuthorizationError(response.body, response.status, options.requestParams.url);
      expect(transport._handleTransportError.call(host, options, response)).toEqual(expectedError);
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

      var expectedError = new PodioErrors.PodioForbiddenError(response.body, response.status, options.requestParams.url);
      expect(transport._handleTransportError(options, response)).toEqual(expectedError);
    });

    it('should throw a PodioNotFoundError with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 404
      };

      var expectedError = new PodioErrors.PodioNotFoundError(response.body, response.status, options.requestParams.url);
      expect(transport._handleTransportError(options, response)).toEqual(expectedError);
    });

    it('should throw a PodioConflictError with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 409
      };

      var expectedError = new PodioErrors.PodioConflictError(response.body, response.status, options.requestParams.url);
      expect(transport._handleTransportError(options, response)).toEqual(expectedError);
    });

    it('should throw a PodioGoneError with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 410
      };

      var expectedError = new PodioErrors.PodioGoneError(response.body, response.status, options.requestParams.url);
      expect(transport._handleTransportError(options, response)).toEqual(expectedError);
    });

    it('should throw a PodioRateLimitError with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 420
      };

      var expectedError = new PodioErrors.PodioRateLimitError(response.body, response.status, options.requestParams.url);
      expect(transport._handleTransportError(options, response)).toEqual(expectedError);
    });

    it('should throw a PodioServerError with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 500
      };

      var expectedError = new PodioErrors.PodioServerError(response.body, response.status, options.requestParams.url);
      expect(transport._handleTransportError(options, response)).toEqual(expectedError);
    });

    it('should throw a PodioUnavailableError 502 with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 502
      };

      var expectedError = new PodioErrors.PodioUnavailableError(response.body, response.status, options.requestParams.url);
      expect(transport._handleTransportError(options, response)).toEqual(expectedError);
    });

    it('should throw a PodioUnavailableError 503 with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 503
      };

      var expectedError = new PodioErrors.PodioUnavailableError(response.body, response.status, options.requestParams.url);
      expect(transport._handleTransportError(options, response)).toEqual(expectedError);
    });

    it('should throw a PodioUnavailableError 504 with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {},
        status: 504
      };

      var expectedError = new PodioErrors.PodioUnavailableError(response.body, response.status, options.requestParams.url);
      expect(transport._handleTransportError(options, response)).toEqual(expectedError);
    });

    it('should throw a PodioError with the right parameters', function() {
      var options = {
        requestParams: { url: 'https://example.com' }
      };
      var response = {
        body: {}
      };

      var expectedError = new PodioErrors.PodioError(response.body, response.status, options.requestParams.url);
      expect(transport._handleTransportError(options, response)).toEqual(expectedError);
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
