---
synopsis: Services are one of the core concepts of CAP. This section describes how services are represented in the CAP Java SDK and how their event-based APIs can be used. One of the key APIs provided by services is the uniform query API based on CQN statements.
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html
---

# Services
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

[Services](../get-started/concepts#services) are one of the core concepts of CAP. This section describes how services are represented in the CAP Java SDK and how their event-based APIs can be used. One of the key APIs provided by services is the uniform query API based on [CQN statements](working-with-cql/query-api).

## An Event-Based API

Services dispatch events to [Event Handlers](event-handlers/), which implement the behaviour of the service.
A service can process synchronous as well as asynchronous events and offers a user-friendly API layer around these events.

Every service implements the [Service](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/Service.html) interface, which offers generic event processing capabilities through its [emit(EventContext)](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/Service.html#emit-com.sap.cds.services.EventContext-) method.
The [Event Context](event-handlers/#eventcontext) contains information about the event and its parameters.
The `emit` method takes care of dispatching an Event Context to all event handlers registered on the respective event and is the central API to process asynchronous and synchronous events.

Usually service implementations extend the `Service` interface to provide a custom, user-friendly API layer on top of the `emit()` method. Examples are the [Application Service](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/cds/ApplicationService.html), [Persistence Service](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/persistence/PersistenceService.html), and [Remote Service](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/cds/RemoteService.html), which offer a common CQN query execution API for their CRUD events.
However, also technical components are implemented as services, for example the [AuthorizationService](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/authorization/AuthorizationService.html) or the [MessagingService](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/messaging/MessagingService.html).

### Using Services

Often times your Java code needs to interact with other services. The [ServiceCatalog](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/ServiceCatalog.html) provides programmatic access to all available services.
The Service Catalog can be accessed from the [Event Context](event-handlers/#eventcontext) or from the [CdsRuntime](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/runtime/CdsRuntime.html).

```java
ServiceCatalog catalog = context.getServiceCatalog();
Stream<Service> allServices = catalog.getServices();
Stream<ApplicationService> appServices = catalog.getServices(ApplicationService.class);
```

To look up a service in the Service Catalog, you need to know its name.
Application Services are created with the fully qualified name of their CDS definition by default:

```java
ApplicationService adminService = catalog.getService(ApplicationService.class, "AdminService");
```

As of version 2.4.0, the [CAP Java SDK Maven Plugin](./developing-applications/building#cds-maven-plugin) is capable of generating specific interfaces for services in the CDS model. These service interfaces also provide Java methods for actions and functions, which allows easily calling actions and functions with their parameters. These specific interfaces can also be used to get access to the service:

```java
AdminService adminService = catalog.getService(AdminService.class, "AdminService");
```

Technical services, like the Persistence Service have a `DEFAULT_NAME` constant defined in their interface:

```java
PersistenceService db = catalog.getService(PersistenceService.class, PersistenceService.DEFAULT_NAME);
```

When running in Spring, all services are available as Spring beans. Dependency injection can therefore be used to get access to the service objects:

```java
@Component
public class EventHandlerClass implements EventHandler {

    @Autowired
    private PersistenceService db;

    @Autowired
    @Qualifier("AdminService")
    private ApplicationService adminService;

}
```

Instead of the generic service interface, also the more specific service interfaces can be injected:

```java
@Component
public class EventHandlerClass implements EventHandler {

    @Autowired
    private PersistenceService db;

    @Autowired
    private AdminService adminService;

}
```
::: tip
For the injection of specific service interfaces the annotation `@Qualifier` is usually not required.
:::

## CQN-based Services

The most used services in CAP are the [CQN-based services](cqn-services/) which define APIs accepting CQN queries:

- [Application Services](cqn-services/application-services) exposed CDS services to clients.
- [Persistence Services](cqn-services/persistence-services) are CQN-based database clients.
- [Remote Services](cqn-services/remote-services) are CQN-based clients for remote APIs

## Application Lifecycle Service

The Application Lifecycle Service emits events when the `CdsRuntime` is fully initialized, but the application is not started yet, or when the application is stopped.
Its API and events are defined in the [ApplicationLifecycleService](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/application/ApplicationLifecycleService.html) interface.
You can use these events to register an event handler which performs custom initialization or shutdown logic.
In addition the Application Lifecycle Service provides an event to globally adapt the error response handling.

[Learn more about adapting the error response handling in section Indicating Errors.](./event-handlers/indicating-errors#errorhandler){.learn-more}
