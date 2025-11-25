---
synopsis: >
  Application Services define the APIs that a CAP application exposes to its clients, for example through OData. This section describes how to add business logic to these services, by extending CRUD events and implementing actions and functions.
status: released
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html
---

# Application Services
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}

## Handling CRUD Events { #crudevents}

Application Services provide a [CQN query API](./index#cdsservices). When running a CQN query on an Application Service CRUD events are triggered.
The processing of these events is usually extended when adding business logic to the Application Service.

The following table lists the static event name constants that exist for these event names on the [CqnService](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/cds/CqnService.html) interface and their corresponding [event-specific Event Context interfaces](../event-handlers/#eventcontext). These constants and interfaces should be used, when registering and implementing event handlers:

| Event | Constant | Event Context |
| --- | --- | --- |
| CREATE | `CqnService.EVENT_CREATE` | [CdsCreateEventContext](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/cds/CdsCreateEventContext.html) |
| READ | `CqnService.EVENT_READ` | [CdsReadEventContext](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/cds/CdsReadEventContext.html) |
| UPDATE | `CqnService.EVENT_UPDATE` | [CdsUpdateEventContext](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/cds/CdsUpdateEventContext.html) |
| UPSERT | `CqnService.EVENT_UPSERT` | [CdsUpsertEventContext](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/cds/CdsUpsertEventContext.html) |
| DELETE | `CqnService.EVENT_DELETE` | [CdsDeleteEventContext](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/cds/CdsDeleteEventContext.html) |

The following example shows how these constants and Event Context interfaces can be leveraged, when adding an event handler to be run when new books are created:

```java
@Before(event = CqnService.EVENT_CREATE, entity = Books_.CDS_NAME)
public void createBooks(CdsCreateEventContext context, List<Books> books) { }
```

::: tip
To learn more about the entity data argument `List<Books> books` of the event handler method, have a look at [this section](../event-handlers/#pojoarguments).
:::

### OData Requests

Application Services are used by OData protocol adapters to expose the Application Service's API as an OData API on a path with the following pattern:

```txt
http(s)://<application_url>/<base_path>/<service_name>
```

|Parameter | Description
| --- | --- |
|`<base_path>`     |  For the OData V2 and OData V4 protocol adapters, `<base_path>` can be configured with the application configuration properties `cds.odataV2.endpoint.path` and `cds.odataV4.endpoint.path` respectively. Please see [CDS Properties](../developing-applications/properties) for their default values.       |
|`<service_name>`     | The name of the Application Service, which by default is the fully qualified name of its definition in the CDS model. However, you can override this default per service by means of the `@path` annotation (see [Service Definitions in CDL](../../cds/cdl#service-definitions)).        |

[Learn more about how OData URLs are configured.](application-services#serve-configuration){.learn-more}

The OData protocol adapters use the CQN query APIs to retrieve a response for the requests they receive.
They transform OData-specific requests into a CQN query, which is run on the Application Service.

The following table shows which CRUD events are triggered by which kind of OData request:

| HTTP Verb | Event | Hint |
| --- | --- | --- |
| POST | CREATE | |
| GET | READ | The same event is used for reading a collection or a single entity |
| PATCH | UPDATE | If the update didn't find an entity, a subsequent `CREATE` event is triggered |
| PUT | UPDATE | If the update didn't find an entity, a subsequent `CREATE` event is triggered |
| DELETE | DELETE | |

> In CAP Java versions < 1.9.0, the `UPSERT` event was used to implement OData V4 `PUT` requests. This has been changed, as the semantics of `UPSERT` didn't really match the semantics of the OData V4 `PUT`.

### Deeply Structured Documents

Events on deeply structured documents, are only triggered on the target entity of the CRUD event's CQN statement.
This means, that if a document is created or updated, events aren't automatically triggered on composition entities.
Also when reading a deep document, leveraging `expand` capabilities, `READ` events aren't triggered on the expanded entities.
The same applies to a deletion of a document, which doesn't automatically trigger `DELETE` events on composition entities to which the delete is cascaded.

When implementing validation logic, this can be handled like shown in the following example:

```java
@Before(event = CqnService.EVENT_CREATE, entity = Orders_.CDS_NAME)
public void validateOrders(List<Orders> orders) {
    for(Orders order : orders) {
        if (order.getItems() != null) {
            validateItems(order.getItems());
        }
    }
}

@Before(event = CqnService.EVENT_CREATE, entity = OrderItems_.CDS_NAME)
public void validateItems(List<OrderItems> items) {
    for(OrderItems item : items) {
        if (item.getQuantity() <= 0) {
            throw new ServiceException(ErrorStatuses.BAD_REQUEST, "Invalid quantity");
        }
    }
}
```

In the example, the `OrderItems` entity exists as a composition within the `Items` element of the `Orders` entity. When creating an order a deeply structured document can be passed, which contains order items.
For this reason, the event handler method to validate order items (`validateItems`) is called as part of the order validation (`validateOrders`).
In case an order item is directly created (for example through a containment navigation in OData V4) only the event handler for validation of the order items is triggered.


## Result Handling

`@On` handlers for `READ`, `UPDATE`, and `DELETE` events _must_ set a result, either by returning the result, or using the event context's `setResult` method.

### READ Result

`READ` event handlers must return the data that was read, either as an `Iterable<Map>` or [Result](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/Result.html) object created via the [ResultBuilder](#result-builder-read). For queries with inline count, a `Result` object _must_ be used as the inline count is obtained from the `Result` interface.

`READ` event handlers are also called, for OData `/$count` requests. These requests determine the total amount of entity instances of a specific entity. When handling these requests in a custom `@On` event handler a `Map` with a single key `count` needs to be returned as a result:

```java
@On(entity = MyEntity_.CDS_NAME)
List<Map<String, Object>> readMyEntity(CdsReadEventContext context) {
	if (CqnAnalyzer.isCountQuery(context.getCqn())) {
		int count = 100; // determine correct count value
		return List.of(Collections.singletonMap("count", count));
	}
	// handle non /$count requests
}
```

### UPDATE and DELETE Results

`UPDATE` and `DELETE` statements have an optional filter condition (where clause) which determines the entities to be updated/deleted. Handlers _must_ return a `Result` object with the number of entities that match this filter condition and have been updated/deleted. Use the [ResultBuilder](#result-builder) to create the `Result` object.

::: warning _❗ Warning_<br>
If an event handler for an `UPDATE` or `DELETE` event does not specify a result the number of updated/deleted rows is automatically set to 0 and the OData protocol adapter will translate this into an HTTP response with status code `404` (Not Found).
:::

### INSERT and UPSERT Results

Event handlers for `INSERT` and `UPSERT` events can return a result representing the data that was inserted/upserted.

A failed insert is indicated by throwing an exception, for example, a `UniqueConstraintException` or a `ServiceException` with error status `CONFLICT`.

### Result Builder { #result-builder}

When implementing custom `@On` handlers for CRUD events, a `Result` object can be constructed with the [ResultBuilder](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ResultBuilder.html).

The semantics of the constructed `Result` differ between the CRUD events.
Clients of Application Services, for example the OData protocol adapters, rely on these specific semantics for each event.
It is therefore important that custom ON handlers fulfill these semantics as well, when returning or setting a `Result` using the `setResult()` method of the respective event context.

The following table lists the events and the expected `Result`:

| Event | Expected Semantic | `ResultBuilder` method |
| --- | --- | --- |
| CREATE | The data of all created entity rows | `insertedRows` |
| READ | The data of all read entity rows and (if requested) the inline count | `selectedRows` |
| UPDATE | The number of updated entity rows and (optionally) the updated data | `updatedRows` |
| UPSERT | The data of all upserted entity rows | `insertedRows` |
| DELETE | The number of deleted entity rows | `deletedRows` |

Use the `selectedRows` or `insertedRows` method for query and insert results, with the data given as `Map` or list of maps:

```java
import static java.util.Arrays.asList;
import static com.sap.cds.ResultBuilder.selectedRows;

Map<String, Object> row = new HashMap<>();
row.put("title", "Capire");
Result res = selectedRows(asList(row)).result();
context.setResult(res);   // CdsReadEventContext
```
{ #result-builder-read}

For query results, the inline count can be set through the `inlineCount` method:

```java
Result r = selectedRows(asList(row)).inlineCount(inlineCount).result();
```
{ #result-builder-update}

For update results, use the `updatedRows` method with the update count and the update data:

```java
import static com.sap.cds.ResultBuilder.updatedRows;

int updateCount = 1;  // number of updated rows
Map<String, Object> data = new HashMap<>();
data.put("title", "CAP Java");
Result r = updatedRows(updateCount, data).result();
```
<!-- TODO { #result-builder-delete} -->
For delete results, use the `deletedRows` method and provide the number of deleted rows:

```java
import static com.sap.cds.ResultBuilder.deletedRows;

int deleteCount = 7;
Result r = deletedRows(deleteCount).result();
```

## Actions and Functions { #actions}

[Actions](../../cds/cdl#actions) and [Functions](../../cds/cdl#actions) enhance the API provided by an Application Service with custom operations. They have well-defined input parameters and a return value, that are modelled in CDS.
Actions or functions are handled - just like CRUD events - using event handlers. To trigger an action or function on an Application Service an event with the action's or function's name is emitted on it.

### Implement Event Handler

The CAP Java runtime doesn't provide any default `On` handlers for actions and functions. For each action or function an event handler of the [`On`](../event-handlers/#on) phase should be defined, which implements the business logic and provides the return value of the operation, if applicable. The event handler needs to take care of [completing the event processing](../event-handlers/#eventcompletion). If an action or function is __bound to an entity__, the entity needs to be specified while registering the event handler. The following example shows how to implement an event handler for an action:

Given this CDS model:

```cds
service CatalogService {
    entity Books {
        key ID: UUID;
        title: String;
    } actions {
      action review(stars: Integer) returns Reviews;
    };

    entity Reviews {
        book : Association to Books;
        stars: Integer;
    }
}
```

The `cds-maven-plugin` generates event context interfaces for the action or function, based on its CDS model definition. These event context interfaces provide direct access to the parameters and the return value of the action or function.
For bound actions or functions the event context interface provides a [CqnSelect](../working-with-cql/query-api#select) statement, which targets the entity on which the action or function was triggered.

Action-specific event context, generated by the CAP Java SDK Maven Plugin:

```java
@EventName("review")
public interface ReviewEventContext extends EventContext {

    // CqnSelect that points to the entity the action was called on
    CqnSelect getCqn();
    void setCqn(CqnSelect select);

    // The 'stars' input parameter
    Integer getStars();
    void setStars(Integer stars);

    // The return value
    void setResult(Reviews review);
    Reviews getResult();

}
```

The event handler registration and implementation is as follows:

```java
@Component
@ServiceName(CatalogService_.CDS_NAME)
public class CatalogServiceHandler implements EventHandler {

    @On(event = "review", entity = Books_.CDS_NAME)
    public void reviewAction(ReviewEventContext context) {
        CqnSelect selectBook = context.getCqn();
        Integer stars = context.getStars();
        Reviews review = ...; // create the review
        context.setResult(review);
    }

}
```

### Trigger Action or Function

As of version 2.4.0, the [CAP Java SDK Maven Plugin](../developing-applications/building#cds-maven-plugin) is capable of generating specific interfaces for services in the CDS model. These service interfaces also provide Java methods for actions and functions, which allow direct access to the action's or function's parameters. You can just call them in custom Java code. If an action or function is bound to an entity, the first argument of the method is an entity reference providing the required information to address the entity instance.

Given the same CDS model as in the previous section, the corresponding generated Java service interface looks like the following:

```java
@CdsName(CatalogService_.CDS_NAME)
public interface CatalogService extends CqnService {

  @CdsName(ReviewContext.CDS_NAME)
  Reviews review(Books_ ref, @CdsName(ReviewContext.STARS) Integer stars);

  interface Application extends ApplicationService, CatalogService {
  }

  interface Remote extends RemoteService, CatalogService {
  }
}
```

In the custom handler class, the specific service interface can be injected as it is already known for generic service interfaces:

```java
  ...
  @Autowired
  private CatalogService catService;
  ...
```

Now, just call the review action from custom handler code:

```java
  ...
  private void someCustomMethod() {
    String bookId = "myBookId";
    Books_ ref = CQL.entity(Books_.class).filter(b -> b.ID().eq(bookId));
    this.catService.review(ref, 5);
  }
  ...
```

Alternatively, the event context can be used to trigger the action or function. This approach is useful for generic use cases, where typed interfaces are not available. The event context needs to be filled with the parameter values and emitted on the service:

```java
    EventContext context = EventContext.create("review", "CatalogService.Books");
    context.put("cqn", Select.from("CatalogService.Books").byId("myBookId"));
    context.put("rating", review.getRating());

    this.catService.emit(context);

    Map<String, Object> result = (Map<String, Object>) context.get("result");
```


## Best Practices and FAQs

This section summarizes some best practices for implementing event handlers and provides answers to frequently asked questions.

1. On which service should I register my event handler?

    Event handlers implementing business or domain logic should be registered on an Application Service.
    When implementing rather technical requirements, like triggering some code whenever an entity is written to the database, you can register event handlers on the Persistence Service.

2. Which services should my event handlers usually interact with?

    The CAP Java SDK provides [APIs](../services) that can be used in event handlers to interact with other services.
    These other services can be used to request data, that is required by the event handler implementation.

    If you're implementing an event handler of an Application Service, and require additional data of other entities part of that service for validation purposes, it's a good practice to read this data from the database using the [Persistence Service](../cqn-services/#persistenceservice). When using the Persistence Service, no user authentication checks are performed.

    If you're mashing up your service with another Application Service and also return data from that service to the client, it's a good practice to consume the other service through its service API. This keeps you decoupled from the possibility that the service might be moved into a dedicated micro-service in the future ([late-cut micro services](../../about/best-practices#agnostic-by-design)) and automatically lets you consume the business or domain logic of that service.
    If you do not require this decoupling, you can also access the service's entities directly from the database.

    In case you're working with draft-enabled entities and your event handler requires access to draft states, you should use the [Draft Service](../fiori-drafts#draftservices) to query and interact with drafts.

3. How should I implement business or domain logic shared across services?

    In general, it's a good practice to design your services with specific use cases in mind. Nevertheless, it might be necessary to share certain business or domain logic across multiple services.
    To achieve this, simple utility methods can be implemented, which can be called from different event handlers.

    If the entities for which a utility method is implemented are different projections of the same database-level entity, you can manually map the entities to the database-level representation and use this to implement your utility method.

    If they're independent from each other, a suitable self-defined representation needs to be found to implement the utility method.


## Serve Configuration

Configure how application services are served. You can define per service which ones are served by which protocol adapters. In addition, you configure on which path they are available. Finally, the combined path an application service is served on, is composed of the base path of a protocol adapter and the relative path of the application service.

### Configure Base Path { #configure-base-path}

Each protocol adapter has its own and unique base path.

By default, the CAP Java SDK provides protocol adapters for OData V4 and V2 and the base paths of both can be configured with [CDS Properties](../developing-applications/properties) in the _application.yaml_:

| Protocol | Default base path | CDS Property                                                                      |
|----------|-------------------|-----------------------------------------------------------------------------------|
| OData V4 | `/odata/v4`       | [`cds.odataV4.endpoint.path`](../developing-applications/properties#cds-odataV4-endpoint-path) |
| OData V2 | `/odata/v2`       | [`cds.odataV2.endpoint.path`](../developing-applications/properties#cds-odataV2-endpoint-path) |

The following example shows, how to deviate from the defaults:
::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  odataV4.endpoint.path: '/api'
  odataV2.endpoint.path: '/api-v2'
```
:::

### Configure Path and Protocol

With the annotation `@path`, you can configure the relative path of a service under which it's served by protocol adapters. The path is appended to the protocol adapter's base path.

With the annotations `@protocol` or `@protocols`, you can configure a list of protocol adapters a service should be served by. By default, a service is served by all installed protocol adapters. If you explicitly define a protocol, the service is only served by that protocol adapter.

In the following example, the service `CatalogService` is available on the combined paths `/odata/v4/browse` with OData V4 and `/odata/v2/browse` with OData V2:

```cds
@path : 'browse'
@protocols: [ 'odata-v4', 'odata-v2' ]
service CatalogService {
    ...
}
```

The same can also be configured in the _application.yaml_ in the `cds.application.services.<key>.serve` section. Replace `<key>` with the service name to configure path and protocols:

```yml
cds.application.services.CatalogService.serve:
  path: 'browse'
  protocols:
    - 'odata-v4'
    - 'odata-v2'
```

You can also disable serving a service if needed:

```cds
@path : 'browse'
@protocol: 'none'
service InternalService {
    ...
}
```

[Learn more about all `cds.application.services.<key>.serve` configuration possibilities.](../developing-applications/properties#cds-application-services-<key>-serve){.learn-more}


### Configure Endpoints

With the annotations `@endpoints.path` and `@endpoints.protocol`, you can provide more complex service endpoint configurations. Use them to serve an application service on different paths for different protocols. The value of `@endpoints.path` is appended to the [protocol adapter's base path](#configure-base-path).

In the following example, the service `CatalogService` is available on different paths for the different OData protocols:

```cds
@endpoints: [
  {path : 'browse', protocol: 'odata-v4'},
  {path : 'list', protocol: 'odata-v2'}
]
service CatalogService {
    ...
}
```

The `CatalogService` is accessible on the combined path `/odata/v4/browse` with the OData V4 protocol and on `/odata/v2/list` with the OData V2 protocol.

The same can also be configured in the _application.yaml_ in the `cds.application.services.<key>.serve.endpoints` section. Replace `<key>` with the service name to configure the endpoints:

```yml
cds.application.services.CatalogService.serve.endpoints:
  - path: 'browse'
    protocol: 'odata-v4'
  - path: 'list'
    protocol: 'odata-v2'
```

[Learn more about all `cds.application.services.<key>.serve.endpoints` configuration possibilities.](../developing-applications/properties#cds-application-services-<key>-serve-endpoints){.learn-more}
