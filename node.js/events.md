---
status: released
---

# Events and Requests


[[toc]]



## cds. context {.property}

This property provides seemingly static access to the current  [`cds.EventContext`], that is, the current `tenant`, `user` , `locale`, and so on, from wherever you are in your code. For example:

```js
let { tenant, user } = cds.context
```

Usually that context is set by inbound middleware.

The property is realized as a so-called continuation-local variable, implemented using [Node.js' async local storage](https://nodejs.org/api/async_context.html) technique, and a getter/setter pair: The getter is a shortcut for[`getStore()`](https://nodejs.org/api/async_context.html#asynclocalstoragegetstore). The setter coerces values into valid instances of [`cds.EventContext`]. For example:

```js
[dev] cds repl
> cds.context = { tenant:'t1', user:'u2' }
> let ctx = cds.context
> ctx instanceof cds.EventContext  //> true
> ctx.user instanceof cds.User     //> true
> ctx.tenant === 't1'              //> true
> ctx.user.id === 'u2'             //> true
```

If a transaction object is assigned, its `tx.context` is used, hence `cds.context = tx` acts as a convenience shortcut for `cds.context = tx.context`:

```js
let tx = cds.context = cds.tx({ ... })
cds.context === tx.context  //> true
```

::: tip

Prefer local  `req`  objects in your handlers for accessing event context properties, as each access to `cds.context` happens through [`AsyncLocalStorage.getStore()`](https://nodejs.org/api/async_context.html#asynclocalstoragegetstore), which induces some minor overhead.

:::







## `cds.EventContext` { .class #cds-event-context }

[`cds.EventContext`]: #cds-event-context	"Class cds.EventContext"



Instances of this class represent the invocation context of incoming requests and event messages, such as `tenant`, `user`, and `locale`. Classes [`cds.Event`] and [`cds.Request`] inherit from it and hence provide access to the event context properties:

```js
this.on ('*', req => {
  let { tenant, user } = req
  ...
})
```

In addition, you can access the current event context from wherever you are in your code via the continuation-local variable [`cds.context`](#cds-context):

```js
  let { tenant, user } = cds.context
```





### . http {.property}

If the inbound process came from an HTTP channel, you can now access express's common [`req`](https://expressjs.com/en/4x/api.html#req) and [`res`](https://expressjs.com/en/4x/api.html#res) objects through this property. It is propagated from `cds.context` to all child requests, so `Request.http` is accessible in all handlers including your database service ones like so:

```js
this.on ('*', req => {
  let { res } = req.http
  res.set('Content-Type', 'text/plain')
  res.send('Hello!')
})
```

Keep in mind that multiple requests (that is, instances of `cds.Request`) may share the same incoming HTTP request and outgoing HTTP response (for example, in case of an OData batch request).



### . id {.property}

A unique string used for request correlation.


For inbound HTTP requests the implementation fills it from these sources in order of precedence:

- `x-correlation-id` header
- `x-correlationid` header
- `x-request-id` header
- `x-vcap-request-id` header
- a newly created UUID

On outgoing HTTP messages, it's propagated as `x-correlation-id` header.



### . locale {.property}

The current user's preferred locale, taken from the HTTP Accept-Language header of incoming requests and resolved to [_normalized_](../guides/i18n#normalized-locales).






### . tenant {.property}

A unique string identifying the current tenant, or `undefined` if not in multitenancy mode. In the case of multitenant operation, this string is used for tenant isolation, for example as keys in the database connection pools.



### . timestamp {.property}

A constant timestamp for the current request being processed, as an instance of [`Date`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date). The CAP framework uses that to fill in values for the CDS pseudo variable `$now`, with the guaranteed same value.

[Learn more in the **Managed Data** guide.](../guides/domain-modeling#managed-data){.learn-more}



### . user {.property}

The current user, an instance of `cds.User` as identified and verified by the authentication strategy. If no user is authenticated, `cds.User.anonymous` is returned.

[See reference docs for `cds.User`.](authentication#cds-user){.learn-more .indent}

::: tip
Please note the difference between `req` in a service handler (instance of `cds.EventContext`) and `req` in an express middleware (instance of `http.IncomingMessage`).
Case in point, `req.user` in a service handler is an official API and, if not explicitely set, points to `cds.context.user`.
On the other hand, setting `req.user` in a custom authentication middleware is deprecated.
:::







## `cds.Event`  { .class #cds-event}
[`cds.Event`]: #cds-event	"Class cds.Event"



Class [`cds.Event`] represents event messages in [asynchronous messaging](messaging), providing access to the [event](#event) name, payload [data](#data), and optional [headers](#headers). It also serves as **the base class for [`cds.Request`](#cds-request)** and hence for all synchronous interactions.




### . event {.property}

The name of the incoming event, which can be one of:

* The name of an incoming CRUD request like `CREATE`, `READ`, `UPDATE`, `DELETE`
* The name of a custom action or function like `submitOrder`
* The name of a custom event like `OrderedBook`




### . data {.property}

Contains the event data. For example, the HTTP body for `CREATE` or `UPDATE` requests, or the payload of an asynchronous event message.

Use `req.data` for modifications as shown in the following:

```js
this.before ('UPDATE',Books, req => {
  req.data.author = 'Schmidt'  // [!code ++]
  req.query.UPDATE.data.author = 'Schmidt'  // [!code --]
})
```

### . headers {.property}

Provides access to headers of the event message or request. In the case of asynchronous event messages, it's the headers information sent by the event source. For HTTP requests it's the [standard Node.js request headers](https://nodejs.org/api/http.html#http_message_headers).





### eve. before 'commit' {.event alt="The following documentation on done also applies to commit. "}

### eve. on 'succeeded' {.event alt="The following documentation on done also applies to succeeded. "}

### eve. on 'failed' {.event alt="The following documentation on done also applies to failed. "}

### eve. on 'done' {.event}

Register handlers to these events on a per event / request basis. The events are executed when the whole top-level request handling is finished

Use this method to register handlers, executed when the whole request is finished.

```js
req.before('commit', () => {...}) // immediately before calling commit
req.on('succeeded', () => {...}) // request succeeded, after commit
req.on('failed', () => {...}) // request failed, after rollback
req.on('done', () => {...}) // request succeeded/failed, after all
```

::: danger
The events `succeeded` , `failed`, and `done` are emitted *after* the current transaction ended. Hence, they **run outside framework-managed transactions**, and handlers can't veto the commit anymore.
:::



To veto requests, either use the `req.before('commit')` hook, or service-level `before` `COMMIT` handlers.

To do something that requires databases in `succeeded`/`failed` handlers, use `cds.spawn()`, or one of the other options of [manual transactions](./cds-tx#manual-transactions). Preferably use a variant with automatic commit/ rollback.

Example:
```js
req.on('done', async () => {
  await cds.tx(async () => {
    await UPDATE `Stats` .set `views = views + 1` .where `book_ID = ${book.ID}`
  })
})
```

Additional note about OData: For requests that are part of a changeset, the events are emitted once the entire changeset was completed. If at least one of the requests in the changeset fails, following the atomicity property ("all or nothing"), all requests fail.





## `cds.Request` { .class #cds-request }

[`cds.Request`]: #cds-request	"Class cds.Request"



Class `cds.Request` extends [`cds.Event`] with additional features to represent and deal with synchronous requests to services in [event handlers](./core-services#srv-handle-event), such as the [query](#query), additional [request parameters](#params), the [authenticated user](#user), and [methods to send responses](#req-reply-results).


[Router]: https://expressjs.com/en/4x/api.html#router
[routing]: https://expressjs.com/en/guide/routing.html
[middleware]: https://expressjs.com/en/guide/using-middleware.html




### . method {.property}

The HTTP method of the incoming request:

| `msg.event` | &rarr; | `msg.method` |
|-------------|--------|--------------|
| CREATE      | &rarr; | POST         |
| READ        | &rarr; | GET          |
| UPDATE      | &rarr; | PATCH        |
| DELETE      | &rarr; | DELETE       |

{style="font-style:italic;width:auto;"}



### . target {.property}

Refers to the current request's target entity definition, if any; `undefined` for unbound actions/functions and events. The returned definition is a [linked](cds-reflect#linked-csn) definition as reflected from the [CSN](../cds/csn) model.

For OData navigation requests along associations, `msg.target` refers to the last target.
For example:

| OData Request     | `req.target`         |
|-------------------|----------------------|
| Books             | AdminService.Books   |
| Books/201/author  | AdminService.Authors |
| Books(201)/author | AdminService.Authors |

{style="font-style:italic;width:80%;"}

[See also `req.path` to learn how to access full navigation paths.](#path){.learn-more}
[See _Entity Definitions_ in the CSN reference.](../cds/csn#entity-definitions){.learn-more}
[Learn more about linked models and definitions.](cds-reflect){.learn-more}



### . path {.property}

Captures the full canonicalized path information of incoming requests with navigation.
For requests without navigation, `req.path` is identical to [`req.target.name`](#target) (or [`req.entity`](#entity), which is a shortcut for that).

Examples based on [cap/samples/bookshop AdminService](https://github.com/capire/bookshop/blob/main/srv/admin-service.cds):

| OData Request     | `req.path`                | `req.target.name`    |
|-------------------|---------------------------|----------------------|
| Books             | AdminService.Books        | AdminService.Books   |
| Books/201/author  | AdminService.Books/author | AdminService.Authors |
| Books(201)/author | AdminService.Books/author | AdminService.Authors |
{style="font-style:italic"}

[See also `req.target`](#target){.learn-more}




### . entity {.property}

This is a convenience shortcut to [`msg.target.name`](#target).




### . params {.property}

Provides access to parameters in URL paths as an [*iterable*](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#The_iterable_protocol) with the contents matching the positional occurrence of parameters in the url path. The respective entry is the key value pair matching the entity definition.

For example, the parameters in an HTTP request like that:

```http
GET /catalog/Authors(101)/books(title='Eleonora',edition=2) HTTP/1.1
```

The provided parameters can be accessed as follows:

```js
const [ author, book ] = req.params
// > author === { ID: 101 }
// > book === { title: 'Eleonora', edition: 2 }
```






### . query {.property}

Captures the incoming request as a [CQN query](cds-ql#class-cds-ql-query). For example, an HTTP request like `GET http://.../Books` is captured as follows:
```js
req.query = {SELECT:{from:{ref:['Books']}}}
```

For bound custom operations, `req.query` contains the query to the entity on which the operation is called. For unbound custom operations, `req.query` contains an empty object.

### . subject {.property}

Acts as a pointer to the instances targeted by the request.
For example for the equivalents of inbound requests addressing _single rows_ like these:

```js
AdminService.read(Books,201)
AdminService.update(Books,201).with({...})
AdminService.delete(Books,201)
```

... `req.subject` would always look like that: 

```js
req.subject //> ...
{ ref: [{
  id: 'AdminService.Books', // == req.target.name
  where: [ { ref: [ 'ID' ] }, '=', { val: 201 } ]
}]}
```

... which allows it to be used in custom handlers of each inbound request to easily read or write this very target row using  [cds.ql](cds-ql) as follows:

```js
SELECT.from(req.subject)  //> returns the single target row
UPDATE(req.subject)...    //> updates the single target row
DELETEfrom(req.subject)   //> deletes the single target row
```

> [!warning] 
> You can use `req.subject` in custom handlers for inbound `READ`, `UPDATE` and `DELETE` requests, as well as in _bound_ actions, addressing **_single rows_**.
> **You can't use it** reasonably in custom handlers for `INSERT` requests or other requests addressing **_multiple row_**.




### req. reply (results) {.method}

```tsx
function req.reply (
  results : object | object[] | string | number | true | false | null
)
```

Stores the given argument in `req.results`, which is subsequently sent back to the client, rendered in a protocol-specific way.

```js
this.on ('READ', Books, req => {
  req.reply ([
    { ID: 1, title: 'Wuthering Heights' },
    { ID: 2, title: 'Catweazle' }
  ])
})
```

Alternatively, you can also just return a value from your `.on` handler, which is then automatically used as the reply:

```js
this.on ('READ', Books, req => {
  return [
    { ID: 1, title: 'Wuthering Heights' },
    { ID: 2, title: 'Catweazle' }
  ]
})
```


### req. reject ({ ... }) {.method #req-reject}


Constructs and throws an error with the given arguments, which is then sent back to the client in an error response. This is the preferred way to reject requests with errors.

```js
this.on('CREATE', Books, req => {
  const { title } = req.data
  if (!title?.trim().length)
    return req.reject ({ // [!code focus]
      status: 400, // [!code focus]
      code: 'MISSING_INPUT', // [!code focus]
      message: 'Input is required', // [!code focus]
      target: 'title', // [!code focus]
    }) // [!code focus]
})
```

::: details **Best Practice:**{.good} Use the `@mandatory` annotation instead.
The sample above is just for illustration. Instead, use the [`@mandatory`](../guides/providing-services.md#mandatory)
annotation in your CDS model to define mandatory inputs like that:

```cds
entity Books {
  key ID : Integer;
  title : String(111) @mandatory; // [!code focus]
  ...
}
```

This way, the framework automatically checks for mandatory inputs and rejects requests with errors if they are missing.
So you don't have to (and should not) implement such checks manually in your code at all.
:::


The basic variant used above accepts a single object as argument with these properties:

```tsx
function req.reject ({
  status?  : number,
  code?    : string | number,
  message? : string,
  target?  : string,
  args?    : string[],
  ... // custom properties
})
```

| Property | Description |
| -------- | ----------- |
| `status` | The numeric [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status). |
| `code`   | A string code for clients to identify the error, also used as [i18n](cds-i18n) key. |
| `message`| A user-readable, potentially localized error message. |
| `target` | The name of an input field/element an error is related to. |
| `args`   | Values to fill in to localized error messages. |

[Learn more about `target` for Fiori UIs](https://ui5.sap.com/#/topic/fbe1cb5613cf4a40a841750bf813238e){.learn-more}


If `status` is omitted, and `code` is a number, that number is interpreted as the status code.

The `code` is used as [i18n](cds-i18n) key to lookup translations for [error responses](#error-responses). If `code` is omitted, a given `message` will be used as [i18n](cds-i18n) key.


### req. reject ( ... ) {.method}

This is a convenience variant of the [`req.reject()`](#req-reject) method, with these arguments:

```tsx
function req.reject (
  code?    : number,
  message? : string,
  target?  : string,
  args?    : string[]
)
```

For example, it would allow rewriting the [above](#req-reject) sample like that:

```js
this.on('CREATE', Books, req => {
  const { title } = req.data
  if (!title?.trim().length)
    req.reject (400, 'MISSING_INPUT', 'title') // [!code focus]
})
```






### req. error() {.method}

Constructs and records an error with the given arguments. The method is similar to [`req.reject()`](#req-reject), and accepts the same arguments, but does not throw the error immediately. Instead, it collects errors in `req.errors`, which are sent back to the client in an [error response](#error-responses) subsequently.

For example:

```js
req.error (400, 'Invalid input', 'some_field')
req.error (404, 'Not found')
```

All errors are collected in property `req.errors`, which is initially `undefined`, and initialized as an array on the first call. This allows to easily check, whether errors occurred with:

```js
if (req.errors) ... //> errors occurred
```

After each phase of request processing, i.e. _before_ / _on_ / _after_, the framework checks whether errors got recorded in `req.errors`. If so, it automatically [rejects](#req-reject) the request with an aggregate error containing all recorded errors, and the request is not processed further. So, in essence, the above ends up in the equivalent of:

```js
return req.reject ({
  code: 'MULTIPLE_ERRORS',
  details: [
    { status: 400, message: 'Invalid input', target: 'some_field' },
    { status: 404, message: 'Not found' }
  ]
})
```


### req. warn() {.method}
### req. info() {.method}
### req. notify() {.method}

Use these methods to record messages to be sent back to the client not in an error response but in addition to a successful response.

```js
req.notify ('Some notification message')
req.info ('Some information message')
req.warn ('Some warning message')
```

The methods are similar to [`req.error()`](#req-error), also accepting the [same arguments](#req-reject), but the messages are collected in `req.messages` instead of `req.errors`, not decorated with stack traces, and returned in a HTTP response header (e.g. `sap-messages`), instead of the response body.



## Error Responses

When a request is rejected with an error, the protocol adapters provided with the CAP framework automatically renders them in a protocol-specific way, for example, like that in case of _OData_ as well as _REST_ endpoints:

```http
Status: 400
Content-Type: application/json

{
  "error": {
    "code": "MISSING_INPUT",
    "message": "Input is required",
    "target": "title"
  }
}
```

::: details OData error responses get cleansed

In order to be compliant with the spec, all custom properties not foreseen in the spec are purged from the error response. If a custom property shall reach the client, it must be prefixed with `@` to not be purged.

:::

[Learn more about OData Error Responses](https://docs.oasis-open.org/odata/odata-json-format/v4.0/os/odata-json-format-v4.0-os.html#_Toc372793091){.learn-more}

The error response is generated from the error object constructed via [`req.reject()`](#req-reject) or [`req.error()`](#req-error), and the properties are used and normalized as follows:

1. If `status` is given, it is used as the HTTP status code of the response. If `status` is omitted, and `code` is a number in the range of 300...600, that number is used as the HTTP status code of the response.

2. If `code` is given, and a string, it is used to look up a user-readable error `message` from the [`i18n/messages`](cds-i18n) bundles. If `code` is omitted, the given `message` is used as the [i18n](cds-i18n) key to look up the `message`, and if found, the original value of `message` is used as `code` in the response.

3. If an `Accept-Language` header is present in the request, a localized message is looked up in addition, using the preferred language specified in the header, and used for the `message` property in the HTTP response. If no suitable localization is found, the original message as resolved in step 2 is returned.

For example:

```js
req.reject ({ code: 400, message: 'MISSING_INPUT', target: 'title' })
req.reject (400, 'MISSING_INPUT', 'title') // same as above
```

... would result in a response like this for `Accept-Language: de`:

```http
Status: 400
Content-Type: application/json

{
  "error": {
    "code": "MISSING_INPUT",
    "message": "Eingabe ist erforderlich",
    "target": "title"
  }
}
```

> [!warning] Error Sanitization
> In production, error responses should never disclose internal information that could be exploited by attackers. To ensure that, all errors with a `5xx` status code are returned to the client with only the respective generic message (example: `500 Internal Server Error`).
>
> In very rare cases, you might want to return 5xx errors with a meaningful message to the client. This can be achieved with `err.$sanitize = false`. Use that option with care!


## Translations for Validation Errors

For the following annotations/error codes, the runtime provides default translations:

| Annotation              | Error Code                      |
|-------------------------|---------------------------------|
| `@mandatory`            | ASSERT_MANDATORY<sup>(1)</sup> |
| `@assert.range`         | ASSERT_RANGE                    |
| `@assert.range` on enum | ASSERT_ENUM                     |
| `@assert.format`        | ASSERT_FORMAT                   |
| `@assert.target`        | ASSERT_TARGET                   |

<sup>(1)</sup> Falls back to error code `ASSERT_NOT_NULL` if provided in custom translations.

These can be overridden by the known technique of providing [custom i18n messages](cds-i18n#localized-messages).

