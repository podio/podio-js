describe('PlatformJS', function() {

  var PlatformJS = require('../lib/PlatformJS');
  var _ = require('underscore');
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
        get: sinon.stub().returns({ accessToken: 123 })
      };
      var instance = new PlatformJS(authOptions, { sessionStore: sessionStore });

      expect(sessionStore.get.calledOnce).toBe(true);
      expect(sessionStore.get.calledWithExactly('client')).toBe(true);
      expect(instance.authObject.accessToken).toEqual(123);
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

    it('should return false if no authObject exists', function() {
      var host = {};

      expect(PlatformJS.prototype.isAuthenticated.call(host)).toBe(false);
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
        redirect_url: redirectURL
      };

      PlatformJS.prototype.getAccessToken.apply(host, [authCode, redirectURL]);
      expect(host._authenticate.calledOnce).toBe(true);
      expect(host._authenticate.getCall(0).args[0]).toEqual(expectedResponseData);
    });

    it('should call the callback and onAccessTokenAcquired when auth request has finished', function() {
      var responseData = { accessToken: 123 };
      var host = {
        authType: 'server',
        _authenticate: function(requestData, callback) { callback(responseData); },
        _onAccessTokenAcquired: sinon.stub()
      };
      var callback = sinon.stub();

      PlatformJS.prototype.getAccessToken.apply(host, ['e123', 'https://www.myapp.com/oauth', callback]);
      expect(host._onAccessTokenAcquired.calledOnce).toBe(true);
      expect(host._onAccessTokenAcquired.calledWithExactly(responseData)).toBe(true);
      expect(callback.calledOnce).toBe(true);
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

      PlatformJS.prototype._onAccessTokenAcquired.call(host, responseData);

      expect(host.authObject).toEqual(oAuthObject);
    });

    it('should save an authObject in the session store', function() {
      var host = {
        sessionStore: {
          set: sinon.stub()
        },
        authType: 'client'
      };

      PlatformJS.prototype._onAccessTokenAcquired.call(host, responseData);

      expect(host.sessionStore.set.calledOnce).toBe(true);
      expect(host.sessionStore.set.getCall(0).args[0]).toEqual(oAuthObject);
      expect(host.sessionStore.set.getCall(0).args[1]).toEqual('client');
    });

  });

  describe('utils._getDomain', function() {

    it('should extract the domain name from a URL', function() {
      var host = {
        apiURL: 'https://api.podio.com:443'
      };

      expect(PlatformJS.prototype.utils._getDomain.call(host)).toEqual('podio.com');
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

      PlatformJS.prototype._onAuthResponse(callback, 'authorization_code', { ok: true, body: 'body' });

      expect(callback.calledOnce).toBe(true);
      expect(callback.calledWithExactly('body')).toBe(true);
    });

    it('should raise an exception if authentication failed', function() {
      var errorMessage = 'Authentication for authorization_code failed';

      expect(function() {
        PlatformJS.prototype._onAuthResponse(null, 'authorization_code', { ok: false });
      }).toThrow(new Error(errorMessage));
    });

  });

});