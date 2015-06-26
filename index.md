---
layout: default
active: index
---
# About podio-js

podio-js is a Podio JavaScript SDK for `node` and the browser.

# Installation

podio-js is available as a NPM module and can be installed using:

{% highlight sh %}
$ npm install podio-js --save
{% endhighlight %}

Alternatively it can be downloaded from the [GitHub repository](https://github.com/podio/podio-js/releases).

Please note if your are not using NPM you will have to include the following dependencies in your project to be able to use podio-js:

* [UnderscoreJS](http://underscorejs.org/)
* [URIjs](http://medialize.github.io/URI.js/)
* [Superagent](http://visionmedia.github.io/superagent/)

If you intend to use the Push Service API, then you should also include the following dependency:

* [Faye](http://faye.jcoglan.com/browser.html)

# Usage

podio-js can be integrated using an AMD loader like RequireJS or a CommonJS loader compatible with `module.exports` (like the NodeJS module system). It can be required like this:

{% highlight javascript %}
var podio = require('podio-js');
{% endhighlight %}

When used without a module loader in the browser it can be included using a `<script>` tag and accessed through a global `window.podio-js` object.


# Hello world
To get started right away, use app authentication to work on a single Podio app. To find your app id and token to go your app, click the wrench in the top right corner of the sidebar and click the **Developer** option.