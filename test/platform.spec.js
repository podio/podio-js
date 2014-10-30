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
        apiURL: 'https://api.podio.com:443',
        authType: 'client',
        clientId: 123
      };
      var expectedURL = 'https://podio.com/oauth/authorize?client_id=123&redirect_uri=https%3A%2F%2Fwww.myapp.com%2Foauth&response_type=token';

      expect(PlatformJS.prototype.getAuthorizationURL.call(host, redirectURL)).toEqual(expectedURL);
    });

    it('should return the correct authorization URL for the server auth', function() {
      var redirectURL = 'https://www.myapp.com/oauth';
      var host = {
        apiURL: 'https://api.podio.com:443',
        authType: 'server',
        clientId: 123
      };
      var expectedURL = 'https://podio.com/oauth/authorize?client_id=123&redirect_uri=https%3A%2F%2Fwww.myapp.com%2Foauth&response_type=code';

      expect(PlatformJS.prototype.getAuthorizationURL.call(host, redirectURL)).toEqual(expectedURL);
    });

    it('should throw an error when retrieving an auth URL for password auth', function() {
      var redirectURL = 'https://www.myapp.com/oauth';
      var host = {
        apiURL: 'https://api.podio.com:443',
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

});