---
layout: default
active: sessions
---
# Sessions management
An important part of any Platform API integration is managing your authentication tokens. You can avoid hitting rate limits and make your integration faster by storing authentication tokens and thus avoid having to re-authenticate every time your script runs.

# What is a session manager
When you setup the Platform SDK you can optionally pass in the a session manager object. This object handles storing and retrieving access tokens in a persistant storage through a unified interface.

If you use a session manager your authentication tokens will automatically be stored after authentication and automatically retrieved when you create a new instance of the Platform SDK on page load.

# Writing your own session manager
Writing a session manager is straight-forward. You need to create a new object that has two methods: `get` and `set`.

## The `get` method
The `get` method should retrieve an existing authentication object when called. It has two parameters:
 
Parameter      | Description
:------------- | :-------------
authType       | "server", "client" or "password", see [authentication chapter](../authentication). Allows usage of separate storages for different authentication mechanisms using the same sessionStore implementation.
callback       |  allows using both a synchronous and an asynchronous storage

The callback function needs to be called with the retrieved authObject as an only parameter once it becomes available.

## The `set` method
The `set` method should store an authObject when called. It has the following parameters:

Parameter      | Description
:------------- | :-------------
oAuthObject    | object which stores authentication data like authToken, refresh token etc.
authType       | "server", "client" or "password", see [authentication chapter](../authentication). Allows using separate storages for different authentication types.

# Server side example

For storing authentication information on the server a file based storage or a database can be used among others. A simple implementation of a file based sessionStore in NodeJS can be found [here](https://github.com/podio/podio-js/blob/master/examples/server_auth/sessionStore.js)

# Client side example

For storing tokens in the browser the localStorage API can be used. You can find an example implementation [here](https://github.com/podio/podio-js/blob/master/examples/client_auth/public/javascript/sessionStore.js). 
