var express = require('express');
var router = express.Router();
var PlatformJS = require('../../../lib/PlatformJS');
var sessionStore = require('../sessionStore');

var clientId = '';       // your clientId here
var clientSecret = '';   // your clientSecret here;
var username = '';       // your username here;
var password = '';       // your password here
var platform = new PlatformJS({ authType: 'password', clientId: clientId, clientSecret: clientSecret }, { sessionStore: sessionStore });

/* GET home page. */
router.get('/', function(req, res) {
  if (platform.isAuthenticated()) {
    // ready to make API calls
    res.render('success');
  } else {
    try {
      platform.authenticateWithCredentials(username, password, function() {
        // we are ready to make API calls
        res.render('success');
      });
    } catch(e) {
      res.render('error', { description: e.message });
    }
  }
});

router.get('/user', function(req, res) {
  if (platform.isAuthenticated()) {
    platform.request('get', '/user/status', null, function(responseData) {
      res.render('user', { profile: responseData.profile });
    });
  } else {
    res.send(401);
  }
});

module.exports = router;
