---
synopsis: >
  Find here information about the Outbox service in CAP Java.
status: released
---

# Transactional Outbox
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}

## Concepts

Usually the emit of messages should be delayed until the main transaction succeeded, otherwise recipients also receive messages in case of a rollback.
To solve this problem, a transactional outbox can be used to defer the emit of messages until the success of the current transaction.

The outbox is typically not used directly, but rather through the [messaging service](../java/messaging), the [AuditLog service](../java/auditlog) or to [outbox CAP service events](#outboxing-cap-service-events).

## In-Memory Outbox (Default) { #in-memory}

The in-memory outbox is used per default and the messages are emitted when the current transaction is successful. Until then, messages are kept in memory.


## Persistent Outbox { #persistent}

The persistent outbox requires a persistence layer to persist the messages before emitting them. Here, the to-be-emitted message is stored in a database table first. The same database transaction is used as for other operations, therefore transactional consistency is guaranteed.

Once the transaction succeeds, the messages are read from the database table and are emitted.

- If an emit was successful, the respective message is deleted from the database table.
- If an emit wasn't successful, there will be a retry after some (exponentially growing) waiting time. After a maximum number of attempts, the message is ignored for processing and remains in the database table. Even if the app crashes the messages can be redelivered after successful application startup.

To enable the persistence for the outbox, you need to add the service `outbox` of kind `persistent-outbox` to the `cds.requires` section in the _package.json_ or _cdsrc.json_, which will automatically enhance your CDS model in order to support the persistent outbox.

```jsonc
{
  // ...
  "cds": {
    "requires": {
      "outbox": {
        "kind": "persistent-outbox"
      }
    }
  }
}
```

::: warning _❗ Warning_
Be aware that you need to migrate the database schemas of all tenants after you've enhanced your model with an outbox version from `@sap/cds`  version 6.0.0 or later.
:::

For a multitenancy scenario, make sure that the required configuration is also done in the MTX sidecar service. Make sure that the base model in all tenants is updated to activate the outbox.

::: info Option: Add outbox to your base model
Alternatively, you can add `using from '@sap/cds/srv/outbox';` to your base model. In this case, you need to update the tenant models after deployment but you don't need to update MTX Sidecar.
:::

If enabled, CAP Java provides two persistent outbox services by default:

-  `DefaultOutboxOrdered` - is used by default by [messaging services](../java/messaging)
-  `DefaultOutboxUnordered` - is used by default by the [AuditLog service](../java/auditlog)

The default configuration for both outboxes can be overridden using the `cds.outbox.services` section, for example in the _application.yaml_:
::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  outbox:
    services:
      DefaultOutboxOrdered:
        maxAttempts: 10
        # ordered: true
      DefaultOutboxUnordered:
        maxAttempts: 10
        # ordered: false
```
:::
You have the following configuration options:
- `maxAttempts` (default `10`): The number of unsuccessful emits until the message is ignored. It still remains in the database table.
- `ordered` (default `true`): If this flag is enabled, the outbox instance processes the entries in the order they have been submitted to it. Otherwise, the outbox may process entries randomly and in parallel, by leveraging outbox processors running in multiple application instances. This option can't be changed for the default persistent outboxes.

The persistent outbox stores the last error that occurred, when trying to emit the message of an entry. The error is stored in the element `lastError` of the entity `cds.outbox.Messages`.

### Configuring Custom Outboxes { #custom-outboxes}

Custom persistent outboxes can be configured using the `cds.outbox.services` section, for example in the _application.yaml_:
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
Afterward you can access the outbox instances from the service catalog:

```java
OutboxService myCustomOutbox = cdsRuntime.getServiceCatalog().getService(OutboxService.class, "MyCustomOutbox");
OutboxService myOtherCustomOutbox = cdsRuntime.getServiceCatalog().getService(OutboxService.class, "MyOtherCustomOutbox");
```

Alternatively it's possible to inject them into a Spring component:

```java
@Component
public class MySpringComponent {
  private final OutboxService myCustomOutbox;

  public MySpringComponent(@Qualifier("MyCustomOutbox") OutboxService myCustomOutbox) {
    this.myCustomOutbox = myCustomOutbox;
  }
}
```

::: warning When removing a custom outbox ...
... it must be ensured that there are no unprocessed entries left.

Removing a custom outbox from the `cds.outbox.services` section doesn't remove the
entries from the `cds.outbox.Messages` table. The entries remain in the `cds.outbox.Messages` table and aren't
processed anymore.

:::

### Outbox Event Versions

In scenarios with multiple deployment versions (blue/green), situations may arise in which the outbox collectors of the older deployment cannot process the events generated by a newer deployment. In this case, the event can get stuck in the outbox, with all the resulting problems.

To avoid this problem, you can configure the outbox to use an event version that prevents the outbox collectors from using the newer events. For this purpose, you can set the parameter [<Config java keyOnly filesOnly>cds.environment.deployment.version: 2</Config>](../java/developing-applications/properties#cds-environment-deployment-version).

::: warning Ascending Versions
The configured deployment versions must be in ascending order. The messages are only processed by the outbox collector if the event version is less than or equal to the deployment version.
:::

To make things easier, you can automate versioning by using the Maven app version. This requires you to increment the version for each new deployment.

To do this, the Maven `resource.filtering` configuration in the `srv/pom.xml` must be activated as follows, so that the app version placeholder `${project.version}` can be used in [<Config java keyOnly filesOnly>cds.environment.deployment.version: ${project.version}</Config>](../java/developing-applications/properties#cds-environment-deployment-version).

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

To be sure that the deployment version has been set correctly, you can find a log entry at startup that shows the configured version:

```bash
2024-12-19T11:21:33.253+01:00 INFO 3420 --- [main] cds.services.impl.utils.BuildInfo : application.deployment.version: 1.0.0-SNAPSHOT
```

And finally, if for some reason you don't want to use a version check for a particular outbox collector, you can switch it off via the outbox configuration [<Config java filesOnly>cds.outbox.services.MyCustomOutbox.checkVersion: false</Config>](../java/developing-applications/properties#cds-outbox-services-<key>-checkVersion).

### Outbox for Shared DB

By default, CAP Java does not support shared database use cases, as this can lead to unexpected behavior when different isolated services use the same outboxes.
Since CAP automatically creates two outboxes — **DefaultOutboxOrdered** and **DefaultOutboxUnordered** — these would otherwise be shared across all services.

To avoid this, you can apply a manual workaround by customizing the outbox configuration and isolating them via distinct namespaces for each service.

#### Deactivate Default Outboxes

First, deactivate the two default outboxes and create custom outboxes with configurations tailored to your needs.

```yaml
cds:
  outbox:
    services:
      # deactivate default outboxes
      DefaultOutboxUnordered.enabled: false
      DefaultOutboxOrdered.enebled: false
      # custom outboxes with uniqie names
      Service1CustomOutboxOrdered:
        maxAttempts: 10
        storeLastError: true
        ordered: true
      Service1CustomOutboxUnordered:
        maxAttempts: 10
        storeLastError: true
        ordered: false

```

#### Adapt Audit Log Configuration

The **DefaultOutboxUnordered** outbox is automatically used for audit logging. Therefore, you must update the audit log configuration to point to the custom one.

```yaml
cds:
  ...
  auditlog:
    outbox.name: Service1CustomOutboxUnordered
```

#### Adapt Messaging Configuration

Next, adapt the messaging configuration of **every** messaging service in the application so that they use the custom-defined outboxes.

```yaml
cds:
  messaging:
    - MessagingService1:
      outbox.name: Service1CustomOutboxOrdered
    - MessagingService2:
      outbox.name: Service1CustomOutboxOrdered
      ...
```


::: tip Important Note
It is crucial to **deactivate** the default outboxes, and	ensure **unique outbox namespaces** in order to achieve proper isolation between services in a shared DB scenario.
:::
  

## Outboxing CAP Service Events

Outbox services support outboxing of arbitrary CAP services. A typical use case is to outbox remote OData
service calls, but also calls to other CAP services can be decoupled from the business logic flow.

The API `OutboxService.outboxed(Service)` is used to wrap services with outbox handling. Events triggered
on the returned wrapper are stored in the outbox first, and executed asynchronously. Relevant information from
the `RequestContext` is stored with the event data, however the user context is downgraded to a system user context.

The following example shows you how to outbox a service:

```java
OutboxService myCustomOutbox = ...;
CqnService remoteS4 = ...;
CqnService outboxedS4 = myCustomOutbox.outboxed(remoteS4);
```

If a method on the outboxed service has a return value, it will always return `null` since it's executed asynchronously. A common example for this are the `CqnService.run(...)` methods.
To improve this the API `OutboxService.outboxed(Service, Class)` can be used, which wraps a service with an asynchronous suited API while outboxing it.
This can be used together with the interface `AsyncCqnService` to outbox remote OData services:

```java
OutboxService myCustomOutbox = ...;
CqnService remoteS4 = ...;
AsyncCqnService outboxedS4 = myCustomOutbox.outboxed(remoteS4, AsyncCqnService.class);
```

The method `AsyncCqnService.of()` can be used alternatively to achieve the same for CqnServices:

```java
OutboxService myCustomOutbox = ...;
CqnService remoteS4 = ...;
AsyncCqnService outboxedS4 = AsyncCqnService.of(remoteS4, myCustomOutbox);
```

::: tip Custom asynchronous suited API
When defining your own custom asynchronous suited API, the interface must provide the same method signatures as the interface of the outboxed service, except for the return types which should be `void`.
:::

The outboxed service is thread-safe and can be cached.
Any service that implements the `Service` interface can be outboxed.
Each call to the outboxed service is asynchronously executed, if the API method internally calls the method `Service.emit(EventContext)`.

A service wrapped by an outbox can be unboxed by calling the API `OutboxService.unboxed(Service)`. Method calls to the unboxed
service are executed synchronously without storing the event in an outbox.

::: warning Java Proxy
A service wrapped by an outbox is a [Java Proxy](https://docs.oracle.com/javase/8/docs/technotes/guides/reflection/proxy.html). Such a proxy only implements the _interfaces_ of the object that it's wrapping. This means an outboxed service proxy can't be casted to the class implementing the underlying service object.
:::

::: tip Custom outbox for scaling
The default outbox services can be used for outboxing arbitrary CAP services. If you detect a scaling issue,
you can define custom outboxes that can be used for outboxing.
:::

## Technical Outbox API { #technical-outbox-api }

Outbox services provide the technical API `OutboxService.submit(String, OutboxMessage)` that can be used to outbox custom messages for an arbitrary event or processing logic.
When submitting a custom message, an `OutboxMessage` that can optionally contain parameters for the event needs to be provided.
As the `OutboxMessage` instance is serialized and stored in the database, all data provided in that message
must be serializable and deserializable to/from JSON. The following example shows the submission of a custom message to an outbox:

```java
OutboxService outboxService = runtime.getServiceCatalog().getService(OutboxService.class, "<OutboxServiceName>");

OutboxMessage message = OutboxMessage.create();
message.setParams(Map.of("name", "John", "lastname", "Doe"));

outboxService.submit("myEvent", message);
```

A handler for the custom message must be registered on the outbox service. This handler performs the processing logic when the message is published by the outbox:

```java
@On(service = "<OutboxServiceName>", event = "myEvent")
void processMyEvent(OutboxMessageEventContext context) {
  OutboxMessage message = context.getMessage();
  Map<String, Object> params = message.getParams();
  String name = (String) param.get("name");
  String lastname = (String) param.get("lastname");

  // Perform processing logic for myEvent

  context.setCompleted();
}
```

You must ensure that the handler is completing the context, after executing the processing logic.

[Learn more about event handlers.](./event-handlers/){.learn-more}

## Handling Outbox Errors { #handling-outbox-errors }

The outbox by default retries publishing a message, if an error occurs during processing, until the message has reached the maximum number of attempts.
This behavior makes applications resilient against unavailability of external systems, which is a typical use case for outbox message processing.

However, there might also be situations in which it is not reasonable to retry publishing a message.
For example, when the processed message causes a semantic error - typically due to a `400 Bad request` - on the external system.
Outbox messages causing such errors should be removed from the outbox message table before reaching the maximum number of retry attempts and instead application-specific
counter-measures should be taken to correct the semantic error or ignore the message altogether.

A simple try-catch block around the message processing can be used to handle errors:
- If an error should cause a retry, the original exception should be (re)thrown (default behavior).
- If an error should not cause a retry, the exception should be suppressed and additional steps can be performed.

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

In some situations, the original outbox processing logic is not implemented by you but the processing needs to be extended with additional error handling.
In that case, wrap the `EventContext.proceed()` method, which executes the underlying processing logic:

```java
@On(service = OutboxService.PERSISTENT_ORDERED_NAME, event = AuditLogService.DEFAULT_NAME)
void handleAuditLogProcessingErrors(OutboxMessageEventContext context) {
  try {
    context.proceed(); // wrap default logic
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

[Learn more about `EventContext.proceed()`.](./event-handlers/#proceed-on){.learn-more}

## Outbox Dead Letter Queue

The transactional outbox tries to process each entry a specific number of times. The number of attempts is configurable per outbox by setting the configuration `cds.outbox.services.<key>.maxAttempts`.

[Learn more about CDS Properties.](./developing-applications/properties){.learn-more}

Once the maximum number of attempts is exceeded, the corresponding entry is not touched anymore and hence it can be regarded as dead. Dead outbox entries are not deleted automatically. They remain in the database and it's up to the application to take care of the entries. By defining a CDS service, the dead entries can be managed conveniently. Let's have a look, how you can develop a Dead Letter Queue for the transactional outbox.

::: warning Changing configuration between deployments

It's possible to increase the value of the configuration `cds.outbox.services.<key>.maxAttempts` in between of deployments. Older entries which have reached their max attempts in the past would be retried automatically after deployment of the new microservice version. If the dead letter queue has a large size, this leads to unintended load on the system.

:::


### Define the Service

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

The `OutboxDeadLetterQueueService` provides an entity `DeadOutboxMessages` which is a projection on the outbox table `cds.outbox.Messages` that has two bound actions:

- `revive()` sets the number of attempts to `0` such that the outbox entry is going to be processed again.
- `delete()` deletes the outbox entry from the database.

Filters can be applied as for any other CDS defined entity, for example, to filter for a specific outbox where the outbox name is stored in the field `target` of the entity `cds.outbox.Messages`.

::: warning `OutboxDeadLetterQueueService` for internal users only

It is crucial to make the service `OutboxDeadLetterQueueService` accessible for internal users only as it contains sensitive data that could be exploited for malicious purposes if unauthorized changes are performed.

[Learn more about pseudo roles](../guides/security/authorization#pseudo-roles){.learn-more}

:::

### Filter for Dead Entries

This filtering can't be done on the database since the maximum number of attempts is only available from the CDS properties.

To ensure that only dead outbox entries are returned when reading `DeadOutboxMessages`, the following code provides the handler for the `DeadLetterQueueService` and the `@After-READ` handler that filters for the dead outbox entries:

```java
@Component
@ServiceName(OutboxDeadLetterQueueService_.CDS_NAME)
public class DeadOutboxMessagesHandler implements EventHandler {

	@After(entity = DeadOutboxMessages_.CDS_NAME)
	public void filterDeadEntries(CdsReadEventContext context) {
		CdsProperties.Outbox outboxConfigs = context.getCdsRuntime().getEnvironment().getCdsProperties().getOutbox();
		List<DeadOutboxMessages> deadEntries = context
				.getResult()
				.listOf(DeadOutboxMessages.class)
				.stream()
				.filter(entry -> entry.getAttempts() >= outboxConfigs.getService(entry.getTarget()).getMaxAttempts())
				.toList();

		context.setResult(deadEntries);
	}
}
```

[Learn more about event handlers.](./event-handlers/){.learn-more}

### Implement Bound Actions

```java
@Autowired
@Qualifier(PersistenceService.DEFAULT_NAME)
private PersistenceService db;

@On
public void reviveOutboxMessage(DeadOutboxMessagesReviveContext context) {
  CqnAnalyzer analyzer = CqnAnalyzer.create(context.getModel());
  AnalysisResult analysisResult = analyzer.analyze(context.getCqn());
  Map<String, Object> key = analysisResult.rootKeys();
  Messages deadOutboxMessage = Messages.create((String) key.get(Messages.ID));

  deadOutboxMessage.setAttempts(0);

  this.db.run(Update.entity(Messages_.class).entry(key).data(deadOutboxMessage));
  context.setCompleted();
}

@On
public void deleteOutboxEntry(DeadOutboxMessagesDeleteContext context) {
  CqnAnalyzer analyzer = CqnAnalyzer.create(context.getModel());
  AnalysisResult analysisResult = analyzer.analyze(context.getCqn());
  Map<String, Object> key = analysisResult.rootKeys();

  this.db.run(Delete.from(Messages_.class).byId(key.get(Messages.ID)));
  context.setCompleted();
}
```

The injected `PersistenceService` instance is used to perform the operations on the `Messages` entity since the entity `DeadOutboxMessages` is read-only. Both handlers first retrieve the ID of the entry and then they perform the corresponding operation on the database.

[Learn more about CQL statement inspection.](./working-with-cql/query-introspection#cqnanalyzer){.learn-more}

::: tip Use paging logic
Avoid to read all entries of the `cds.outbox.Messages` or `OutboxDeadLetterQueueService.DeadOutboxMessages` table at once, as the size of an entry is unpredictable
and depends on the size of the payload. Prefer paging logic instead.
:::

## Observability using Open Telemetry

The transactional outbox integrates Open Telemetry for logging telemetry data.

[Learn more about observability with Open Telemetry.](./operating-applications/observability#open-telemetry){.learn-more}

The following KPIs are logged in addition to the spans described in the [observability chapter](./operating-applications/observability):

| KPI Name                                   | Description                                                                                            | KPI Type |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------- |
| `com.sap.cds.outbox.coldEntries`           | Number of entries that could not be delivered after repeated attempts and will not be retried anymore. | Gauge    |
| `com.sap.cds.outbox.remainingEntries`      | Number of entries which are pending for delivery.                                                      | Gauge    |
| `com.sap.cds.outbox.maxStorageTimeSeconds` | Maximum time in seconds an entry was residing in the outbox.                                           | Gauge    |
| `com.sap.cds.outbox.medStorageTimeSeconds` | Median time in seconds of an entry stored in the outbox."                                              | Gauge    |
| `com.sap.cds.outbox.minStorageTimeSeconds` | Minimal time in seconds an entry was stored in the outbox.                                             | Gauge    |
| `com.sap.cds.outbox.incomingMessages`      | Number of incoming messages of the outbox.                                                             | Counter  |
| `com.sap.cds.outbox.outgoingMessages`      | Number of outgoing messages of the outbox.                                                             | Counter  |

The KPIs are logged per microservice instance (in case of horizontal scaling), outbox, and tenant.
