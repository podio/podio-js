var URI = require('URIjs');
var _ = require('lodash');
var PodioErrors = require('./PodioErrors');

module.exports = {
  _getAuth: function() {
    // we have the auth object mixed in
    return this;
  },

  getThumbnailURLForFileLink: function(link, size) {
    var ALLOWED_SIZES = ['badge', 'extra_large', 'large', 'medium', 'small', 'tiny'];
    var uri = new URI(link);

    if (!this._getAuth().isAuthenticated()) {
      throw new PodioErrors.PodioForbiddenError('Authentication has not been performed');
    }

    if (!_.include(ALLOWED_SIZES, size)) {
      size = null;
    }

    if (size) {
      // append the size segment
      uri.segment(size);
    }

    return uri.setQuery('oauth_token', this.authObject.accessToken).toString();
  }
};
