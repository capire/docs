---
# layout: node-js
label: Transactions
---

# Transaction Management

Transaction management in CAP deals with (ACID) database transactions, principal / context propagation on service-to-service calls and tenant isolation.

::: tip **In Essence...** <!-- {  style="font-size:111%" } -->
As an application developer, **you don't have to care** about transactions, principal propagation, or tenant isolation at all. CAP runtime manages that for you automatically. Only in rare cases, you need to go beyond that level, and use one or more of the options documented hereinafter.
:::

[[toc]]

<br>


## Automatic Transactions


Whenever an instance of `cds.Service` processes requests, the core framework automatically cares for starting and committing or rolling back database transactions, connection pooling, principal propagation and tenant isolation.

For example a call like that:

```js
await db.read('Books')
```

... will cause this to take place on SQL level:

```sql
-- ACQUIRE connection from pool
CONNECT; -- if no pooled one
BEGIN;
SELECT * from Books;
COMMIT;
-- RELEASE connection to pool
```

<br>

::: tip
**Service-managed Transactions** — whenever a service operation, like `db.read()` above, is executed, the core framework ensures it will either join an existing transaction, or create a new root transaction. Within event handlers, your service always is in a transaction.
:::



## Nested Transactions

Services commonly process requests in event handlers, which in turn send requests to other services, like in this simplistic implementation of a bank transfer operation:

```js
const log = cds.connect.to('log')
const db = cds.connect.to('db')

BankingService.on ('transfer', req => {
  let { from, to, amount } = req.data
  await db.update('BankAccount',from).set('balance -=', amount),
  await db.update('BankAccount',to).set('balance +=', amount),
  await log.insert ({ kind:'Transfer', from, to, amount })
})
```

Again, all transaction handling is done by the CAP core framework, in this case by orchestrating three transactions:

1. A *root* transaction for `BankingService.transfer`
2. A *nested* transaction for the calls to the `db` service
3. A *nested* transaction for the calls to the `log` service

Nested transactions are automatically committed when their root transaction is committed upon successful processing of the request; or rolled back if not.

<br>

::: warning
**No Distributed Transactions** — Note that in the previous example, the two nested transactions are *synchronized* with respect to a final commit / rollback, but *not as a distributed atomic transaction*. This means, it still can happen, that the commit of one nested transaction succeeds, while the other fails.
:::



## Manual Transactions

Use `cds.tx()` to start and commit transactions manually, if you need to ensure two or more queries to run in a single transaction. The easiest way to achieve this is shown below:

```js
cds.tx (async ()=>{
  const [ Emily ] = await db.insert (Authors, {name:'Emily Brontë'})
  await db.insert (Books, { title: 'Wuthering Heights', author: Emily })
})
```

[Learn more about `cds.tx()`](#srv-tx){.learn-more}

This usage variant, which accepts a function with nested operations ...

1. creates a new root transaction
2. executes all nested operations in this transaction
3. automatically finalizes the transaction with commit or rollback

<br>

::: tip
**Only in non-managed environments** — as said above: you don't need to care for that if you are in a managed environment, that is, when implementing an event handler. In that case, the core service runtime automatically created a transaction for you already.
:::

::: warning _
If you're using the database SQLite, it leads to deadlocks when two transactions wait for each other. Parallel transactions are not allowed and a new transaction is not started before the previous one is finished.
:::


## Background Jobs

Background jobs are tasks to be executed *outside of the current transaction*, possibly also with other users, and maybe repeatedly. Use `cds.spawn()` to do so:

```js
// run in current tenant context but with privileged user
// and with a new database transactions each...
cds.spawn ({ user: cds.User.privileged, every: 1000 /* ms */ }, async ()=>{
  const mails = await SELECT.from('Outbox')
  await MailServer.send(mails)
  await DELETE.from('Outbox').where (`ID in ${mails.map(m => m.ID)}`)
})
```

[Learn more about `cds.spawn()`](#cds-spawn){.learn-more}



## cds. context {#event-contexts .property}

Automatic transaction management, as offered by the CAP, needs access to properties of the invocation context — most prominently, the current **user** and **tenant**, or the inbound HTTP request object.


### Accessing Context

Access that information anywhere in your code through `cds.context` like that:

```js
// Accessing current user
const { user } = cds.context
if (user.is('admin')) ...
```

```js
// Accessing HTTP req, res objects
const { req, res } = cds.context.http
if (!req.is('application/json')) res.send(415)
```

[Learn more about available `cds.context` properties](events#cds-context){.learn-more}

### Setting Contexts

Setting `cds.context` usually happens in inbound authentication middlewares or in inbound protocol adapters. You can also set it in your code, for example, you might implement a simplistic custom authentication middleware like so:

```js
app.use ((req, res, next) => {
  const { 'x-tenant':tenant, 'x-user-id':user } = req.headers
  cds.context = { tenant, user } // Setting cds.context
  next()
})
```



### Continuation-local Variable

`cds.context` is implemented as a so-called *continuation-local* variable.

As JavaScript is single-threaded, we cannot capture request-level invocation contexts such (as current user, tenant, or locale) in what other languages like Java call thread-local variables. But luckily, starting with Node v12, means for so-called *"Continuation-Local Storage (CLS)"* were given to us. Basically, the equivalent of thread-local variables in the asynchronous continuations-based execution model of Node.js.


### Context Propagation

When creating new root transactions in calls to `cds.tx()`, all properties not specified in the `context` argument are inherited from `cds.context`, if set in the current continuation.

In effect, this means the new transaction demarcates a new ACID boundary, while it inherits the event context properties unless overridden in the `context` argument to `cds.tx()`. The following applies:

```js
cds.context = { tenant:'t1', user:'u1' }
cds.context.user.id === 'u1'          //> true
let tx = cds.tx({ user:'u2' })
tx.context !== cds.context            //> true
tx.context.tenant === 't1'            //> true
tx.context.user.id === 'u2'           //> true
tx.context.user !== cds.context.user  //> true
cds.context.user.id === 'u1'          //> true
```




## cds/srv. tx() {#srv-tx .method}

```tsx
function srv.tx ( ctx?, fn? : tx<srv> => {...} ) => Promise
function srv.tx ( ctx? ) => tx<srv>
var ctx : { tenant, user, locale }
```

Use this method to run the given function `fn` and all nested operations in a new *root* transaction.
For example:

```js
await srv.tx (async tx => {
  let exists = await tx.run ( SELECT(1).from(Books,201).forUpdate() )
  if (exists) await tx.update (Books,201).with(data)
  else await tx.create (Books,{ ID:201,...data })
})
```

::: details Transaction objects  `tx<srv>`

The `tx` object created by `srv.tx()` and passed to the function `fn` is a derivate of the service instance, constructed like that:

```js
tx = { __proto__:srv,
  context: { tenant, user, locale }, // defaults from cds.context
  model: cds.model, // could be a tenant-extended variant instead
  commit(){...},
  rollback(){...},
}
```

:::



The new root transaction is also active for all nested operations run from fn, including other services, most important database services. In particular, the following would work as well as expected (this time using `cds.tx` as shortcut `cds.db.tx`):

```js
await cds.tx (async () => {
  let exists = await SELECT(1).from(Books,201).forUpdate()
  if (exists) await UPDATE (Books,201).with(data)
  else await INSERT.into (Books,{ ID:201,...data })
})
```

**Optional argument `ctx`** allows to override values for nested contexts, which are otherwise inherited from `cds.context`, for example:

```js
await cds.tx ({ tenant:t0, user: privileged }, async ()=>{
  // following + nested will now run with specified tenant and user...
  let exists = await SELECT(1).from(Books,201).forUpdate()
  ...
})
```

**If argument `fn` is omitted**, the constructed `tx` would be returned and can be used to manage the transaction in a fully manual fashion:

```js
const tx = srv.tx() // [!code focus]
try { // [!code focus]
  let exists = await tx.run ( SELECT(1).from(Books,201).forUpdate() )
  if (exists) await tx.update (Books,201).with(data)
  else await tx.create (Books,{ ID:201,...data })
  await tx.commit() // [!code focus]
} catch(e) {
  await tx.rollback(e) // will rethrow e // [!code focus]
} // [!code focus]
```

::: warning

Note though, that with this usage we've **not** started a new async context, and all nested calls to other services, like db, will **not** happen within the confines of the constructed `tx`.

:::






### srv.tx  <i>  (context?, fn?) → tx\<srv\> </i>


Use `srv.tx()` to start new app-controlled transactions manually, most commonly for [database services](databases) as in this example:

```js
let db = await cds.connect.to('db')
let tx = db.tx()
try {
  await tx.run (SELECT.from(Foo))
  await tx.create (Foo, {...})
  await tx.read (Foo)
  await tx.commit()
} catch(e) {
  await tx.rollback(e)
}
```

**Arguments:**

* `context` – an optional context object → [see below](#srv-tx-ctx)
* `fn` – an optional function to run → [see below](#srv-tx-fn)

**Returns:** a transaction object, which is constructed as a derivate of `srv` like that:

```js
tx = Object.create (srv, Object.getOwnPropertyDescriptors({
  commit(){...},
  rollback(){...},
}))
```

In effect, `tx` objects ...

* are concrete context-specific — that is tenant-specific — incarnations of `srv`es
* support all the [Service API](core-services) methods like `run`, `create` and `read`
* support methods `tx.commit` and `tx.rollback` as documented below.

**Important:** The caller of `srv.tx()` is responsible to `commit` or `rollback` the transaction, otherwise the transaction would never be finalized and respective physical driver connections never be released / returned to pools.

### srv.tx  <i>  ({ tenant?, user?, ... }) → tx\<srv\> </i> {#srv-tx-ctx}

Optionally specify an object with [event context](events#cds-event-context) properties as the *first* argument to execute subsequent operations with different tenant or user context:

```js
let tx = db.tx ({ tenant:'t1' user:'u2' })
```

The argument is an object with these properties:

* `user` — a unique user ID string or an [instance of `cds.User`](authentication#cds-user)
* `tenant` — a unique string identifying the tenant
* `locale` — a locale string in format `<language>_<region>`

The implementation constructs a new instance of [cds.EventContext](events#cds-event-context) from the given properties, which is assigned to [tx.context](#tx-context) of the new transaction.

[Learn more in section **Continuations & Contexts**.](#event-contexts){.learn-more}




### srv.tx  <i>  ((tx)=>{...}) → tx\<srv\> </i> {#srv-tx-fn}

Optionally specify a function as the *last* argument to have `commit` and `rollback` called automatically. For example, the following snippets are equivalent:

```js
await db.tx (async tx => {
  await tx.run (SELECT.from(Foo))
  await tx.create (Foo, {...})
  await tx.read (Foo)
})
```

```js
let tx = db.tx()
try {
  await tx.run (SELECT.from(Foo))
  await tx.create (Foo, {...})
  await tx.read (Foo)
  await tx.commit()
} catch(e) {
  await tx.rollback(e)
}
```

In addition to creating a new tx for the current service,

### srv.tx  <i>  (ctx) → tx\<srv\> </i> {#srv-tx-context}

If the argument is an instance of [cds.EventContext](events#cds-event-context) the constructed transaction will use this context as it's `tx.context`.
If the specified context was constructed for a transaction started with `cds.tx()`, the new transaction will be constructed as a nested transaction. If not, the new transaction will be constructed as a root transaction.

```js
cds.context = { tenant:'t1', user:'u2' }
const tx = cds.tx (cds.context)
//> tx is a new root transaction
```

```js
const tx = cds.context = cds.tx ({ tenant:'t1', user:'u2' })
const tx1 = cds.tx (cds.context)
//> tx1 is a new nested transaction to tx
```


### _↳_ <span style="color:#088; font-weight:500">tx</span>.context  <i>  → [cds.EventContext](events#cds-event-context) </i> {#tx-context }

Each new transaction created by [cds.tx()](#srv-tx) will get a new instance of [cds.EventContext](events#cds-event-context) constructed and assigned to this property. If there is a `cds.context` set in the current continuation, the newly constructed context object will inherit properties from that.

[Learn more in section **Continuations & Contexts**.](#event-contexts){.learn-more}


### _↳_ <span style="color:#088; font-weight:500">tx</span>.commit  <i>  (res?) ⇢ res </i> {#commit }

In case of database services, this sends a `COMMIT` (or `ROLLBACK`) command to the database and releases the physical connection, that is returns it to the connection pool. In addition, the commit is propagated to all nested transactions.

The methods are [bound](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Function/bind) to the `tx` instance, and the passed-in argument is returned, or rethrown in case of `rollback`, which allows them to be used as follows:

```js
let tx = cds.tx()
tx.run(...) .then (tx.commit, tx.rollback)
```


###  _↳_ <span style="color:#088; font-weight:500">tx</span>.rollback  <i>  (err?) ⇢ err </i> {#rollback }

In case of database services, this sends `ROLLBACK` command to the database and releases the physical connection. In addition, the rollback is propagated to all nested transactions, and if an `err` object is passed, it is rethrown.

[See documentation for `commit` for common details.](#commit){.learn-more}

<br>

::: warning
**Note:** `commit` and `rollback` both release the physical connection. This means subsequent attempts to send queries via this `tx` will fail.
:::



## cds.spawn() {#cds-spawn .method}

Runs the given function as detached continuation in a specified event context (not inheriting from the current one).
Options `every` or `after` allow to run the function repeatedly or deferred. For example:

```js
cds.spawn ({ tenant:'t0', every: 1000 /* ms */ }, async (tx) => {
  const mails = await SELECT.from('Outbox')
  await MailServer.send(mails)
  await DELETE.from('Outbox').where (`ID in ${mails.map(m => m.ID)}`)
})
```

::: tip
Even though the callback function is executed as a background job, all asynchronous operations inside the callback function must be awaited. Otherwise, transaction handling does not work properly.
:::

**Arguments:**

* `options` is the same as the `ctx` argument for `cds.tx()`, plus:
  * `every: <n>` number of milliseconds to use in `setInterval(fn,n)`
  * `after: <n>` number of milliseconds to use in `setTimeout(fn,n)`
  * if non of both is given, `setImmediate(fn)` is used to run the job
* `fn` is a function representing the background task

**Returns:**

- An event emitter which allows to register handlers on `succeeded`, `failed`, and `done` events.

```js
let job = cds.spawn(...)
job.on('succeeded', ()=>console.log('succeeded'))
```

- In addition, property `job.timer` returns the response of `setTimeout` in case option `after` was used, or `setInterval` in case of option `every`. For example, this allows to stop a regular running job like that:

```js
let job = cds.spawn({ every:111 }, ...)
await sleep (11111)
clearInterval (job.timer) // stops the background job loop
```

The implementation guarantees decoupled execution from request-handling threads/continuations, by...

- constructing a new root transaction `tx` per run using `cds.tx()`
- setting that as the background run's continuation's `cds.context`
- invoking `fn`, passing `tx` as argument to it.

Think of it as if each run happens in an own thread with own context, with automatic transaction management.

By default, the nested context inherits all values except `timestamp` from `cds.context`, especially user and tenant. Use the argument `options` if you want to override values, for example to run the background thread with different user or tenant than the one you called `cds.spawn()` from.



## DEPRECATED APIs

#### srv.tx <i> (req) → tx\<srv\> </i> {#srv-tx-req}

Prior to release 5, you always had to write application code like that to ensure context propagation and correctly managed transactions:

```js
this.on('READ','Books', req => {
  const tx = cds.tx(req)
  return tx.read ('Books')
})
```

This still works but is not required **nor recommended** anymore.
