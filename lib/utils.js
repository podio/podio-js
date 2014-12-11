var _ = require('lodash');
var URI = require('URIjs');

module.exports = {
  _getHash: function() {
    return window.location.hash;
  },

  _getHashParams: function() {
    var queryString = {};

    this._getHash().substr(1).replace(
      new RegExp("([^?=&]+)(=([^&]*))?", "g"),
      function($0, $1, $2, $3) { queryString[$1] = $3; }
    );

    return queryString;
  },

  _validateAuthOptions: function(authOptions) {
    var props = ['authType', 'clientId'];
    var failedProp;

    if (_.isUndefined(authOptions)) {
      throw new Error('Authentication options are missing');
    }

    if (authOptions.authType !== 'client') {
      props.push('clientSecret');
    }

    failedProp = _.find(props, function(prop) { return _.isUndefined(authOptions[prop]); })

    if (failedProp) {
      throw new Error('Missing auth property ' + failedProp);
    }
  },

  _getDomain: function(apiURL) {
    return new URI(apiURL).domain();
  }
};