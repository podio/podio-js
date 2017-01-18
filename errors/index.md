---
layout: default
active: errors
---
# Errror handling

podio-js will throw exceptions when something goes predictably wrong. For example if you try to update something you don’t have permissions to update, if you don’t include required attributes, if you hit the rate limit etc. For the list of exceptions consult [PodioErrors.js](https://github.com/podio/podio-js/blob/master/lib/PodioErrors.js).

All Exceptions contain an error message, a HTTP status, a URL used to perform the request on the API and the name of the exception. The name attribute can be used to differentiate between different exceptions if you want to handle them differently.

Since most of the operations of the Platform SDK are asynchronous we cannot use `try{}...catch(e)` to handle them. Instead we recommend following approaches for different platforms:

# NodeJS

The [domain module](http://nodejs.org/api/domain.html) in Node can be use to catch exceptions from asynchronous behaviour.

The following example shows how to log errors produced by a GET request to /user/status:

```js
var domain = require('domain');
var PodioJS = require('podio-js');

var podio = new PodioJS({
  authType: 'server',
  clientId: clientId,
  clientSecret: clientSecret
});

var reqdomain = domain.create();

reqdomain.on('error', function(e) {
  console.log('Error:', e.name);
  console.log('Error description:', e.message.error_description);
  console.log('HTTP status:', e.status);
  console.log('Requested URL:', e.url);
});

reqdomain.run(function() {
  podio.request('get', '/user/status', null, function(responseData) {
    // do something...
  });
});
```

# Browser

While there are polyfills for Nodes domain module for the browser we would rather recommend using the [promises](http://www.html5rocks.com/en/tutorials/es6/promises/) interface for error handling. A lot of modern browsers have native [support](http://caniuse.com/#search=promises) for promises, for older browser we recommend the [ES6-Promise](https://github.com/jakearchibald/es6-promise) library as a pollyfill.

The following example shows how to extract error data from the error callback on the promise:

```js
var podio = new PodioJS({
  authType: 'server',
  clientId: clientId,
  clientSecret: clientSecret
});

podio.request('get', '/user/status').then(function(responseData) {
  // do something...
}, function(e) {
  console.log('Error:', e.body.error);
  console.log('Error description:', e.description);
  console.log('HTTP status:', e.status);
  console.log('Requested URL:', e.url);
});
```
