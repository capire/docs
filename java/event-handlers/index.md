---
synopsis: >
  This section describes how to register event handlers on services. In CAP everything that happens at runtime is an event that is sent to a service.
  With event handlers the processing of these events can be extended or overridden. Event handlers can be used to handle CRUD events, implement actions and functions and to handle asynchronous events from a messaging service.
status: released
uacp: Used as link target from SAP Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html
---

# Event Handlers
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

This section describes how to register event handlers on services. In CAP everything that happens at runtime is an [event](../../about/best-practices#events) that is sent to a [service](../../about/best-practices#services).
With event handlers, the processing of these events can be extended or overridden. Event handlers can be used to handle CRUD events, implement actions and functions, and to handle asynchronous events from a messaging service.

## Introduction to Event Handlers

CAP allows you to register event handlers for [events](../../about/best-practices#events) on [services](../../about/best-practices#services). An event handler is simply a Java method.
Event handlers enable you to add custom business logic to your application by either extending the processing of an event, or by completely overriding its default implementation.

::: tip
Event handlers are a powerful means to extend CAP. Did you know that most of the built-in features provided by CAP are implemented using event handlers?
:::

Common events are the CRUD events (`CREATE`, `READ`, `UPDATE`, `DELETE`), which are handled by the different kinds of [CQN-based services](../cqn-services/#cdsservices).
These events are most typically triggered when an HTTP-based protocol adapter (for example OData V4) executes a CQN statement on an Application Service to fulfill the HTTP request.
The CAP Java SDK provides a lot of built-in event handlers (also known as [Generic Providers](../../guides/providing-services)) that handle CRUD operations out of the box and implement the handling of many CDS annotations.
Applications most commonly use event handlers on CRUD events to _extend_ the event processing by using the [`Before`](#before) and [`After`](#after) phase.

[Actions](../../cds/cdl#actions) and [Functions](../../cds/cdl#actions) that are defined by an Application Service in its model definition are mapped to events as well.
Therefore, to implement the business logic of an action or function, you need to register event handlers as well.
Event handlers that implement the core processing of an event should be registered using the [`On`](#on) phase.

Events in CAP can have parameters and - in case they're synchronous - a return value. The CAP Java SDK uses [Event Contexts](#eventcontext) to provide a type-safe way to access parameters and return values.
In the case of CRUD events the corresponding Event Contexts provide, for example, access to the CQN statement. Event Contexts can be easily obtained in an event handler.

## Event Phases { #phases}

Events are processed in three phases that are executed consecutively: `Before`, `On`, and `After`. When registering an event handler the phase in which the event handler should be called, needs to be specified.
The CAP Java SDK provides an annotation for each event phase ([`@Before`](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/handler/annotations/Before.html), [`@On`](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/handler/annotations/On.html), and [`@After`](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/handler/annotations/After)).
These [annotations](#handlerannotations) can be used on event handler methods to indicate which phase of the event processing the method handles.

It's possible to register multiple event handlers for each event phase. Handlers within the same event phase are never executed concurrently.
In case concurrency is desired, it needs to be explicitly implemented within an event handler.
Note that by default there is no guaranteed order in which the handlers of the same phase are called.

The following subsections describe the semantics of the three phases in more detail.

### Before { #before}

The `Before` phase is the first phase of the event processing. This phase is intended for filtering, validation, and other types of preprocessing of the incoming parameters of an event.
There can be an arbitrary number of `Before` handlers per event.

The processing of the `Before` phase is completed when one of the following conditions applies:
- All registered `Before` handlers were successfully called. Execution continues with the `On` phase.
- A handler [completes the event processing](#eventcompletion) by setting a return value or setting the state of an event to completed.
  In this case, any remaining registered `Before` and `On` handlers are skipped and execution continues with the `After` phase.
- A handler throws an exception. In this case, event processing is terminated immediately.

### On { #on}

The `On` phase is started after the `Before` phase, as long as no return value is yet provided and no exception occurred. It's meant to implement the core processing of the event.
There can be an arbitrary number of `On` handlers per event, although as soon as the first `On` handler successfully completes the event processing, all remaining `On` handlers are skipped.

The `On` phase is completed when one of the following conditions applies:
- A handler [completes the event processing](#eventcompletion) by setting a result value or setting the state of an event to completed.
  In this case, any remaining registered `On` handlers are skipped and execution continues with the `After` phase.
- A handler throws an exception. In this case, event processing is terminated immediately.

In case of synchronous events, if after the `On` phase, no handler completed the event processing, it's considered an error and the event processing is aborted with an exception.
However, when registering an `On` handler for an asynchronous event it is not recommended to complete the event processing, as other handlers might not get notified of the event anymore.
In that case CAP ensures to auto-complete the event, once all `On` handlers have been executed.

### After { #after}

The `After` phase is only started after the `On` phase is completed successfully. Handlers are therefore guaranteed to have access to the result of the event processing.
This phase is useful for post-processing of the return value of the event or triggering side-effects.
A handler in this phase can also still abort the event processing by throwing an exception. No further handlers of the `After` phase are called in this case.

## Event Contexts { #eventcontext}

The [EventContext](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/EventContext.html) is the central interface, that provides information about the event to the event handler.
The EventContext interface is a general interface that can be used with every event, it provides:
- Name of the event
- Entity targeted by the event
- Service the event was sent to
- Parameters and return value
- Request Context: User information, tenant-specific CDS model, headers and query parameters
- ChangeSet Context: Transactional boundaries of the event
- Service Catalog
- CDS Runtime

Parameters and the return value can be obtained and stored as key-value pairs in the Event Context using its `get` and `put` methods.

```java
EventContext context = EventContext.create("myEvent", null);

// set parameters
context.put("parameter1", "MyParameter1");
context.put("parameter2", 2);

srv.emit(context); // process event

// access return value
Object result = context.get("result");
```

Using the `get` and `put` methods has several drawbacks: The API is not type-safe and it's not clear what the correct keys for different event parameters are.
To solve these issues, it is possible to overlay the general Event Context with an event-specific Event Context, which provides typed getters and setters for the parameters of a specific event.
For each event that the CAP Java SDK provides out of the box (for example the [CRUD events](../cqn-services/application-services#crudevents)) a corresponding Event Context is provided.

Let's have a look at an example. The [CdsReadEventContext](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/cds/CdsReadEventContext.html) interface is the `READ` event-specific Event Context.
As one of the parameters of the `READ` event is a [CqnSelect](../../cds/cqn#select), it provides a `CqnSelect getCqn()` method. The return value of a `READ` event is a [Result](../working-with-cql/query-execution#result).
The context therefore also provides a `Result getResult()` and a `setResult(Result r)` method. You can use the `as` method provided by the general Event Context to overlay it:

```java
CdsReadEventContext context = genericContext.as(CdsReadEventContext.class);
CqnSelect select = context.getCqn();
context.setResult(Collections.emptyList());
Result result = context.getResult();
```

The getter and setter methods, still operate on the simple get/put API shown in the previous example. They just provide a type-safe layer on top of it.
The `as` method uses Java Proxies behind the scenes. Therefore, an interface definition is all that is required to enable this functionality.

::: tip
Use these event-specific type-safe Event Context interfaces whenever possible.
:::

For actions or functions defined in the CDS model the [CAP Java SDK Maven Plugin](../developing-applications/building#cds-maven-plugin) can automatically generate Event Context objects, which provide type-safe access to the action or function parameters and allow to set the return values.

### Completing the Event Processing { #eventcompletion}

The Event Context also provides means to indicate the completion of the core processing of the event. This is important to finish the [`On`](#on) phase of a synchronous event.
In case the synchronous event does not have a return value the `setCompleted()` method should be used to indicate the completion of the core processing of the event.

```java
context.setCompleted();
```

In case the synchronous event has a return value the `setResult(...)` method of the event-specific Event Context automatically triggers the `setCompleted()` method as well.

```java
context.setResult(myResult);
```

### Explicitly Proceeding the On Handler Execution { #proceed-on }

An event handler registered to the [`On phase`](#on) can call `proceed()` on the Event Context to explicitly proceed executing the remaining registered [`On`](#on) handlers.
This allows the handler to pre- and post-process the Event Context in a single method, without fully overwriting the core processing of the event.
It also enables catching and handling exceptions thrown by an underlying handler.

```java
@On(event = "myEvent")
void wrapMyEvent(EventContext context) {
    context.put("param", "Adjusted"); // pre-process
    context.proceed(); // delegate to underlying handler
    context.put("result", 42); // post-process
}
```

Calling `proceed()` from a [`Before`](#before) or [`After`](#after) event handler is not allowed and will raise an exception.
If an [`On`](#on) handler has already [completed](#eventcompletion) the event processing, calling `proceed()` will not have any effects.

### Defining Custom EventContext Interfaces { #customeventcontext}

In certain cases you might want to define your own custom event-specific Event Context interfaces. Simply define an interface, which extends the general `EventContext` interface.
Use the `@EventName` annotation to indicate for which event this context should be used.
Getters and setters defined in the interface automatically operate on the `get` and `put` methods of the general Event Context.
In case you want to define the key they use for this, you can use the `@CdsName` annotation on the getter and setter method.

```java
@EventName("myEvent")
public interface MyEventContext extends EventContext {

    static MyEventContext create() {
        return EventContext.create(MyEventContext.class, null);
    }

    @CdsName("Param")
    String getParam();
    void setParam(String param);

    void setResult(Integer result);
    Integer getResult();

}
```

::: tip
For actions or functions defined in the CDS model the [CAP Java SDK Maven Plugin](../developing-applications/building#cds-maven-plugin) can automatically generate Event Context objects, which provide type-safe access to the action or function parameters and allow to set the return values.
:::


## Event Handler Classes { #handlerclasses}

Event handler classes contain one or multiple event handler methods. You can use them to group event handlers, for example for a specific service.
The class can also define arbitrary methods, which aren't event handler methods, to provide functionality reused by multiple event handlers.

In Spring Boot, event handler classes are Spring beans. This enables you to use the full range of Spring Boot features in your event handlers, such as [Dependency Injection](https://www.baeldung.com/spring-dependency-injection) or [Scopes](https://www.baeldung.com/spring-bean-scopes).

The following [example](https://github.com/SAP-samples/cloud-cap-samples-java/blob/f1f18b8fd015257d33606864481ac5e6ec082b45/srv/src/main/java/my/bookshop/handlers/AdminServiceHandler.java) defines an event handler class:

::: code-group
```java [AdminServiceHandler.java]
import org.springframework.stereotype.Component;
import com.sap.cds.services.handler.EventHandler;
import com.sap.cds.services.handler.annotations.ServiceName;

@Component
@ServiceName("AdminService")
public class AdminServiceHandler implements EventHandler {
  // ...
}
```
:::

- The annotation `@Component` instructs Spring Boot to create a bean instance from this class.
- The `EventHandler` marker interface is required for CAP to identify the class as an event handler class among all beans and scan it for event handler methods.
- The optional `@ServiceName` annotation can be used to specify the default service, which event handlers are registered on. It's possible to override this value for specific event handler methods.

::: tip
The CAP Java SDK Maven Plugin generates interfaces for services in the CDS model. These interfaces provide String constants with the fully qualified name of the service.
If the service name is based on the CDS model, it's recommended to use these constants with the `@ServiceName` annotation.
:::

It is possible to specify multiple service names. Event handlers are registered on all of these services.

<!-- java-mode: ignore, no annotation target -->
```java
@ServiceName({"AdminService", "CatalogService"})
```

The `type` attribute of the `@ServiceName` annotation can be used to register event handlers on all services of a certain type:

<!-- java-mode: ignore, no annotation target -->
```java
@ServiceName(value = "*", type = ApplicationService.class)
```

## Event Handler Annotations { #handlerannotations}

Event handler methods need to be annotated with one of the following annotations: [`@Before`](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/handler/annotations/Before.html), [`@On`](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/handler/annotations/On.html), or [`@After`](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/handler/annotations/After).
The annotation defines, during which [phase](#phases) of the event processing the event handler is called.

Each of these annotations can define the following attributes:
- `service`: The services the event handler is registered on. It's optional, if a `@ServiceName` annotation is specified on class-level.

- `serviceType`: The type of services the event handler is registered on, for example, `ApplicationService.class`. Can be used together with `service = "*"` to register an event handler on all services of a certain type.

- `event`: The events the event handler is registered on. The event handler is invoked in case any of the events specified matches the current event. Use `*` to match any event.
  It's optional, if the event can be inferred through an [Event Context argument](#contextarguments) in the handler signature.

- `entity`: The target entities that the event handler is registered on. The event handler is invoked in case any of the entities specified matches the current entity. Use `*` to match any entity.
  It's optional, if the entity can be inferred through a [POJO-based argument](#pojoarguments) in the handler signature. If no value is specified or can be inferred, it defaults to `*`.

::: tip
The interfaces of different service types provide String constants for the events they support (see for example the [CqnService](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/cds/CqnService.html)).
The CAP Java SDK Maven Plugin generates interfaces for entities in the CDS model, which provide String constants with their fully qualified name.
It is recommended to use these constants with the `event` or `entity` attributes of the annotations.
:::

<!-- java-mode: ignore, no annotation target -->
```java
// registers on multiple events
@Before(event = { "CREATE", "UPDATE" }, entity = "AdminService.Books")

// overrides the default service on class-level
// registers on any entity
@On(service = "CatalogService", event = "READ")

// usage of String constants is recommended
@After(event = CqnService.EVENT_READ, entity = Books_.CDS_NAME)
```

## Event Handler Method Signatures { #handlersignature}

The most basic signature of an event handler method is `public void process(EventContext context)`. However, event-specific Event Context and entity data arguments and return values are supported as well and can be freely combined.
It is even valid for event handler methods to have no arguments at all. Handler methods don't necessarily have to be public methods. They can also be methods with protected, private, or package visibility.

### Event Context Arguments { #contextarguments}

The [Event Context](#eventcontext) is the central interface that provides information about the event to the event handler.
An event handler can get access to the general `EventContext` by simply declaring an argument of that type in its method:

```java
@Before(event = CqnService.EVENT_READ, entity = Books_.CDS_NAME)
public void readBooks(EventContext context) { }
```

It is also possible to directly refer to event-specific Event Context interfaces in your arguments. In that case the general Event Context is automatically overlaid with the event-specific one:

```java
@Before(event = CqnService.EVENT_READ, entity = Books_.CDS_NAME)
public void readBooks(CdsReadEventContext context) { }
```

If an event-specific Event Context argument is used and the event handler annotation declares an event as well, the argument is automatically validated during startup of the application.
Alternatively it is possible to let CAP infer the event for the event handler registration from the Event Context argument:

```java
@Before(entity = Books_.CDS_NAME)
public void readBooks(CdsReadEventContext context) { }
```

::: tip
The mapping between an Event Context interface and an event, is based on the `@EventName` annotation of the Event Context interface.
:::

In case an event handler is registered on multiple events only the general Event Context argument can be used.
At runtime, the corresponding event-specific Event Context can be overlaid explicitly, if access to event-specific parameters is required:

```java
@Before(event = { CqnService.EVENT_CREATE, CqnService.EVENT_UPDATE }, entity = Books_.CDS_NAME)
public void changeBooks(EventContext context) {
    if(context.getEvent().equals(CqnService.EVENT_CREATE)) {
        CdsCreateEventContext ctx = context.as(CdsCreateEventContext.class);
        // ...
    } else {
        CdsUpdateEventContext ctx = context.as(CdsUpdateEventContext.class);
        // ...
    }
}
```

### Entity Data Arguments { #pojoarguments}

When adding business logic to an Application Service, event handlers most commonly need to access entity data.
Entity data can be directly accessed in the event handler method, by using an argument of type `CdsData`:

```java
@Before(event = { CqnService.EVENT_CREATE, CqnService.EVENT_UPDATE },
        entity = Books_.CDS_NAME)
public void changeBooks(List<CdsData> data) { }
```
> The `CdsData` interface extends `Map<String, Object>` with some additional JSON serialization capabilities and therefore provides a generic data access capability.

The CAP Java SDK Maven Plugin can generate data accessor interfaces for entities defined in the CDS model. These interfaces allow for a [typed access](../cds-data#typed-access) to data and can be used in arguments as well:

```java
@Before(event = { CqnService.EVENT_CREATE, CqnService.EVENT_UPDATE },
        entity = Books_.CDS_NAME)
public void changeBooks(List<Books> books) { }
```

::: tip
To learn more about typed access to data and how entity data is handled in CAP Java SDK, have a look at [Working with Data](../cds-data).
:::

If an entity data argument is used and the event handler annotation declares an entity as well, the argument is automatically validated during startup of the application.
Alternatively it is possible to let CAP infer the entity for the event handler registration from the entity data argument:

```java
@Before(event = { CqnService.EVENT_CREATE, CqnService.EVENT_UPDATE })
public void changeBooks(List<Books> books) { }
```

::: tip
The mapping between a data accessor interface and an entity, is based on the `@CdsName` annotation of the accessor interface.
:::

Entity data arguments only work on [CRUD events](../cqn-services/application-services#crudevents) of [CQN-based services](../cqn-services/#cdsservices). In addition they work with the [draft-specific CRUD events](../fiori-drafts#draftevents) provided by Draft Services.

The origin from which the entity data is provided depends on the phase of the event processing.
During the `Before` and `On` phase it is obtained from the CQN statement. The CQN statement contains the entity data that was provided by the service client.
However, during the `After` phase the entity data is obtained from the `Result` object, which is provided as the return value of the event to the service client.
Some CQN statements such as for example `CqnSelect`, which is used with `READ` events, don't allow to carry data. In these cases entity data arguments are set to `null`.

There are different flavors of entity data arguments. Besides using `List<Books>`, it's also possible to use `Stream<Books>`:

```java
@Before(event = { CqnService.EVENT_CREATE, CqnService.EVENT_UPDATE })
public void changeBooks(Stream<Books> books) { }
```

It is also possible to use non-collection-based entity arguments, such as `Books`. However, if multiple data rows are available at runtime an exception will be thrown in that case:

```java
@Before(event = { CqnService.EVENT_CREATE, CqnService.EVENT_UPDATE })
public void changeBook(Books book) { }
```

::: tip
Entity data arguments are safely modifiable.
During the `Before` and `On` phase changes affect the data carried by the CQN statement.
During the `After` phase changes affect the return value of the event.
:::

### Entity Reference Arguments

You can get an entity reference reflecting the reference of the currently processed CQN statement, by declaring a corresponding argument in your method signature.

```java
@After(event = CqnService.EVENT_UPDATE, entity = Books_.CDS_NAME)
public void changedBook(CqnStructuredTypeRef ref) { }
```

The CAP Java SDK Maven Plugin can generate query builder interfaces for entities defined in the CDS model. These interfaces allow you to build [type-safe queries](../working-with-cql/query-api#concepts) and can be used in arguments as well:

```java
@After(event = CqnService.EVENT_UPDATE, entity = Books_.CDS_NAME)
public void changedBook(Books_ ref) { }
```

If an entity reference argument is used, CAP can infer the entity for the event handler registration from the entity reference argument:

```java
@After(event = CqnService.EVENT_UPDATE)
public void changedBook(Books_ ref) { }
```

::: tip Mapping uses `@CdsName` annotation
The mapping between a query builder interface and an entity is based on the `@CdsName` annotation of the query builder interface.
:::

Entity data arguments work on all events that operate with a `CqnStatement`. This is the case for all CRUD events and custom bound actions or functions.

You can directly use these references to build further queries in your event handlers:

```java
@After(event = CqnService.EVENT_UPDATE)
public void changedBook(Books_ ref) {
  var select = Select.from(ref).columns(b -> b.title());
}
```

### Service Arguments { #servicearguments }

The CAP Java SDK Maven Plugin can [generate service interfaces](../cqn-services/application-services#trigger-action-or-function) for services defined in the CDS model.

To easily access these generated application-specific interfaces, you can declare corresponding arguments in your method signature.
The same approach works for generic interfaces like `CqnService` or `DraftService`.

The service instances that can be provided to the event handler are always the service instances that are processing the event.

```java
@After(event = CqnService.EVENT_UPDATE)
public void changedBook(Books book, AdminService service) { }
```

### Return Values

The return value of an event can be set by returning a value in an event handler method:

```java
@On(entity = Books_.CDS_NAME)
public Result readBooks(CdsReadEventContext context) {
    return db.run(context.getCqn());
}
```

In case an event handler method of the `Before` or `On` phase has a return value it automatically [completes the event processing](#eventcompletion), once it's executed.
Event handler methods of the `After` phase that have a return value, replace the return value of the event.

For [CRUD events](../cqn-services/application-services#crudevents) and [draft-specific CRUD events](../fiori-drafts#draftevents), return values that extend `Iterable<? extends Map<String, Object>>` are supported. The `Result` and `CdsResult<?>` interfaces or a list of entity data (for example `List<Books>`) fulfill this requirement.

```java
@On(entity = Books_.CDS_NAME)
public List<Books> readBooks(CdsReadEventContext context) {
    Books book = Struct.create(Books.class);
    // ...
    return Arrays.asList(book);
}
```

::: tip
To learn how to build your own Result objects, have a look at [Result Handling](../cqn-services/application-services#result-handling)
:::

For custom actions or functions, you can directly return the return value of the corresponding action or function in your event handler:

Given the following CDS model:
```cds
service World {
  function hello() returns String;
}
```

The event handler can directly return a `String`, which corresponds to the return type of the `hello` function:
```java
@On(event = "hello")
public String hello() {
  return "Hello World";
}
```

### Ordering of Event Handler Methods

You can influence the order in which the event handlers are executed by means of CAP annotation [@HandlerOrder](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/handler/annotations/HandlerOrder.html). It defines the order of handler methods within each phase of events. You may use constants `HandlerOrder.EARLY` or `HandlerOrder.LATE` to place one handler earlier or later relative to the handlers without the annotation. Note that handlers with the same `@HandlerOrder` are executed in a deterministic, but arbitrary sequence.

Generic handlers typically are executed by the framework before `HandlerOrder.EARLY` and after `HandlerOrder.LATE`:

1. Generic framework handlers
2. Custom handlers, annotated with `HandlerOrder.EARLY`
3. Custom handlers for phases `@Before`, `@On`, and `@After`
4. Custom handlers, annotated with `HandlerOrder.LATE`
5. Generic framework handlers


For example, in the following snippet, several methods are bound to the same phase of the `READ` event for the same entity and are executed one after another:

```java

@After(event = CqnService.EVENT_READ, entity = Books_.CDS_NAME)
@HandlerOrder(HandlerOrder.EARLY)
public void firstHandler(EventContext context) {
    // This handler is executed first
}

@After(event = CqnService.EVENT_READ, entity = Books_.CDS_NAME)
public void defaultHandler(EventContext context) {
    // This one is the second
}

@After(event = CqnService.EVENT_READ, entity = Books_.CDS_NAME)
@HandlerOrder(HandlerOrder.LATE)
public void lastHandler(EventContext context) {
    // This one is the last
}

```

CAP Java always executes event handlers in the order specified by the annotations, even if the handlers are defined in separate classes.

In addition, CAP Java respects the [Spring Framework annotation `@Order`](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/core/annotation/Order.html) and executes the handlers, that are registered in such annotated beans, in the order defined by that annotation. If the `@HandlerOrder` annotation is specified, this overrides the order defined by `@Order`.
