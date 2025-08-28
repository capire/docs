---
status: released
---



# Bootstrapping Servers





CAP Node.js servers are bootstrapped through a [built-in `server.js` module](#built-in-server-js), which can be accessed through [`cds.server`](#cds-server). You can plug-in custom logic to the default bootstrapping choreography using a [custom `server.js`](#custom-server-js) in your project.



[[toc]]



## CLI Command `cds serve`

A Node.js CAP server process is usually started with the `cds serve` CLI command,
with `cds run` and `cds watch` as convenience variants.

**For deployment**, when the `@sap/cds-dk` package providing the `cds` CLI executable is not available, use the `cds-serve` binary provided by the `@sap/cds` package:

```json
{
  "scripts": {
    "start": "cds-serve"
  }
}
```







##  Built-in `server.js`

The built-in `server.js` constructs an [express.js app](cds-facade#cds-app), and bootstraps all CAP services using [`cds.connect`](cds-connect) and [`cds.serve`](cds-serve).
Its implementation essentially is as follows:

```js twoslash
const cds = require('@sap/cds')
module.exports = async function cds_server(options) {

  // prepare express app
  const o = { ...options, __proto__:defaults }
  const app = cds.app = o.app || require('express')()
  cds.emit ('bootstrap', app)

  // mount static resources and middlewares
  if (o.cors)      app.use (o.cors)                     //> if not in prod
  if (o.health)    app.get ('/health', o.health)
  if (o.static)    app.use (express.static (o.static))  //> defaults to ./app
  if (o.favicon)   app.use ('/favicon.ico', o.favicon)  //> if none in ./app
  if (o.index)     app.get ('/',o.index)                //> if none in ./app and not in prod

  // load and prepare models
  const csn = await cds.load('*') .then (cds.minify)
  cds.model = cds.compile.for.nodejs (csn)
  cds.emit ('loaded', cds.model)

  // connect to essential framework services
  if (cds.requires.db) cds.db = await cds.connect.to ('db') .then (_init)
  if (cds.requires.messaging)   await cds.connect.to ('messaging')

  // serve all services declared in models
  await cds.serve ('all') .in (app)
  await cds.emit ('served', cds.services)

  // start http server
  const port = o.port || process.env.PORT || 4004
  return app.server = app.listen (port)
}
```



### cds. server() {.method}

This is essentially a shortcut getter to `require('@sap/cds/server')`, that is, it loads and returns
the [built-in `server.js`](#built-in-server-js) implementation.
You'd mainly use this in [custom `server.js`](#custom-server-js) to delegate to the default implementation, [as shown below](#override-cds-server).



### cds. app {.property}

The express.js `app` constructed by the server implementation.



##   Custom `server.js`

The CLI command `cds serve` optionally bootstraps from project-local `./server.js` or  `./srv/server.js`.

### Plug-in to Lifecycle Events

In custom `server.js`, you can plugin to all parts of `@sap/cds`.  Most commonly you'd register own handlers to lifecycle events emitted to [the `cds` facade object](cds-facade) as below:

```js twoslash
// @noErrors
const cds = require('@sap/cds')
// react on bootstrapping events...
cds.on('bootstrap', ...)
cds.on('served', ...)
```

### Override `cds.server()`

Provide an own bootstrapping function if you want to access and process the command line options.
This also allows you to override certain options before delegating to the built-in `server.js`.
In the example below, we construct the express.js app ourselves and fix the models to be loaded.

```js twoslash
// @noErrors
const cds = require('@sap/cds')
// react on bootstrapping events...
cds.on('bootstrap', ...)
cds.on('served', ...)
// handle and override options
module.exports = (o)=>{
  o.from = 'srv/precompiled-csn.json'
  o.app = require('express')()
  return cds.server(o) //> delegate to default server.js
}
```

::: tip `req` != `req`
The `req` object in your express middleware is not the same as `req` in your CDS event handlers.
:::



## Lifecycle Events

The following [lifecycle events](cds-facade#lifecycle-events) are emitted via the `cds` facade object during the server bootstrapping process.
You can register event handlers using `cds.on()` like so:


```js
const cds = require('@sap/cds')
cds.on('bootstrap', ...)
cds.on('served', ...)
cds.on('listening', ...)
```


> [!warning]
> As we're using Node's standard [EventEmitter](https://nodejs.org/api/events.html#asynchronous-vs-synchronous),
> event handlers execute **synchronously** in the order they are registered, with `served` and `shutdown`
> events as the only exceptions.


### bootstrap {.event}

A one-time event, emitted immediately after the [express.js app](cds-facade#cds-app)
has been created and before any middleware or CDS services are added to it.

```js twoslash
// @noErrors
const cds = require('@sap/cds')
const express = require('express')
cds.on('bootstrap', app => {
  // add your own middleware before any by cds are added
  // for example, serve static resources incl. index.html
  app.use(express.static(__dirname+'/srv/public'))
})
```


### loaded {.event}

Emitted whenever a CDS model got loaded using `cds.load()`

```js twoslash
// @noErrors
const cds = require('@sap/cds')
cds.on('loaded', model => { /* ... */ })
```


### connect {.event}

Emitted for each service constructed through [`cds.connect`](cds-connect).

```js twoslash
// @noErrors
const cds = require('@sap/cds')
cds.on('connect', service => { /* ... */ })
```

### serving {.event}

Emitted for each service constructed by [`cds.serve`](cds-serve).

```js twoslash
// @noErrors
const cds = require('@sap/cds')
cds.on('serving', service => { /* ... */ })
```

### served {.event}

A one-time event, emitted when all services have been bootstrapped and added to the [express.js app](cds-facade#cds-app).

```js twoslash
// @noErrors
const cds = require('@sap/cds')
cds.on('served', async (services) => {
  // We can savely access service instances through the provided argument:
  const { CatalogService, db } = services
  // ...
})
```

This event supports _asynchronous_ event handlers.


### listening {.event}

A one-time event, emitted when the server has been started and is listening to incoming requests.

```js twoslash
// @noErrors
const cds = require('@sap/cds')
cds.on('listening', ({ server, url }) => { /* ... */ })
```


### shutdown {.event}

A one-time event, emitted when the server is closed and/or the process finishes.  Listeners can execute cleanup tasks.

This event supports _asynchronous_ event handlers.

```js twoslash
// @noErrors
const cds = require('@sap/cds')
cds.on('shutdown', async () => { /* ... */ })
```



## Configuration

The behavior of the built-in `server.js` can be customized through the options documented in the following sections.

### CORS Middleware

The built-in CORS middleware can be enabled explicitly with <Config>cds.server.cors: true</Config>.  By default, this is `false` if in production.

[Learn more about best practices regarding **Cross-Origin Resource Sharing (CORS)**.](../node.js/best-practices.md#cross-origin-resource-sharing-cors) {.learn-more}



### Toggle Generic Index Page

The default generic _index.html_ page is not served if `NODE_ENV` is set to `production`. Set <Config>cds.server.index: true</Config> to activate explicitly (not recommended for production).

[See the **Generic *index.html*** page in action.](../get-started/in-a-nutshell.md#generic-index-html) {.learn-more}



### Maximum Request Body Size

There are two ways to restrict the maximum request body size of incoming requests, globally for all endpoints and for individual services. If the payload exceeds the configured value, the request is rejected with _413 - Payload too large_. The configured values are passed through to the underlying Express body parser middlewares. Therefore, the default limit is _100kb_, as this is the default of the Express built-in [body parsers](https://expressjs.com/en/api.html#express.json).

The maximum request body size can be limited globally, for all services and protocols, using the configuration `cds.server.body_parser.limit`, like so:

```jsonc
{
  "cds": {
    "server": {
      "body_parser": {
        "limit": "1mb" // also accepts b, kb, etc...
      }
    }
  }
}
```

To restrict the maximum request body size of requests received by an individual service, the service specific annotation `@cds.server.body_parser.limit` can be used, like so:

```cds
annotate AdminService with @cds.server.body_parser.limit: '1mb';
```

This is useful when the expected request body sizes might vary for services within the application. If both the global configuration and the service specific annotation are set, the service specific annotation takes precedence for the respective service.



## See Also...

The [`cds-plugin` package technique](cds-plugins) provides more options to customize server startup.
