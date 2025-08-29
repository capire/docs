---
synopsis: >
  This section describes how to test CAP Java applications on different level.

status: released
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html
---

# Testing Applications { #testing-cap-java-applications }
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>


This section describes some best practices and recommendations for testing CAP Java applications.

As described in [Modular Architecture](building#starter-bundles#modular_architecture), a CAP Java application consists of weakly coupled components, which enables you to define your test scope precisely and focus on parts that need a high test coverage.

Typical areas that require testing are the [services](../cqn-services/#cdsservices) that dispatch events to [event handlers](../event-handlers/), the event handlers themselves that implement the behaviour of the services, and finally the APIs that the application services define and that are exposed to clients through [OData](../cqn-services/application-services#odata-requests).

::: tip
Aside from [JUnit](https://junit.org/junit5/), the [Spring framework](https://docs.spring.io/spring-framework/docs/current/reference/html/index.html) provides much convenience for both unit and integration testing, like dependency injection via [*autowiring*](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#beans-factory-autowire) or the usage of [MockMvc](https://docs.spring.io/spring-framework/reference/testing/mockmvc.html) and [*mocked users*](https://docs.spring.io/spring-security/reference/servlet/test/method.html#test-method-withmockuser). So whenever possible, it's recommended to use it for writing tests.
:::

## Sample Tests

To illustrate this, the following examples demonstrate some of the recommended ways of testing. All the examples are taken from the [CAP Java bookshop sample project](https://github.com/SAP-samples/cloud-cap-samples-java/) in a simplified form, so definitely have a look at this as well.

Let's assume you want to test the following custom event handler:

```java
@Component
@ServiceName(CatalogService_.CDS_NAME)
public class CatalogServiceHandler implements EventHandler {

    private final PersistenceService db;

    public CatalogServiceHandler(PersistenceService db) {
        this.db = db;
    }

    @On
    public void onSubmitOrder(SubmitOrderContext context) {
        Integer quantity = context.getQuantity();
        String bookId = context.getBook();

        Optional<Books> book = db.run(Select.from(BOOKS).columns(Books_::stock).byId(bookId)).first(Books.class);

        book.orElseThrow(() -> new ServiceException(ErrorStatuses.NOT_FOUND, MessageKeys.BOOK_MISSING)
            .messageTarget(Books_.class, b -> b.ID()));

        int stock = book.map(Books::getStock).get();

        if (stock >= quantity) {
            db.run(Update.entity(BOOKS).byId(bookId).data(Books.STOCK, stock -= quantity));
            SubmitOrderContext.ReturnType result = SubmitOrderContext.ReturnType.create();
            result.setStock(stock);
            context.setResult(result);
        } else {
            throw new ServiceException(ErrorStatuses.CONFLICT, MessageKeys.ORDER_EXCEEDS_STOCK, quantity);
        }
    }

    @After(event = CqnService.EVENT_READ)
    public void discountBooks(Stream<Books> books) {
        books.filter(b -> b.getTitle() != null).forEach(b -> {
            loadStockIfNotSet(b);
            discountBooksWithMoreThan111Stock(b);
        });
    }

    private void discountBooksWithMoreThan111Stock(Books b) {
        if (b.getStock() != null && b.getStock() > 111) {
            b.setTitle(String.format("%s -- 11%% discount", b.getTitle()));
        }
    }

    private void loadStockIfNotSet(Books b) {
        if (b.getId() != null && b.getStock() == null) {
            b.setStock(db.run(Select.from(BOOKS).byId(b.getId()).columns(Books_::stock)).single(Books.class).getStock());
        }
    }
}
```

::: tip
You can find a more complete sample of the previous snippet in our [CAP Java bookshop sample project](https://github.com/SAP-samples/cloud-cap-samples-java/blob/main/srv/src/main/java/my/bookshop/handlers/CatalogServiceHandler.java).
:::

The `CatalogServiceHandler` here implements two handler methods -- `onSubmitOrder` and `discountBooks` -- that should be covered by tests.

The method `onSubmitOrder` is registered to the `On` phase of a `SubmitOrder` event and basically makes sure to reduce the stock quantity of the ordered book by the order quantity, or, in case the order quantity exceeds the stock, throws a `ServiceException`.

Whereas `discountBooks` is registered to the `After` phase of a `read` event on the `Books` entity and applies a discount information to a book's title if the stock quantity is larger than 111.

## Event Handler Layer Testing

Out of these two handler methods `discountBooks` doesn't actually depend on the `PersistenceService`.

That allows us to verify its behavior in a unit test by creating a `CatalogServiceHandler` instance with the help of a `PersistenceService` mock to invoke the handler method on, as demonstrated below:

::: tip
For mocking, you can use [Mockito](https://site.mockito.org/), which is already included with the `spring-boot-starter-test` starter bundle.
:::

```java
@ExtendWith(MockitoExtension.class)
public class CatalogServiceHandlerTest {

    @Mock
    private PersistenceService db;

    @Test
    public void discountBooks() {
        Books book1 = Books.create();
        book1.setTitle("Book 1");
        book1.setStock(10);

        Books book2 = Books.create();
        book2.setTitle("Book 2");
        book2.setStock(200);

        CatalogServiceHandler handler = new CatalogServiceHandler(db);
        handler.discountBooks(Stream.of(book1, book2));

        assertEquals("Book 1", book1.getTitle(), "Book 1 was discounted");
        assertEquals("Book 2 -- 11% discount", book2.getTitle(), "Book 2 was not discounted");
    }
}
```

::: tip
You can find a variant of this sample code also in our [CAP Java bookshop sample project](https://github.com/SAP-samples/cloud-cap-samples-java/blob/main/srv/src/test/java/my/bookshop/handlers/CatalogServiceHandlerTest.java).
:::

Whenever possible, mocking dependencies and just testing the pure processing logic of an implementation allows you to ignore the integration bits and parts of an event handler, which is a solid first layer of your testing efforts.

## Service Layer Testing

[Application Services](../cqn-services/application-services) that are backed by an actual service definition within the `CdsModel` implement an interface, which extends the `Service` interface and offers a common `CQN execution API` for `CRUD` events. This API can be used to run `CQN` statements directly against the service layer, which can be used for testing, too.

To verify the proper discount application in our example, we can run a `Select` statement against the `CatalogService` and assert the result as follows, using a well-known dataset:

```java
@ExtendWith(SpringExtension.class)
@SpringBootTest
public class CatalogServiceTest {

    @Autowired
    @Qualifier(CatalogService_.CDS_NAME)
    private CqnService catalogService;

    @Test
    public void discountApplied() {
        CdsResult<Books> result = catalogService.run(Select.from(Books_.class).byId("51061ce3-ddde-4d70-a2dc-6314afbcc73e"));

        // book with title "The Raven" and a stock quantity of > 111
        Books book = result.single(Books.class);

        assertEquals("The Raven -- 11% discount", book.getTitle(), "Book was not discounted");
    }
}
```

As every service in CAP implements the [Service](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/Service.html) interface with its [emit(EventContext)](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/Service.html#emit-com.sap.cds.services.EventContext-) method, another way of testing an event handler is to dispatch an event context via the `emit()` method to trigger the execution of a specific handler method.

Looking at the `onSubmitOrder` method from our example above we see that it uses an event context called `SubmitOrderContext`. Therefore, using an instance of that event context, in order to test the proper stock reduction, we can trigger the method execution and assert the result, as demonstrated:

```java
@SpringBootTest
public class CatalogServiceTest {

    @Autowired
    @Qualifier(CatalogService_.CDS_NAME)
    private CqnService catalogService;

    @Test
    public void submitOrder() {
        SubmitOrderContext context = SubmitOrderContext.create();

        // ID of a book known to have a stock quantity of 22
        context.setBook("4a519e61-3c3a-4bd9-ab12-d7e0c5329933");
        context.setQuantity(2);
        catalogService.emit(context);

        assertEquals(22 - context.getQuantity(), context.getResult().getStock());
    }
}
```

In the same way you can verify that the `ServiceException` is being thrown when the order quantity exceeds the stock value:

```java
@SpringBootTest
public class CatalogServiceTest {

    @Autowired
    @Qualifier(CatalogService_.CDS_NAME)
    private CqnService catalogService;

    @Test
    public void submitOrderExceedingStock() {
        SubmitOrderContext context = SubmitOrderContext.create();

        // ID of a book known to have a stock quantity of 22
        context.setBook("4a519e61-3c3a-4bd9-ab12-d7e0c5329933");
        context.setQuantity(30);
        catalogService.emit(context);

        assertThrows(ServiceException.class, () -> catalogService.emit(context), context.getQuantity() + " exceeds stock for book");
    }
}
```

::: tip
For a more extensive version of the previous `CatalogServiceTest` snippets, have a look at our [CAP Java bookshop sample project](https://github.com/SAP-samples/cloud-cap-samples-java/blob/main/srv/src/test/java/my/bookshop/CatalogServiceTest.java).
:::

## Integration Testing

Integration tests enable us to verify the behavior of a custom event handler execution doing a roundtrip starting at the protocol adapter layer and going through the whole CAP architecture until it reaches the service and event handler layer and then back again through the protocol adapter.

As the services defined in our `CDS model` are exposed as `OData` endpoints, by using [MockMvc](https://docs.spring.io/spring-framework/reference/testing/mockmvc.html) we can simply invoke a specific `OData` request and assert the response from the addressed service.

The following demonstrates this by invoking a `GET` request to the `OData` endpoint of our `Books` entity, which triggers the execution of the `discountBooks` method of the `CatalogServiceHandler` in our example:

```java
@SpringBootTest
@AutoConfigureMockMvc
public class CatalogServiceITest {

    private static final String booksURI = "/api/browse/Books";

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void discountApplied() throws Exception {
        mockMvc.perform(get(booksURI + "?$filter=stock gt 200&top=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.value[0].title").value(containsString("11% discount")));
    }

    @Test
    public void discountNotApplied() throws Exception {
        mockMvc.perform(get(booksURI + "?$filter=stock lt 100&top=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.value[0].title").value(not(containsString("11% discount"))));
    }
}
```

::: tip
Check out the version in our [CAP Java bookshop sample project](https://github.com/SAP-samples/cloud-cap-samples-java/blob/main/srv/src/test/java/my/bookshop/CatalogServiceITest.java) for additional examples of integration testing.
:::
