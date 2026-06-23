---
synopsis: >
  Java APIs and configuration for CAP's Transactional Event Queues — `OutboxService`, `AsyncCqnService`, scheduling, custom outbox services, error handling, and event versioning.
status: released
---

# Event Queues in Java

For concepts, use cases, and guarantees, see the [Transactional Event Queues](../guides/events/event-queues) guide. This page covers the Java-specific APIs and configuration.

In Java, event queues are exposed as **outbox services**. The runtime ships two default outboxes. First, `DefaultOutboxOrdered` that is used by messaging services and processes entries in submission order. Second, `DefaultOutboxUnordered` that is used by the audit-log service and processes entries in parallel. You can register custom outbox services for advanced isolation, scaling, or shared-database scenarios.

[[toc]]


## Programmatic API

### Queueing a Service

Wrap any CAP service with outbox handling. Events triggered on the returned wrapper are stored in the outbox first and executed asynchronously after commit. Relevant information from the `RequestContext` is stored with the event data. The user context is downgraded to a system user context.

```java
OutboxService myCustomOutbox = ...;
CqnService remoteS4 = ...;
CqnService outboxedS4 = myCustomOutbox.outboxed(remoteS4);
```

If a method on the outboxed service has a return value, it returns `null` - the call is asynchronous. To make this explicit at the type level, use the variant that wraps the service with an API designed for asynchronous use:

```java
OutboxService myCustomOutbox = ...;
CqnService remoteS4 = ...;
AsyncCqnService outboxedS4 = myCustomOutbox.outboxed(remoteS4, AsyncCqnService.class);
```

`AsyncCqnService.of()` is a convenience for the common case:

```java
OutboxService myCustomOutbox = ...;
CqnService remoteS4 = ...;
AsyncCqnService outboxedS4 = AsyncCqnService.of(remoteS4, myCustomOutbox);
```

The outboxed service is thread-safe and can be cached. Any service that implements the `Service` interface can be outboxed, and each call is asynchronously executed if the API method internally calls `Service.emit(EventContext)`.

To get the original synchronous service from a wrapped one:

```java
CqnService synchronous = OutboxService.unboxed(outboxedS4);
```

::: tip Custom asynchronous-ready APIs
When defining your own asynchronous-ready interface, it must provide the same method signatures as the interface of the outboxed service, except for the return types. Those return types must be `void`.
:::

::: warning Java Proxy
A service wrapped by an outbox is a [Java Proxy](https://docs.oracle.com/javase/8/docs/technotes/guides/reflection/proxy.html). It only implements the *interfaces* of the underlying object, which means you can't cast an outboxed service proxy back to its concrete implementation class.
:::


### Scheduling

CAP Java offers two ways to schedule a queued event, both controlled by a `Schedule` builder.

**Option 1 — pass a `Schedule` to `submit`** on a regular outbox, per call:

```java
@Autowired
OutboxService outboxService;  // DefaultOutboxUnordered — injectable without qualifier

OutboxMessage message = OutboxMessage.create();
message.setParams(Map.of("entity", "Airports"));

outboxService.submit("replicate", message,
  Schedule.create().every(Duration.ofMinutes(10)));
```

**Option 2 — wrap a service with `Schedulable`** so all subsequent emits use a fixed schedule:

```java
@Autowired
OutboxService outboxService;

@Autowired
RemoteService xflights;

Schedulable<RemoteService> scheduled = Schedulable.of(xflights, outboxService)
  .scheduled(Schedule.create().every(Duration.ofMinutes(10)));

scheduled.emit("replicate", Map.of("entity", "Airports"));
```

Every outboxed service is guaranteed to implement `Schedulable<T>` — its single method `scheduled(Schedule)` returns the same service typed to use the given schedule on every subsequent emit.

#### `Schedule` Options

`Schedule` is a small builder with three timing options:

```java
// Immediate execution
Schedule.NOW;

// Execute once, after a delay
Schedule.create().after(Duration.ofHours(1));

// Execute repeatedly, with a fixed delay between successful runs
Schedule.create().every(Duration.ofMinutes(10));

// Execute with an initial delay, then recurring
Schedule.create().after(Duration.ofSeconds(10)).every(Duration.ofMinutes(5));

// Execute repeatedly, on a Spring cron expression
Schedule.create().cron("0 0 3 * * *");
```

`after` and `every` accept any [`java.time.Duration`](https://docs.oracle.com/javase/8/docs/api/java/time/Duration.html). `cron` follows the [Spring cron syntax](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/scheduling/support/CronExpression.html). `cron` is mutually exclusive with `after`/`every` — combining them throws `IllegalArgumentException`. `after` and `every` may be combined: the first execution is delayed by `after`, then `every` applies between subsequent runs.

> [!warning] Cron field counts differ between stacks
> Java cron expressions are **six fields including seconds** (Spring syntax); Node.js cron expressions are **five fields**. A cron string copied between stacks won't behave the same way.

Every scheduled task has a name — by default it inherits the event name, which makes scheduling idempotent: a subsequent submission for the same event name overwrites the previous schedule (tasks are upserted, not deduplicated). Use `.as(name)` explicitly only when you want a custom name different from the event name — for example, to schedule the same event with different payloads as separate, independently-managed tasks:

```java
// Two independent singleton tasks for the same "replicate" event
OutboxMessage airports = OutboxMessage.create();
airports.setParams(Map.of("entity", "Airports"));
outboxService.submit("replicate", airports,
  Schedule.create().as("replicate-airports").every(Duration.ofMinutes(10)));

OutboxMessage airlines = OutboxMessage.create();
airlines.setParams(Map.of("entity", "Airlines"));
outboxService.submit("replicate", airlines,
  Schedule.create().as("replicate-airlines").every(Duration.ofHours(1)));

// Each can be removed independently by its task name
outboxService.submit("replicate", OutboxMessage.create(),
  Schedule.create().as("replicate-airports").cancel());
outboxService.submit("replicate", OutboxMessage.create(),
  Schedule.create().as("replicate-airlines").cancel());
```

To remove a task that uses the default event name, submit a cancellation without `.as()`:

```java
outboxService.submit("replicate", OutboxMessage.create(),
  Schedule.create().cancel());
```


### Technical Outbox API

The technical API outboxes custom messages for arbitrary events or processing logic. The `OutboxMessage` instance is serialized to JSON and stored in the database, so all data must be JSON-serializable.

```java
OutboxService outboxService = runtime.getServiceCatalog()
  .getService(OutboxService.class, "<OutboxServiceName>");

OutboxMessage message = OutboxMessage.create();
message.setParams(Map.of("name", "John", "lastname", "Doe"));

outboxService.submit("myEvent", message);
```

Register an `@On` handler on the outbox service to perform the processing logic when the message is published:

```java
@On(service = "<OutboxServiceName>", event = "myEvent")
void processMyEvent(OutboxMessageEventContext context) {
  OutboxMessage message = context.getMessage();
  Map<String, Object> params = message.getParams();
  String name = (String) params.get("name");
  String lastname = (String) params.get("lastname");

  // Perform processing logic for myEvent

  context.setCompleted();
}
```

The handler must complete the context after executing the processing logic.

[Learn more about event handlers.](./event-handlers/){.learn-more}


#### Custom Serialization

The outbox has no information about the structure or data types being serialized. If your custom messages use non-default data types, or you need extra context properties, register `@Before` and `@On` handlers to customize serialization and deserialization. This isn't required for CDS-model-based services.

```java [srv/src/main/java/com/myapp/CustomOutboxHandler.java]
@Component
@ServiceName(value = "*", type = OutboxService.class)
public class CustomOutboxHandler implements EventHandler {

    @On
    void publishedByOutbox(OutboxMessageEventContext context) {
        // Restore custom values from context only
        if (Boolean.FALSE.equals(context.getIsInbound())) {
            return;
        }

        // custom deserialization logic
        Long date = (Long) context.getMessage().getParams().get("orderDate");
        context.getMessage().getParams().put("orderDate", Instant.ofEpochSecond(date));
    }

    @Before(event = "*")
    void prepareOutboxMessage(OutboxMessageEventContext context) {
        // prepare outbox message for storage only
        if (Boolean.TRUE.equals(context.getIsInbound())) {
            return;
        }

        // custom serialization logic
        Instant date = (Instant) context.getMessage().getParams().get("orderDate");
        context.getMessage().getParams().put("orderDate", date.getEpochSecond());
    }
}
```

> [!warning] Don't complete the context in either of those handlers
> Calling `setCompleted` here breaks the chain. The next handler isn't called and processing fails.


### Error Handling

By default, the outbox retries publishing a message on error until it reaches `maxAttempts`. This makes applications resilient against unavailability of external systems.

Some errors aren't worth retrying, for example, a `400 Bad Request` from a downstream service indicates a *semantic* error that the same payload reproduces on every attempt. Wrap the processing in a try/catch and call `context.setCompleted()` to remove the message from the queue without further retries:

```java
@On(service = "<OutboxServiceName>", event = "myEvent")
void processMyEvent(OutboxMessageEventContext context) {
  try {
    // Perform processing logic for myEvent
  } catch (Exception e) {
    if (isUnrecoverableSemanticError(e)) {
      // Perform application-specific counter-measures
      context.setCompleted(); // indicate message deletion to outbox
    } else {
      throw e; // indicate error to outbox
    }
  }
}
```

If the original processing logic isn't yours and you need to wrap its error handling, use `EventContext.proceed()`:

```java
@On(service = OutboxService.PERSISTENT_ORDERED_NAME, event = AuditLogService.DEFAULT_NAME)
void handleAuditLogProcessingErrors(OutboxMessageEventContext context) {
  try {
    context.proceed(); // wrap default logic
  } catch (Exception e) {
    if (isUnrecoverableSemanticError(e)) {
      // Perform application-specific counter-measures
      context.setCompleted();
    } else {
      throw e;
    }
  }
}
```

[Learn more about `EventContext.proceed()`.](./event-handlers/#proceed-on){.learn-more}

> [!note] Callbacks not yet available
> The `#succeeded` / `#failed` callback events documented for Node.js have no Java equivalent yet, see [Callbacks](../guides/events/event-queues#callbacks) in the common guide.


## Configuration

### Default Outbox Services

`DefaultOutboxUnordered` is the primary persistent outbox — it is used by the [AuditLog service](auditlog) by default and registered as the primary Spring bean for `OutboxService`, so it can be injected directly without a qualifier:

```java
@Autowired
OutboxService outboxService; // DefaultOutboxUnordered
```

`DefaultOutboxOrdered` is used by [messaging services](messaging) by default; it processes entries in submission order.

The configuration of both can be overridden in *application.yaml*:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  outbox:
    services:
      DefaultOutboxOrdered:
        maxAttempts: 10
      DefaultOutboxUnordered:
        maxAttempts: 10
```
:::

| Option | Default | Description |
|---|---|---|
| `maxAttempts` | `10` | Number of unsuccessful emits until the message is ignored. It still remains in the database. |
| `enabled` | `true` | Set to `false` to disable an outbox service. |

#### Status Lock Timeout

A separate, runtime-global setting controls how long a `processing` entry can be held before another instance picks it up, which is useful when an instance crashes mid-processing:

```yaml [srv/src/main/resources/application.yaml]
cds:
  outbox:
    persistent:
      statusLock:
        timeout: PT1H  # default
```


### Collector Strategies

In a multitenant environment, outbox entries reside in tenant-specific databases. The outbox collector is triggered when events are submitted. However, if an application instance crashes, unprocessed entries for a tenant are only retried when that tenant next produces a new outbox event. If a tenant goes quiet after a crash, remaining entries stay unprocessed.

Both strategies are disabled by default and must be enabled explicitly.

#### Hot-Tenant Task

Tracks which tenants have been recently active and only triggers the collector for those tenants. Lookups are distributed over time to avoid activity jams — a lighter alternative to the all-tenants task for large tenant counts.

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  outbox:
    persistent:
      scheduler:
        hotTenantTask:
          enabled: true
          maxTaskDelay: 2h  # max time after a tenant event before checking its outbox
```
:::

#### All-Tenants Task

Periodically iterates over **all** tenant outboxes. Acts as a safety net to ensure no entries are missed regardless of tenant activity.

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  outbox:
    persistent:
      scheduler:
        enabled: true
        allTenantsTask:
          enabled: true
          startDelay: 30s   # delay after startup before first run
          interval: 2h      # interval between runs
          spreadTime: 15m   # spread individual tenant checks to avoid thundering-herd
```
:::

> [!warning] Performance for large tenant counts
> Traversing all tenants can cause significant overhead due to tenant context switches. Consider the hot-tenant task as a lighter alternative.


### Custom Outbox Services

Configure custom persistent outboxes in *application.yaml*:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  outbox:
    services:
      MyCustomOutbox:
        maxAttempts: 5
      MyOtherCustomOutbox:
        maxAttempts: 10
```
:::

Access them either via the service catalog:

```java
OutboxService myCustomOutbox = cdsRuntime.getServiceCatalog()
    .getService(OutboxService.class, "MyCustomOutbox");
```

or by Spring injection:

```java
@Component
public class MySpringComponent {
  private final OutboxService myCustomOutbox;

  public MySpringComponent(@Qualifier("MyCustomOutbox") OutboxService myCustomOutbox) {
    this.myCustomOutbox = myCustomOutbox;
  }
}
```

::: warning Removing a custom outbox
Before removing a custom outbox from the configuration, ensure no unprocessed entries remain in `cds.outbox.Messages` for it. Removing the outbox configuration does not delete the entries — they remain in the table and aren't processed anymore.
:::


### Shared Databases

> [!warning] Workaround for unsupported scenario
> CAP Java does not yet support microservices with a shared database out of the box: the two static-named default outboxes (`DefaultOutboxOrdered`, `DefaultOutboxUnordered`) are shared across all services and introduce conflicts.

The manual workaround uses isolated custom outboxes with service-specific names:

**1. Deactivate the default outboxes and create service-specific ones**

```yaml
cds:
  outbox:
    services:
      # deactivate default outboxes
      DefaultOutboxUnordered.enabled: false
      DefaultOutboxOrdered.enabled: false
      # custom outboxes with unique names
      Service1CustomOutboxOrdered:
        maxAttempts: 10
      Service1CustomOutboxUnordered:
        maxAttempts: 10
```

**2. Adapt audit log configuration**

The default audit-log outbox is `DefaultOutboxUnordered`. Point it at the new custom outbox:

```yaml
cds:
  auditlog:
    outbox.name: Service1CustomOutboxUnordered
```

**3. Adapt messaging configuration**

For *each* messaging service in the application, point it at the new ordered outbox:

```yaml
cds:
  messaging:
    services:
      MessagingService1:
        outbox.name: Service1CustomOutboxOrdered
      MessagingService2:
        outbox.name: Service1CustomOutboxOrdered
```

::: tip Required for isolation
Both deactivating the defaults *and* using unique outbox namespaces are required to achieve service isolation in a shared-database scenario.
:::


### Event Versions

In blue/green scenarios, outbox collectors of an older deployment cannot process events emitted by a newer deployment. Configure each deployment with an *event version* so older collectors skip newer events:

[`cds.environment.deployment.version: 2`](./developing-applications/properties#cds-environment-deployment-version)

::: warning Ascending versions only
Configured deployment versions must increase. Messages are processed by an outbox collector only if the event version is less than or equal to the deployment version.
:::

To automate versioning from the Maven app version, enable resource filtering in *srv/pom.xml*:

::: code-group
```xml [srv/pom.xml]
<build>
  ...
  <resources>
    <resource>
      <directory>src/main/resources</directory>
      <filtering>true</filtering>
    </resource>
  </resources>
  ...
```
:::

Then use the `${project.version}` placeholder:

[`cds.environment.deployment.version: ${project.version}`](./developing-applications/properties#cds-environment-deployment-version)

A startup log entry shows the configured version:

```bash
2024-12-19T11:21:33.253+01:00 INFO 3420 --- [main] cds.services.impl.utils.BuildInfo : application.deployment.version: 1.0.0-SNAPSHOT
```

To bypass the version check for a specific custom outbox, set [`cds.outbox.services.MyCustomOutbox.checkVersion: false`](./developing-applications/properties#cds-outbox-services-<key>-checkVersion).


## Troubleshooting

### Inspecting `cds.outbox.Messages`

To see what's currently queued, query `cds.outbox.Messages` directly through the `PersistenceService`. The columns most useful for triage are `status`, `attempts`, `target`, `lastError`, and `lastAttemptTimestamp`:

```java
@Autowired @Qualifier(PersistenceService.DEFAULT_NAME)
PersistenceService db;

Result result = db.run(Select.from(Messages_.class)
    .columns(m -> m.ID(), m -> m.target(), m -> m.status(),
             m -> m.attempts(), m -> m.lastAttemptTimestamp(), m -> m.lastError())
    .orderBy(m -> m.timestamp().desc()));
```

For a managed view with bound *revive* and *delete* actions, see [*Dead Letter Queue*](../guides/events/event-queues#dead-letter-queue) in the common guide.

### Deleting Entries

To clear stuck messages programmatically:

```java
db.run(Delete.from(Messages_.class));
```


---

Working in Node.js? See [Event Queues in Node.js](../node.js/event-queues).
