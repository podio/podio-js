# PlatformJS

Podio Platform JavaScript SDK for NodeJS and the browser

## Installation

```
npm install git+ssh://git@github.com:podio/platformJS.git --save
```

## Use in NodeJS applications

```
var PlatformJS = require('PlatformJS');
```

## Use in browser applications

If you are using and AMD/CommonJS compatible module loader you can require the module:

```
var PlatformJS = require('PlatformJS');
```

If you are not using a loader, browserify PlatformJS like this:

```
npm install -g browserify

browserify lib/PlatformJS.js -s PlatformJS > dist/PlatformJS.js
```

and include `dist/PlatformJS.js` using a `<script>` tag.

## Tests

PhantomJS:

```sh
$ grunt
```

Node:

```sh
$ jasmine-node test
```

## Documentation

You will find a detailed documentation at [http://podio.github.io/platformJS/](http://podio.github.io/platformJS/)
