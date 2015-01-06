var general = require('../lib/general');
var PodioErrors = require('../lib/PodioErrors');
var sinon = require('sinon');
var _ = require('lodash');

describe('general', function() {
  
  describe('getThumbnailURLForFileLink', function() {

    beforeEach(function() {
      this.auth = {
        isAuthenticated: sinon.stub().returns(true)
      };
      this.host = {
        _getAuth: sinon.stub().returns(this.auth),
        authObject: { accessToken: '12345' }
      };
      this.url = 'https://files.podio.com/140156539';
    });
    
    it('should add an auth token to the given URL', function() {
      var result = general.getThumbnailURLForFileLink.call(this.host, this.url);

      expect(this.auth.isAuthenticated.calledOnce).toBe(true);
      expect(result).toEqual('https://files.podio.com/140156539?oauth_token=12345');
    });

    it('should add a size if it is provided', function() {
      var result = general.getThumbnailURLForFileLink.call(this.host, this.url, 'tiny');

      expect(result).toEqual('https://files.podio.com/140156539/tiny?oauth_token=12345');
    });

    it('should fallback to full size if invalid size is provided', function() {
      var result = general.getThumbnailURLForFileLink.call(this.host, this.url, 'invalid');

      expect(result).toEqual('https://files.podio.com/140156539?oauth_token=12345');
    });

    it('should throw an error if authentication has not happened', function() {
      this.auth.isAuthenticated = sinon.stub().returns(false);

      expect(general.getThumbnailURLForFileLink.bind(this.host, this.url)).toThrow(new PodioErrors.PodioForbiddenError('Authentication has not been performed'));
    });
    
  });
  
});