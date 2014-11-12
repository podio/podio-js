describe('PlatformJS', function() {

  var PlatformJS = require('../lib/PlatformJS');
  var _ = require('lodash');
  var sinon = require('sinon');
  
  describe('constructor', function() {

    it('should set auth data correctly', function() {
      var authOptions = {
        authType: 'server',
        clientId: 123,
        clientSecret: 'abcdef'
      };
      var instance = new PlatformJS(authOptions);

      expect(instance.authType).toEqual(authOptions.authType);
      expect(instance.clientId).toEqual(authOptions.clientId);
      expect(instance.clientSecret).toEqual(authOptions.clientSecret);
    });

    it('should throw an exception if one of the auth properties is missing', function() {
      expect(function() { new PlatformJS(); }).toThrow(new Error('Authentication options are missing'));
      expect(function() { new PlatformJS({}); }).toThrow(new Error('Missing auth property authType'));
      expect(function() { new PlatformJS({ authType: 'client' }); }).toThrow(new Error('Missing auth property clientId'));
      expect(function() { new PlatformJS({ authType: 'server', clientId: 123 }); }).toThrow(new Error('Missing auth property clientSecret'));
    });

    it('should not throw an exception if clientSecret is missing for a client auth', function() {
      var instance = new PlatformJS({ authType: 'client', clientId: 123 });

      expect(instance).toBeDefined();
    });

    it('should set the API URL to default', function() {
      var authOptions = {
        authType: 'client',
        clientId: 123
      };
      var instance = new PlatformJS(authOptions);

      expect(instance.apiURL).toEqual('https://api.podio.com:443');
    });

    it('should set the API URL to the one provided in options', function() {
      var authOptions = {
        authType: 'client',
        clientId: 123
      };
      var apiURL = 'https://api2.podio.com';
      var instance = new PlatformJS(authOptions, { apiURL: apiURL});

      expect(instance.apiURL).toEqual(apiURL);
    });

    it('should get the authObject from the session store when one is provided', function() {
      var authOptions = {
        authType: 'client',
        clientId: 123
      };
      var sessionStore = {
        get: sinon.spy(function(authType, callback) {
          callback({ accessToken: 123 });
        })
      };
      var instance = new PlatformJS(authOptions, { sessionStore: sessionStore });

      expect(sessionStore.get.calledOnce).toBe(true);
      expect(sessionStore.get.getCall(0).args[0]).toEqual('client');
      expect(instance.authObject.accessToken).toEqual(123);
    });

    it('should still set the apiURL to default when a session store is provided', function() {
      var authOptions = {
        authType: 'client',
        clientId: 123
      };
      var sessionStore = {
        get: sinon.stub().returns({ accessToken: 123 })
      };
      var instance = new PlatformJS(authOptions, { sessionStore: sessionStore });

      expect(instance.apiURL).toEqual('https://api.podio.com:443');
    });

  });

  describe('getAuthorizationURL', function() {

    it('should return the correct authorization URL for the client auth', function() {
      var redirectURL = 'https://www.myapp.com/oauth';
      var host = {
        utils: { _getDomain: sinon.stub().returns('podio.com') },
        authType: 'client',
        clientId: 123
      };
      var expectedURL = 'https://podio.com/oauth/authorize?client_id=123&redirect_uri=https%3A%2F%2Fwww.myapp.com%2Foauth&response_type=token';

      expect(PlatformJS.prototype.getAuthorizationURL.call(host, redirectURL)).toEqual(expectedURL);
      expect(host.utils._getDomain.calledOnce).toBe(true);
    });

    it('should return the correct authorization URL for the server auth', function() {
      var redirectURL = 'https://www.myapp.com/oauth';
      var host = {
        utils: { _getDomain: sinon.stub().returns('podio.com') },
        authType: 'server',
        clientId: 123
      };
      var expectedURL = 'https://podio.com/oauth/authorize?client_id=123&redirect_uri=https%3A%2F%2Fwww.myapp.com%2Foauth&response_type=code';

      expect(PlatformJS.prototype.getAuthorizationURL.call(host, redirectURL)).toEqual(expectedURL);
    });

    it('should throw an error when retrieving an auth URL for password auth', function() {
      var redirectURL = 'https://www.myapp.com/oauth';
      var host = {
        utils: { _getDomain: sinon.stub().returns('podio.com') },
        authType: 'password',
        clientId: 123
      };
      var errorText = 'Authorization URLs are not supported for password authentication';

      expect(PlatformJS.prototype.getAuthorizationURL.bind(host, redirectURL)).toThrow(new Error(errorText));
    });

  });
    
  describe('isAuthenticated', function() {

    it('should return true if authObject is populated', function() {
      var host = {
        authObject: {
          accessToken: 'adbcdegt'
        }
      };

      expect(PlatformJS.prototype.isAuthenticated.call(host)).toBe(true);
    });

    it('should call _hasClientSideRedirect and return false if no authObject exists', function() {
      var host = {
        _hasClientSideRedirect: sinon.stub().returns(false)
      };

      expect(PlatformJS.prototype.isAuthenticated.call(host)).toBe(false);
      expect(host._hasClientSideRedirect.calledOnce).toBe(true);
    });

  });
  
  describe('getAccessToken', function() {
    
    it('should call _authenticate with the right responseData', function() {
      var host = {
        authType: 'server',
        _authenticate: sinon.stub(),
        _onAccessTokenAcquired: function() {}
      };
      var authCode = 'e123';
      var redirectURL = 'https://www.myapp.com/oauth';
      var expectedResponseData = {
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: redirectURL
      };

      PlatformJS.prototype.getAccessToken.apply(host, [authCode, redirectURL]);
      expect(host._authenticate.calledOnce).toBe(true);
      expect(host._authenticate.getCall(0).args[0]).toEqual(expectedResponseData);
    });

    it('should throw an exception if authType is not server', function() {
      var host = {
        authType: 'client'
      };

      expect(PlatformJS.prototype.getAccessToken.bind(host)).toThrow(new Error('In authentication types other than server access token is delivered through a redirect'));
    });
    
  });

  describe('_onAccessTokenAcquired', function() {

    var responseData = {
      access_token: 'e123',
      refresh_token: 'a321',
      expires_in: 4434,
      ref: {}
    };
    var oAuthObject = {
      accessToken: 'e123',
      refreshToken: 'a321',
      expiresIn: 4434,
      ref: {}
    };

    it('should set an OAuth object correctly', function() {
      var host = {};

      PlatformJS.prototype._onAccessTokenAcquired.call(host, responseData, function() {});

      expect(host.authObject).toEqual(oAuthObject);
    });

    it('should save an authObject in the session store and provide a callback', function() {
      var host = {
        sessionStore: {
          set: sinon.stub()
        },
        authType: 'client'
      };

      PlatformJS.prototype._onAccessTokenAcquired.call(host, responseData, function() {});

      expect(host.sessionStore.set.calledOnce).toBe(true);
      expect(host.sessionStore.set.getCall(0).args[0]).toEqual(oAuthObject);
      expect(host.sessionStore.set.getCall(0).args[1]).toEqual('client');
      expect(_.isFunction(host.sessionStore.set.getCall(0).args[2])).toBe(true);
    });

    it('should call the callback if no session store is provided', function() {
      var callback = sinon.stub();
      var host = {};

      PlatformJS.prototype._onAccessTokenAcquired.call(host, responseData, callback);

      expect(callback.calledOnce).toBe(true);
    });

    it('should not fail trying to call the callback if none is provided', function() {
      var host = {};

      PlatformJS.prototype._onAccessTokenAcquired.call(host, responseData);

      expect(true).toBe(true);
    });

  });

  describe('utils._getDomain', function() {

    it('should extract the domain name from a URL', function() {
      expect(PlatformJS.prototype.utils._getDomain('https://api.podio.com:443')).toEqual('podio.com');
    });

  });

  describe('_authenticate', function() {
  
    it('should construct the request data and url correctly', function() {
      var host = {
        utils: { _getDomain: sinon.stub().returns('podio.com') },
        clientId: 123,
        clientSecret: 'secret',
        _authRequest: sinon.stub()
      };
      var requestData = { grant_type: 'authorization_code' };
      var expectedRequestData = {
        grant_type: 'authorization_code',
        client_id: 123,
        client_secret: 'secret'
      };

      PlatformJS.prototype._authenticate.call(host, requestData);

      expect(host._authRequest.calledOnce).toBe(true);
      expect(host._authRequest.getCall(0).args[0]).toEqual('https://podio.com/oauth/token');
      expect(host._authRequest.getCall(0).args[1]).toEqual(expectedRequestData);
    });
    
  });

  describe('_onAuthResponse', function() {

    it('should call the callback with the body if response is ok', function() {
      var callback = sinon.stub();
      var url = 'https://api.podio.com:443/oauth/token';

      PlatformJS.prototype._onAuthResponse(callback, 'authorization_code', url, { ok: true, body: 'body' });

      expect(callback.calledOnce).toBe(true);
      expect(callback.calledWithExactly('body')).toBe(true);
    });

    it('should raise an exception if authentication failed', function() {
      var url = 'https://api.podio.com:443/oauth/token';
      var errorMessage = 'Authentication for authorization_code failed. Reason: 42';
      var PodioAuthorizationError = function(message, status, url) {
        this.message = message;
        this.status = status;
        this.url = url;
        this.name = 'PodioAuthorizationError';
      };
      var res = {
        ok: false,
        body: { error_description: '42' },
        status: 401
      };

      expect(function() {
        PlatformJS.prototype._onAuthResponse(null, 'authorization_code', url, res);
      }).toThrow(new PodioAuthorizationError(errorMessage, 401, url));
    });

  });

  describe('_clearAuthentication', function() {

    it('should remove the authObject and call sessionStore with an empty auth object', function() {
      var host = {
        authObject: {},
        authType: 'client',
        sessionStore: { set: sinon.stub() }
      };

      PlatformJS.prototype._clearAuthentication.call(host);

      expect(host.authObject).toBeUndefined();
      expect(host.sessionStore.set.calledOnce).toBe(true);
      expect(host.sessionStore.set.calledWithExactly({}, 'client')).toBe(true);
    });

  });
  
  describe('_refreshToken', function() {
    
    it('calls authenticate with the refresh token', function() {
      var host = {
        authObject: {
          refreshToken: 123
        },
        _authenticate: sinon.stub()
      };
      var expectedOptions = {
        grant_type: 'refresh_token',
        refresh_token: 123
      };

      PlatformJS.prototype._refreshToken.call(host);

      expect(host._authenticate.calledOnce).toBe(true);
      expect(host._authenticate.getCall(0).args[0]).toEqual(expectedOptions);
    });

    it('calls _onAccessTokenAcquired when authentication is done', function() {
      var callbackFn = function() {};
      var responseData = { accessToken: 123 };
      var host = {
        authObject: {
          refreshToken: 123
        },
        _authenticate: function(requestData, callback) {
          callback(responseData);
        },
        _onAccessTokenAcquired: sinon.stub()
      };

      PlatformJS.prototype._refreshToken.call(host, callbackFn);
      
      expect(host._onAccessTokenAcquired.calledOnce).toBe(true);
      expect(host._onAccessTokenAcquired.calledWithExactly(responseData, callbackFn)).toBe(true);
    });
    
  });

  describe('_addRequestData', function() {

    it('should attach data as query for a get request and return the request object', function() {
      var newReq = {};
      var data = { authToken: 123 };
      var req = {
        query: sinon.spy(function(data) {
          return newReq;
        })
      };

      var result = PlatformJS.prototype._addRequestData(data, 'get', req);

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

      var result = PlatformJS.prototype._addHeaders.call(host, req);

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

      expect(PlatformJS.prototype._addCORS.call(host, req)).toEqual(req);
      expect(req.withCredentials.calledOnce).toBe(true);
    });

    it('should not enable cookies if no client auth is used', function() {
      var host = {
        authType: 'server'
      };
      var req = {
        withCredentials: sinon.stub()
      };

      expect(PlatformJS.prototype._addCORS.call(host, req)).toEqual(req);
      expect(req.withCredentials.called).toBe(false);
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

      PlatformJS.prototype._onResponse(options, res)

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

      PlatformJS.prototype._onResponse.call(host, options, res);

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

      PlatformJS.prototype._getPromise(options, callback);

      expect(callback.calledOnce).toBe(true);
      expect(callback.calledWithExactly(options.resolve, options.reject)).toBe(true);
    });

    it('should return a new promise if no resolve and reject functions are injected', function() {
      var callback = sinon.stub();

      var promise = PlatformJS.prototype._getPromise(null, callback);

      expect(_.isFunction(promise.then)).toBe(true);
      expect(callback.calledOnce).toBe(true);
      expect(callback.getCall(0).args.length).toEqual(2);
    });
    
  });

  describe('request', function() {

    var request, host;

    beforeEach(function() {
      request = {
        get: sinon.spy(function() { return request; }),
        end: sinon.stub()
      };
      host = {
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
        isAuthenticated: sinon.stub().returns(true),
        apiURL: 'https://api.podio.com:443'
      }
    });

    afterEach(function() {
      host = request = null;
    });

    it('should call the correct method on the request object with a correct URL', function() {
      var url = 'https://api.podio.com:443/test';

      PlatformJS.prototype.request.call(host, 'GET', '/test', null, function(responseData) {});

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

      host.isAuthenticated = sinon.stub().returns(false);

      expect(function() {
        PlatformJS.prototype.request.call(host, 'get', '/test', null, function(responseData) {});
      }).toThrow(new PodioForbiddenError('Authentication has not been performed'));
    });

    it('should call addRequestData, addHeaders, addCORS with the request object and let them augment it', function() {
      var data = { data: true };

      PlatformJS.prototype.request.call(host, 'GET', '/test', data, function(responseData) {});

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

      PlatformJS.prototype.request.call(host, 'GET', '/test', null, callback);

      expect(request.end.calledOnce).toBe(true);
      expect(host._onResponse.calledOnce).toBe(true);
      expect(host._onResponse.getCall(0).args[0].resolve).toEqual(resolve);
      expect(host._onResponse.getCall(0).args[0].reject).toEqual(reject);
      expect(host._onResponse.getCall(0).args[0].callback).toEqual(callback);
    });

  });

  describe('_getHashParams', function() {

    it('should extract the auth token from the hash fragment correctly', function() {
      var host = {
        _getHash: sinon.stub().returns('#access_token=123&token_type=bearer&expires_in=12345&refresh_token=e443')
      };
      var expectedParams = {
        access_token: '123',
        token_type: 'bearer',
        expires_in: '12345',
        refresh_token: 'e443'
      };
      var params = PlatformJS.prototype.utils._getHashParams.call(host);

      expect(params).toEqual(expectedParams);
    });

    it('should return an empty object when no hash fragment is present', function() {
      var host = {
        _getHash: sinon.stub().returns('')
      };
      var params = PlatformJS.prototype.utils._getHashParams.call(host);

      expect(params).toEqual({});
    });

  });
  
  describe('_hasClientSideRedirect', function() {

    it('should return false for non client auth', function() {
      var host = {
        authType: 'server'
      };

      expect(PlatformJS.prototype._hasClientSideRedirect.call(host)).toBe(false);
    });
    
    it('should save access token if it is present in the hash fragment and return true', function() {
      var params = { access_token: 123 };
      var host = {
        authType: 'client',
        utils: {
          _getHashParams: sinon.stub().returns(params)
        },
        _onAccessTokenAcquired: sinon.stub()
      };

      expect(PlatformJS.prototype._hasClientSideRedirect.call(host)).toBe(true);
      expect(host._onAccessTokenAcquired.calledOnce).toBe(true);
      expect(host._onAccessTokenAcquired.getCall(0).args[0]).toEqual(params);
    });

    it('should not attempt to save the token and return false if no hash parameters are present in the client auth', function() {
      var host = {
        authType: 'client',
        utils: {
          _getHashParams: sinon.stub().returns({})
        },
        _onAccessTokenAcquired: sinon.stub()
      };

      expect(PlatformJS.prototype._hasClientSideRedirect.call(host)).toBe(false);
      expect(host._onAccessTokenAcquired.called).toBe(false);
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
      var host = {
        _refreshToken: sinon.stub().callsArg(0),
        request: sinon.stub(),
        authObject: {
          refreshToken: 'e123'
        }
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

      PlatformJS.prototype._handleTransportError.call(host, options, response);

      expect(host._refreshToken.calledOnce).toBe(true);
      expect(_.isFunction(host._refreshToken.getCall(0).args[0])).toBe(true);

      // verify bound arguments
      expect(host.request.getCall(0).args[0]).toEqual('GET');
      expect(host.request.getCall(0).args[1]).toEqual('/tasks');
      expect(host.request.getCall(0).args[2]).toEqual({});
      expect(host.request.getCall(0).args[3]).toEqual(options.callback);
      expect(host.request.getCall(0).args[4]).toEqual({ resolve: options.resolve, reject: options.reject });
    });
    
    it('should throw a PodioAuthorizationError if the 401 is not an expired token error and clear the current auth data', function() {
      var host = {
        _clearAuthentication: sinon.stub()
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
        PlatformJS.prototype._handleTransportError.call(host, options, response);
      }).toThrow(new PodioAuthorizationError(response.body, 401, '/tasks'));
      expect(host._clearAuthentication.calledOnce).toBe(true);
    });
    
    it('should throw a PodioAuthorizationError if the 401 is an invalid token error but the refresh token is missing', function() {
      var host = {
        _clearAuthentication: sinon.stub(),
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
        PlatformJS.prototype._handleTransportError.call(host, options, response);
      }).toThrow(new PodioAuthorizationError(response.body, 401, '/tasks'));
      expect(host._clearAuthentication.calledOnce).toBe(true);
    });

  });

});