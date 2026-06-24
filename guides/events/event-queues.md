---
synopsis: >
  Transactional Event Queues let you persist events and scheduled tasks in the same database transaction as your business data, then process them asynchronously with retries and a dead letter queue.
status: released
---

# Transactional Event Queues
The *'Transactional Outbox'* Pattern, generalized {.subtitle}

Persist events and scheduled tasks in the same database transaction as your business data, then process them asynchronously with retries and a dead letter queue.
{.abstract}

> [!tip] Transactional Event Queues – Guiding Principles
>
> 1. Queued work is written in the same transaction as your business data → *no phantom events, no lost events*
> 2. A background runner dispatches it after commit, not during the request → *fast request handling, durable side effects*
> 3. Failed work is retried with exponential backoff; unrecoverable entries become dead letters → *ultimate resilience*
>
> => Application developers stay focused on the domain, not on failure modes.


[[toc]]


## Motivation

Distributed side effects are hard to get right.
An application may commit local data, but a follow-up remote call can still fail because of network errors, service outages, or a process crash. Two-phase commits across a database and a remote service or message broker are impractical in modern cloud architectures, so applications instead aim for **eventual consistency**: the local state and the remote state diverge briefly, but converge after the dispatch completes (or after compensation, if it fails permanently).

*Transactional Event Queues* are CAP's mechanism for that. They store the follow-up work in the database as part of the **same transaction** as your business data. Once the transaction commits, a background runner reads pending messages and dispatches them — retrying with exponentially increasing delays on failure, and moving the message to a dead letter queue after a configurable number of attempts.

![Two side-by-side diagrams contrasting two integration patterns. On the left, on a red background labelled 'High Risk of Inconsistent Data', Service A calls Service B directly and each service writes to its own database — if either step fails after the other has committed, the two databases diverge. On the right, on a green background labelled 'Eventual Consistency', Service A writes to its own database and into an event queue inside that same database in one transaction; the queued message is then dispatched to Service B asynchronously. Service B still writes to its own database. Either both writes on the Service-A side commit together or neither does, and the call to Service B is retried until it succeeds.](assets/event-queues-motivation.drawio.svg)

Because the queued message and your business data share the same database transaction, you get two core guarantees:

- **No phantom events**: if the transaction rolls back, no message is sent.
- **No lost events**: if the transaction commits, the queued work is persisted and processed eventually. CAP avoids duplicate execution under normal operation, but handlers must still be idempotent to tolerate rare crash windows or external side effects.

This pattern is widely known as the [*'Transactional Outbox'*](https://microservices.io/patterns/data/transactional-outbox.html), but CAP's event queues go beyond outbound messages. They cover three use cases:

- **Outbox**: defer outbound calls to remote services and emits to message brokers until the transaction succeeds.
- **Inbox**: acknowledge inbound messages immediately and process them asynchronously.
- **Scheduled Tasks**: run periodic or delayed work such as data replication.

### Pub/Sub vs. Event Queues

These are sometimes confused but solve different problems.

**Pub/sub**, typically realized through a message broker, address *loosely couples microservices*. A producer publishes events without knowing who consumes them; consumers subscribe by topic. The unit of trust is the broker.

**Event queues** address *asynchronous workload processing within one service*. They turn a piece of work into a database row that survives commit, restart, and retry, then dispatch it later: to the same service in process, to a remote service, or to a message broker. The unit of trust is the database transaction.

The two patterns complement each other: when the dispatch target *is* a message broker, the event queue is the transactional bridge that makes pub/sub safe across the local commit. The [Inbox](#inbox) does the mirror image on the receiving side.

> [!note] Related patterns
> [*Event Sourcing*](https://microservices.io/patterns/data/event-sourcing.html) solves the same atomic-state-change-and-publish problem by making an append-only event log the source of truth. Event queues persist messages only until processed and then delete them — they're a transactional bridge to remote systems, not the system of record.

> [!tip] When <i>not</i> to use event queues
> If you need an immediate, synchronous response from a remote system, use a normal service call. Queued calls execute asynchronously and discard the direct return value. For purely local logic that finishes inside the current request, an event queue adds nothing.


## Outbox

The outbox defers outbound calls to remote services and emits to message brokers until the main transaction succeeds.
This prevents sending requests or messages to external systems when your transaction has not yet committed.


### Programmatic Use

**Example:** In the *xtravels* application, when an agent creates a `Bookings` record (a flight booking tied to a travel), the application also notifies *xflights* of the booking. The straightforward implementation is to call *xflights* directly from an `after CREATE` handler:

```js
const xflights = await cds.connect.to('xflights')

this.after('CREATE', 'Bookings', async (_, req) => {
  const { flight_ID: flight, flight_date: date } = req.data
  // Anti-pattern: the remote call happens before the local commit is safe  // [!code --]
  await xflights.send('POST', 'BookingCreated', { flight, date })           // [!code --]
})
```

This works when everything succeeds, but it's not safe: if the surrounding transaction later fails, the external booking can already exist while the local `Bookings` row gets rolled back.

The outbox fixes this. Wrap the remote service in `cds.queued()` (Node.js) or `OutboxService.outboxed()` (Java) and dispatch as before. The call is now persisted within the current transaction and sent after commit:

::: code-group
```js [Node.js]
const xflights = await cds.connect.to('xflights')
const qd_xflights = cds.queued(xflights)

this.after('CREATE', 'Bookings', async (_, req) => {
  const { flight_ID: flight, flight_date: date } = req.data
  // Persisted within the current transaction, sent after commit      // [!code ++]
  await qd_xflights.send('POST', 'BookingCreated', { flight, date })  // [!code ++]
})
```
```java [Java]
@Autowired @Qualifier("XFlightsOutbox")
OutboxService outbox;

@Autowired @Qualifier(CqnService.DEFAULT_NAME)
CqnService xflights;

@After(event = CqnService.EVENT_CREATE, entity = Bookings_.CDS_NAME)
void notifyXFlights(List<Bookings> bookings) {
  AsyncCqnService outboxedXFlights = AsyncCqnService.of(xflights, outbox);
  bookings.forEach(b -> outboxedXFlights.emit("BookingCreated",
    Map.of("flight", b.getFlightId(), "date", b.getFlightDate())));
}
```
:::

If the transaction rolls back, no booking request is sent.

> [!tip] Enabled by default
> Event queues are enabled by default — there's nothing to install or activate. The persistent queue starts with your application; the configuration shown later is only for tuning.

The `xflights` connection here stands in for any remote service you've configured under `cds.requires`. The complete setup of the *xtravels* application and the *xflights* service it consumes lives in the [*@capire/xtravels*](https://github.com/capire/xtravels) sample.

A queued call changes *when* work happens and *what the caller can expect back*:

- A **direct** call returns the remote service's result (or error) before the local transaction commits.
- A **queued** call writes the message to the queue inside the local transaction and returns. The actual remote dispatch happens after commit, in the background.

> [!warning] Queued calls discard the direct return value
> A queued service persists the request and returns after the message is stored, not after the remote operation finishes. Any return value from `send()` or `run()` is therefore not available to the caller. To act on the outcome, register a [callback handler](#callbacks) on `#succeeded` or `#failed`.

> [!tip] `await` is still needed
> Even though processing is asynchronous, you still need to `await` because the message is written to the database within the current transaction.

In Java, you can also wrap a service at runtime through the service catalog rather than wiring through Spring:

```java
OutboxService outbox = runtime.getServiceCatalog()
    .getService(OutboxService.class, "XFlightsOutbox");
CqnService xflights = runtime.getServiceCatalog()
    .getService(CqnService.class, "xflights");

AsyncCqnService queued = AsyncCqnService.of(xflights, outbox);
queued.emit("BookingCreated", Map.of("flight", "AA017", "date", "2026-07-15"));
```

To get the original synchronous service from a queued proxy:

::: code-group
```js [Node.js]
const xflights = cds.unqueued(qd_xflights)
```
```java [Java]
CqnService xflights = OutboxService.unboxed(outboxedXFlights);
```
:::


### By Configuration

To outbox a service centrally, without touching handler code, set a flag on its configuration. Every call from your handlers is then queued automatically.

::: code-group
```json [Node.js — package.json]
{
  "cds": {
    "requires": {
      "messaging": {
        "outboxed": true
      }
    }
  }
}
```
```yaml [Java — application.yaml]
cds:
  outbox:
    services:
      DefaultOutboxUnordered:
        maxAttempts: 10
```
:::

This is the typical setup for **technical services**, like messaging and audit logging, where every emit must be durable. CAP enables it by default for those services (see [*Auto-Outboxed Services*](#auto-outboxed-services) below).

For **business services**, however, a class-level flag is usually too coarse. Remote integrations called from domain handlers typically need *some* calls outboxed, for example, the post-commit notification to *xflights*, while others stay synchronous (a read-through query, a probe before commit). For that finer control, prefer the programmatic path with `cds.queued()` or `srv.schedule()`.


### Auto-Outboxed Services

Some services are outboxed automatically, so you don't need to wrap or configure them:

| Service | Description |
|---------|-------------|
| `cds.MessagingService` | All messaging services |
| `cds.AuditLogService` | Audit log events |

This ensures that messaging and audit log events are sent reliably and never lost because of transaction rollbacks. They use the persistent queue by default.

[Learn more about auto-outboxed services in Node.js.](../../node.js/event-queues#queueing-a-service){.learn-more}
[Learn more about the outbox in Java.](../../java/event-queues#default-outbox-services){.learn-more}


### Callbacks <Alpha />

Because queued calls return after the message is *stored*, not after the remote operation completes, you can't use the return value of `send()` or `run()` to react to success or failure. Instead, register a callback handler on the queued service:

- `<event>/#succeeded`: fires when processing completes successfully.
- `<event>/#failed`: fires when the message becomes a dead letter (after all retries are exhausted).

**Example:** After *xflights* successfully processes a `BookingCreated` event, the *xtravels* application replicates the booking confirmation back into its own database. If the booking fails, the application updates the local `Bookings` row to surface the error in its UI.

```js
const xflights = await cds.connect.to('xflights')

// Called when the queued booking succeeds
xflights.after('BookingCreated/#succeeded', async (result, req) => {
  console.log('Flight booked successfully:', result)
  // Replicate booking details from remote
})

// Called when the queued booking fails after max retries
xflights.after('BookingCreated/#failed', async (error, req) => {
  console.log('Flight booking failed:', error)
  // Trigger compensation logic
})
```

This is also the foundation for [SAGA-style](https://microservices.io/patterns/data/saga.html) compensation across distributed systems: once an outboxed call has gone out, you maintain consistency by reacting to outcomes and applying compensation logic where needed.

> [!note] Node.js only
> Callback events `#succeeded` and `#failed` are currently available in Node.js only. Java doesn't have an equivalent yet, but it's on the roadmap.

> [!tip] Register on specific events
> Callback handlers must be registered for the specific `#succeeded` or `#failed` events.
> The `*` wildcard handler is not called for these events.


## Inbox

The inbox mirrors the [*'Outbox'* pattern](#outbox) for inbound messages.
When a message arrives from a broker, the messaging service immediately persists it to the database, acknowledges it to the broker, and schedules its processing.

This brings two advantages:

- **Quick acknowledgment**: the broker no longer waits for your processing to complete, which keeps consumer throughput high under load.
- **Controlled processing rate**: if a burst of messages arrives, they are queued in your database and processed at a controlled pace.

> [!note] Especially useful when broker redelivery doesn't fit
> Some message brokers don't allow redelivery or payload correction. Others have fixed redelivery timeouts that expire when your processing legitimately takes longer than the broker's window. With the inbox, the broker's job ends at acknowledgement and failures are handled inside your app via the [dead letter queue](#dead-letter-queue), where you have full control over retry timing, payload correction, and discard.

Enable the inbox in your configuration:

::: code-group
```json [Node.js — package.json]
{
  "cds": {
    "requires": {
      "messaging": {
        "inboxed": true
      }
    }
  }
}
```
```yaml [Java — application.yaml]
cds:
  messaging:
    services:
      - name: messaging-name
        inbox:
          enabled: true
```
:::

> [!warning] Inboxing shifts failure handling to your application
> With inboxing enabled, the broker considers the message delivered as soon as your app stores it.
> If later processing fails, recovery no longer happens in the broker; it happens in your application's retry and dead letter queue flow.


## Scheduled Tasks

Event queues are not limited to outbound calls and messaging.
You can schedule arbitrary work such as data replication, cache refresh, or garbage collection.

A scheduled task is identified by its event name and exists only once: a subsequent `schedule()` call with the same name overwrites the previous schedule (tasks are upserted, not deduplicated). This makes scheduling idempotent, which is convenient during application startup, where the same registration code runs on every boot.

**Example:** Replicate airport master data from the *xflights* service every 10 minutes.

::: code-group
```js [Node.js]
const xflights = await cds.connect.to('xflights')
await xflights.schedule('replicate', { entity: 'Airports' }).every('10m')
```
```java [Java]
@Autowired
OutboxService outbox;

@Autowired
RemoteService xflights;

Schedulable.of(xflights, outbox)
  .scheduled(Schedule.create().every(Duration.ofMinutes(10)))
  .emit("replicate", Map.of("entity", "Airports"));
```
:::

The `schedule()` method queues like `cds.queued(srv).send(event, data)`, that is within the current transaction and dispatched after commit, but it **upserts** a singleton task keyed by event name (or by `.as(name)`) instead of inserting a new entry on every call. It also accepts optional timing:

::: code-group
```js [Node.js]
// Execute once, as soon as possible
await xflights.schedule('cleanup', { olderThan: '30d' })

// Execute once, after a delay
await xflights.schedule('cleanup', { olderThan: '30d' })
  .after('1h') // [!code highlight]

// Execute repeatedly — supports time strings and cron expressions
await xflights.schedule('replicate', { entity: 'Airports' })
  .every('10m') // [!code highlight]
await xflights.schedule('replicate', { entity: 'Airports' })
  .every('*/10 * * * *') // [!code highlight]

// Remove a previously scheduled task
await xflights.unschedule('replicate')
```
```java [Java]
@Autowired
OutboxService outbox;

// Execute once, as soon as possible
outbox.submit("cleanup", message, Schedule.NOW);

// Execute once, after a delay
outbox.submit("cleanup", message,
  Schedule.create().after(Duration.ofHours(1))); // [!code highlight]

// Execute repeatedly
outbox.submit("replicate", message,
  Schedule.create().every(Duration.ofMinutes(10))); // [!code highlight]

// Execute repeatedly on a cron expression (6-field Spring syntax)
outbox.submit("replicate", message,
  Schedule.create().cron("0 */10 * * * *")); // [!code highlight]

// Remove a previously scheduled task
outbox.submit("replicate", OutboxMessage.create(),
  Schedule.create().cancel());
```
:::

**Node.js** — `.after()` accepts milliseconds or a time string (`'1s'`, `'10m'`, `'1h'`). `.every()` accepts the same plus a five-field cron expression. Fluent calls can be combined in any order; `.as()` is typically chained last.

**Java** — `after(Duration)` and `every(Duration)` accept a `java.time.Duration`. `cron(String)` uses the six-field [Spring cron syntax](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/scheduling/support/CronExpression.html) (second minute hour day month weekday). `cron` is mutually exclusive with `after`/`every`; `after` and `every` may be combined.

> [!note] `every` is a post-execution delay
> The interval defined by `.every()` is applied *after* a successful execution completes — it is not a fixed-rate interval. The next run is scheduled from the moment the previous run finishes, not from when it started.

To schedule the same event with different payloads as independent tasks, give each its own task name with `.as(<name>)`:

::: code-group
```js [Node.js]
// Two independent singleton tasks for the same "replicate" event
await xflights.schedule('replicate', { entity: 'Airports' }).every('10m')
  .as('replicate-airports') // [!code highlight]
await xflights.schedule('replicate', { entity: 'Airlines' }).every('1h')
  .as('replicate-airlines') // [!code highlight]

// Each can be removed independently by its task name
await xflights.unschedule('replicate-airports')
await xflights.unschedule('replicate-airlines')
```
```java [Java]
OutboxMessage airports = OutboxMessage.create();
airports.setParams(Map.of("entity", "Airports"));
outbox.submit("replicate", airports,
  Schedule.create().as("replicate-airports").every(Duration.ofMinutes(10))); // [!code highlight]

OutboxMessage airlines = OutboxMessage.create();
airlines.setParams(Map.of("entity", "Airlines"));
outbox.submit("replicate", airlines,
  Schedule.create().as("replicate-airlines").every(Duration.ofHours(1))); // [!code highlight]

// Each can be removed independently by its task name
outbox.submit("replicate", OutboxMessage.create(),
  Schedule.create().as("replicate-airports").cancel());
outbox.submit("replicate", OutboxMessage.create(),
  Schedule.create().as("replicate-airlines").cancel());
```
:::

> [!important] Re-submitting replaces both schedule and payload
> When a named task is re-submitted, both the schedule *and* the payload are replaced. If you only want to update the timing, you still need to provide the full payload. Re-submitting while the task is currently being processed is safe — the updated schedule and payload take effect after the current execution completes.

> [!note] Cancellation semantics
> Cancelling a scheduled task removes it from the schedule so no future executions occur. A currently running execution **completes** — cancellation is not an interrupt. If the task was already picked up for processing at the moment the cancellation is submitted, at most one additional execution may occur. Cancelling a non-existent task is a silent no-op.

> [!tip] Real-world example: data federation
> The [data federation guide](../integration/data-federation) uses `srv.schedule().every()` to implement polling-based replication, fetching incremental updates from remote services on a regular interval.


## End-to-End Example

The following example from [*@capire/xtravels*](https://github.com/capire/xtravels) ties together queueing, callbacks, and local state updates — a choreography-based SAGA pattern across two microservices.

> [!note] Uses an alpha API
> This example relies on [Callbacks](#callbacks), which are currently `<Alpha />` and Node.js-only.

```js [srv/travel-service.js]
const cds = require('@sap/cds')

module.exports = class TravelService extends cds.ApplicationService {
  async init() {

    const xflights = await cds.connect.to('xflights')
    const qd_xflights = cds.queued(xflights)
    const messaging = await cds.connect.to('messaging')

    const { Flights, Travels } = this.entities
    const { Bookings } = cds.entities('sap.capire.travels')

    // After saving a Travel, emit a BookingCreated event for each booking.
    // Travel_ID + Pos are carried as headers so the callbacks can correlate back.
    this.after('SAVE', Travels, (_, req) => {
      const { Bookings: bookings = [] } = req.data
      return Promise.all(bookings.map(booking => {
        const { Flight_ID: flight, Flight_date: date, Travel_ID, Pos } = booking
        return qd_xflights.emit('BookingCreated', { flight, date }, { Travel_ID, Pos })
      }))
    })

    // xflights confirmed the seat — mark the booking as Confirmed
    xflights.after('BookingCreated/#succeeded', async (_, req) => {
      const { Travel_ID, Pos } = req.headers
      await UPDATE(Bookings, { Travel_ID, Pos }).set({ Status_code: 'C' })
    })

    // xflights rejected the seat (e.g. no availability) — mark as Failed
    // This is not a rollback: the booking was never confirmed, so there is nothing to undo.
    // The status is recorded explicitly, leaving it visible for manual resolution or retry.
    xflights.after('BookingCreated/#failed', async (err, req) => {
      const { Travel_ID, Pos } = req.headers
      await UPDATE(Bookings, { Travel_ID, Pos }).set({ Status_code: 'F' })
    })

    // Keep the local Flights replica current whenever xflights updates seat counts.
    // The inbox (inboxed: true on messaging) stores the event before acknowledging the broker,
    // so it is processed reliably even if xflights is temporarily ahead of xtravels.
    // FlightUpdated intentionally carries no seat count in its payload — messages can overtake each
    // other, so we re-read the authoritative current value from xflights instead.
    messaging.on('FlightUpdated', async (event) => {
      const { flight_ID: ID, date } = event.data
      const { free_seats } = await xflights.read(Flights, { ID, date }).columns('free_seats')
      await UPDATE(Flights, { ID, date }).set({ free_seats })
    })

    await super.init()
  }
}
```

The correlation context (`Travel_ID`, `Pos`) is passed as **headers** on the queued emit and available on `req.headers` in the callbacks — the payload itself carries only the business data needed by xflights.

The `FlightUpdated` handler illustrates the inbox pattern: the broker acknowledges delivery as soon as the message is stored, and the re-read from xflights avoids stale data from out-of-order messages.

This example highlights three design rules: use callbacks or persisted status updates for outcomes, not direct return values; carry correlation context in event headers, not in the payload; and re-read authoritative state at processing time rather than trusting the event payload when messages can overtake each other.


## Configuration

The persistent queue is enabled by default, which means messages are stored in the `cds.outbox.Messages` table within the current transaction. The `outbox` namespace is historical and the table backs all three patterns. You only configure the queue when you want to deviate from the defaults.

::: code-group
```json [Node.js — package.json]
{
  "cds": {
    "requires": {
      "queue": {
        "maxAttempts": 11 //> default: 10
      }
    }
  }
}
```
```yaml [Java — application.yaml]
cds:
  outbox:
    services:
      DefaultOutboxUnordered:
        maxAttempts: 11 #> default: 10
```
:::

::: details Node.js — `cds.requires.queue`

| Option | Default | Description |
|--------|---------|-------------|
| `maxAttempts` | `10` | Maximum retries before a message becomes a dead letter |
| `timeout` | `"1h"` | Time after which a `processing` message is considered abandoned and eligible for reprocessing |

:::

::: details Java — per outbox service

| Option | Default | Description |
|--------|---------|-------------|
| `maxAttempts` | `10` | Maximum retries before the entry becomes a dead letter |
| `enabled` | `true` | Set to `false` to disable an outbox service |

A separate, runtime-global setting controls how long a `processing` entry can be held before another instance may pick it up:

```yaml
cds.outbox.persistent.statusLock.timeout: PT1H  # default
```

:::

To disable event queues entirely, set `cds.requires.queue: false`.

To disable queueing for a specific service in Node.js, set `outboxed: false` on it (for example, `cds.requires.messaging.outboxed: false`). In Java, set `cds.outbox.services.<name>.enabled: false`.


## Operations

Once event queues are in production, you need to know how runners coordinate across instances, how authorization carries over the queue boundary, what happens when processing fails, how to manage messages that have ended up in the dead letter queue, and how to observe the queue's health.

### Locking

CAP uses **application-level locking** to coordinate processors across application instances. When a runner picks up a message, it sets the message's `status` to `processing`. Other runners skip messages in that state. After processing, the row lock is released. The message is deleted (on success) or rescheduled (on failure) in the processing transaction.

> [!warning] Migrating across `@sap/cds` major versions
> This guide describes the implementation in `@sap/cds` 10+. Older versions select messages differently:
>
> - **`@sap/cds` 8** does **not** check the `status` column at all.
> - **`@sap/cds` 9** checks `status` but holds a row-level lock for the duration of processing (`legacyLocking: true` is the default in cds 9).
> - **`@sap/cds` 10** uses application-level locking via `status` and releases the row lock after selection.
>
> A rolling upgrade from `@sap/cds` 8 directly to 10 can therefore lead to **double-processing of messages**, because `@sap/cds` 8 instances pick up messages that an `@sap/cds` 10 instance has already marked `processing`. Plan downtime, drain the queue before upgrading, or upgrade through `@sap/cds` 9 first.

### Authorization

When an event is processed asynchronously, the original HTTP request context is no longer available.
CAP handles this as follows:

- The **user ID** is stored with the queued message and re-created when the message is processed.
- **User roles, attributes, and tokens** are *not* stored. Asynchronous processing always runs in privileged mode.

No principal propagation occurs across the queue boundary, by design. That would require CAP to persist authentication tokens in some encrypted form, and those tokens often expire long before the queued work runs.

*"Privileged mode"* means `@requires` annotations don't gate execution in queued handlers — the runtime grants full service access regardless of the stored user ID. If your handler must enforce the original caller's identity, carry the relevant claims via **payload or headers** at queue time and read them during processing. For scheduled tasks, headers are a natural fit since they stay in-process:

```js
// Schedule a task, carrying the originating user as a header
await xflights.schedule('replicate', { entity: 'Airports' }, { requestedBy: req.user.id })

// At processing time — read from headers
xflights.on('replicate', async (req) => {
  const { requestedBy } = req.headers
  // use requestedBy to derive authorization or audit context
})
```

> [!warning] Headers are forwarded to the target system
> When a **queued outbound call** (to a remote service or message broker) is dispatched, CAP forwards the stored headers to the target. Do not carry sensitive data — authentication tokens, personal data, secrets — in headers on outbound calls. For **scheduled tasks**, which are processed in-process and never leave the application, headers are not forwarded and this restriction doesn't apply.

As a consequence, queued calls reach their target system in the context of a *technical user* of the calling application, not the original end user. Queue only those calls that the target system can authorize for a technical user, for example, service-to-service calls that don't depend on the end-user identity.

### Error Handling

When processing fails, the system retries the message with exponentially increasing delays.
After a configurable maximum number of attempts, the message is moved to the dead letter queue.

Some errors are identified as *unrecoverable*, for example, when a topic is forbidden by the broker.
These messages are immediately moved to the dead letter queue without further retries.

To mark your own errors as unrecoverable in Node.js, for example, when *xflights* rejects a `replicate` request with a permanent 4xx response:

```js
xflights.on('replicate', async (req) => {
  try {
    // call xflights to fetch the delta for the entity
    // and write the result to the database
  } catch (e) {
    if (e.code >= 400 && e.code < 500) {  // [!code highlight]
      // semantic error — don't retry     // [!code highlight]
      e.unrecoverable = true              // [!code highlight]
    }                                     // [!code highlight]
    throw e
  }
})
```

In Java, suppress retries by catching the error and calling `context.setCompleted()`:

```java
@On(service = "XFlightsOutbox", event = "replicate")
void replicate(OutboxMessageEventContext context) {
  try {
    // call xflights to fetch the delta for the entity
    // and write the result to the database
  } catch (HttpClientErrorException e) {
    if (e.getStatusCode().is4xxClientError()) { // [!code highlight]
      // semantic error — don't retry           // [!code highlight]
      context.setCompleted();                   // [!code highlight]
      return;                                   // [!code highlight]
    }                                           // [!code highlight]
    throw e; // transient — let the runner retry
  }
}
```

### Dead Letter Queue

Messages that exceed the maximum retry count remain in the `cds.outbox.Messages` database table with their error information intact.
These entries form the *dead letter queue* and require manual intervention, either to fix the underlying issue and retry, or to discard the message.

> [!warning] Increasing `maxAttempts` between deployments
> You can raise `maxAttempts` between deployments. Older entries that had reached the previous maximum are retried automatically after the new deployment. If the dead letter queue is large, this causes unintended load on the system.

For triage, query the table directly:

```sql
SELECT ID, target, status, attempts, lastAttemptTimestamp, lastError
  FROM cds_outbox_Messages
  ORDER BY timestamp DESC;
```

You can also expose a CDS service to manage dead-letter entries with bound *revive* and *delete* actions:

**1. Define the service**

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

> [!warning] Restrict access
> The dead letter queue contains sensitive data.
> Ensure the service is accessible only to internal users.

**2. Filter for dead entries**

As `maxAttempts` is configurable, its value is not added as a static filter to the projection. Apply it programmatically.

::: code-group
```js [Node.js — srv/outbox-dead-letter-queue-service.js]
const cds = require('@sap/cds')

module.exports = class OutboxDeadLetterQueueService extends cds.ApplicationService {
  async init() {
    this.before('READ', 'DeadOutboxMessages', function (req) {
      const { maxAttempts } = cds.env.requires.queue
      req.query.where('attempts >= ', maxAttempts)
    })
    await super.init()
  }
}
```
```java [Java — DeadOutboxMessagesHandler.java]
@Component
@ServiceName(OutboxDeadLetterQueueService_.CDS_NAME)
public class DeadOutboxMessagesHandler implements EventHandler {

  private final PersistenceService db;

  public DeadOutboxMessagesHandler(
      @Qualifier(PersistenceService.DEFAULT_NAME) PersistenceService db) {
    this.db = db;
  }

  @Before(event = CqnService.EVENT_READ, entity = DeadOutboxMessages_.CDS_NAME)
  public void addDeadEntryFilter(CdsReadEventContext context) {
    Optional<Predicate> outboxFilters = createOutboxFilters(context.getCdsRuntime());
    outboxFilters.ifPresent(filter -> {
      CqnSelect modified = copy(context.getCqn(), new Modifier() {
        @Override
        public CqnPredicate where(Predicate where) {
          return filter.and(where);
        }
      });
      context.setCqn(modified);
    });
  }
}
```
:::

**3. Implement bound actions**

Entries in the dead letter queue can be *revived* by resetting the retry counter to zero, or *deleted* permanently.

::: code-group
```js [Node.js — srv/outbox-dead-letter-queue-service.js]
this.on('revive', 'DeadOutboxMessages', async function (req) {
  await UPDATE(req.subject).set({ attempts: 0 })
})

this.on('delete', 'DeadOutboxMessages', async function (req) {
  await DELETE.from(req.subject)
})
```
```java [Java — DeadOutboxMessagesHandler.java]
@On
public void reviveOutboxMessage(DeadOutboxMessagesReviveContext context) {
  CqnAnalyzer analyzer = CqnAnalyzer.create(context.getModel());
  Map<String, Object> key = analyzer.analyze(context.getCqn()).rootKeys();
  Messages msg = Messages.create((String) key.get(Messages.ID));
  msg.setAttempts(0);
  db.run(Update.entity(Messages_.class).entry(key).data(msg));
  context.setCompleted();
}

@On
public void deleteOutboxEntry(DeadOutboxMessagesDeleteContext context) {
  CqnAnalyzer analyzer = CqnAnalyzer.create(context.getModel());
  Map<String, Object> key = analyzer.analyze(context.getCqn()).rootKeys();
  db.run(Delete.from(Messages_.class).byId(key.get(Messages.ID)));
  context.setCompleted();
}
```
:::



### Observability

Both stacks export queue metrics through OpenTelemetry, sourced from the `cds.outbox.Messages` table:

| Metric | Description | Type |
|---|---|---|
| `cold` (`com.sap.cds.outbox.coldEntries`) | Entries that exhausted retries and won't be retried — the dead letter queue size. | Gauge |
| `remaining` (`com.sap.cds.outbox.remainingEntries`) | Entries pending delivery. | Gauge |
| `min` / `med` / `max storage time` (`com.sap.cds.outbox.{min,med,max}StorageTimeSeconds`) | How long entries have been sitting in the outbox, in seconds. | Gauge |
| `incoming` (`com.sap.cds.outbox.incomingMessages`) | Messages submitted to the outbox. | Counter |
| `outgoing` (`com.sap.cds.outbox.outgoingMessages`) | Messages successfully dispatched. | Counter |

Metrics are scoped per microservice instance, outbox name, and tenant. The Java integration is built in. For Node.js, add `@cap-js/telemetry` to your dependencies. Queue metrics then emit alongside CAP's other telemetry signals.

[Learn more about Java OpenTelemetry integration.](../../java/operating-applications/observability#open-telemetry){.learn-more}
[Learn more about `@cap-js/telemetry`.](https://github.com/cap-js/telemetry#queue){.learn-more}


## Next Steps

For stack-specific APIs, configuration keys, and troubleshooting, see the following:

- [Event Queues in Node.js](../../node.js/event-queues) — `cds.queued`, `cds.unqueued`, `cds.flush`, `srv.schedule` (incl. `#succeeded` / `#failed` callbacks), queue configuration, troubleshooting.
- [Event Queues in Java](../../java/event-queues) — `OutboxService`, `AsyncCqnService`, custom outbox services, the technical outbox API, error-handling patterns, and event versioning for blue/green deployments.

Most event-queue usage comes through messaging or remote services. From here you'll likely want to look at:

- [Messaging](messaging) — emitting and consuming events between CAP applications and via brokers; messaging services are auto-outboxed.
- [CAP-Level Service Integration](../integration/calesi) — consuming remote services as if they were local; outboxing them centrally with `outboxed: true`.
- [CAP-Level Data Federation](../integration/data-federation) — using `srv.schedule().every()` for polling-based replication from remote services.

