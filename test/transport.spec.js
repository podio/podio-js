var transport = require('../lib/transport');
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

  describe('_handleTransportError', function() {

    var PodioAuthorizationError = function(message, status, url) {
      this.message = message;
      this.status = status;
      this.url = url;
      this.name = 'PodioAuthorizationError';
    };

    it('should try to refresh token when the expire error is triggered', function() {
      var auth = {
        _refreshToken: sinon.stub().callsArg(0)
      };
      var host = {
        request: sinon.stub(),
        authObject: {
          refreshToken: 'e123'
        },
        _getAuth: sinon.stub().returns(auth)
      };
      var options = {
        resolve: function() {},
        reject: function() {},
        callback: function() {},
        requestParams: {
          method: 'GET',
          path: '/tasks',
          data: {}
        }
      };
      var response = {
        status: 401,
        body: {
          error_description: 'expired_token'
        }
      };

      transport._handleTransportError.call(host, options, response);

      expect(auth._refreshToken.calledOnce).toBe(true);
      expect(_.isFunction(auth._refreshToken.getCall(0).args[0])).toBe(true);

      // verify bound arguments
      expect(host.request.getCall(0).args[0]).toEqual('GET');
      expect(host.request.getCall(0).args[1]).toEqual('/tasks');
      expect(host.request.getCall(0).args[2]).toEqual({});
      expect(host.request.getCall(0).args[3]).toEqual(options.callback);
      expect(host.request.getCall(0).args[4]).toEqual({ resolve: options.resolve, reject: options.reject });
    });

    it('should throw a PodioAuthorizationError if the 401 is not an expired token error and clear the current auth data', function() {
      var auth = {
        _clearAuthentication: sinon.stub()
      };
      var host = {
        _getAuth: sinon.stub().returns(auth)
      };
      var response = {
        status: 401,
        body: {
          error_description: 'invalid_grant'
        }
      };
      var options = {
        requestParams: {
          url: '/tasks'
        }
      };

      expect(function() {
        transport._handleTransportError.call(host, options, response);
      }).toThrow(new PodioAuthorizationError(response.body, 401, '/tasks'));
      expect(auth._clearAuthentication.calledOnce).toBe(true);
    });

    it('should throw a PodioAuthorizationError if the 401 is an invalid token error but the refresh token is missing', function() {
      var auth = {
        _clearAuthentication: sinon.stub()
      };
      var host = {
        _getAuth: sinon.stub().returns(auth),
        authObject: {
          authToken: 123
        }
      };
      var response = {
        status: 401,
        body: {
          error: 'invalid_token'
        }
      };
      var options = {
        requestParams: {
          url: '/tasks'
        }
      };

      expect(function() {
        transport._handleTransportError.call(host, options, response);
      }).toThrow(new PodioAuthorizationError(response.body, 401, '/tasks'));
      expect(auth._clearAuthentication.calledOnce).toBe(true);
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

    it('should call reject and handle the error if response was a failure', function() {
      var host = {
        _handleTransportError: sinon.stub()
      };
      var options = {
        reject: sinon.stub()
      };
      var res = {
        ok: false,
        body: { error_description: 'Error occured' }
      };

      transport._onResponse.call(host, options, res);

      expect(options.reject.calledOnce).toBe(true);
      expect(options.reject.calledWithExactly(res.body.error_description)).toBe(true);
      expect(host._handleTransportError.calledOnce).toBe(true);
      expect(host._handleTransportError.calledWithExactly(options, res)).toBe(true);
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
        _getAuth: sinon.stub().returns(auth),
        _getRequestObject: sinon.stub().returns(request),
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
        _getPromise: sinon.stub().callsArg(1),
        _onResponse: function() {},
        apiURL: 'https://api.podio.com:443'
      }
    });

    afterEach(function() {
      host = request = null;
    });

    it('should call the correct method on the request object with a correct URL', function() {
      var url = 'https://api.podio.com:443/test';

      transport.request.call(host, 'GET', '/test', null, function(responseData) {});

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

    it('should call addRequestData, addHeaders, addCORS with the request object and let them augment it', function() {
      var data = { data: true };

      transport.request.call(host, 'GET', '/test', data, function(responseData) {});

      expect(host._addRequestData.calledOnce).toBe(true);
      expect(host._addRequestData.calledWith(data, 'get')).toBe(true);
      expect(host._addHeaders.calledOnce).toBe(true);
      expect(host._addCORS.calledOnce).toBe(true);
      expect(request.end.getCall(0).thisValue).toEqual(request); // request has been augmented at this point
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

  });



});