var Promise = require('es6-promise');
    Promise = Promise.Promise; // unwrap
var pushLib = require('../lib/push');
var PodioErrors = require('../lib/PodioErrors');
var sinon = require('sinon');
var _ = require('lodash');

var Promise = require('es6-promise');
Promise = Promise.Promise; // unwrap

describe('push', function() {
  
  describe('_getFayeClient', function() {

    it('should initialize, set and return client, when it hasn\'t yet been set', function() {

      var host = {
        apiURL: 'https://api.podio.com'
      };

      var returnedClient = pushLib._getFayeClient.call(host);
      
      expect(_.isObject(host._fayeClient)).toBe(true);
      expect(_.isObject(returnedClient)).toBe(true);
      expect(returnedClient._endpoint).toBe('https://push.podio.com/faye');
    });

    it('shouldn\'t re-initialize client. Rather return the existing, when already set', function() {

      var disableSpy = sinon.spy();
      var clientStub = sinon.stub().returns({
        disable: disableSpy
      });
      
      var host = {
        apiURL: 'https://api.podio.com',
        _fayeClient: clientStub
      };

      var returnedClient = pushLib._getFayeClient.call(host);
      
      expect(_.isObject(host._fayeClient)).toBe(true);
      expect(_.isObject(returnedClient)).toBe(true);
      expect(returnedClient).toBe(clientStub);
      expect(disableSpy.called).toBe(false);
    });
  });

  describe('_getSubscription/_setSubscription', function() {
    it('should correctly get and set subscriptions', function() {

      var message = {
        channel: 'my/test/channel',
        timestamp: 1234,
        signature: 'myTestSignature'
      };

      pushLib._setSubscription(message.channel, message);

      expect(_.isObject(pushLib._getSubscription(message.channel))).toBe(true);
      expect(pushLib._getSubscription(message.channel)).toBe(message);
    });
  });

  describe('_fayeExtensionOutgoing', function () {

    it('should attach signature and timestamp to outgoing \'meta/subscribe\' messages', function() {

      var callbackSpy = sinon.spy();

      var message = {
        channel: '/meta/subscribe',
        signature: 'myTestSignature',
        timestamp: 123456789
      };

      var host = {
        _getSubscription: sinon.stub().returns(message)
      };

      pushLib._fayeExtensionOutgoing.call(host, message, callbackSpy);

      expect(callbackSpy.calledWithExactly({
        channel: message.channel,
        signature: message.signature,
        timestamp: message.timestamp,
        ext: {
          private_pub_signature: message.signature,
          private_pub_timestamp: message.timestamp
        }
      })).toBe(true);
    });

    it('shouldn\'t attach signature info to non-/meta/subscribe messages', function() {

      callbackSpy = sinon.spy();

      var message = {
        channel: 'some/other/channel',
        timestamp: 123456789,
        signature: 'myTestSignature'
      };

      pushLib._fayeExtensionOutgoing(message, callbackSpy);

      expect(callbackSpy.calledWithExactly(message));
    });
  })

  describe('subscribe', function() {

    it ('should reject if authentication has not been performed', function(done) {

      var host = {
        _getAuth: sinon.stub().returns({
          isAuthenticated: sinon.stub().returns(Promise.reject())
        })
      };
      
      var options = {
        timestamp: 1435054283,
        expires_in: 21600,
        channel: "/conversation/2256621",
        signature: "7d2018df16bd7686063483c8960124bc0a1bb0e2"
      };

      var subscription = pushLib.push.call(host, options).subscribe(new Function());

      subscription.then(function(){
        // Should not be called
        expect('Authentication should not pass').toBe(false);
      }).catch(function(err) {
        done();
      });

    });
  
    it ('should resolve if authentication has been performed', function() {

      var subscribeSpy = sinon.spy();
      var setSubscriptionSpy = sinon.spy();
      
      var host = {
        _getFayeClient: sinon.stub().returns({
          subscribe: subscribeSpy
        }),
        _setSubscription: setSubscriptionSpy,
        _getAuth: sinon.stub().returns({
          isAuthenticated: sinon.stub().returns(Promise.resolve())
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

      subscription.then(function() {
        // Assert that the Faye client is properly subscribed to
        expect(subscribeSpy.calledWith(options.channel, handler)).toBe(true);
        expect(setSubscriptionSpy.called).toBe(true);
      }).catch(function(err) {
        expect(String(err)).toBe(null);
      });
    });
  });
})