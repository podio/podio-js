---
layout: default
active: auth
---
# Making your first API call
Making API calls is a three step process:

1. Setup the API client
2. Authenticate
3. Make your API calls

## Setting up the API client
Before you can do anything you must initialize the API client using your Podio API key. [Head over to Podio to generate a client_id and client_secret](https://podio.com/settings/api) before continuing.

You can initialize it like this, passing the auth settings as object as the first parameter:

{% highlight javascript %}
var podio = new Podio({ 
  authType: 'client', 
  clientId: clientId, 
  clientSecret: clientSecret 
});
{% endhighlight %}

The authObject has the following options:

Parameter      | Description
:------------- | :-------------
authType       | "server", "client" or "password", see authentication chapter below.
clientId       | See [API key](https://podio.com/settings/api)
clientSecret   | Except for "client" authentication. See [API key](https://podio.com/settings/api)

Now you're ready to authenticate.

## Authentication
Platform supports multiple forms of authentication depending on what you want to do.

Flow             | Purpose
:----------------| :------
Sever-side flow  | Web apps in NodeJS
Client-side flow | Single-page apps in the browser
Password auth    | Only for testing purposes or when no user interaction is possible

[Read more about authentication in general at the Podio developer site](https://developers.podio.com/authentication).

### Server-side flow
The server-side flow requires you to redirect your users to a page on podio.com to authenticate. After they authenticate on podio.com they will be redirected back to your site. [Read about the flow on the developer site](https://developers.podio.com/authentication/server_side).

The example below handles three cases:

* The user has not authenticated and has not been redirected back to our page after authenticating.
* The user has already authenticated and they have a session stored (in memory or using the [session manager]({{site.baseurl}}/sessions).
* The user is being redirected back to our page after authenticating.

{% highlight javascript %}
var podio = new PodioJS({
  authType: 'server', 
  clientId: <your client id>, 
  clientSecret: <your client secret> 
});
var redirectURL = 'https://www.myapp.com';

// Your request handler (for example in ExpressJS)
var action = function(request, response) {
var authCode = request.query.code;
var errorCode = request.query.error;

podio.isAuthenticated().then(function() {
  // Ready to make API calls...
}).catch(function(err) {

  if (typeof authCode !== 'undefined') {
    podio.getAccessToken(authCode, redirectURL, function(err, response) {
      // make API calls here 
    }); 
  } else if (typeof errorCode !== 'undefined') {
    // a problem occured
    console.log(request.query.error_description);
  } else {
    // start authentication via link or redirect
    console.log(podio.getAuthorizationURL(redirectURL));
  }
});
{% endhighlight %}

The podio-js SDK contains an [example of server-side authentication](https://github.com/podio/podio-js/tree/master/examples/server_auth) to give you a better impression on how things work.

In the server side scenario the podio-js SDK will automatically refresh tokens for you.

### Client-side flow

The client-side flow is similar to the server-side flow and and will redirect back to your site after a user has confirmed 
the authentication. It will use hash parameters for transferring the auth tokens. The podio-js SDK offers you a higher level abstraction for the client-side flow compared to the server-side one and will parse and read the hash URL for you. Client secret is not required for the client-side flow.

{% highlight javascript %}
var podio = new PodioJS({ authType: 'client', clientId: <your client id> });
var redirectURL = 'https://www.myapp.com';

// isAuthenticated either gets the cached accessToken 
// or will check whether it is present in the hash fragment
podio.isAuthenticated().then(function(){
  // ready to make API calls...
}).catch(function(){
  if (podio.hasAuthError()) {
    console.log(podio.getAuthError());
  } else {
    // start authentication via link or redirect
    console.log(platform.getAuthorizationURL(redirectURL));
  }
});
{% endhighlight %}

At this point there is no support for automatic token refresh in the Podio API. A callback handler can be registered with a `onTokenWillRefresh` option passed in to the podio-js SDK on initialization. We recommend using this handler
for reauthentication. An example of how this can be done without losing the state of your client side application by using a popup can be found [here](https://github.com/podio/podio-js/tree/master/examples/client_auth).

### Password authentication
Password authentication will require users credentials. As it's bad practice to store your Podio password like this you should only use password-based authentication for testing or if you cannot use any of the other options.

{% highlight javascript %}
var podio = new PodioJS({
  authType: 'password', 
  clientId: <your client id>, 
  clientSecret: <your client secret> 
});
var username = <your username>;
var password = <your password>;

podio.isAuthenticated().then(function() {
  // Ready to make API calls...  
}).catch(function(err) {
  podio.authenticateWithCredentials(username, password, function() {
    // Make API calls here...
  });
});
{% endhighlight %}

It is considered a bad practice to store user credentials in the client side JavaScript. Please see an [example](https://github.com/podio/podio-js/tree/master/examples/password_auth) of how password authentication can be implemented.

## Refreshing access tokens
Under the hood you receive two tokens upon authenticating. An access token is used to make API calls and a refresh token is used to get a new access/refresh token pair once the access token expires.

You should **avoid authenticating every time your script runs**. It's highly inefficient and you risk running into rate limits quickly. Instead [use a session manager to store access/refresh tokens between script runs]({{site.baseurl}}/sessions) to re-use your tokens.