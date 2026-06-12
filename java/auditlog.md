---
synopsis: >
  Find here information about the AuditLog service in CAP Java.
status: released
---

# Audit Logging
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}


<!-- #### Content
% include _chapters toc="2,3" %} -->

## AuditLog Service

### Overview

As of CAP Java 1.18.0, an AuditLog service is provided for CAP Java applications. The AuditLog service can be used to emit AuditLog related events to registered handlers.

The following events can be emitted with the [AuditLogService](https://javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/auditlog/AuditLogService.html) to the registered handlers:

- [Personal data accesses](#data-access)
- [Personal data modifications](#data-modification)
- [Configuration changes](#config-change)
- [Security events](#security-event)

AuditLog events typically are bound to business transactions. In order to handle the events transactionally and also to decouple the request from outbound calls to a consumer, for example a central audit log service, the AuditLog service leverages the [outbox](./event-queues) service internally which allows [deferred](#deferred) sending of events.

### Use AuditLogService

#### Get AuditLogService Instance

The `AuditLogService` can be injected into a custom handler class, if the CAP Java project uses Spring Boot:

```java
import com.sap.cds.services.auditlog.AuditLogService;

@Autowired
private AuditLogService auditLogService;
```

Alternatively the AuditLog service can be retrieved from the `ServiceCatalog`:

```java
ServiceCatalog catalog = context.getServiceCatalog();
auditLogService = (AuditLogService) catalog.getService(AuditLogService.DEFAULT_NAME);
```
[See section **Using Services** for more details about retrieving services.](./services#using-services){.learn-more}


#### Emit Personal Data Access Event { #data-access}

To emit a personal data access event use method [logDataAccess](https://javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/auditlog/AuditLogService.html#logDataAccess-java.util.List-java.util.List-) of the `AuditLogService`.

```java
List<Access> accesses = new ArrayList<>();
Access access = Access.create();
// fill access object with data
accesses.add(access);
auditLogService.logDataAccess(accesses);
```

#### Emit Personal Data Modification Event { #data-modification}

To emit a personal data modification event use method [logDataModification](https://javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/auditlog/AuditLogService.html#logDataModification-java.util.List-) of the `AuditLogService`.

```java
List<DataModification> dataModifications = new ArrayList<>();
DataModification modification = DataModification.create();
// fill data modification object with data
dataModifications.add(modification);
auditLogService.logDataModification(dataModifications);
```

#### Emit Configuration Change Event { #config-change}

To emit a configuration change event use method [logConfigChange](https://javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/auditlog/AuditLogService.html#logConfigChange-java.lang.String-java.util.List-) of the `AuditLogService`.

```java
List<ConfigChange> configChanges = new ArrayList<>();
ConfigChange configChange = ConfigChange.create();
// fill config change object with data
configChanges.add(configChange);
auditLogService.logConfigChange(Action.UPDATE, configChanges);
```

#### Emit Security Event { #security-event}

Use method [logSecurityEvent](https://javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/auditlog/AuditLogService.html#logSecurityEvent-java.lang.String-java.lang.String-) of the `AuditLogService` to emit an security event.

```java
String action = "login";
String data = "user-name";
auditLogService.logSecurityEvent(action, data);
```

### Deferred AuditLog Events { #deferred}

Instead of processing the audit log events synchronously in the [audit log handler](#auditlog-handlers), the `AuditLogService` can store the event in the [outbox](./event-queues). This is done in the *same* transaction of the business request. Hence, a cancelled business transaction will not send any audit log events that are bound to it. To gain fine-grained control, for example to isolate a specific event from the current transaction, you may refine the transaction scope. See [ChangeSetContext API](./event-handlers/changeset-contexts#defining-changeset-contexts) for more information.

As the stored events are processed asynchronously, the business request is also decoupled from the audit log handler which typically sends the events synchronously to a central audit log service. This improves resilience and performance.

By default, the outbox comes in an [in-memory](./event-queues#persistent-vs-in-memory-outbox) flavour which has the drawback that it can't guarantee that the all events are processed after the transaction has been successfully closed.

To close this gap, a sophisticated [persistent outbox](./event-queues#default-outbox-services) service can be configured.

By default, not all events are send asynchronously via (persistent) outbox.
* [Security events](#security-event) are always send synchronously.
* All other events are stored to persistent outbox, if available. The in-memory outbox acts as a fallback otherwise.


::: warning _❗ Compliance & Data Privacy_
* It is up to the application developer to make sure that audit log events stored in the persistent outbox don't violate given **compliance rules**.
  For instance, it might be appropriate not to persist audit log events triggered by users who have operator privileges. Such logs could be modified on DB level by the same user afterward.
* For technical reasons, the AuditLog service temporarily stores audit log events enhanced with personal data such as the request's _user_ and _tenant_.
  In case of persistent outbox, this needs to be handled individually by the application to comply with **data privacy rules**.
:::

## AuditLog Handlers { #auditlog-handlers}

### Default Handler

By default, the CAP Java SDK provides an AuditLog handler that writes the AuditLog messages to the application log.
This default handler is registered on all AuditLog events and writes `DEBUG` log entries.
However, the application log does not log `DEBUG` entries by default.
To enable audit logging to the application log, the log level of the default handler needs to be set to `DEBUG` level:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
logging:
  level:
    com.sap.cds.auditlog: DEBUG
```
:::

### AuditLog v2 Handler { #handler-v2}

Additionally, the CAP Java SDK provides an _AuditLog v2_ handler that writes the audit messages to the SAP Audit Log service via its API version 2. To enable this handler, an additional feature dependency must be added to the `srv/pom.xml` of the CAP Java project:

```xml
<dependency>
  <groupId>com.sap.cds</groupId>
  <artifactId>cds-feature-auditlog-v2</artifactId>
  <scope>runtime</scope>
</dependency>
```

Also a service binding to the AuditLog v2 service has to be added to the CAP Java application, then this handler is activated. The Auditlog v2 handler supports the `premium` plan of the AuditLog Service as described [here](https://help.sap.com/docs/btp/sap-business-technology-platform/audit-log-write-api-for-customers?#prerequisites-for-using-the-audit-log-write-api-for-customers).

<div id="handler-service-plans"/>

If it's required to disable the AuditLog v2 handler for some reason, this can be achieved by setting the CDS property [`cds.auditLog.v2.enabled`](../java/developing-applications/properties#cds-auditLog-v2-enabled) to `false` in _application.yaml_:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  auditlog.v2.enabled: false
```
:::

The default value of this parameter is `true` and the AuditLog v2 handler is automatically enabled, if all other requirements are fulfilled.

<div id="handler-mt-v2"/>

### Custom AuditLog Handler

CAP Java applications can also provide their own AuditLog handlers to implement custom processing of AuditLog events. The custom handler class has to implement the interface `EventHandler` and needs to be annotated with `@ServiceName(value = "*", type = AuditLogService.class)`.
If the CAP Java project uses Spring Boot, the class can be annotated with `@Component` to register the handler at the CDS runtime.

For each of the four supported AuditLog events, a handler method can be registered. Depending on the event type, the method signature has to support the corresponding argument type:

| Event Type | Argument Type |
| --- | --- |
| [Personal Data Access](#data-access) | [com.sap.cds.services.auditlog.DataAccessLogContext](https://javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/auditlog/DataAccessLogContext.html) |
| [Personal Data Modification](#data-modification) | [com.sap.cds.services.auditlog.DataModificationLogContext](https://javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/auditlog/DataModificationLogContext.html) |
| [Configuration Change](#config-change) | [com.sap.cds.services.auditlog.ConfigChangeLogContext](https://javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/auditlog/ConfigChangeLogContext.html) |
| [Security Event](#security-event) | [com.sap.cds.services.auditlog.SecurityLogContext](https://javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/auditlog/SecurityLogContext.html) |

With one of the annotations `@Before`, `@On`, and `@After` the handler method needs to be annotated to indicate in which phase of the event processing this method gets called.

The following example defines an AuditLog event handler class with methods for all event types:

```java
import com.sap.cds.services.auditlog.*;
import com.sap.cds.services.handler.*;
import com.sap.cds.services.handler.annotations.*;
import org.springframework.stereotype.*;

@Component
@ServiceName(value = "*", type = AuditLogService.class)
class CustomAuditLogHandler implements EventHandler {

	@On
	public void handleDataAccessEvent(DataAccessLogContext context) {
		// custom handler code
	}

	@On
	public void handleDataModificationEvent(DataModificationLogContext context) {
		// custom handler code
	}

	@On
	public void handleConfigChangeEvent(ConfigChangeLogContext context) {
		// custom handler code
	}

	@On
	public void handleSecurityEvent(SecurityLogContext context) {
		// custom handler code
	}
}
```

[Learn more about implementing an event handler in **Event Handler Classes**.](./event-handlers/#handlerclasses){.learn-more}

