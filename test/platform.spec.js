describe('PlatformJS', function() {

  var PlatformJS = require('../lib/PlatformJS');
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
      var sessionStore = {};
      var instance;

      sinon.stub(PlatformJS.prototype, '_getAuthFromStore');

      instance = new PlatformJS(authOptions, { sessionStore: sessionStore });

      expect(instance._getAuthFromStore.calledOnce).toBe(true);

      PlatformJS.prototype._getAuthFromStore.restore();
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

    it('should set onTokenWillRefresh callback', function() {
      var authOptions = {
        authType: 'client',
        clientId: 123
      };
      var onTokenWillRefresh = function() {};

      var instance = new PlatformJS(authOptions, { onTokenWillRefresh: onTokenWillRefresh });

      expect(instance.onTokenWillRefresh).toEqual(onTokenWillRefresh);
    });

  });

});