var _ = require('lodash');

var errors = {
  PodioBadRequestError: function(message, status, url) {
    this.message = message;
    this.status = status;
    this.url = url;
    this.name = 'PodioBadRequestError';
  },
  PodioAuthorizationError: function(message, status, url) {
    this.message = message;
    this.status = status;
    this.url = url;
    this.name = 'PodioAuthorizationError';
  },
  PodioForbiddenError: function(message, status, url) {
    this.message = message;
    this.status = status;
    this.url = url;
    this.name = 'PodioForbiddenError';
  },
  PodioNotFoundError: function(message, status, url) {
    this.message = message;
    this.status = status;
    this.url = url;
    this.name = 'PodioNotFoundError';
  },
  PodioConflictError: function(message, status, url) {
    this.message = message;
    this.status = status;
    this.url = url;
    this.name = 'PodioConflictError';
  },
  PodioGoneError: function(message, status, url) {
    this.message = message;
    this.status = status;
    this.url = url;
    this.name = 'PodioGoneError';
  },
  PodioRateLimitError: function(message, status, url) {
    this.message = message;
    this.status = status;
    this.url = url;
    this.name = 'PodioRateLimitError';
  },
  PodioServerError: function(message, status, url) {
    this.message = message;
    this.status = status;
    this.url = url;
    this.name = 'PodioServerError';
  },
  PodioUnavailableError: function(message, status, url) {
    this.message = message;
    this.status = status;
    this.url = url;
    this.name = 'PodioUnavailableError';
  },
  PodioError: function(message, status, url) {
    this.message = message;
    this.status = status;
    this.url = url;
    this.name = 'PodioError';
  }
};

_.each(errors, function(err, name) {
  err.prototype = new Error();
  // Node can't display instance properties properly,
  // so assign the name to the prototype
  err.prototype.name = name;
});

module.exports = errors;