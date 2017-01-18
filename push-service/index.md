---
layout: default
active: push
---
# Using the Push Service
Detailed documentation on how the service works can be found at [https://developers.podio.com/examples/push](https://developers.podio.com/examples/push).

After you [authenticated](http://podio.github.io/platformJS/authentication/) successfully you can start subscribing to push events using the `push` method.

This method simply accepts the 'push object' that is attached to the relavant carrier objects in API call responses:

Parameter      | Type     | Description
:------------- | :------- | :-------------
pushObject     | Object   | Contains information needed for connecting

The `push` method returns an object with a method `subscribe`. 

You need to call `subscribe` to create a new subscription, and pass to it a function that you would like invoked whenever push events for this subscription are incoming:

Parameter      | Type     | Description
:------------- | :------- | :-------------
handler        | Function | Invoked on incoming messages for its subscription

The `subscribe` method returns a promise that resolves when the connection is established (incoming events will **not** be registered before then). If it is rejected, it means the connection could not be established for some reason. One reason could be missing authentication.

# Example
This example demonstrates how to subscribe to all incoming events for the *User* carrier object of the authenticated user:
```js
  
// Make API request to get push object
podio.request('get','/user/status').then(function(responseBody) {

  // Deliver the push object and create a subscription
  podio.push(responseBody.push).subscribe(function(payload){
    console.log('I received a new notification!');
  })
  .then(function(){
    // The connection has been succesfully established...
  })
  .catch(function(err){
    // There was an error establishing the connection...
  });
});
```

See [this detailed example](https://github.com/podio/podio-js/tree/master/examples/push_service/) for some  working code including authentication.

***

**NOTE:** The push service API only supports subscribing to incoming events. It is not possible to publish  events to Podio.