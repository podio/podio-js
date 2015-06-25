var _ = require('lodash');
var URI = require('URIjs');
var Promise = require('es6-promise');
    Promise = Promise.Promise; // unwrap
var Faye = require('faye');
var PodioErrors = require('./PodioErrors');

Faye.MANDATORY_CONNECTION_TYPES = ['long-polling', 'cross-origin-long-polling', 'callback-polling'];

var subscriptionsData = {};

module.exports = {

  // Hook that is run for all outgoing messages:
  // Attaches signature information to outgoing 'subscribe' messages for authentication purposes
  _fayeExtensionOutgoing: function(message, callback) {
    if (message.channel == "/meta/subscribe") {
      var subscription = subscriptionsData[message.subscription];
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

  _fayeExtensionIncoming: function(message, callback) {
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
        outgoing: this._fayeExtensionOutgoing,
        incoming: this._fayeExtensionIncoming
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

        console.log(self._getAuth().isAuthenticated());

        // Make sure that user is authenticated
        if (!self._getAuth().isAuthenticated()) {
          return new Promise(function (resolve, reject) {
            reject(new PodioErrors.PodioForbiddenError('Authentication has not been performed'))
          });
        }

        subscriptionsData[options.channel] = options;

        // Perform subscription and return Faye Subscription Object
        return self._getFayeClient().subscribe(options.channel, handler);
      }
    }
  }
};