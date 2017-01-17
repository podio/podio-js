describe('podio-js', function() {

  var PodioJS = require('../lib/podio-js');
  var sinon = require('sinon');
  
  describe('constructor', function() {

    it('should have version property', function() {
      var authOptions = {
        authType: 'client',
        clientId: 123,
      };
      var instance = new PodioJS(authOptions);

      expect(instance.VERSION).toEqual(require('../package.json').version);
    });

    it('should set auth data correctly', function() {
      var authOptions = {
        authType: 'server',
        clientId: 123,
        clientSecret: 'abcdef'
      };
      var instance = new PodioJS(authOptions);

      expect(instance.authType).toEqual(authOptions.authType);
      expect(instance.clientId).toEqual(authOptions.clientId);
      expect(instance.clientSecret).toEqual(authOptions.clientSecret);
    });

    it('should throw an exception if one of the auth properties is missing', function() {
      expect(function() { new PodioJS(); }).toThrow(new Error('Authentication options are missing'));
      expect(function() { new PodioJS({}); }).toThrow(new Error('Missing auth property authType'));
      expect(function() { new PodioJS({ authType: 'client' }); }).toThrow(new Error('Missing auth property clientId'));
      expect(function() { new PodioJS({ authType: 'server', clientId: 123 }); }).toThrow(new Error('Missing auth property clientSecret'));
    });

    it('should not throw an exception if clientSecret is missing for a client auth', function() {
      var instance = new PodioJS({ authType: 'client', clientId: 123 });

      expect(instance).toBeDefined();
    });

    it('should set the API URL to default', function() {
      var authOptions = {
        authType: 'client',
        clientId: 123
      };
      var instance = new PodioJS(authOptions);

      expect(instance.apiURL).toEqual('https://api.podio.com:443');
    });

    it('should set the API URL to the one provided in options', function() {
      var authOptions = {
        authType: 'client',
        clientId: 123
      };
      var apiURL = 'https://api2.podio.com';
      var instance = new PodioJS(authOptions, { apiURL: apiURL});

      expect(instance.apiURL).toEqual(apiURL);
    });

    it('should get the authObject from the session store when one is provided', function() {
      var authOptions = {
        authType: 'client',
        clientId: 123
      };
      var sessionStore = {};
      var instance;

      sinon.stub(PodioJS.prototype, 'refreshAuthFromStore');

      instance = new PodioJS(authOptions, { sessionStore: sessionStore });

      expect(instance.refreshAuthFromStore.calledOnce).toBe(true);

      PodioJS.prototype.refreshAuthFromStore.restore();
    });

    it('should still set the apiURL to default when a session store is provided', function() {
      var authOptions = {
        authType: 'client',
        clientId: 123
      };
      var sessionStore = {
        get: sinon.stub().returns({ accessToken: 123 })
      };
      var instance = new PodioJS(authOptions, { sessionStore: sessionStore });

      expect(instance.apiURL).toEqual('https://api.podio.com:443');
    });

    it('should set onTokenWillRefresh callback', function() {
      var authOptions = {
        authType: 'client',
        clientId: 123
      };
      var onTokenWillRefresh = function() {};

      var instance = new PodioJS(authOptions, { onTokenWillRefresh: onTokenWillRefresh });

      expect(instance.onTokenWillRefresh).toEqual(onTokenWillRefresh);
    });

    it('should set afterTokenRefreshed callback', function() {
      var authOptions = {
        authType: 'client',
        clientId: 123
      };
      var afterTokenRefreshed = function() {};

      var instance = new PodioJS(authOptions, { afterTokenRefreshed: afterTokenRefreshed });

      expect(instance.afterTokenRefreshed).toEqual(afterTokenRefreshed);
    });

    it('should no include Push Service functionality by default', function() {

      var authOptions = {
        authType: 'client',
        clientId: 123
      };

      var instance = new PodioJS(authOptions);

      expect(instance.push).toBeUndefined();
      expect(instance._getFayeClient).toBeUndefined();
    });

    it('should include Push Service functionality when .enablePushService is true', function() {

      var authOptions = {
        authType: 'client',
        clientId: 123
      };

      var options = {
        enablePushService: true
      };

      var instance = new PodioJS(authOptions, options);

      expect(instance.push).toBeDefined();
      expect(instance._getFayeClient).toBeDefined();
    });
  });
});
