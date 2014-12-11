var auth = require('../lib/auth');
var sinon = require('sinon');
var _ = require('lodash');

describe('auth', function() {

  describe('isAuthenticated', function() {

    it('should return true if authObject is populated', function() {
      var host = {
        authObject: {
          accessToken: 'adbcdegt'
        }
      };

      expect(auth.isAuthenticated.call(host)).toBe(true);
    });

    it('should call _hasClientSideRedirect and return false if no authObject exists', function() {
      var host = {
        _hasClientSideRedirect: sinon.stub().returns(false)
      };

      expect(auth.isAuthenticated.call(host)).toBe(false);
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

      auth.getAccessToken.apply(host, [authCode, redirectURL]);
      expect(host._authenticate.calledOnce).toBe(true);
      expect(host._authenticate.getCall(0).args[0]).toEqual(expectedResponseData);
    });

    it('should throw an exception if authType is not server', function() {
      var host = {
        authType: 'client'
      };

      expect(auth.getAccessToken.bind(host)).toThrow(new Error('In authentication types other than server access token is delivered through a redirect'));
    });

  });

  describe('getAuthorizationURL', function() {

    it('should return the correct authorization URL for the client auth', function() {
      var redirectURL = 'https://www.myapp.com/oauth';
      var utils = {
        _getDomain: sinon.stub().returns('podio.com')
      };
      var host = {
        _getUtils: sinon.stub().returns(utils),
        authType: 'client',
        clientId: 123
      };
      var expectedURL = 'https://podio.com/oauth/authorize?client_id=123&redirect_uri=https%3A%2F%2Fwww.myapp.com%2Foauth&response_type=token';

      expect(auth.getAuthorizationURL.call(host, redirectURL)).toEqual(expectedURL);
      expect(utils._getDomain.calledOnce).toBe(true);
    });

    it('should return the correct authorization URL for the server auth', function() {
      var redirectURL = 'https://www.myapp.com/oauth';
      var utils = {
        _getDomain: sinon.stub().returns('podio.com')
      };
      var host = {
        _getUtils: sinon.stub().returns(utils),
        authType: 'server',
        clientId: 123
      };
      var expectedURL = 'https://podio.com/oauth/authorize?client_id=123&redirect_uri=https%3A%2F%2Fwww.myapp.com%2Foauth&response_type=code';

      expect(auth.getAuthorizationURL.call(host, redirectURL)).toEqual(expectedURL);
    });

    it('should throw an error when retrieving an auth URL for password auth', function() {
      var redirectURL = 'https://www.myapp.com/oauth';
      var host = {
        utils: { _getDomain: sinon.stub().returns('podio.com') },
        authType: 'password',
        clientId: 123
      };
      var errorText = 'Authorization URLs are not supported for password authentication';

      expect(auth.getAuthorizationURL.bind(host, redirectURL)).toThrow(new Error(errorText));
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
      var utils = {
        _getDomain: sinon.stub().returns('podio.com')
      };
      var host = {
        _getUtils: sinon.stub().returns(utils),
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
      expect(host._authRequest.getCall(0).args[0]).toEqual('https://podio.com/oauth/token');
      expect(host._authRequest.getCall(0).args[1]).toEqual(expectedRequestData);
    });

  });

  describe('_onAuthResponse', function() {

    it('should call the callback with the body if response is ok', function() {
      var callback = sinon.stub();
      var url = 'https://api.podio.com:443/oauth/token';

      auth._onAuthResponse(callback, 'authorization_code', url, { ok: true, body: 'body' });

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
        auth._onAuthResponse(null, 'authorization_code', url, res);
      }).toThrow(new PodioAuthorizationError(errorMessage, 401, url));
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

      auth._refreshToken.call(host);

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

      auth._refreshToken.call(host, callbackFn);

      expect(host._onAccessTokenAcquired.calledOnce).toBe(true);
      expect(host._onAccessTokenAcquired.calledWithExactly(responseData, callbackFn)).toBe(true);
    });

  });

});