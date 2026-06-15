---
synopsis: >
  Java APIs and configuration for CAP's Transactional Event Queues — `OutboxService`, `AsyncCqnService`, custom outbox services, error handling, and event versioning.
status: released
---

# Event Queues in Java
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

For concepts, use cases, and guarantees, see the [Transactional Event Queues](../guides/events/event-queues) guide. This page covers the Java-specific APIs and configuration on top of that.

In Java, event queues are exposed as **outbox services**. The runtime ships two default outboxes — `DefaultOutboxOrdered` (used by messaging services; processes entries in submission order) and `DefaultOutboxUnordered` (used by the audit-log service; may process entries in parallel). You can register custom outbox services for advanced isolation, scaling, or shared-database scenarios.

[[toc]]


## Programmatic API

### Outboxing a Service

Wrap any CAP service with outbox handling. Events triggered on the returned wrapper are stored in the outbox first and executed asynchronously after commit. Relevant information from the `RequestContext` is stored with the event data; the user context is downgraded to a system user context.

```java
OutboxService myCustomOutbox = ...;
CqnService remoteS4 = ...;
CqnService outboxedS4 = myCustomOutbox.outboxed(remoteS4);
```

If a method on the outboxed service has a return value, it returns `null` — the call is asynchronous. To make this explicit at the type level, use the variant that wraps the service with an asynchronous-suited API:

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

To recover the synchronous service from a wrapped one:

```java
CqnService synchronous = OutboxService.unboxed(outboxedS4);
```

::: tip Custom asynchronous-suited APIs
When defining your own asynchronous-suited interface, it must provide the same method signatures as the interface of the outboxed service, except for the return types — those should be `void`.
:::

::: warning Java Proxy
A service wrapped by an outbox is a [Java Proxy](https://docs.oracle.com/javase/8/docs/technotes/guides/reflection/proxy.html). It only implements the *interfaces* of the underlying object — you can't cast an outboxed service proxy back to its concrete implementation class.
:::


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

::: tip Customizing outbox entries
The outbox has no information about the structure or data types being serialized. If your custom messages use non-default data types — or you need extra context properties — register `@Before` and `@On` handlers to customize serialization and deserialization. *(This isn't required for CDS-model-based services.)*

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
        context.getMessage().getParams().put("orderDate", new Long(date.getEpochSecond()));
    }
}
```

**Don't complete the context in either of those handlers**, otherwise the next handler in the chain isn't called and processing breaks.
:::


### Error-Handling Patterns

By default the outbox retries publishing a message on error until it reaches `maxAttempts`. This makes applications resilient against unavailability of external systems.

Some errors aren't worth retrying — for example, a `400 Bad Request` from a downstream service indicates a *semantic* error that the same payload will reproduce on every attempt. Wrap the processing in a try/catch and call `context.setCompleted()` to remove the message from the queue without further retries:

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


### Scheduling

Every outboxed service is guaranteed to implement the [`Schedulable<T>`](https://github.wdf.sap.corp/cds-java/cds-services/blob/main/cds-services-api/src/main/java/com/sap/cds/services/outbox/Schedulable.java) interface, which adds a single method, `scheduled(Schedule)`. It returns a service whose subsequent emits are queued with the given timing — equivalent to the Node.js `srv.schedule()` shortcut in the common guide.

A scheduled task with a name is a **singleton**: a subsequent submission with the same task name overwrites the previous schedule (tasks are upserted, not deduplicated). This makes scheduling idempotent — convenient during application startup, where the same registration code may run on every boot.

**Example:** Replicate airport master data from the *xflights* service every 10 minutes.

```java
RemoteService xflights = ...;
OutboxService outbox = ...;

Schedulable<RemoteService> scheduled = Schedulable.of(xflights, outbox);

scheduled
  .scheduled(Schedule.create()
    .taskName("replicate-airports")
    .every(Duration.ofMinutes(10)))
  .emit(...); // your replication event
```

`Schedule` is a small builder with three timing options:

```java
// Execute once, after a delay
Schedule.create().taskName("cleanup").after(Duration.ofHours(1));

// Execute repeatedly, with a fixed delay between successful runs
Schedule.create().taskName("replicate-airports").every(Duration.ofMinutes(10));

// Execute repeatedly, on a Spring cron expression
Schedule.create().taskName("nightly-cleanup").cron("0 0 3 * * *");
```

`after` and `every` accept any [`java.time.Duration`](https://docs.oracle.com/javase/8/docs/api/java/time/Duration.html). `cron` follows the [Spring cron syntax](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/scheduling/support/CronExpression.html) (six fields, including seconds). The three are mutually exclusive — combining them throws `IllegalArgumentException`.

Without a task name, every submission is a new scheduled entry. Set `taskName(...)` when you want the singleton-by-name semantics.

To remove a previously scheduled task, submit a cancellation with the same task name:

```java
scheduled
  .scheduled(Schedule.create()
    .taskName("replicate-airports")
    .cancel())
  .emit(...);
```

Cancellation requires a task name — it's how the runtime locates the entry to delete.

::: tip Scheduling without a wrapper
The technical outbox API takes the same `Schedule` directly, for cases where you submit `OutboxMessage` instances rather than service events:

```java
outbox.submit("replicate", message,
  Schedule.create().taskName("replicate-airports").every(Duration.ofMinutes(10)));
```
:::

[Learn more about `Schedulable`.](https://github.wdf.sap.corp/cds-java/cds-services/blob/main/cds-services-api/src/main/java/com/sap/cds/services/outbox/Schedulable.java){.learn-more}
[Learn more about `Schedule`.](https://github.wdf.sap.corp/cds-java/cds-services/blob/main/cds-services-api/src/main/java/com/sap/cds/services/outbox/Schedule.java){.learn-more}


## Configuration

### Default Outbox Services

CAP Java ships two default outbox services:

- **`DefaultOutboxOrdered`** — used by [messaging services](messaging) by default. Processes entries in submission order.
- **`DefaultOutboxUnordered`** — used by the [AuditLog service](auditlog) by default. May process entries in parallel across application instances.

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

A separate, runtime-global setting controls how long a `processing` entry can be held before another instance may pick it up — useful when an instance crashes mid-processing:

```yaml [srv/src/main/resources/application.yaml]
cds:
  outbox:
    persistent:
      statusLock:
        timeout: PT1H  # default
```

The outbox stores the last error in the `lastError` element of `cds.outbox.Messages`.


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


### Outbox for Shared Databases

CAP Java does not yet support microservices with a shared database out of the box: the two static-named default outboxes (`DefaultOutboxOrdered`, `DefaultOutboxUnordered`) would be shared across all services and introduce conflicts.

A manual workaround uses isolated custom outboxes with service-specific names:

#### 1. Deactivate the Default Outboxes and Create Service-Specific Ones

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

#### 2. Adapt Audit Log Configuration

The default audit-log outbox is `DefaultOutboxUnordered`. Point it at the new custom outbox:

```yaml
cds:
  auditlog:
    outbox.name: Service1CustomOutboxUnordered
```

#### 3. Adapt Messaging Configuration

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

::: tip Important
Both deactivating the defaults *and* using unique outbox namespaces are required to achieve service isolation in a shared-DB scenario.
:::


### Event Versions for Blue/Green Deployments

In blue/green scenarios, outbox collectors of an older deployment may not be able to process events emitted by a newer deployment. Configure each deployment with an *event version* so older collectors skip newer events:

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

To opt a specific custom outbox out of the version check entirely, set [`cds.outbox.services.MyCustomOutbox.checkVersion: false`](./developing-applications/properties#cds-outbox-services-<key>-checkVersion).


## Dead Letter Queue

The dead-letter queue lifecycle (define service → filter for dead entries → bound revive/delete actions) is the same shape across both stacks; see [*Dead Letter Queue*](../guides/events/event-queues#dead-letter-queue) in the common guide for the full flow with code in both Node.js and Java.

::: warning Changing `maxAttempts` between deployments
You can increase `cds.outbox.services.<key>.maxAttempts` between deployments. Older entries that had reached the previous maximum will be retried automatically after the new deployment — if the dead letter queue is large, this can cause unintended load on the system.
:::

::: tip Use paging
Avoid reading all outbox entries at once when entries with large request payloads are present. Prefer `READ` queries with paging.
:::

---

Working in Node.js? See [Event Queues in Node.js](../node.js/event-queues).
