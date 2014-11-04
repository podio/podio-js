var express = require('express');
var router = express.Router();
var PlatformJS = require('../../../lib/PlatformJS');
var sessionStore = require('../sessionStore');

var clientId = '';      // your clientId here
var clientSecret = ''   // your clientSecret here;
var platform = new PlatformJS({ authType: 'server', clientId: clientId, clientSecret: clientSecret }, { sessionStore: sessionStore });

function getFullURL(req) {
  return req.protocol + '://' + req.get('host') + '/';
}

/* GET home page. */
router.get('/', function(req, res) {
  var authCode = req.query.code;
  var errorCode = req.query.error;
  var redirectURL = getFullURL(req);

  if (platform.isAuthenticated()) {
    // ready to make API calls
    res.render('success');
  } else {
    if (typeof authCode !== 'undefined') {
      platform.getAccessToken(authCode, redirectURL, function () {
        // we are ready to make API calls
        res.render('success');
      });
    } else if (typeof errorCode !== 'undefined') {
      // an error occured
      res.render('error', { description: req.query.error_description });
    } else {
      // we have neither an authCode nor have we authenticated before
      res.render('index', { authUrl: platform.getAuthorizationURL(redirectURL) });
    }
  }
});

module.exports = router;
