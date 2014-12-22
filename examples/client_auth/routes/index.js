var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index');
});

router.get('/auth_popup', function(req, res) {
  res.render('auth_popup');
});

module.exports = router;
