---
synopsis: >
  Learn details about the task queue feature.
status: released
---

# Queueing with `cds.queued`

[[toc]]



## Overview

The _task queue_ feature allows you to defer event processing.

A common use case is the outbox pattern, where remote operations are deferred until the main transaction has been successfully committed.
This prevents accidental execution of remote calls in case the transaction is rolled back.

Every non-database CAP service can be _queued_, meaning that event dispatching becomes _asynchronous_.

::: tip
The _task queue_ feature can be disabled globally via <Config>cds.requires.queue = false</Config>.
:::


## Queueing a Service


### cds. queued (srv) {.method}

```tsx
function cds.queued ( srv: Service, options? ) => QueuedService
```

Programmatically, you can get the queued service as follows:

```js
const srv = await cds.connect.to('yourService')
const qd_srv = cds.queued(srv)

await qd_srv.emit('someEvent', { some: 'message' }) // asynchronous
await qd_srv.send('someEvent', { some: 'message' }) // asynchronous
```

::: tip `await` needed
You still need to `await` these operations because they're asynchronous. In case of a persistent queue, which is the default, messages are stored in the database, within the current transaction.
:::

The `cds.queued` function can also be called with optional configuration options.

```js
const qd_srv = cds.queued(srv, { maxAttempts: 5 })
```

> The persistent queue can only be used if it is not disabled globally via `cds.requires.queue = false`, as it requires a dedicated database table.

::: warning One-time configuration
Once you queued a service, you cannot override its configuration options again.
:::

For backwards compatibility, `cds.outboxed(srv)` works as a synonym.


### cds. unqueued (srv) {.method}

```tsx
function cds.unqueued ( srv: QueuedService ) => Service
```

Use this on a queued service to get back to the original service:

```js
const srv = cds.unqueued(qd_srv)
```

This is useful if your service is outboxed (that is, queued) per configuration.

For backwards compatibility, `cds.unboxed(srv)` works as a synonym.


### Per Configuration

Some services are outboxed by default; these include [`cds.MessagingService`](messaging) and `cds.AuditLogService`.
You can configure the outbox behavior by specifying the `outboxed` option in your service configuration.

```json
{
  "requires": {
    "yourService": {
      "kind": "odata",
      "outboxed": {
        "maxAttempts": 5
      }
    }
  }
}
```

For transactional safety, you're encouraged to use the [persistent queue](#persistent-queue), which is enabled by default.



## Persistent Queue (Default) {#persistent-queue}

The persistent queue is the default configuration.

Using the persistent queue, the to-be-emitted message is stored in a database table within the current transaction, therefore transactional consistency is guaranteed.

::: details You can use the following configuration options:

```json
{
  "requires": {
    "queue": {
      "kind": "persistent-queue",
      "maxAttempts": 20,
      "chunkSize": 10,
      "storeLastError": true,
      "legacyLocking": true,
      "timeout": "1h"
    }
  }
}
```

The optional parameters are:

- `maxAttempts` (default `20`): The number of unsuccessful emits until the message is considered unprocessable. The message will remain in the database table!
- `chunkSize` (default `10`): The number of messages that are read from the database table in one go.
- `storeLastError` (default `true`): Specifies whether error information of the last failed emit is stored in the tasks table.
- `legacyLocking` (default `true`): If set to `false`, database locks are only used to set the status of the message to `processing` to prevent long-kept database locks. Although this is the recommended approach, it is incompatible with task runners still on `@sap/cds^8`.
- `timeout` (default `"1h"`): The time after which a message with `status === "processing"` is considered to be abandoned and eligable to be processed again. Only for `legacyLocking === false`.

:::

Once the transaction succeeds, the messages are read from the database table and dispatched.
If processing was successful, the respective message is deleted from the database table.
If processing failed, the system retries the message after exponentially increasing delays.
After a maximum number of attempts, the message is ignored for processing and remains in the database, which
therefore also acts as a dead letter queue.
See [Managing the Dead Letter Queue](#managing-the-dead-letter-queue), to learn about how to handle such messages.

There is only one active message processor per service, tenant, app instance, and message.
This ensures that no duplicate emits happen, except in the highly unlikely case of an app crash right after successful processing but  before the message could be deleted.

::: tip Unrecoverable errors
Some errors during the emit are identified as unrecoverable, for example in [SAP Event Mesh](../guides/messaging/event-mesh) if the used topic is forbidden.
The respective message is then updated and the `attempts` field is set to `maxAttempts` to prevent further processing.
[Programming errors](./best-practices#error-types) crash the server instance and must be fixed.
To mark your own errors as unrecoverable, you can set `unrecoverable = true` on the error object.
:::


Your database model is automatically extended by the entity `cds.outbox.Messages`:

```cds
namespace cds.outbox;

entity Messages {
  key ID                   : UUID;
      timestamp            : Timestamp;
      target               : String;
      msg                  : LargeString;
      attempts             : Integer default 0;
      partition            : Integer default 0;
      lastError            : LargeString;
      lastAttemptTimestamp : Timestamp @cds.on.update: $now;
      status               : String(23);
}
```

In your CDS model, you can refer to the entity `cds.outbox.Messages` using the path `@sap/cds/srv/outbox`, for example to expose it in a service (cf. [Managing the Dead Letter Queue](#managing-the-dead-letter-queue)).


### Known Limitations

- If the app crashes, another emit for the respective tenant and service is necessary to restart the message processing. It can be triggered manually using the `flush` method.
- The service that handles the queued event must not rely on user roles and attributes, as they are not stored with the message. In other words, asynchronous task are always processed in a privileged mode. However, the user ID is stored to re-create the correct context.


### Managing the Dead Letter Queue

You can manage the dead letter queue by implementing a service that exposes a read-only projection on entity `cds.outbox.Messages` as well as bound actions to either revive or delete the respective message.

::: tip
See [Outbox Dead Letter Queue](../java/outbox#outbox-dead-letter-queue) in the CAP Java documentation for additional considerations while we work on a general outbox guide.
:::

#### 1. Define the Service

::: code-group
```cds [srv/outbox-dead-letter-queue-service.cds]
using from '@sap/cds/srv/outbox';

@requires: 'internal-user'
service OutboxDeadLetterQueueService {

  @readonly
  entity DeadOutboxMessages as projection on cds.outbox.Messages
    actions {
      action revive();
      action delete();
    };

}
```
:::

#### 2. Filter for Dead Entries

As `maxAttempts` is configurable, its value cannot be added as a static filter to projection `DeadOutboxMessages`, but must be considered programmatically.

::: code-group
<<< ./assets/dead-letter-queue-1.js#snippet{5-8} [srv/outbox-dead-letter-queue-service.js]
:::

#### 3. Implement Bound Actions

Finally, entries in the dead letter queue can either be _revived_ by resetting the number of attempts (that is, `SET attempts = 0`) or _deleted_.

::: code-group
<<< ./assets/dead-letter-queue-2.js#snippet{10-12,14-16} [srv/outbox-dead-letter-queue-service.js]
:::


### Additional APIs <Alpha />

#### Task Scheduling

You can use the `schedule` method as a shortcut for `cds.queued(srv).send()`, with optional scheduling options `after` and `every`:

```js
await srv.schedule('someEvent', { some: 'message' })
await srv.schedule('someEvent', { some: 'message' }).after('1h') // after one hour
await srv.schedule('someEvent', { some: 'message' }).every('1h') // every hour after each processing
```

#### Task Processing

To manually trigger the message processing, for example if your server is restarted, you can use the `flush` method.

```js
const srv = await cds.connect.to('yourService')
cds.queued(srv).flush()
```

#### Task Callbacks

Once a message has been successfully processed, it triggers the `<event>/#succeeded` handlers.

```js
srv.after('someEvent/#succeeded', (data, req) => {
  // `data` is the result of the event processor
  console.log('Message successfully processed:', data)
})
```

Similarly, you can use the `<event>/#failed` event to handle failed messages (once the maximum retry count is reached).

```js
srv.after('someEvent/#failed', (data, req) => {
  // `data` is the error from the event processor
  console.log('Message could not be processed:', data)
})
```

::: tip Register on specific events
Event handlers have to be registered for these specific events. The `*` wildcard handler is not called for these.
:::



## In-Memory Queue

You can enable the in-memory queue globally with:

```json
{
  "requires": {
    "queue": {
      "kind": "in-memory-queue"
    }
  }
}
```

Messages are emitted only after the current transaction is successfully committed. Until then, messages are only kept in memory.
This is similar to the following code if done manually:

```js
cds.context.on('succeeded', () => this.emit(msg))
```

::: warning No retry mechanism
The message is lost if the emit fails. There's no retry mechanism.
:::



## Immediate Emit

To disable deferred emitting for a particular service only, you can set the `outboxed` option of that service to `false`:

```json
{
  "requires": {
    "messaging": {
      "kind": "enterprise-messaging",
      "outboxed": false
    }
  }
}
```



## Troubleshooting


### Delete Entries in the Messages Table

To manually delete entries in the table `cds.outbox.Messages`, you can either
expose it in a service, see [Managing the Dead Letter Queue](#managing-the-dead-letter-queue), or programmatically modify it using the `cds.outbox.Messages`
entity:

```js
const db = await cds.connect.to('db')
await DELETE.from('cds.outbox.Messages')
```


### Messages Table Not Found

If the messages table is not found on the database, this can be caused by insufficient configuration data in _package.json_.

In case you have overwritten `requires.db.model` there, make sure to add the outbox model path `@sap/cds/srv/outbox`:

```jsonc
"requires": {
  "db": { ...
    "model": [..., "@sap/cds/srv/outbox"]
  }
}
```

The following is only relevant if you're using @sap/cds version < 6.7.0 and you've configured `options.model` in custom build tasks.
Add the model path accordingly:

```jsonc
"build": {
  "tasks": [{ ...
    "options": { "model": [..., "@sap/cds/srv/outbox"] }
  }]
}
```

Note that model configuration isn't required for CAP projects using the [standard project layout](../get-started/index.md#project-structure) with `db`, `srv`, and `app` folders. In this case, you can delete the entire `model` configuration.
