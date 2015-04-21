---
layout: default
active: api
---
# Making API requests

The API reference documentation at [https://developers.podio.com/doc](https://developers.podio.com/doc) lists all
available API operations.

After you [authenticated](http://podio.github.io/platformJS/authentication/) successfully you can start making API requests using the `request` method. 

The method accepts the following parameters:

Parameter      | Description
:------------- | :-------------
method         | HTTP verb like `get` or `post`
path           | relative URL of the API, like `/tasks`
data           | JS object for POST/PUT requests, `null` for GET
callback       | Success function, called with responseData as a parameter

# GET and DELETE requests

{% highlight javascript %}
podio.request('GET', '/tasks', null, function(responseData) {
  // do something with the data  
});
{% endhighlight %}

# POST and PUT requests

{% highlight javascript %}
var requestData = { data: true };

podio.request('POST', '/tasks', requestData, function(responseData) {
  // response, if available
});
{% endhighlight %}

# File uploads

For file uploads the `uploadFile` method can be used. It has the following signature:

Parameter      | Description
:------------- | :-------------
filePath       | An absolute path to an existing file on the hard drive
fileName       | The name of the file to be uploaded
callback       | Success function, called with responseData as a parameter

Note: Uploading files is currently only supported in NodeJS and not in the browser.

# Using promises

The `request` function returns a promise object which can be used instead of the callback function. The promise format used is [EcmaScript 6 Promises](http://www.html5rocks.com/en/tutorials/es6/promises/). We recommend using the [ES6-Promise library](https://github.com/jakearchibald/es6-promise) for pollyfilling older browsers. 

Here is an example of using `request` with a promise:

{% highlight javascript %}
podio.request('GET', '/tasks').then(function(responseData) {
   // response, if available
});
{% endhighlight %}

# Error handling

Depending on the error code PlatformJS SDK will throw different exceptions. On all exceptions you will be able to access the following properties:

Property | Description
:------- | :----------
body     | API error response, see Error body section
status   | HTTP status
url      | Original request URL

The following exceptions are possible:

HTTP Code | Exception
:-------- | :--------
400       | PodioBadRequestError
401       | PodioAuthorizationError
403       | PodioForbiddenError
404       | PodioForbiddenError
409       | PodioConflictError
410       | PodioGoneError
420       | PodioRateLimitError
500       | PodioServerError
502       | PodioUnavailableError
503       | PodioUnavailableError
504       | PodioUnavailableError
other     | PodioError

# Error body

A typical error body returned by the Platform API looks like this:

{% highlight json %}
{
  "error_parameters": {},
  "error_detail": null,
  "error_propagate": false,
  "request": {
    "url": "http:\/\/api.podio.com\/comment\/item\/78077883\/",
    "query_string": "",
    "method": "POST"
  },
  "error_description": "No matching operation could be found. No body was given.",
  "error": "not_found"
}
{% endhighlight %}

