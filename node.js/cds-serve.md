---
status: released
---



# Serving Provided Services



[[toc]]



## cds. serve (...) {.method}



Use `cds.serve()` to construct service providers from the service definitions in corresponding CDS models.

Declaration:

```ts:no-line-numbers
async function cds.serve (
  service        : 'all' | string | cds.Service | typeof cds.Service,
  options        : { service = 'all', ... }
) .from ( model  : string | CSN )         // default: cds.model
  .to ( protocol : string | 'rest' | 'odata' | 'odata-v2' | 'odata-v4' | ... )
  .at ( path     : string )
  .in ( app      : express.Application )  // default: cds.app
.with ( impl     : string | function | cds.Service | typeof cds.Service )
```


##### Common Usages:

```js
const { CatalogService } = await cds.serve ('my-services')
```
```js
const app = require('express')()
cds.serve('all') .in (app)
```




##### Arguments:

* `name` specifies which service to construct a provider for; use `all` to construct providers for all definitions found in the models.

```js
cds.serve('CatalogService')  //> serve a single service
cds.serve('all')             //> serve all services found
```

You may alternatively specify a string starting with `'./'` or refer to a file name with a non-identifier character in it, like `'-'` below, as a convenient shortcut to serve all services from that model:
```js
cds.serve('./reviews-service')  //> is not an identifier through './'
cds.serve('reviews-service')    //> same as '-', hence both act as:
cds.serve('all').from('./reviews-service')
```

The method returns a fluent API object, which is also a _Promise_ resolving to either an object with `'all'` constructed service providers, or to the single one created in case you specified a single service:

```js
const { CatalogService, AdminService } = await cds.serve('all')
const ReviewsService = await cds.serve('ReviewsService')
```


##### Caching:

The constructed service providers are cached in [`cds.services`](cds-facade#cds-services), which (a) makes them accessible to [`cds.connect`](cds-connect), as well as (b) allows us to extend already constructed services through subsequent invocation of [`cds.serve`](cds-serve).


##### Common Usages and Defaults

Most commonly, you'd use `cds.serve` in a custom file to add all the services to your [express.js](https://expressjs.com) app as follows:

```js
const app = require('express')()
cds.serve('all').in(app)
app.listen()
```

This uses these defaults for all options:

| Option               | Description                     | Default                     |
|----------------------|---------------------------------|-----------------------------|
| cds.serve ...        | which services to construct     | `'all'` services            |
| <i>&#8627;</i> .from | models to load definitions from | `'./srv'` folder            |
| <i>&#8627;</i> .in   | express app to mount to         | — none —                    |
| <i>&#8627;</i> .to   | client protocol to serve to     | `'fiori'`                   |
| <i>&#8627;</i> .at   | endpoint path to serve at       | [`@path`](#path) or `.name` |
| <i>&#8627;</i> .with | implementation function         | `@impl` or `._source`.js    |

Alternatively you can construct services individually, also from other models, and also mount them yourself, as document in the subsequent sections on individual fluent API options.

If you just want to add some additional middleware, it's recommended to bootstrap from a [custom `server.js`](#cds-server).




### .from <i> (model) </i> {#from .method}

Allows to determine the CDS models to fetch service definitions from, which can be specified as one of:

- A filename of a single model, which gets loaded and parsed with [`cds.load`]
- A name of a folder containing several models, also loaded with [`cds.load`]
- The string `'all'` as a shortcut for all models in the `'./srv'` folder
- An already parsed model in [CSN](../cds/csn) format

The latter allows you to [`cds.load`] or dynamically construct models yourself and pass in the [CSN](../cds/csn) models, as in this example:

```js
const csn = await cds.load('my-services.cds')
cds.serve('all').from(csn)...
```

**If omitted**, `'./srv'` is used as default.



### .to <i> (protocol) </i> {#to .method}

Allows to specify the protocol through which to expose the service. Currently supported values are:

* `'rest'` plain HTTP rest protocol without any OData-specific extensions
* `'odata'` standard OData rest protocol without any Fiori-specific extensions
* `'fiori'` OData protocol with all Fiori-specific extensions like Draft enabled

**If omitted**, `'fiori'` is used as default.



### .at <i> (path) </i> {#at .method}

Allows to programmatically specify the mount point for the service.

**Note** that this is only possible when constructing single services:
```js
cds.serve('CatalogService').at('/cat')
cds.serve('all').at('/cat') //> error
```

**If omitted**, the mount point is determined from annotation [`@path`](#path), if present, or from the service's lowercase name, excluding trailing _Service_.

```cds
service MyService @(path:'/cat'){...}  //> served at: /cat
service CatalogService {...}           //> served at: /catalog
```


### .in <i> ([express app](https://expressjs.com/api.html#app)) </i> {#in .method}

Adds all service providers as routers to the given [express app](https://expressjs.com/api.html#app).

```js
const app = require('express')()
cds.serve('all').in(app)
app.listen()
```





### .with <i> (impl) </i> {#with .method}

Allows to specify a function that adds [event handlers] to the service provider, either as a function or as a string referring to a separate node module containing the function.

```js
cds.serve('./srv/cat-service.cds') .with ('./srv/cat-service.js')
```

```js
cds.serve('./srv/cat-service') .with (srv => {
  srv.on ('READ','Books', (req) => req.reply([...]))
})
```

[Learn more about using impl annotations.](core-services#implementing-services){.learn-more}
[Learn more about adding event handlers.](core-services#srv-on-before-after){.learn-more}


**Note** that this is only possible when constructing single services:
```js
cds.serve('CatalogService') .with (srv=>{...})
cds.serve('all') .with (srv=>{...})  //> error
```

**If omitted**, an implementation is resolved from annotation `@impl`, if present, or from a `.js` file with the same basename than the CDS model, for example:

```cds
service MyService @(impl:'cat-service.js'){...}
```

```sh
srv/cat-service.cds  #> CDS model with service definition
srv/cat-service.js   #> service implementation used by default
```



## cds. middlewares

For each service served at a certain protocol, the framework registers a configurable set of express middlewares by default like so:

```js
app.use (cds.middlewares.before, protocol_adapter)
```

The standard set of middlewares uses the following order:

```js
cds.middlewares.before = [
  context(),   // provides cds.context
  trace(),     // provides detailed trace logs when DEBUG=trace
  auth(),      // provides cds.context.user & .tenant
  ctx_model(), // fills in cds.context.model, in case of extensibility
]
```

::: warning _Be aware of the interdependencies of middlewares_ <!--  -->
_ctx_model_ requires that _cds.context_ middleware has run before.
_ctx_auth_ requires that _authentication_ has run before.
:::


### . context() {.method}

This middleware initializes [cds.context](events#cds-context) and starts the continuation. It's required for every application.


### . trace() {.method}

The tracing middleware allows you to do a first-level performance analysis. It logs how much time is spent on which layer of the framework when serving a request.
To enable this middleware, you can set for example the [environment variable](cds-log#debug-env-variable) `DEBUG=trace`.


### . auth() {.method}

[By configuring an authentication strategy](./authentication#strategies), a middleware is mounted that fulfills the configured strategy and subsequently adds the user and tenant identified by that strategy to [cds.context](events#cds-context).


### . ctx_model() {.method}

It adds the currently active model to the continuation. It's required for all applications using extensibility or feature toggles.


### .add(mw, pos?) {.method}

Registers additional middlewares at the specified position.
`mw` must be a function that returns an express middleware.
`pos` specified the index or a relative position within the middleware chain. If not specified, the middleware is added to the end.

```js
cds.middlewares.add (mw, {at:0}) // to the front
cds.middlewares.add (mw, {at:2})
cds.middlewares.add (mw, {before:'auth'})
cds.middlewares.add (mw, {after:'auth'})
cds.middlewares.add (mw) // to the end
```

<div id="beforecustomization" />


### Custom Middlewares

The configuration of middlewares must be done programmatically before bootstrapping the CDS services, for example, in a [custom server.js](cds-serve#custom-server-js).

The framework exports the default middlewares itself and the list of middlewares which run before the protocol adapter starts processing the request.

```js
cds.middlewares = {
  auth,
  context,
  ctx_model,
  errors,
  trace,
  before = [
    context(),
    trace(),
    auth(),
    ctx_model()
  ]
}
```

In order to plug in custom middlewares, you can override the complete list of middlewares or extend the list programmatically.

::: warning
Be aware that overriding requires constant updates as new middlewares by the framework are not automatically taken over.
:::

[Learn more about the middlewares default order.](#cds-middlewares){.learn-more}

#### Customization of `cds.context.user`

You can register middlewares to customize `cds.context.user`.
It must be done after authentication.
If `cds.context.tenant` is manipulated as well, it must also be done before `cds.context.model` is set for the current request.

```js
cds.middlewares.before = [
  cds.middlewares.context(),
  cds.middlewares.trace(),
  cds.middlewares.auth(),
  function ctx_user (_,__,next) {
    const ctx = cds.context
    ctx.user.id = '<my-idp>' + ctx.user.id
    next()
  },
  cds.middlewares.ctx_model()
]
```

#### Enabling Feature Flags

You can register middlewares to customize `req.features`.
It must be done before `cds.context.model` is set for the current request.

```js
cds.middlewares.before = [
  cds.middlewares.context(),
  cds.middlewares.trace(),
  cds.middlewares.auth(),
  function req_features (req,_,next) {
    req.features = ['<feature-1>', '<feature-2>']
    next()
  },
  cds.middlewares.ctx_model()
]
```

[Learn more about Feature Vector Providers.](../guides/extensibility/feature-toggles#feature-vector-providers){.learn-more}


### Current Limitations

- Configuration of middlewares must be done programmatically.



## cds. protocols

The framework provides adapters for OData V4 and REST out of the box. In addition, GraphQL can be served by using our open source package [`@cap-js/graphql`](https://github.com/cap-js/graphql).

By default, the protocols are served at the following path:
|protocol|path|
|---|---|
|OData V4|/odata/v4|
|REST|/rest|
|GraphQL|/graphql|

### @protocol

Configures at which protocol(s) a service is served.

```cds
@odata
service CatalogService {}
//> serves CatalogService at: /odata/v4/catalog

@protocol: 'odata'
service CatalogService {}
//> serves CatalogService at: /odata/v4/catalog

@protocol: ['odata', 'rest', 'graphql']
service CatalogService {}
//> serves CatalogService at: /odata/v4/catalog, /rest/catalog and /graphql

@protocol: [{ kind: 'odata', path: 'some/path' }]
service CatalogService {}
//> serves CatalogService at: /odata/v4/some/path
```

Note, that
- the shortcuts `@rest`, `@odata`, `@graphql` are only supported for services served at only one protocol.
- `@protocol` has precedence over the shortcuts.
- `@protocol.path` has precedence over `@path`.
- the default protocol is OData V4.
- `odata` is a shortcut for `odata-v4`.
- `@protocol: 'none'` will treat the service as _internal_.

### @path

Configures the path at which a service is served.

```cds
@path: 'browse'
service CatalogService {}
//> serves CatalogService at: /odata/v4/browse

@path: '/browse'
service CatalogService {}
//> serves CatalogService at: /browse
```

Be aware that using an absolute path will disallow serving the service at multiple protocols.

### PATCH vs. PUT vs. Replace

The HTTP method `PATCH` is meant for partial modification of an _existing resource_.
`PUT`, on the other hand, is meant for ensuring a resource exists
, that is, if it doesn't yet exists, it gets created.
If it does exist, it gets updated to reflect the request's content.

This content, however, may be incomplete.
By default, the values for not listed keys are not touched.
The rationale being that default values are known and clients have the option to send full representations, if necessary.

The following table shows the Node.js runtime's configuration options and their respective default value:

| Flag                                         | Behavior                                 | Default |
|----------------------------------------------|------------------------------------------|---------|
| <Config keyOnly>cds.runtime.patch_as_upsert </Config> | Create resource if it does not yet exist   | false   |
| <Config keyOnly>cds.runtime.put_as_upsert</Config>     | Create resource if it does not yet exist    | true    |
| <Config keyOnly>cds.runtime.put_as_replace</Config>   | Payload is enriched with default values  | false   |

### Custom Protocol Adapter

Similar to the configuration of the GraphQL Adapter, you can plug in your own protocol.
The `impl` property must point to the implementation of your protocol adapter.
Additional options for the protocol adapter are provided on the same level.

```js
cds.env.protocols = {
  'custom-protocol': { path: '/custom', impl: '<custom-impl.js>', ...options }
}
```

### Current Limitations

- Configuration of protocols must be done programmatically.
- Additional protocols do not respect `@protocol` annotation yet.
- The configured protocols do not show up in the `index.html` yet.
