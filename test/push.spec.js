var pushLib = require('../lib/push');
var PodioErrors = require('../lib/PodioErrors');
var sinon = require('sinon');
var _ = require('lodash');

var Promise = require('es6-promise');
Promise = Promise.Promise; // unwrap

describe('push', function() {
  
  describe('_getFayeClient', function() {

    it('should correctly set and return the client', function(){

      var host = {
        apiUrl: 'https://api.podio.com'
      };

      var returnedClient = pushLib._getFayeClient.call(host);
      
      expect(_.isObject(host._fayeClient)).toBe(true);
      expect(_.isObject(returnedClient)).toBe(true);
      expect(returnedClient._endpoint).toEqual('https://push.podio.com/faye');
    });
  });

  describe('subscribe', function() {

    it ('should reject if authentication has not been performed', function(done) {

      var host = {
        _getAuth: sinon.stub().returns({
          isAuthenticated: sinon.stub().returns(false)
        })
      };
      
      var options = {
        timestamp: 1435054283,
        expires_in: 21600,
        channel: "/conversation/2256621",
        signature: "7d2018df16bd7686063483c8960124bc0a1bb0e2"
      };

      var subscription = pushLib.push.call(host, options).subscribe(new Function());

      subscription.catch(function(err) {
        expect(err).toEqual(new PodioErrors.PodioForbiddenError('Authentication has not been performed'));
        done();
      });
    });
  
    it ('should resolve if authentication has been performed', function() {

      var subscribeSpy = sinon.spy();
      
      var host = {
        _getFayeClient: sinon.stub().returns({
          subscribe: subscribeSpy
        }),
        
        _getAuth: sinon.stub().returns({
          isAuthenticated: sinon.stub().returns(true)
        })
      };

      var options = {
        timestamp: 1435054283,
        expires_in: 21600,
        channel: "/conversation/2256621",
        signature: "7d2018df16bd7686063483c8960124bc0a1bb0e2"
      };

      var handler = new Function();

      var subscription = pushLib.push.call(host, options).subscribe(handler);

      expect(subscribeSpy.calledWith(options.channel, handler)).toBe(true);
    });

  });
})