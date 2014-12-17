var express = require('express');
var router = express.Router();
var PlatformJS = require('../../../lib/PlatformJS');
var sessionStore = require('../sessionStore');
var Busboy = require("busboy");
var temp = require('temp');
var fs = require('fs');

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

router.get('/user', function(req, res) {
  if (platform.isAuthenticated()) {
    platform.request('get', '/user/status', null, function(responseData) {
      res.render('user', { profile: responseData.profile });
    });
  } else {
    res.send(401);
  }
});

router.get('/upload', function(req, res) {
  res.render('upload');
});

router.post('/upload', function(req, res) {
  var busboy = new Busboy({ headers: req.headers });

  if (!platform.isAuthenticated()) {
    res.send(401);
    return;
  }

  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    var dir = temp.mkdirSync();
    var filePath = dir + '/' + filename;

    fs.writeFileSync(filePath, '');

    file.on('data', function(data) {
      fs.appendFileSync(filePath, data);
    });

    file.on('end', function() {
      platform.uploadFile(filePath, filename, function(body, response) {
        res.render('upload_success', { fileId: body.file_id })
      });
    });
  });

  req.pipe(busboy);
});

module.exports = router;
