---
status: released
uacp: This page is linked from the Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/29c25e504fdb4752b0383d3c407f52a6.html
---

# Core Services

[[toc]]



## Provided Services

A CAP application mainly consists of the services it provides to clients. Such *provided services* are commonly declared through service definitions in CDS, and served automatically during bootstrapping as follows...



#### CDS-Modeling *Provided* Services

For example, a simplified all-in-one variant of [*capire/bookshop/srv/cat-service.cds*](https://github.com/capire/bookshop/blob/main/srv/cat-service.cds):

```cds
using { User, sap.capire.bookshop as my } from '../db/schema';
service CatalogService {
  entity Books {
    key ID : UUID;
    title  : String;
    descr  : String;
    author : Association to my.Authors;
  }
  action submitOrder ( book: UUID, quantity: Integer );
  event OrderedBook: { book: UUID; quantity: Integer; buyer: User }
}
```

[Learn more about defining services using CDS](../guides/providing-services) {.learn-more}



#### Serving Provided Services →  `cds.serve`

When starting a server with `cds watch` or `cds run` this uses `cds.serve` to automatically create instances of `cds.Service` for all such service definitions found in our models, and serve them to respective endpoints via corresponding protocols.

In essence, the built-in bootstrapping logic works like that:

```js
cds.app = require('express')()
cds.model = await cds.load('*')
cds.services = await cds.serve('all').from(cds.model).in(cds.app)
```

[Learn more about `cds.serve`](cds-serve) {.learn-more}





## Required Services

In addition to provided services, your applications often need to consume other services as *required services*. The most prominent example for that is the primary database `cds.db`. Other examples include the application services provided by other enterprise applications, or micro services, and other platform services, such as secondary databases or message brokers.



#### Configuring *Required* Services

We need to configure required services with `cds.requires.<...>` config options. These configurations act like sockets for service bindings to fill in missing credentials later on.

::: code-group

```json [package.json]
{"cds":{
  "requires": {
    "ReviewsService": { "kind": "odata", "model": "@capire/reviews" },
    "db": { "kind": "sqlite", "credentials": { "url":"db.sqlite" }},
  }
}}
```
:::

*Learn more about [configuring required services](cds-connect#cds-env-requires) and [service bindings](cds-connect#service-bindings)* {.learn-more}



#### Connecting to Required Services → `cds.connect`

Given such configurations, we can connect to the configured services like so:

```js
const ReviewsService = await cds.connect.to('ReviewsService')
const db = await cds.connect.to('db')
```

[Learn more about `cds.connect`](cds-connect) {.learn-more}





## Implementing Services

By default `cds.serve` creates an instance of `cds.ApplicationService` for each service definition it finds. Each instance provides generic implementations for all CRUD operations, including full support for deep document structures, declarative input validation and many other out-of-the-box features. Yet, you'd likely need to provide domain-specific custom logic, especially for custom actions and functions, or for custom validations. In the next sections, you can learn the following:

- **How** to provide custom implementations?
- **Where**, that is, in which files, to add the implementation?



#### In sibling `.js` files, next to `.cds` sources

The easiest way to add custom service implementations is to simply place a `.js` file with the same name next to the `.cds` file containing the respective service definition. For example, as in [*cap/samples/bookshop*](https://github.com/capire/bookshop):

```zsh
bookshop/
├─ srv/
│ ├─ admin-service.cds
│ ├─ admin-service.js
│ ├─ cat-service.cds # [!code focus]
│ └─ cat-service.js # [!code focus]
└─ ...
```

::: details Alternatively in subfolders `lib/` or `handlers/`...

 In addition to adding the implementation in a neighbouring file you can place them in nested subfolders called `lib/` or `handlers/`, for example:

```zsh
bookshop/
├─ srv/
│ └─ lib/ # or handlers/ # [!code focus]
│ │ ├─ admin-service.js
│ │ └─ cat-service.js
│ ├─ admin-service.cds
│ └─ cat-service.cds
└─ ...
```

:::



#### Specified by `@impl` Annotation, or `impl` Configuration

You can explicitly specify sources for service implementations using...

The `@impl` annotation in CDS definitions for [provided services](#provided-services):

::: code-group

```cds [srv/cat-service.cds]
@impl: 'srv/cat-service.js' // [!code focus]
service CatalogService { ... }
```

:::

The `impl` configuration property for [required services](#required-services):

::: code-group

```json [package.json]
{ "cds": {
  "requires": {
    "ReviewsService": {
      "impl": "srv/reviews-services.js" // [!code focus]
    }
  }
}}
```

:::





#### How to provide custom service implementations?

Implement your custom logic as a subclass of `cds.Service`, or more commonly of `cds.ApplicationService` to benefit from generic out-of-the-box implementations. The actual implementation goes into event handlers, commonly registered in method [`srv.init()`](#srv-init):

```js
class BooksService extends cds.ApplicationService {
  init() {
    const { Books, Authors } = this.entities
    this.before ('READ', Authors, req => {...})
    this.after ('READ', Books, books => {...})
    this.on ('submitOrder', req => {...})
    return super.init()
  }
}
module.exports = BooksService
```

[Learn more about `cds.ApplicationService`](app-services) {.learn-more}

::: details Alternatively using old-style `cds.service.impl` functions...

As an alternative to providing subclasses of `cds.Service` as service implementations, you can simply provide a single function like so:

```js
const cds = require('@sap/cds')
module.exports = cds.service.impl (function(){ ... }) // [!code focus]
```

> Note: `cds.service.impl()` is just a noop wrapper that enables [IntelliSense in VS Code](https://code.visualstudio.com/docs/editor/intellisense).

This will be translated behind the scenes to the equivalent of this:

```js
const cds = require('@sap/cds')
module.exports = new class extends cds.ApplicationService {
  async init() {
    await srv_impl_fn .call (this,this) // [!code focus]
    return super.init()
  }
}
```

:::

::: details Multiple implementations in one file...

In case you have multiple service definition is one `.cds` file like that:

```cds
// services.cds
namespace foo.bar;
service Foo {...}
service Bar {...}
```

... you may also want to have multiple implementations provided through one corresponding `.js` file. Simply do so by by having multiple exports like that:

```js
// services.js
exports['foo.bar.Foo'] = class Foo {...}
exports['foo.bar.Boo'] = class Bar {...}
```

The exports' names must **match the fully-qualified names of the service definitions**.

:::



## Consuming Services

Given access to a service instance — for example, through `cds.connect` — we can send requests, queries or asynchronously processed event messages to it:

```js
const srv = await cds.connect.to ('BooksService')
```

[Using REST-style APIs](#rest-style-api):

```js
await srv.create ('/Books', { title: 'Catweazle' })
await srv.read ('GET','/Books/206')
await srv.send ('submitOrder', { book:206, quantity:1 })
```

[Using typed APIs for actions and functions](../guides/providing-services#calling-actions-functions):

```js
await srv.submitOrder({ book:206, quantity:1 })
await srv.submitOrder(206,1)
```

[Using Query-style APIs](#srv-run-query):

```js
await srv.run( INSERT.into(Books).entries({ title: 'Wuthering Heights' }) )
await srv.run( SELECT.from(Books,201) )
await srv.run( UPDATE(Books,201).with({stock:111}) )
await srv.run( UPDATE(Books).set({discount:'10%'}).where({stock:{'>':111}}) )
```
[Same with CRUD-style convenience APIs](#crud-style-api):

```js
await srv.create(Books).entries({ title: 'Wuthering Heights' })
await srv.read(Books,201)
await srv.update(Books,201).with({stock:111})
await srv.update(Books).set({discount:'10%'}).where({stock:{'>':111}})
```

[Emitting Asynchronous Event Messsages:](#srv-emit-event)

```js
await srv.emit ('SomeEvent', {foo:'bar'})
```

```js
await srv.emit ({ event: 'OrderedBooks', data: {
  book: 206, quantity: 1,
  buyer: 'alice@wonderland.com'
}})
```
```js
await srv.emit ('OrderedBooks', {
  book: 206, quantity: 1,
  buyer: 'alice@wonderland.com'
})
```



::: tip Prefer Platform-Agnostic APIs

REST-style APIs using `srv.send()` tend to become protocol-specific, for example if you'd use OData `$filter` query options, or alike. In contrast to that, the `cds.ql`-based CRUD-style APIs using `srv.run()` are platform-agnostic to a very large extent. We can translate these to local API calls, remote service calls via GraphQL, OData, or REST, or to plain SQL queries sent to underlying databases.

:::



## `cds.Service` {.class}



Every active thing in CAP is a service, and class `cds.Service` is the base class for all of which.

Services react to events through execution of registered event handlers. So, the following code snippets show the essence of how you'd use services.

You register **[event handlers](#srv-on-before-after)** with them as implementation:

```js
const srv = (new cds.Service)
 .on('READ','Books', req => console.log (req.event, req.entity))
 .on('foo', req => console.log (req.event, req.data))
 .on('*', msg => console.log (msg.event))
```

You send **[queries](#srv-run-query)**, **[requests](#srv-send-request)** or  **[events](#srv-emit-event)** to them for consumption:

```js
await srv.read('Books')       //> READ Service.Books
await srv.send('foo',{bar:1}) //> foo {bar:1}
await srv.emit('foo',{bar:1}) //> foo {bar:1} //> foo
await srv.emit('bar')         //> bar
```

> Most commonly, instances are not created like this but during bootstrapping via [`cds.serve()`](#provided-services) for provided services, or [`cds.connect()`](#required-services) for required ones.





### Service ( ... ) {.constructor}

```tsx
function constructor (
  name    : string,
  model   : CSN,
  options : { kind: string, ... }
)
```

>  *Arguments fill in equally named properties [`name`](#name), [`model`](#model), [`options`](#options).*

**Don't override the constructor** in subclasses, rather override [`srv.init()`](#srv-init).



### . name {.property}

The service's name as passed to the constructor, and under which it is found in `cds.services`.

- If constructed by [`cds.serve()`](cds-serve) it's the fully-qualified name of the CDS service definition.
- If constructed by [`cds.connect()`](cds-connect) it's the lookup name:

```js
const srv = await cds.connect.to('audit-log')
srv.name //> 'audit-log'
```



### . model {.property}

```tsx
var srv.model      : LinkedCSN
var srv.definition : LinkedCSN service definition
```
- `model`, a [`LinkedCSN`](cds-reflect#linked-csn), is the CDS model from which this service was constructed
- `definition`, a [`LinkedCSN` definition](cds-reflect#any) from which this service was constructed



### . options {.property}

```tsx
var srv.options : { //> from cds.requires config
  service : string, // the definition's name if different from srv.name
  kind    : string,
  impl    : string,
}
```



### . entities {.property alt="The following documentation on operations also applies to entities. "}

### . events {.property alt="The following documentation on operations also applies to events. "}

### . operations {.property}

```tsx
var srv.entities/events/operations : Iterable <{
  name : CSN definition
}>
```

These properties provide convenient access to the CSN definitions of the *entities*, *events* and operations — that is *actions* and *functions* — exposed by this service.

They are *iterable* objects, which means you can use them in all of these ways:

```js
// Assumed `this` is an instance of cds.Service
let { Books, Authors } = this.entities
let all_entities = [ ... this.entities ]
for (let k in this.entities) //... k is a CSN definition's name
for (let d of this.entities) //... d is a CSN definition
```





### srv. init() {.method}

```tsx
async function srv.init()
```

Override this method in subclasses to register custom event handlers. As shown in the example, you would usually derive from [`cds.ApplicationService`](app-services):

```js
class BooksService extends cds.ApplicationService {
  init(){
    const { Books, Authors } = this.entities
    this.before ('READ', Authors, req => {...})
    this.after ('READ', Books, books => {...})
    this.on ('submitOrder', req => {...})
    return super.init()
  }
}
```

Ensure to call `super.init()` to allow subclasses to register their handlers. Do that after your registrations to go before the ones from subclasses, or before to have theirs go before yours.





### srv. prepend() {.method}

```tsx
function srv.prepend(()=>{...})
```

If you need to register a handler that has to run before the existing ones, use `srv.prepend()` to do so. For example:

```js
cds.on('served',()=>{
  const { SomeService } = cds.services
  SomeService.prepend (()=>{
    SomeService.on('READ','Foo', (req,next) => {...})
  })
})
```





### srv. on, before, after() {.method}

```tsx
function srv.on/before/after (
  event   : string | string[] | '*',
  entity? : CSN definition | CSN definition[] | string | string[] | '*',
  handler : function
)
```

Use these methods to register event handlers with a service, usually in your service implementation's [`init()`](#srv-init) method:

```js
class BooksService extends cds.ApplicationService {
  init(){
    const { Books, Authors } = this.entities
    this.on ('READ',[Books,Authors], req => {...})
    this.after ('READ',Books, books => {...})
    this.after ('each',Books, book => {...})
    this.before (['CREATE','UPDATE'],Books, req => {...})
    this.on ('CREATE',Books, req => {...})
    this.on ('UPDATE',Books, req => {...})
    this.on ('submitOrder', req => {...})
    this.before ('*', console.log)
    return super.init()
  }
}
```



**Methods `.on`, `.before`, `.after`** refer to corresponding *phases* during request processing:

- **`.on`** handlers actually fulfill requests, for example, by reading/writing data from/to databases
- **`.before`** handlers run before the `.on` handlers, frequently for validating inbound data
- **`.after`** handlers run after the `.on` handlers, frequently to enrich outbound data

**Argument `event`** can be one of:

- `'CREATE'`, `'READ'`, `'UPDATE'`, `'UPSERT'`,`'DELETE'`
- `'INSERT'`,`'SELECT'` → as aliases for: `'CREATE'`,`'READ'`
- `'POST'`,`'GET'`,`'PUT'`,`'PATCH'` → as aliases for: `'CREATE'`,`'READ'`,`'UPDATE'`
- `'each'` → convenience feature to register `.after` `'READ'` handler that runs for each individual result entry
- Any other string name of a custom action or function – for example,, `'submitOrder'`
- An `array` of the above to register the given handler for multiple events
- The string `'*'` to register the given handler for *all* potential events
- The string `'error'` to register an error handler for *all* potential events

**Argument `entity`** can be one of:

- A `CSN definition` of an entity served by this service → as obtained from [`this.entities`](#entities)
- A `string` matching the name of an entity served by this service → see [draft support](./fiori#draft-support)
- A `path`  navigating from a served entity to associated ones → for example, `'Books/author'`
- An `array` of the above to register the given handler for multiple entities / paths
- The string `'*'` to register the given handler for *all* potential entities / paths



::: tip Best Practices

Use named functions as event handlers instead of anonymous ones as that will improve both, code comprehensibility as well as debugging experiences. Moreover `this` in named functions are the [transactional derivates](cds-tx#srv-tx) of your service, with access to transaction and tenant-specific information, while for arrow functions it is the base instance.

:::

::: tip Custom domain logic mostly goes into `.before` or `.after` handlers

Your services are mostly constructed by [`cds.serve()`](cds-serve) based on service definitions in CDS models. And these are mostly instances of [`cds.ApplicationService`](app-services), which provide generic handlers for a broad range of CRUD requests. So, the need to provide own `.on` handlers reduces to custom actions and functions.

:::



### srv. before (request) {.method}

```tsx
function srv.before (event, entity?, handler: (
  req : cds.Request
))
```

*Find details on `event` and `entity` in [srv.on,before,after()](#srv-on-before-after) above*. {.learn-more}

Use this method to register handlers to run *before*  `.on` handlers, frequently used for validating user input. The handlers receive a single argument `req`, an instance of [`cds.Request`](./events.md#cds-request).

Examples:

```js
this.before ('UPDATE',Books, req => {
  const { stock } = req.data
  if (stock < 0) req.error `${{ stock }} must be >= ${0}`
})
this.before ('submitOrder', req => {
  const { quantity } = req.data
  if (quantity > 11) req.error `${{ quantity }} must not exceed ${11}`
})
```

You can as well run additional operations in before handlers, of course:

```js
this.before ('submitOrder', async req => {
  await UPDATE(Books).set ('stock -=', req.data.quantity)
})
```

::: details Collecting input errors with `req.error()`...

The input validation handlers above collect input errors with [`req.error()`](./events#req-error) . This method collects all failures in property `req.errors`, allowing to display them on UIs all at once. If there are `req.errors` after the before phase, request processing is aborted with a corresponding error response returned to the client.

:::

[Learn more about how requests are processed by `srv.handle(req)`](#srv-handle-event) {.learn-more}



### srv. after (request) {.method}

```tsx
function srv.after (event, entity?, handler: (
  results : object[] | any,
  req     : cds.Request
))
```

*Find details on `event` and `entity` in [srv.on,before,after()](#srv-on-before-after) above*. {.learn-more}

Use this method to register handlers to run *after* the `.on` handlers, frequently used to enrich outbound data. The handlers receive two arguments:

- `results` — the outcomes of the `.on` handler which ran before
- `req` — an instance of [`cds.Request`](./events.md#cds-request)

::: warning
Asynchronous functions can be registered, but all `.after` handlers are executed in parallel, which can lead to race conditions in case multiple handlers apply to the respective request. Hence, use with caution!
:::

As a convenience feature, `.after` handlers that are registered on the event `'each'` are called for each individual result entry on `'READ'`.

::: warning
Only synchronous functions are allowed to be registered as `.after('each',...)` handlers as they are run in a `.forEach()` loop without promise handling.
:::

Examples:

```js
this.after ('READ', Books, books => {
  for (let b of books) if (b.stock > 111) b.discount = '11%'
})
this.after ('each', Books, book => {
  if (book.stock > 111) book.discount = '11%'
})
```

[Learn more about how requests are processed by `srv.handle(req)`](#srv-handle-event) {.learn-more}



### srv. on (request) {.method}

```tsx
function srv.on (event, entity?, handler: (
  req  : cds.Request,
  next : function
))
```

*Find details on `event` and `entity` in [srv.on,before,after()](#srv-on-before-after) above*. {.learn-more}

Use this method to register handlers meant to actually fulfill requests, for example, by reading/writing data from/to databases. The handlers receive two arguments:

- `req` — an instance of [`cds.Request`](./events.md#cds-request) providing access to all request data
- `next` — a function which allows handlers to pass control down the [interceptor stack](#interceptor-stack-with-next)

Examples:

```js
const { Books, Authors } = this.entities
this.on ('READ',[Books,Authors], req => req.target.data) // [!code focus]
this.on ('UPDATE',Books, req => { // [!code focus]
  let [ ID ] = req.params
  return Object.assign (Books.data[ID], req.data)
})
```

::: details Using mock data structures...

```js
Authors.data = {
  111: { ID:111, name:'Emily Brontë' },
  112: { ID:112, name:'Edgar Allan Poe' },
  114: { ID:114, name:'Richard Carpenter' },
}
Books.data = {
  211: { ID:211, title:'Wuthering Heights', author: Authors.data[111], stock:11 },
  212: { ID:212, title:'Eleonora', author: Authors.data[112], stock:14 },
  214: { ID:214, title:'Catweazle', author: Authors.data[114], stock:114 },
}
```

:::

::: details Noteworthy in these examples...

- The `READ` handler is using the [`req.target`](./events.md#target) property which points to the CSN definition of the entity addressed by the incoming request → matching one of `Books` or `Authors` we obtained from [`this.entities`](#entities) above.

- The `UPDATE` handler is using the [`req.params`](./events.md#params) property which provides access to passed in entity keys.

:::


#### Interceptor stack with `next()`

When processing requests,  `.on(request)` handlers are **executed in sequence** on a first-come-first-serve basis: Starting with the first registered one, each in the chain can decide to call subsequent handlers via `next()` or not, hence breaking the chain:

```js
// Authorization check -> shadowing all other handlers registered below
this.on ('*', function authorize (req,next) {
  if (!req.user.is('authenticated-user')) return req.reject('FORBIDDEN')
  else return next() // [!code focus]
})
this.on ('READ',[Books,Authors], req => req.target.data)
...
```

> Alternatively, such authorization checks could also be placed in *.before* handlers.

[Learn more about how requests are processed by `srv.handle(req)`](#srv-handle-event) {.learn-more}



### srv. on (event) {.method}

```tsx
function srv.on (event, handler: (
  msg : cds.Event
))
```

*Find details on `event` in [srv.on,before,after()](#srv-on-before-after) above*. {.learn-more}

Handlers for asynchronous events, as emitted by [`srv.emit()`](#srv-emit-event), are registered in the same way as [`.on(request)`](#srv-on-request) handlers for synchronous requests, but work slightly different:

1. They are usually registered 'from the outside', not as part of a service's implementation.
2. They receive only a single argument: `msg`, an instance of [`cds.Event`](./events.md#cds-request); no `next`.
3. *All* of them get executed *concurrently*, not first-come-first-serve thru `next()`.

For example, assumed *BooksService* would emit an event whenever books are ordered:

```js
this.on ('submitOrder', async req => {
  // ... handle the request, and inform whoever might be interested:
  await this.emit('BooksOrdered', req.data) // [!code focus]
})
```

We could subscribe to this event to mashup with an `OrdersService` like so:

```js
const BooksService = await cds.connect.to('BooksService')
const OrdersService = await cds.connect.to('OrdersService')
BooksService.on ('BooksOrdered', async msg => { // [!code focus]
  const { buyer, books } = msg.data
  await OrdersService.create ('Orders', {
    customer: buyer,
    items: books
  })
})
```

Moreover, `.on(event)` handlers are *listeners*, not *interceptors*: **all** registered handlers are **executed concurrently **, not just the ones called thru `next()` chains — actually there is no argument `next`. So, if we had another consumer like that:

```js
const audit = await cds.connect.to('audit-log')
BooksService.on ('BooksOrdered', msg => audit.log ({ // [!code focus]
  timestamp: msg.timestamp,
  user: msg.data.buyer,
  event: msg.event,
  details: msg.data
}))
```

All these registered handlers would get executed concurrently, and independently.

[Learn more about how requests are processed by `srv.handle(event)`](#srv-handle-event) {.learn-more}



### srv. on (error) {.method}

```ts
function srv.on ('error', handler: (
   err : Error,
   req : cds.Event | cds.Request
))
```

Use the special event name `'error'` to register a custom error handler. The handler receives the error object `err` and the respective request object `req`, an instance of [`cds.Event`](./events.md#cds-request) or [`cds.Request`](./events.md#cds-request).

Example:

```js
this.on ('error', (err, req) => {
  err.message = 'Oh no! ' + err.message
})
```

Error handlers are invoked whenever an error occurs during event processing of *all* potential events and requests, and are used to augment or modify error messages, before they go out to clients. They are expected to be a sync function, that is, **not `async`**, not returning Promises.





### srv. send (request) {.method}

```ts
async function srv.send (
  method   : string | { method, path?, data?, headers? } | { query, headers? },
  path?    : string,
  data?    : object | any,
  headers? : object
)
return : result of this.dispatch(req)
```

Use this method to send synchronous requests to a service for execution.

-  `method` is an HTTP method
-  `path` can be an arbitrary URL, starting with a leading `'/'`, it is passed to a service without any modification as a string

To call bound / unbound actions and functions from the service, further variants of `srv.send` are additionally supported, as described in the section [Calling Actions / Functions](../guides/providing-services#calling-actions-functions). Basically, use the action or function name instead of the HTTP method.

Examples:

```js
await srv.send('POST','/Books', { title: 'Catweazle' })
await srv.send('GET','/Books')
await srv.send('GET','/Books/201')
await srv.send('submitOrder',{...})
```

These requests would be processed by respective [event handlers](#srv-on-before-after) registered like that:

```js
srv.on('CREATE','Books', req => {...})
srv.on('READ','Books', req => {...})
srv.on('submitOrder', req => {...})
```

The implementation essentially constructs and [dispatches](#srv-dispatch-event) instances of [`cds.Request`](./events.md#cds-request) like so:

```js
let req = new cds.Request (
  (method is object) ? method
  : (path is object) ? { method, data:path, headers:data }
  : { method, path, data, headers }
)
return this.dispatch(req)
```
Use this method instead of [`srv.run(query)`](#srv-run-query), if headers should be added to the request object. For example:
```js
await srv.send({ query: SELECT.from('Books'), headers: { some: 'header' } })
```

*See also [REST-Style Convenience API](#rest-style-api) below* {.learn-more}



### srv. emit (event) {.method}

```ts
async function srv.emit (
  event    : string | { event, data?, headers? },
  data?    : object | any,
  headers? : object
)
return : nothing
```

Use this method to emit asynchronous event messages to a service, for example:

```js
await srv.emit ({ event: 'SomeEvent', data: { foo: 'bar' }})
await srv.emit ('SomeEvent', { foo:'bar' })
```

Consumers would subscribe to such events through [event handlers](#srv-on-before-after) like that:

```js
Emitter.on('SomeEvent', msg => {...})
```

The implementation essentially constructs and [dispatches](#srv-dispatch-event) instances of [`cds.Event`](./events.md#cds-event) like so:

```js
let msg = new cds.Event (
  (event is object) ? event : { event, data, headers }
)
return this.dispatch(msg)
```



::: tip **INTRINSIC MESSAGING**

All *cds.Services* are intrinsically events & messaging-enabled. The core implementation provides local in-process messaging, while [*cds.MessagingService*](messaging) plugs in to that to extend it to cross-process messaging via common message brokers.

[**⇨ Read the Messaging Guide**](../guides/messaging/index) for the complete story.

:::

::: danger **PLEASE NOTE**

Although emitters do not handle any return values from consumers, it is necessary to always call them with `await`. Keep in mind that `srv.emit()` is an *`async`* method, it is **very important** to properly handle the returned *Promises* by using `await`. Not handing them will likely lead to invalid transaction states and deadlocks.

:::





### srv. run (query) {.method}

```ts
async function srv.run (
  query : CQN | CQN[]
)
return : result of this.dispatch(req)
```

Use this method to send queries to the service for execution. <br>
It accepts single [`CQN`](../cds/cqn) query objects, or arrays of which:

```js
await srv.run( INSERT.into(Books,{ title: 'Catweazle' }) )
await srv.run( SELECT.from(Books,201) )
await srv.run([
  SELECT.from(Authors),
  SELECT.from(Books)
])
```

These queries would be processed by respective [event handlers](#srv-on-before-after) registered like that:

```js
srv.on('CREATE',Books, req => {...})
srv.on('READ',Books, req => {...})
```

The implementation essentially constructs and [dispatches](#srv-dispatch-event) instances of [`cds.Request`](./events.md#cds-request) like so:

```js
let req = new cds.Request({query})
return this.dispatch(req)
```

*See also [CRUD-Style Convenience API](#crud-style-api) below*{.learn-more}





### srv. run ( fn ) {.method}

```tsx
function srv.run ( fn? : tx<srv> => {...} ) => Promise
```

Use this method to ensure operations in the given functions are executed in a proper transaction, either a new root transaction or a nested one to an already existing root transaction. For example:

```js
const db = await cds.connect.to('db')
await db.run (tx => {
  let [ Emily, Charlotte ] = await db.create (Authors, [
    { name: 'Emily Brontë' },
    { name: 'Charlotte Brontë' },
  ])
  await db.create (Books, [
    { title: 'Wuthering Heights', author: Emily },
    { title: 'Jane Eyre', author: Charlotte },
  ])
})
```

> Without the enclosing  `db.run(...)` the two INSERTs would be executed in two separate transactions, if that code would have run without an outer tx in place already.

This method is also used by [`srv.dispatch()`](#srv-dispatch-event) to ensure single operations happen within a transaction. All subsequent nested operations started from within an event handler, will all be nested transactions to the root transaction started by the outermost service operation.

[Learn more about transactions and `tx<srv>` transaction objects in `cds.tx` docs](cds-tx) {.learn-more}





### srv. dispatch (event) {.method}

```ts
async function srv.dispatch (
  this  : srv | Transactional <srv>,
  event : cds.Event | cds.Request | cds.Event[] | cds.Request[]
)
return : result of this.handle(event)
```

This is the central method handling all requests or event messages sent to a service. Argument `event` is expected to be an instance of [`cds.Event`](./events.md#cds-event) or [`cds.Request`](./events.md#cds-request).

The implementation basically works like that:

```js
// Ensure we are running in a proper tx, nested or root
if (!this.context) return this.run (tx => tx.dispatch(req))
// Handle batches of queries
if (req.query is array) return Promise.all (req.query.map(this.dispatch))
// Ensure req.target is properly determined
if (!req.target) req.target = _infer_target (req)
// Actually handle the request
return this.handle(req)
```

Basically, methods  `srv.dispatch()` and `.handle()` are designed as a pair, with the former caring for all preparatory work, and the latter actually processing the request by executing matching event handlers.

::: tip

When looking for overriding central event processing, rather choose  [`srv.handle()`](#srv-handle-event) as that doesn't have to deal with all such input variants, and is guaranteed to be in [*tx* mode](cds-tx#srv-tx).

:::





### srv. handle (event) {.method}

```ts
async function srv.handle (
  this  : Transactional <srv>,
  event : cds.Event | cds.Request
)
return : result of executed .on handlers
```

This is the internal method called by [`this.dispatch()`](#srv-dispatch-event) to actually process requests or events by executing registered event handlers. Argument `event` is expected to be an instance of [`cds.Event`](./events.md#cds-event) or [`cds.Request`](./events.md#cds-request).

The implementation basically works like that:

```js
// before phase
await Promise.all (matching .before handlers)
if (req.errors) throw req.reject()

// on phase
await (event.reply //> synchronous?
    ? Promise.seq (matching .on handlers) // for synchronous requests
    : Promise.all (matching .on handlers) // for asynchronous events
)
if (req.errors) throw req.reject()

// after phase
await Promise.all (matching .after handlers)
if (req.errors) throw req.reject()

return req.results
```

With `Promise.seq()` defined like this:

```js
Promise.seq = handlers => async function next(){
  req.results = await handlers.shift()?.(req, next)
}()
```

All matching `.before`, `.on`, and `.after` handlers are executed in corresponding phases, with the next phase being started only if no `req.errors` have occurred. In addition, note that...

- **`before`** handlers are always executed *concurrently*
- **`on`** handlers are executed...
  -  ***sequentially*** for instances of `cds.Requests`
  -  ***concurrently*** for instances of `cds.Event`
- **`after`** handlers are always executed *concurrently*

In effect, for asynchronous event messages, that is, instances of `cds.Event`, sent via [`srv.emit()`](#srv-emit-event), all registered `.on` handlers are always executed. In contrast to that, for synchronous resuests, that is, instances of `cds.Requests`  this is up to the individual handlers calling `next()`. See [`srv.on(request)`](#interceptor-stack-with-next) for an example.





### srv. foreach (entity) {.method}

```ts
function foreach(
  query: CQN, callback: (row: object) => void
)
```

Executes the statement and processes the result set row by row. Use this API instead of [`cds.run`](#srv-run-query) if you expect large result sets. Then they're processed in a streaming-like fashion instead of materializing the full result set in memory before processing.

> As of now, this API is only implemented by `cds.DatabaseService`. For all other subclasses, the full result set is currently materialized in memory.

_**Common Usage:**_

```js
cds.foreach (SELECT.from('Foo'), each => console.log(each))
```
{.indent}


## REST-style API

As an alternative to `srv.send(method,...)` you can use these convenience methods:

- srv. **get** (path, ...) {.method}
- srv. **put** (path, ...) {.method}
- srv. **post** (path, ...) {.method}
- srv. **patch** (path, ...) {.method}
- srv. **delete** (path, ...) {.method}

Essentially they call `srv.send()` with method filled in as follows:

```js
srv.get('/Books',...)     -->  srv.send('GET','/Books',...)
srv.put('/Books',...)     -->  srv.send('PUT','/Books',...)
srv.post('/Books',...)    -->  srv.send('POST','/Books',...)
srv.patch('/Books',...)   -->  srv.send('PATCH','/Books',...)
srv.delete('/Books',...)  -->  srv.send('DELETE','/Books',...)
```

Leading slash in the `path` argument results in the same behaviour as in `srv.send()`: `path` is sent unmodified to a service. Omitting the leading slash, or passing a reflected entity definition instead, constructs *bound* [`cds.ql` query objects](cds-ql), equivalent to [CRUD-style API](#crud-style-api):

```js
await srv.get(Books,201)
await srv.get(Books).where({author_ID:106})
await srv.post(Books).entries({title:'Wuthering Heights'})
await srv.post(Books).entries({title:'Catweazle'})
await srv.patch(Books).set({discount:'10%'}).where({stock:{'>':111}})
await srv.patch(Books,201).with({stock:111})
await srv.delete(Books,201)
```


## CRUD-style API

As an alternative to [`srv.run(query)`](#srv-run-query) you can use these convenience methods:

- srv. **read** (entity, ...) {.method}
- srv. **create** (entity, ...) {.method}
- srv. **insert** (...).into(entity) {.method}
- srv. **upsert** (...).into(entity) {.method}
- srv. **update** (entity, ...) {.method}
- srv. **delete** (entity, ...) {.method}

Essentially, they start constructing *bound* [`cds.ql` query objects](cds-ql) as follows:

```js
srv.read('Books',...)...         --> SELECT.from ('Books',...)...
srv.create('Books',...)...       --> INSERT.into ('Books',...)...
srv.insert(...).into('Books')... --> INSERT.into ('Books',...)...
srv.upsert(...).into('Books')... --> UPSERT.into ('Books',...)...
srv.update('Books',...)...       --> UPDATE.entity ('Books',...)...
srv.delete('Books',...)...       --> DELETE.from ('Books',...)...
```

You can further construct the queries using the `cds.ql` fluent APIs, and then `await` them for execution thru `this.run()`. Here are some examples:

```js
await srv.read(Books,201)
await srv.read(Books).where({author_ID:106})
await srv.create(Books).entries({title:'Wuthering Heights'})
await srv.insert(Books).entries({title:'Catweazle'})
await srv.update(Books).set({discount:'10%'}).where({stock:{'>':111}})
await srv.update(Books,201).with({stock:111})
await srv.delete(Books,201)
```

Which are equivalent to these usages of `srv.run(query)`:

```js
await srv.run( SELECT.from(Books,201) )
await srv.run( SELECT.from(Books).where({author_ID:106}) )
await srv.run( INSERT.into(Books).entries({title:'Wuthering Heights'}) )
await srv.run( INSERT.into(Books).entries({title:'Catweazle'}) )
await srv.run( UPDATE(Books).set({discount:'10%'}).where({stock:{'>':111}}) )
await srv.run( UPDATE(Books,201).with({stock:111}) )
await srv.run( DELETE.from(Books,201) )
```

We can also use tagged template strings as provided by `cds.ql`:

```js
await srv.read `Books` .where `ID=${201}`
await srv.create `Books` .entries ({title:'Wuthering Heights'})
await srv.update `Books` .where `ID=${201}` .with `title=${'Sturmhöhe'}`
await srv.delete `Books` .where `ID=${201}`
```
