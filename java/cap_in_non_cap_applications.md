---
synopsis: >
  This guide shows how legacy Spring Boot applications can integrate themselves with service offerings of SAP BTP using different CAP plugins without the need to completely migrate to CAP Java.
status: released
---

# Legacy Applications using SAP BTP services with CAP Java

<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}

One of the strengths of CAP Java is that it offers a [variety of plugins integrating with SAP BTP services](../plugins) while keeping applications free of technical dependencies to such services. In the CAP ecosystem, we call this approach [Calesi (CAP level service integration)](../get-started/concepts#the-calesi-pattern). Most of those Calesi plugins expose themselves as a CDS service which also can be injected as a Spring Boot service. Take this together with the fact that the CAP runtime can run alongside a idiomatic Spring Boot application and you have robust and provden service integration (via CAP plugins) with a growing set of BTP platform services.

In general, adding a CAP Java plugin to your existing Spring Boot application is just adding one or more dependencies to the application's `pom.xml` as well as adding configuration to the application.yaml (or other mechanisms for [Spring Boot configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html)). In the following sections we will discuss several examples on how to use the core CAP Java runtime and CAP plugin to integrate a Spring Boot application with different SAP BTP services.

## SAP Audit Log Service

In order to add audit log support you need to add the following dependencies to your `pom.xml`:

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-services-api</artifactId>
    <version>${cds.services.version}</version>
</dependency>

<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-framework-spring-boot</artifactId>
    <version>${cds.services.version}</version>
    <scope>runtime</scope>
</dependency>
```

Please also maintain a version property in your `<properties>` section:

```xml
<cds.services.version>4.6.2</cds.services.version>
```

:::info
As the logical layer of audit log is already part of the core CAP Java components you can already start with these 2 additions using the audit log for local development. The audit log messages will be written to SLF4j's default logger using the log level `DEBUG`. In order to see the messages on the console of your app you need to set the log level to 'DEBUG':
:::

```yaml
logging.level.com.sap.cds.auditlog: DEBUG
```

Now, you can write client code that is actually producing and publishing audit log messages. First, you need to choose the class/component in that you want to publish audit log messages. In that class you need to declare a new class member of type `com.sap.cds.services.auditlog.AuditLogService` and inject it via constructor injection (@Autowired works but is discouraged). With that done, you can create the message that is going to be published as a audit log:

```java
ConfigChange change = ConfigChange.create();
DataObject object = DataObject.create();
KeyValuePair key = KeyValuePair.create();
key.setKeyName("id");
key.setValue(String.valueOf(owner.getId()));
object.setId(List.of(key));
object.setType("Owner");
change.setDataObject(object);
ChangedAttribute attribute = ChangedAttribute.create();
attribute.setName("Owner");
attribute.setNewValue(String.valueOf(owner.getId()));
change.setAttributes(List.of(attribute));
```

In the final step you pass the created message to the `AuditLogService`:

```java
auditLogService.logConfigChange(Action.CREATE, createOwnerConfigChange(owner.getId()));
```

When you now run through the modified application code you should be able to read the logged audit message on the console of your Spring Boot application.

As said, with the past changes you just enabled the local variant of the audit log support. For the full integration of the deployed application with the SAP Audit Log service you also need to add this dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-feature-auditlog-ng</artifactId>
    <version>0.0.3</version>
</dependency>
```

For further configuration of this module please follow the [README of the module](https://github.com/cap-java/cds-feature-auditlog-ng).

## CAP Messaging

The CAP framework offers an abstraction layer for messaging services. CAP applications can emit events and messages to a `MessagingService` regardless of the target messaging infrastructure. The local default implementation for messaging is using the filesystem as the communication layer. Similar to the logical audit log support the messaging layer is already part of the core APIs of CAP Java. A plain Spring Boot application can use these APIs, too and only needs to perform these two steps to activate CAP messaging:

At first you need to make sure that the following dependencies are part of your `pom.xml`:

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-services-api</artifactId>
    <version>${cds.services.version}</version>
</dependency>

<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-framework-spring-boot</artifactId>
    <version>${cds.services.version}</version>
    <scope>runtime</scope>
</dependency>
```

Again, you need to set a property for the `cds.services.version`:

```xml
<cds.services.version>4.6.2</cds.services.version>
```

After setting up the dependencies you just need to activate the file-based messaging in the application's configuration:

```yaml
cds.messaging.services.messaging.kind: file-based-messaging
```
### Emitting Messages

In order to use CAP Java Messaging support to send messages from your application's code you need to inject an instance of `com.sap.cds.services.messaging.MessageService` into your class and set it as a class member. Then, you can use the CAP Java `MessageService` in your code like this to emit messages:

```java
Map<String, Object> data = Map.of("ownerId", owner.getId(), "petId", petId, "date", visit.getDate(), "descr", visit.getDescription());
messaging.emit("org.spring.alesi.PlannedVisit", data);
```

### Handling Messages

Usually, messaging applications do not only send but also handle received messages. Handling messages with CAP Java Messaging is basically the same as [handling general CAP events](./event-handlers). In Spring Boot applications the straight forward way is to define a new event handling method either in an already existing or a new component. In both cases you have to make sure that the component's class implements the `com.sap.cds.services.handler.EventHandler` interface. The next thing you have to do is to add an event handling method like below. The event name and the actual code of course differs from case to case. 

```java
	@On(event = "org.spring.alesi.PetBabiesBorn", service = "messaging")
	public void handlePetBabiesBorn(TopicMessageEventContext context) {
		Map<String, Object> data = context.getDataMap();
		int ownerId = (int) data.get("ownerId");
		int petId = (int) data.get("motherId");
		String count = (String) data.get("description");

        // work with the received data
	}
```

:::info
Please not that the handling code is listening for the message named `org.spring.alesi.PetBabiesBorn` and the code sending the message is using the same name. So, if both were residing the same application the components would communicate via messaging.
:::

When you now start your application you will see new files created at the root of your application's file system. These are the files being used for exchanging messages. In case of the above sketched scenario you would need to stop the application with a debugger to actually see the file content. What you can also do is writing to those files in order to simulate messages coming from a message broker:

```bash
echo 'org.shelter.PetBabiesBorn {"data":{"ownerId":11,"motherId":14,"description":"cute puppy"}}' >> events-*
```

### Connecting Message Brokers

Similar to the audit log integration the CAP messaging consist of a logical layer (as just used in the sample code) and a technical layer. The technical layer used for the sample is the file-based messaging. For this, you don't need an additional module and it can be activated via configuration. In case your want to use production-ready message brokers like SAP Event Hub you need to add the corresponding dependencies and configuration to your application.

#### SAP Event Hub

In case of the SAP Event Hub feature you would need to add this dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-feature-event-hub</artifactId>
    <version>${latest-version}</version>
</dependency>
```

Credentials and service coordinates for connecting to a SAP Event Hub instance need to be provided by the runtime environment of your application. For more details you can have a look at the the [SAP Event Hub CAP Plugin](https://github.com/cap-java/cds-feature-event-hub).


::: info
Both, the Audit Log and the Messaging of CAP Java use the transactional outbox by default. The outbox is a component that allows binding of external service calls to the outcome of the current request's transaction. With that semantics you can be sure that e.g. the SAP Audit Log Service is only called when your business transaction was successful. This frees you the application developer from the task to implement compensation logic in case of failed transactions.
:::


<div id="alesi-cds-feature-ucl" />

##