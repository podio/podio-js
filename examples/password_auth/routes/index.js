var express = require('express');
var domain = require('domain');
var router = express.Router();
var PodioJS = require('../../../lib/podio-js');
var sessionStore = require('../sessionStore');
var fs = require('fs');

var config = JSON.parse(fs.readFileSync('./config.json'));

var clientId = config.clientId;
var clientSecret = config.clientSecret;
var username = config.username;
var password = config.password;
var podio = new PodioJS({ authType: 'password', clientId: clientId, clientSecret: clientSecret }, { sessionStore: sessionStore });

/* GET home page. */
router.get('/', function(req, res) {

  podio.isAuthenticated().then(function () {
    // ready to make API calls
    res.render('success');
  }).catch(function (err) {

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
  });
});

router.get('/user', function(req, res) {
  
  podio.isAuthenticated().then(function () {
    return podio.request('get', '/user/status');
  })
  .then(function(responseData) {
    res.render('user', { profile: responseData.profile });
  })
  .catch(function () {
    res.send(401);
  });
});

module.exports = router;
