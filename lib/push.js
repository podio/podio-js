var _ = require('lodash');
var URI = require('URIjs');
var Promise = require('es6-promise');
    Promise = Promise.Promise; // unwrap
var Faye = require('faye');
var PodioErrors = require('./PodioErrors');

Faye.MANDATORY_CONNECTION_TYPES = ['long-polling', 'cross-origin-long-polling', 'callback-polling'];

var subscriptionsData = {};

module.exports = {

  _getSubscription: function (channel) {
    return subscriptionsData[channel];
  },

  _setSubscription: function (channel, subscription) {
    subscriptionsData[channel] = subscription;
  },

  // Hook that is run for all outgoing messages:
  // Attaches signature information to outgoing 'subscribe' messages for authentication purposes
  _fayeExtensionOutgoing: function(message, callback) {
    if (message.channel == "/meta/subscribe") {
      var subscription = this._getSubscription(message.subscription);
      if (!message.ext) {
        message.ext = {};
      }

      if(subscription) {
        message.ext.private_pub_signature = subscription.signature;
        message.ext.private_pub_timestamp = subscription.timestamp;
      }
    }
    callback(message);
  },

  // Returns a reference to the Faye client and initializes it if needed
  _getFayeClient: function () {
    
    // Initialize the Faye client if it hasn't been initialized
    if (_.isUndefined(this._fayeClient)) {
     
      var pushUrl = new URI(this.apiURL).subdomain('push').path('faye').toString();
     
      this._fayeClient = this._fayeClient = new Faye.Client(pushUrl);
      
      // We don't support websockets
      this._fayeClient.disable('websocket');
      
      // Add extensions to Faye client
      this._fayeClient.addExtension({
        outgoing: this._fayeExtensionOutgoing
      });
    }

    return this._fayeClient;
  },

  // 'options' should be the 'body.push' object 
  // from the body of a api.request() response
  push: function(options) {

    var self = this;

    return {
      subscribe: function (handler) {
        return self._getAuth().isAuthenticated()
        .then(function() {

          self._setSubscription(options.channel, options);

          // Perform subscription and return Faye Subscription Object
          return self._getFayeClient().subscribe(options.channel, handler);
        });
      }
    }
  }
};