var OAuth = require('../lib/PodioOAuth');

describe('PodioOAuth', function() {

  describe('instantiation', function() {

    it('should throw error when `access_token` is not set', function() {
      expect(function () {
        new OAuth(void 0, 'refresh_token', 'expires_in');
      }).toThrow(new Error('Access token is missing'));
    });

    it('should throw error when `refresh_token` is not set', function() {
      expect(function () {
        new OAuth('access_token', void 0, 'expires_in');
      }).toThrow(new Error('Refresh token is missing'));
    });

    it('should throw error when `expires_in` is not set', function() {
      expect(function () {
        new OAuth('access_token', 'refresh_token', void 0);
      }).toThrow(new Error('Expiration timestamp is missing'));
    });

    it('should set instance properties', function() {
      var args = {
        accessToken: 'a123',
        refreshToken: 'b123',
        expiresIn: 4434,
        ref: {},
        transferToken: 'c123'
      };

      var oAuth = new OAuth(args.accessToken, args.refreshToken, args.expiresIn, args.ref, args.transferToken);

      expect(oAuth.accessToken).toEqual(args.accessToken);
      expect(oAuth.refreshToken).toEqual(args.refreshToken);
      expect(oAuth.expiresIn).toEqual(args.expiresIn);
      expect(oAuth.ref).toEqual(args.ref);
      expect(oAuth.transferToken).toEqual(args.transferToken);
    });

  });

});
