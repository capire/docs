---
synopsis: >
  Node.js APIs and configuration for CAP's Transactional Event Queues — `cds.queued`, `cds.unqueued`, `srv.schedule`, `cds.flush`, callbacks, and queue configuration.
status: released
---

# Event Queues in Node.js

For concepts, use cases, and guarantees, see the [Transactional Event Queues](../guides/events/event-queues) guide. This page covers the Node.js-specific APIs and configuration on top of that.

In Node.js, you wrap a service with `cds.queued()` to queue its events, or enable queueing through configuration. The persistent queue is the default for all queued services.

> [!info] Event queues vs. `cds.spawn`
> [`cds.spawn`](cds-tx#cds-spawn) runs a *detached continuation* — an in-memory background job in a fresh root transaction, optionally with `every` / `after` recurrence. It does not persist anything: a crash before the job completes loses it, and concurrent app instances each run their own copy.
>
> Reach for `cds.spawn` when the work is in-process, idempotent, and tolerates being dropped — for example, a periodic cache refresh. Use an event queue when you need **transactional integration with the calling request** (the message lives or dies with the surrounding commit) or **persistence and retries across restarts and instances**.

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

For backwards compatibility, `cds.outboxed(srv)` works as a synonym.

#### `cds.unqueued(srv)` { .method }

```tsx
function cds.unqueued ( srv: QueuedService ) => Service
```

Get back the original synchronous service from a queued proxy:

```js
const srv = cds.unqueued(qd_srv)
```

This is useful when a service is queued through configuration and you need a synchronous call site. For backwards compatibility, `cds.unboxed(srv)` works as a synonym.

#### Queueing through Configuration

You can outbox any *outbound* service through configuration without changing code. The `outboxed` flag on the service config is the trigger:

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

Some services — `cds.MessagingService` and `cds.AuditLogService` — are outboxed by default; see [*Auto-Outboxed Services*](../guides/events/event-queues#auto-outboxed-services) in the common guide.


### Scheduling

`srv.schedule()` is a shortcut for `cds.queued(srv).send()` with optional timing:

```js
await srv.schedule('someEvent', { some: 'message' })                       // execute asap
await srv.schedule('someEvent', { some: 'message' }).after('1h')           // delay
await srv.schedule('someEvent', { some: 'message' }).every('10 minutes')   // recurrence
await srv.schedule('someEvent', { some: 'message' }).every('*/10 * * * *') // cron

await srv.unschedule('someEvent')                                          // remove
```

`.after()` accepts milliseconds (as a number) or a time string such as `'1s'`, `'10m'`, `'1h'`. `.every()` accepts the same plus a five-field cron expression.

A scheduled task is identified by its event name and exists only once. A subsequent `schedule()` call with the same name overwrites the previous schedule (tasks are upserted, not deduplicated) — convenient for idempotent registration during application startup.

To schedule the same event under separate identities (for example, with different payloads), give each its own task name with `.as(<name>)`:

```js
await srv.schedule('replicate', { entity: 'Airports' }).as('airports').every('10 minutes')
await srv.schedule('replicate', { entity: 'Airlines' }).as('airlines').every('1 hour')

await srv.unschedule('airports')                                           // remove by task name
```


### Callback Events <Alpha />

> [!note] Node.js only
> Callback events have no Java equivalent yet, but they're on the roadmap. See [*Stack Differences at a Glance*](../guides/events/event-queues#stack-differences-at-a-glance).

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
> `cds.flush()` is a Node.js API; both stacks have built-in recovery mechanisms that pick up pending messages automatically. See [*Stack Differences at a Glance*](../guides/events/event-queues#stack-differences-at-a-glance).

You rarely need to trigger processing manually — both single-tenant and multi-tenant runners pick up pending messages automatically. The most common use case is recovery after an application crash, where another emit for the same tenant and service would otherwise be needed to restart processing:

```js
// Flush a specific queue
const srv = await cds.connect.to('yourService')
await cds.flush(srv.name)

// Flush all queues
await cds.flush()
```


## Configuration

The persistent queue is enabled by default. Messages are stored in the `cds.outbox.Messages` table within the current transaction. `cds.requires.queue` and `cds.requires.scheduling` resolve to their default config automatically via `cds.env`; specify them only when tuning.

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

::: warning `legacyLocking` and rolling upgrades
The locking mechanism changed across `@sap/cds` major versions: cds 8 doesn't check the `status` column at all, cds 9 checks it but holds row locks for the duration of processing (`legacyLocking: true` was the cds 9 default), and cds 10 uses application-level locking via `status` and releases the row lock after selection. A rolling upgrade from cds 8 directly to cds 10 can lead to **double-processing of messages** — plan downtime, drain the queue first, or upgrade through cds 9.
:::

::: details Queue options

`cds.requires.queue`:

| Option | Default | Description |
|--------|---------|-------------|
| `maxAttempts` | `10` | Maximum retries before a message becomes a dead letter |
| `timeout` | `"1h"` | Time after which a `processing` message is considered abandoned and eligible for reprocessing |
| `legacyLocking` | `false` | Backward compatibility with `@sap/cds` v9; to be removed in a future release |

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

For a managed view with bound *revive* and *delete* actions, see [*Dead Letter Queue*](#dead-letter-queue) below.


### Manually Deleting Entries

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

Note that the model configuration isn't required for CAP projects using the standard project layout with `db`, `srv`, and `app` folders.


## Dead Letter Queue

The dead-letter queue lifecycle (define service → filter for dead entries → bound revive/delete actions) is the same shape across both stacks; see [*Dead Letter Queue*](../guides/events/event-queues#dead-letter-queue) in the common guide for the full flow with code in both Node.js and Java.

---

Working in Java? See [Event Queues in Java](../java/event-queues).
