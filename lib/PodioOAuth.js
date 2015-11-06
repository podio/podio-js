var _ = require('lodash');

module.exports = function(accessToken, refreshToken, expiresIn, ref, transferToken, scope) {
  if (_.isUndefined(accessToken)) {
    throw new Error('Access token is missing');
  }

  if (_.isUndefined(refreshToken)) {
    throw new Error('Refresh token is missing');
  }

  if (_.isUndefined(expiresIn)) {
    throw new Error('Expiration timestamp is missing');
  }

  this.accessToken = accessToken;
  this.refreshToken = refreshToken;
  this.expiresIn = expiresIn;
  this.ref = ref;
  this.transferToken = transferToken;
  this.scope = scope;
};
