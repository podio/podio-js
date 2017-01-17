var _ = require('lodash');
var URI = require('URIjs');
var Promise = require('es6-promise');
    Promise = Promise.Promise; // unwrap
var Faye = require('faye');
var PodioErrors = require('./PodioErrors');

module.exports = {

  // Returns a reference to the Faye client and initializes it if needed
  _getFayeClient: function (options) {
    
    // Initialize the Faye client if it hasn't been initialized
    if (_.isUndefined(this._fayeClient)) {
     
      var pushUrl = new URI(this.apiURL).subdomain('push').path('faye').toString();
     
      this._fayeClient = new Faye.Client(pushUrl);
      
      // We don't support websockets
      this._fayeClient.disable('websocket');

      // Add extensions to Faye client
      this._fayeClient.addExtension({
        'outgoing': function(message, callback) {
          message.ext = message.ext || {};
          message.ext = {
            private_pub_signature: options.signature,
            private_pub_timestamp: options.timestamp
          };
          callback(message);
        }
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
          // Perform subscription and return Faye Subscription Object
          return self._getFayeClient(options).subscribe(options.channel, handler);
        });
      }
    }
  }
};
