var _ = require('lodash');
var URI = require('URIjs');
var Promise = require('es6-promise');
    Promise = Promise.Promise; // unwrap
var Faye = require('faye');
var PodioErrors = require('./PodioErrors');


module.exports = {

  subscriptionsData: [],

  _fayeExtensionOutgoing: function(message, callback) {
    
    if (message.channel == "/meta/subscribe") {
      // Attach the signature and timestamp to subscription messages
      var subscription = this.subscriptionsData[message.subscription];

      if (!message.ext) {
        message.ext = {};
      }

      if(subscription) {
        message.ext.private_pub_signature = subscription.signature;
        message.ext.private_pub_timestamp = subscription.timestamp;
      }

      debugger;
    }

    callback(message);
  },

  _fayeExtensionIncoming: function(message, callback) {
    // if (message.channel == "/meta/subscribe" && message.successful === false) {
    //   this.onSubscriptionError.apply(this, [Faye.Error.parse(message.error)]);
    // }

    callback(message);
  },

  _getFayeClient: function () {

    if (_.isUndefined(this._fayeClient)) {
      var pushUrl = new URI(this.apiURL).subdomain('push').path('faye').toString();
      this._fayeClient = this._fayeClient = new Faye.Client(pushUrl);

      // Add extensions to Faye client for authentication purposes
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

        // Make sure that user is authenticated
        if (!self._getAuth().isAuthenticated()) {
          return new Promise(function (resolve, reject) {
            reject(new PodioErrors.PodioForbiddenError('Authentication has not been performed'))
          });
        }

        // Perform subscription and return Faye Subscription Object
        return self._getFayeClient().subscribe(options.channel, handler);
      }
    }
  }
};