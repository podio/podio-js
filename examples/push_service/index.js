var fs = require('fs');
var _ = require('lodash');
var async = require('async');
var PodioJS = require('../../lib/podio-js');

var config = JSON.parse(fs.readFileSync('./config.json'));

var podio1 = new PodioJS({
  authType: 'password',
  clientId: config.clientId,
  clientSecret: config.clientSecret
}, {
    apiURL: config.apiURL,
    enablePushService: true
});

var podio2 = new PodioJS({
  authType: 'password',
  clientId: config.clientId,
  clientSecret: config.clientSecret
}, {
    apiURL: config.apiURL,
    enablePushService: true

});

function handleError (err) {
  throw err;
}

function authUser (connection, userInfo, callback) {
  connection.authenticateWithCredentials(userInfo.username, userInfo.password, function() {
    connection.request('get','/user/status')
    .then(function(responseData) {
      callback(null, responseData);
    }).catch(function(err) {
      callback(err);
    });
  })
}

function onNotificationReceived (notification) {
  console.log('Notification received!', notification.data);
  process.exit();
}

function onTaskCreated (response) {
  // When the task has been created...
  console.log('Created task!', response.text);
  console.log('Now waiting for notification...');
}

// Log in both users
async.parallel([
  _.partial(authUser, podio1, config.user1),
  _.partial(authUser, podio2, config.user2)
], function(err, results) {

  if (err) { handleError(err); }

  var user1Data = results[0];

  // Create the subscription for user 1 to listen for notifications.
  // More specifically the event type 'notification_unread'
  podio1.push(user1Data.push).subscribe(onNotificationReceived)
  .then(function () {
    
    console.log('Added subscription');
    
    // Have user2 post a task assigned to user1
    var taskOptions = {
      responsible: user1Data.profile.user_id,
      text: 'An example task to generate a notification ' + new Date().toString()
    };

    podio2.request('post', '/task/', taskOptions)
    .then(onTaskCreated)
    .catch(handleError);
  }).catch(handleError);
});