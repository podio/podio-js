var PodioErrors = require('../lib/PodioErrors');
var auth = require('../lib/auth');
var sinon = require('sinon');
var _ = require('lodash');

describe('auth', function() {

  describe('isAuthenticated', function() {

    it('should resolve if authObject is populated', function(done) {
      var host = {
        authObject: {
          accessToken: 'adbcdegt'
        },
        refreshAuthFromStore: sinon.spy(function (callback) {
          callback()
        })
      };

      auth.isAuthenticated.call(host).then(function () {
        done();
      });
    });

    it('should reject if authObject is populated', function(done) {
      var host = {
        authObject: void 0,
        refreshAuthFromStore: sinon.spy(function (callback) {
          callback()
        })
      };

      auth.isAuthenticated.call(host).catch(function () {
        done();
      });
    });

    it('should call _hasClientSideRedirect and reject if no authObject exists', function(done) {
      var host = {
        refreshAuthFromStore: sinon.spy(function (callback) {
          callback()
        }),
        _hasClientSideRedirect: sinon.stub().returns(false)
      };

      auth.isAuthenticated.call(host).catch(function () {
        expect(host._hasClientSideRedirect.calledOnce).toBe(true);

        done();
      });
    });

    it('should call refreshAuthFromStore if a callback is provided', function() {
      var host = {
        refreshAuthFromStore: sinon.stub().returns(false)
      };
      var callback = sinon.stub();

      auth.isAuthenticated.call(host, callback);
      expect(_.isFunction(callback)).toBe(true);
      expect(host.refreshAuthFromStore.calledOnce).toBe(true);
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

      auth.getAccessToken.apply(host, [authCode, redirectURL]);
      expect(host._authenticate.calledOnce).toBe(true);
      expect(host._authenticate.getCall(0).args[0]).toEqual(expectedResponseData);
    });

    it('should throw an exception if authType is not server', function() {
      var host = {
        authType: 'client'
      };

      var callback = sinon.stub();

      auth.getAccessToken.call(host, 'e123', 'http://redirect.url/', callback);

      var expectedError = new Error('In authentication types other than server access token is delivered through a redirect');

      expect(_.isFunction(callback)).toBe(true);
      expect(callback.calledOnce).toBe(true);
      expect(callback.getCall(0).args[0]).toEqual(expectedError);
    });

  });

  describe('setAccessToken', function() {

    it('should set the OAuth object', function() {
      var host = {};

      var responseData = {
        access_token: 'a123',
        refresh_token: 'b123',
        expires_in: 4434,
        ref: {},
        transfer_token: 'c123'
      };

      auth.setAccessToken.call(host, responseData);

      expect(host.authObject).not.toEqual(void 0);
      expect(host.authObject.accessToken).toEqual(responseData.access_token);
      expect(host.authObject.refreshToken).toEqual(responseData.refresh_token);
      expect(host.authObject.expiresIn).toEqual(responseData.expires_in);
      expect(host.authObject.ref).toEqual(responseData.ref);
      expect(host.authObject.transferToken).toEqual(responseData.transfer_token);
    });

  });

  describe('getAuthorizationURL', function() {

    it('should return the correct authorization URL for the client auth', function() {
      var redirectURL = 'https://www.myapp.com/oauth';
      var host = {
        apiURL: 'https://api.podio.com',
        authType: 'client',
        clientId: 123
      };
      
      var expectedURL = 'https://podio.com/oauth/authorize?client_id=123&redirect_uri=https%3A%2F%2Fwww.myapp.com%2Foauth&response_type=token';
      
      expect(auth.getAuthorizationURL.call(host, redirectURL)).toBe(expectedURL);
    });

    it('should return the correct authorization URL for the server auth', function() {
      var redirectURL = 'https://www.myapp.com/oauth';
      
      var host = {
        apiURL: 'https://podio.com',
        authType: 'server',
        clientId: 123
      };
      var expectedURL = 'https://podio.com/oauth/authorize?client_id=123&redirect_uri=https%3A%2F%2Fwww.myapp.com%2Foauth&response_type=code';

      expect(auth.getAuthorizationURL.call(host, redirectURL)).toBe(expectedURL);
    });

    it('should throw an error when retrieving an auth URL for password auth', function() {
      var redirectURL = 'https://www.myapp.com/oauth';
      var host = {
        authType: 'password',
        clientId: 123
      };
      var errorText = 'Authorization URLs are not supported for password authentication';

      expect(auth.getAuthorizationURL.bind(host, redirectURL)).toThrow(new Error(errorText));
    });

  });

  describe('authenticateWithCredentialsForOffering', function() {

    it('should call authenticate with credentials and the correct grant type', function() {
      var host = {
        _authenticate: sinon.stub()
      };
      var username = 'user@podio.com';
      var password = 'password';
      var expected = {
        grant_type: 'password',
        username: username,
        password: password
      };

      auth.authenticateWithCredentialsForOffering.call(host, username, password);

      expect(host._authenticate.calledOnce).toBe(true);
      expect(host._authenticate.getCall(0).args[0]).toEqual(expected);
      expect(_.isFunction(host._authenticate.getCall(0).args[1])).toBe(true);
    });

    it('should call onAccessTokenAcquired with correct parameters when authentication succeeds', function() {
      var responseData = {};
      var host = {
        _authenticate: sinon.stub().callsArgWith(1, null, responseData),
        _onAccessTokenAcquired: sinon.stub()
      };
      var username = 'user@podio.com';
      var password = 'password';
      var callback = function() {};

      auth.authenticateWithCredentialsForOffering.call(host, username, password, null, callback);

      expect(host._onAccessTokenAcquired.calledOnce).toBe(true);
      expect(host._onAccessTokenAcquired.calledWithExactly(responseData, callback)).toBe(true);
    });

  });

  describe('authenticateWithApp', function() {

    it('should call _authenticate with appId, appToken and correct grand type', function() {
      var host = {
        _authenticate: sinon.stub()
      };
      var expectedData = {
        grant_type: 'app',
        app_id: 123,
        app_token: 'e123'
      };

      auth.authenticateWithApp.call(host, 123, 'e123');

      expect(host._authenticate.calledOnce).toBe(true);
      expect(host._authenticate.getCall(0).args[0]).toEqual(expectedData);
    });

    it('should call _onAccessTokenAcquired with responseData and callback when auth is completed', function() {
      var authData = { access_token: 'a321' };
      var callback = function() {};
      var host = {
        _authenticate: sinon.stub().callsArgWith(1, null, authData),
        _onAccessTokenAcquired: sinon.stub()
      };

      auth.authenticateWithApp.call(host, 123, 'e123', callback);

      expect(host._onAccessTokenAcquired.calledOnce).toBe(true);
      expect(host._onAccessTokenAcquired.calledWithExactly(authData, callback)).toBe(true);
    });

    it('should not call _onAccessTokenAcquired when auth failed and call the callback', function() {
      var callback = sinon.stub();
      var err = new Error();
      var host = {
        _authenticate: sinon.stub().callsArgWith(1, err),
        _onAccessTokenAcquired: sinon.stub()
      };

      auth.authenticateWithApp.call(host, 123, 'e123', callback);

      expect(host._onAccessTokenAcquired.called).toBe(false);
      expect(callback.called).toBe(true);
      expect(callback.calledWithExactly(err)).toBe(true);
    });

  });

  describe('_getAuthFromStore', function() {

    it('should get auth data from the session store and store it in memory', function() {
      var authObject = { accessToken: 'e123' };
      var callback = sinon.stub();

      var host = {
        sessionStore: { get: sinon.stub().callsArgWith(1, authObject) },
        authType: 'client'
      };

      auth._getAuthFromStore.call(host, callback);

      expect(host.sessionStore.get.calledOnce).toBe(true);
      expect(host.sessionStore.get.getCall(0).args[0]).toEqual(host.authType);
      expect(_.isFunction(host.sessionStore.get.getCall(0).args[1])).toBe(true);
      expect(host.authObject).toEqual(authObject);
      expect(callback.calledOnce).toBe(true);
    });

    it('should call the callback function if provided', function() {
      var authObject = { accessToken: 'e123' };
      var host = {
        sessionStore: { get: sinon.stub().callsArgWith(1, authObject) },
        authType: 'client'
      };
      var callback = sinon.stub();

      auth._getAuthFromStore.call(host, callback);

      expect(_.isFunction(callback)).toBe(true);
      expect(callback.calledOnce).toBe(true);
    });

    it('should not call callback if not specified and get auth data from the session store and store it in memory', function() {
      var authObject = { accessToken: 'e123' };

      var host = {
        sessionStore: { get: sinon.stub().callsArgWith(1, authObject) },
        authType: 'client'
      };

      auth._getAuthFromStore.call(host);

      expect(host.sessionStore.get.calledOnce).toBe(true);
      expect(host.sessionStore.get.getCall(0).args[0]).toEqual(host.authType);
      expect(_.isFunction(host.sessionStore.get.getCall(0).args[1])).toBe(true);
      expect(host.authObject).toEqual(authObject);
    });

  });

  describe('_hasClientSideRedirect', function() {

    it('should return false for non client auth', function() {
      var host = {
        authType: 'server'
      };

      expect(auth._hasClientSideRedirect.call(host)).toBe(false);
    });

    it('should save access token if it is present in the hash fragment and return true', function() {
      var params = { access_token: 123 };
      var utils = {
        _getHashParams: sinon.stub().returns(params)
      };
      var host = {
        authType: 'client',
        _getUtils: sinon.stub().returns(utils),
        _onAccessTokenAcquired: sinon.stub()
      };

      expect(auth._hasClientSideRedirect.call(host)).toBe(true);
      expect(host._onAccessTokenAcquired.calledOnce).toBe(true);
      expect(host._onAccessTokenAcquired.getCall(0).args[0]).toEqual(params);
    });

    it('should not attempt to save the token and return false if no hash parameters are present in the client auth', function() {
      var utils = {
        _getHashParams: sinon.stub().returns({})
      };
      var host = {
        authType: 'client',
        _getUtils: sinon.stub().returns(utils),
        _onAccessTokenAcquired: sinon.stub()
      };

      expect(auth._hasClientSideRedirect.call(host)).toBe(false);
      expect(host._onAccessTokenAcquired.called).toBe(false);
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

      auth._onAccessTokenAcquired.call(host, responseData, function() {});

      expect(host.authObject).toEqual(oAuthObject);
    });

    it('should save an authObject in the session store and provide a callback', function() {
      var host = {
        sessionStore: {
          set: sinon.stub()
        },
        authType: 'client'
      };

      auth._onAccessTokenAcquired.call(host, responseData, function() {});

      expect(host.sessionStore.set.calledOnce).toBe(true);
      expect(host.sessionStore.set.getCall(0).args[0]).toEqual(oAuthObject);
      expect(host.sessionStore.set.getCall(0).args[1]).toEqual('client');
      expect(_.isFunction(host.sessionStore.set.getCall(0).args[2])).toBe(true);
    });

    it('should call the callback if no session store is provided', function() {
      var callback = sinon.stub();
      var host = {};

      auth._onAccessTokenAcquired.call(host, responseData, callback);

      expect(callback.calledOnce).toBe(true);
      expect(callback.getCall(0).args[0]).toEqual(null);
      expect(callback.getCall(0).args[1]).toEqual(responseData);
    });

    it('should not fail trying to call the callback if none is provided', function() {
      var host = {};

      auth._onAccessTokenAcquired.call(host, responseData);

      expect(true).toBe(true);
    });

  });

  describe('_clearAuthentication', function() {

    it('should remove the authObject and call sessionStore with an empty auth object', function() {
      var host = {
        authObject: {},
        authType: 'client',
        sessionStore: { set: sinon.stub() }
      };

      auth._clearAuthentication.call(host);

      expect(host.authObject).toBeUndefined();
      expect(host.sessionStore.set.calledOnce).toBe(true);
      expect(host.sessionStore.set.calledWithExactly({}, 'client')).toBe(true);
    });

  });

  describe('_authenticate', function() {

    it('should construct the request data and url correctly', function() {
      var host = {
        apiURL: 'http://sub.podio.com',
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

      auth._authenticate.call(host, requestData);

      expect(host._authRequest.calledOnce).toBe(true);
      expect(host._authRequest.getCall(0).args[0]).toEqual('http://sub.podio.com/oauth/token');
      expect(host._authRequest.getCall(0).args[1]).toEqual(expectedRequestData);
    });
  });

  describe('_onAuthResponse', function() {

    it('should call the callback with the body if response is ok', function() {
      var callback = sinon.stub();
      var url = 'https://api.podio.com:443/oauth/token';

      auth._onAuthResponse(callback, 'authorization_code', url, null, { ok: true, body: 'body' });

      expect(callback.calledOnce).toBe(true);
      expect(callback.calledWithExactly(null, 'body')).toBe(true);
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

      var response = {
        ok: false,
        body: { error_description: '42' },
        status: 401
      };

      var callback = sinon.stub();
      auth._onAuthResponse(callback, 'authorization_code', url, new PodioAuthorizationError(errorMessage, 401, url), response);

      expect(callback.calledOnce).toBe(true);
      expect(callback.calledWithExactly(new PodioAuthorizationError(errorMessage, 401, url), void 0)).toBe(true);
    });

  });

  describe('_refreshToken', function() {

    it('should call authenticate with the refresh token, clear previous authentication', function() {
      var host = {
        authObject: {
          refreshToken: 123
        },
        _authenticate: sinon.stub(),
        _clearAuthentication: sinon.stub()
      };
      var expectedOptions = {
        grant_type: 'refresh_token',
        refresh_token: 123
      };

      auth._refreshToken.call(host);

      expect(host._authenticate.calledOnce).toBe(true);
      expect(host._authenticate.getCall(0).args[0]).toEqual(expectedOptions);
      expect(host._clearAuthentication.calledOnce).toBe(true);
    });

    it('should call _onAccessTokenAcquired when authentication is done', function() {
      var callbackFn = function() {};
      var responseData = { accessToken: 123 };
      var host = {
        authObject: {
          refreshToken: 123
        },
        _authenticate: function(requestData, callback) {
          callback(null, responseData);
        },
        _onAccessTokenAcquired: sinon.stub(),
        _clearAuthentication: sinon.stub()
      };

      auth._refreshToken.call(host, callbackFn);

      expect(host._onAccessTokenAcquired.calledOnce).toBe(true);
      expect(host._onAccessTokenAcquired.calledWithExactly(responseData, callbackFn)).toBe(true);
    });

    it('should call an onTokenWillRefresh callback if present and client side authentication is chosen', function() {
      var callbackFn = function() {};
      var host = {
        authObject: {},
        _clearAuthentication: function() {},
        authType: 'client',
        onTokenWillRefresh: sinon.stub(),
        _onAccessTokenAcquired: sinon.stub(),
        _authenticate: sinon.stub()
      };

      auth._refreshToken.call(host, callbackFn);

      expect(host.onTokenWillRefresh.calledOnce).toBe(true);
      expect(host.onTokenWillRefresh.calledWithExactly(callbackFn)).toBe(true);
      expect(host._authenticate.called).toBe(false);
      expect(host._onAccessTokenAcquired.called).toBe(false);
    });

  });

});
