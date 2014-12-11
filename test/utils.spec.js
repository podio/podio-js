var utils = require('../lib/utils');
var sinon = require('sinon');

describe('utils', function() {

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
      var params = utils._getHashParams.call(host);

      expect(params).toEqual(expectedParams);
    });

    it('should return an empty object when no hash fragment is present', function() {
      var host = {
        _getHash: sinon.stub().returns('')
      };
      var params = utils._getHashParams.call(host);

      expect(params).toEqual({});
    });

  });

  describe('_getDomain', function() {

    it('should extract the domain name from a URL', function() {
      expect(utils._getDomain('https://api.podio.com:443')).toEqual('podio.com');
    });

  });

});