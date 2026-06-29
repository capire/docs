---
synopsis: >
  Node.js APIs and configuration for CAP's Transactional Event Queues — `cds.queued`, `cds.unqueued`, `srv.schedule`, `cds.flush`, callbacks, and queue configuration.
status: released
---

# Event Queues in Node.js

For concepts, use cases, and guarantees, see the [Transactional Event Queues](../guides/events/event-queues) guide. This page covers the Node.js-specific APIs and configuration.

In Node.js, you wrap a service with `cds.queued()` to queue its events, or enable queueing through configuration. The persistent queue is the default for all queued services.

> [!info] Event queues vs. `cds.spawn`
> [`cds.spawn`](cds-tx#cds-spawn) runs a *detached continuation*, which means an in-memory background job in a fresh root transaction, optionally with `every` / `after` recurrence. It does not persist anything: a crash before the job completes loses it, and concurrent app instances each run their own copy.
>
> Use `cds.spawn` when the work is in-process, idempotent, and tolerates being dropped, for example, a periodic cache refresh. Use an event queue when you need **transactional integration with the calling request** (the message is committed or discarded with the surrounding transaction) or **persistence and retries across restarts and instances**.

[[toc]]


## Programmatic API

### Queueing a Service

#### `cds.queued(srv)` { .method }

```tsx
function cds.queued ( srv: Service ) => QueuedService
```

Wrap a non-database service in `cds.queued()` to obtain a queued proxy. All `emit` / `send` / `run` calls on the proxy are persisted in the current transaction and dispatched after commit:

```js
const srv = await cds.connect.to('yourService')
const qd_srv = cds.queued(srv)

await qd_srv.emit('someEvent', { some: 'message' }) // persisted, dispatched async
await qd_srv.send('someEvent', { some: 'message' })
```

::: tip `await` is still needed
The persistent queue writes the message to the database within the current transaction; you still need to `await` to keep that write inside the transaction.
:::

For backward compatibility, `cds.outboxed(srv)` works as a synonym.

#### `cds.unqueued(srv)` { .method }

```tsx
function cds.unqueued ( srv: QueuedService ) => Service
```

Get back the original synchronous service from a queued proxy:

```js
const srv = cds.unqueued(qd_srv)
```

This is useful when a service is queued through configuration and you need a synchronous call site. For backward compatibility, `cds.unboxed(srv)` works as a synonym.

#### Queueing through Configuration

Set the `outboxed` flag in the *outbound* service's configuration:

```json
{
  "requires": {
    "yourService": {
      "kind": "odata",
      "outboxed": true
    }
  }
}
```

Some services - `cds.MessagingService` and `cds.AuditLogService` - are outboxed by default. See [*Auto-Outboxed Services*](../guides/events/event-queues#auto-outboxed-services) in the Transactional Event Queues guide.


### Scheduling

The `srv.schedule()` method queues like `cds.queued(srv).send()`, that is within the current transaction, dispatched after commit. But it **upserts** a singleton task keyed by event name (or by `.as(name)`) instead of inserting a new entry on every call. It accepts optional timing:

```js
await srv.schedule('someEvent', { some: 'msg' })                       // execute asap
await srv.schedule('someEvent', { some: 'msg' }).after('1h')           // delay
await srv.schedule('someEvent', { some: 'msg' }).every('10m')          // recurrence
await srv.schedule('someEvent', { some: 'msg' }).every('*/10 * * * *') // cron

await srv.unschedule('someEvent')                                      // remove
```

`.after()` accepts milliseconds (as a number) or a time string such as `'1s'`, `'10m'`, `'1h'`. `.every()` accepts the same plus a five-field cron expression.

> [!warning] Cron field counts differ between stacks
> Java cron expressions are **six fields including seconds** (Spring syntax); Node.js cron expressions are **five fields**. A cron string copied between stacks won't behave the same way.

A scheduled task is identified by its event name and exists only once. A subsequent `schedule()` call with the same name overwrites the previous schedule (tasks are upserted, not deduplicated), which is convenient for idempotent registration during application startup.

To schedule the same event under separate identities (for example, with different payloads), give each its own task name with `.as(<name>)`:

```js
// Two independent singleton tasks for the same "replicate" event
await srv.schedule('replicate', { entity: 'Airports' }).every('10m')
  .as('replicate-airports') // [!code highlight]
await srv.schedule('replicate', { entity: 'Airlines' }).every('1 hour')
  .as('replicate-airlines') // [!code highlight]

// Each can be removed independently by its task name
await srv.unschedule('replicate-airports')
await srv.unschedule('replicate-airlines')
```


### Callbacks <Alpha />

> [!note] Node.js only
> Callback events have no Java equivalent yet, but they're on the roadmap.

Once a queued message has been successfully processed, the runtime emits `<event>/#succeeded` on the same service:

```js
srv.after('someEvent/#succeeded', (data, req) => {
  // `data` is the result of the event processor
  console.log('Message successfully processed:', data)
})
```

Similarly, when a message becomes a dead letter (after all retries are exhausted), the runtime emits `<event>/#failed`:

```js
srv.after('someEvent/#failed', (data, req) => {
  // `data` is the error from the event processor
  console.log('Message could not be processed:', data)
})
```

::: tip Register on specific events
Callback handlers must be registered for the specific `#succeeded` or `#failed` events. The `*` wildcard handler is not called for these events.
:::


### Manual Processing

> [!note] Node.js only
> `cds.flush()` is a Node.js API. Both stacks have built-in recovery mechanisms that pick up pending messages automatically.

The background runner picks up pending messages automatically. The main use case for a manual flush is triggering processing immediately after reviving a dead-letter entry — without waiting for the next runner cycle:

```js
await cds.flush()
```

The returned promise resolves once the runner has finished dispatching all currently processable messages and goes idle. Handler failures don't reject it — failed messages are rescheduled for the next retry.


## Configuration

The persistent queue is enabled by default. Messages are stored in the `cds.outbox.Messages` table within the current transaction. `cds.requires.queue` resolves to its default config automatically via `cds.env`. Specify it only when tuning.

```json
{
  "requires": {
    "queue": {
      "maxAttempts": 10,
      "timeout": "1h"
    }
  }
}
```

> [!warning] Rolling upgrades and `legacyLocking`
> The `legacyLocking` flag controls cross-version compatibility for the queue's status check. See [*Locking*](../guides/events/event-queues#locking) in the common guide for the version-by-version behavior and the rolling-upgrade caveat.

::: details Queue options

`cds.requires.queue`:

| Option | Default | Description |
|--------|---------|-------------|
| `maxAttempts` | `10` | Maximum retries before a message becomes a dead letter |
| `timeout` | `"1h"` | Time after which a `processing` message is considered abandoned and eligible for reprocessing |
| `legacyLocking` | `false` | Backward compatibility with `@sap/cds` v9. Planned for removal in a future release |

:::


### Disabling the Queue

Disable event queues globally:

```json
{ "cds": { "requires": { "queue": false } } }
```

Or disable queueing for a specific service — for example to make `cds.MessagingService` emit immediately:

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

### Inspecting `cds.outbox.Messages`

To see what's currently queued, query `cds.outbox.Messages` directly. The columns most useful for triage are `status`, `attempts`, `target`, `lastError`, and `lastAttemptTimestamp`:

```js
const db = await cds.connect.to('db')
const messages = await SELECT.from('cds.outbox.Messages')
  .columns('ID', 'target', 'status', 'attempts', 'lastAttemptTimestamp', 'lastError')
  .orderBy('timestamp desc')
```

For a managed view with bound *revive* and *delete* actions, see [*Dead Letter Queue*](../guides/events/event-queues#dead-letter-queue) in the common guide.


### Deleting Entries

To clear stuck messages programmatically:

```js
const db = await cds.connect.to('db')
await DELETE.from('cds.outbox.Messages')
```


### Messages Table Not Found

If the `cds.outbox.Messages` table is missing from the database, the most common cause is insufficient model configuration in *package.json*. If you've overwritten `requires.db.model`, add the outbox model path:

```jsonc
"requires": {
  "db": { ...
    "model": [..., "@sap/cds/srv/outbox"]
  }
}
```

For projects on `@sap/cds < 6.7.0` with custom build tasks that override `options.model`, add the path there too:

```jsonc
"build": {
  "tasks": [{ ...
    "options": { "model": [..., "@sap/cds/srv/outbox"] }
  }]
}
```

The model configuration isn't required for CAP projects using the standard project layout with `db`, `srv`, and `app` folders.


---

Working in Java? See [Event Queues in Java](../java/event-queues).
