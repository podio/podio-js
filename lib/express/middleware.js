var Podio = require('../podio-js');

module.exports = function (opts) {
  return function podioMiddleware(req, res, next) {
    var client = new Podio({
      authType: opts.authType || 'server',
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,
      projectId: opts.projectId
    }, {
      apiURL: opts.apiURL || 'https://api.podio.com',
      afterTokenRefreshed: function (user) {
        if (req.session) {
          req.session.user = user;
        }
      }
    });

    if (req.session && req.session.user) {
      client.setAccessToken(req.session.user);
    }

    req.session.podio = client;

    next();
  };
};
