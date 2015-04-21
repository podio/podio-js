var express = require('express');
var domain = require('domain');
var router = express.Router();
var PodioJS = require('../../../lib/podio-js');
var sessionStore = require('../sessionStore');

var clientId = '';       // your clientId here
var clientSecret = '';   // your clientSecret here;
var username = '';       // your username here;
var password = '';       // your password here
var podio = new PodioJS({ authType: 'password', clientId: clientId, clientSecret: clientSecret }, { sessionStore: sessionStore });

/* GET home page. */
router.get('/', function(req, res) {
  if (podio.isAuthenticated()) {
    // ready to make API calls
    res.render('success');
  } else {
    var reqdomain = domain.create();

    reqdomain.on('error', function(e) {
      console.log('Error:', e.name);
      console.log('Error description:', e.message.error_description);
      console.log('HTTP status:', e.status);
      console.log('Requested URL:', e.url);

      res.render('error', { description: e.message });
    });

    reqdomain.run(function() {
      podio.authenticateWithCredentialsForOffering(username, password, null, function() {
        // we are ready to make API calls
        res.render('success');
      });
    });
  }
});

router.get('/user', function(req, res) {
  if (podio.isAuthenticated()) {
    podio.request('get', '/user/status', null, function(responseData) {
      res.render('user', { profile: responseData.profile });
    });
  } else {
    res.send(401);
  }
});

module.exports = router;
