var _ = require('lodash');
var URI = require('URIjs');
var Promise = require('es6-promise');
    Promise = Promise.Promise; // unwrap
var Faye = require('faye');
var PodioErrors = require('./PodioErrors');

module.exports = {

  _getFayeClient: function () {

    if (_.isUndefined(this._fayeClient)) {
      var pushUrl = new URI(this.apiUrl).subdomain('push').path('faye').toString();
      this._fayeClient = this._fayeClient = new Faye.Client(pushUrl);
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