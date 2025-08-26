---
synopsis: API to execute CQL statements on services accepting CQN queries.
status: released
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html
---

# Executing CQL Statements
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}

## Query Execution { #queries}

[CDS Query Language (CQL)](./query-api) statements can be executed using the `run` method of any [service that accepts CQN queries](../cqn-services/#cdsservices):

```java
CqnService service = ...

CqnSelect query = Select.from("bookshop.Books")
    .columns("title", "price");

Result result = service.run(query);
```


### Parameterized Execution

Queries, as well as update and delete statements, can be parameterized with _named_, or _indexed parameters_. Update and delete statements with _named_ parameters can be executed in batch mode using multiple parameter sets.

#### Named Parameters

The following statement uses two parameters named *id1* and *id2*. The parameter values are given as a map:

```java
import static com.sap.cds.ql.CQL.param;

CqnDelete delete = Delete.from("bookshop.Books")
    .where(b -> b.get("ID").eq(param("id1"))
            .or(b.get("ID").eq(param("id2"))));

Map<String, Object> paramValues = new HashMap<>();
paramValues.put("id1", 101);
paramValues.put("id2", 102);

Result result = service.run(delete, paramValues);
```
::: warning
The parameter value map **must** be of type `Map<String, Object>`, otherwise the map is interpreted as a single positional/indexed parameter value, which results in an error.
:::

#### Indexed Parameters

The following statement uses two indexed parameters defined through `param(i)`:

```java
import static com.sap.cds.ql.CQL.param;

CqnDelete delete = Delete.from("bookshop.Books")
    .where(b -> b.get("ID").in(param(0), param(1)));

Result result = service.run(delete, 101, 102);
```

Before the execution of the statement the values 101 and 102 are bound to the defined parameters.


#### Batch Execution

Update and delete statements with _named parameters_ can be executed as batch with multiple parameter sets.
The named parameters example from above can be expressed using batch delete with a single parameter and two value sets:

```java
import static com.sap.cds.ql.CQL.param;

CqnDelete delete = Delete.from("bookshop.Books").byParams("ID");

Map<String, Object> paramSet1 = singletonMap("ID", 101);
Map<String, Object> paramSet1 = singletonMap("ID", 102);

Result result = service.run(delete, asList(paramSet1, paramSet2));
long deletedRows = result.rowCount();
```

From the result of a batch update/delete the total number of updated/deleted rows can be determined by [rowCount()](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/CdsResult.html#rowCount--), and [rowCount(batchIndex)](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/CdsResult.html#rowCount-int-) returns the number of updated/deleted rows for a specific parameter set of the batch.
The number of batches can be retrieved via the [batchCount()](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/CdsResult.html#batchCount--) method. Batch updates also return the update data.

The maximum batch size for update and delete can be configured via `cds.sql.max-batch-size` and has a default of 1000.


#### Querying Parameterized Views on SAP HANA { #querying-views}

To query [views with parameters](../../advanced/hana#views-with-parameters) on SAP HANA, build a select statement and execute it with [named parameter](#named-parameters) values that correspond to the view's parameters.

Let's consider the following `Books` entity and a parameterized view `BooksView`, which returns the `ID` and `title` of `Books` with `stock` greater or equal to the value of the parameter `minStock`:

```cds
entity Books {
    key ID : UUID;
    title  : String;
    stock  : Integer;
}

entity BooksView(minStock : Integer) as
   SELECT from Books {ID, title} where stock >= :minStock;
```

To query `BooksView` in Java, run a select statement and provide values for all view parameters:

```java
CqnSelect query = Select.from("BooksView");
var params = Map.of("minStock", 100);

Result result = service.run(query, params);
```

### Query Hints { #hana-hints}

To add a hint clause to a statement, use the `hints` method and prefix the [SAP HANA hints](https://help.sap.com/docs/HANA_CLOUD_DATABASE/c1d3f60099654ecfb3fe36ac93c121bb/4ba9edce1f2347a0b9fcda99879c17a1.htmlS) with `hdb.`:

```java
Select.from(BOOKS).hints("hdb.USE_HEX_PLAN", "hdb.ESTIMATION_SAMPLES(0)");
```
::: warning No external input in SQL for SAP HANA
Hints prefixed with `hdb.` are directly rendered into SQL for SAP HANA and therefore **must not** contain external input!
:::

### Data Manipulation

The CQN API allows to manipulate data by executing insert, update, delete, or upsert statements.

#### Update

The [update](./query-api) operation can be executed as follows:

```java
Map<String, Object> book = Map.of("title", "CAP");

CqnUpdate update = Update.entity("bookshop.Books").data(book).byId(101);
Result updateResult = service.run(update);
```

The update `Result` contains the data that is written by the statement execution. Additionally to the given data, it may contain values generated for [managed data](../../guides/domain-modeling#managed-data) and foreign key values.

The [row count](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/CdsResult.html#rowCount()) of the update `CdsResult` indicates how many rows where updated during the statement execution:


```java
CqnUpdate update = ...

long rowCount = service.run(update).rowCount();
```

If no rows are touched the execution is successful but the row count is 0.

:::warning Update with expressions
The setters of an [update with expressions](../working-with-cql/query-api#update-expressions) are evaluated on the database. The result of these expressions is not contained in the update result.
:::

### Structured Documents

It's possible to work with structured data as the insert, update, and delete operations cascade along *compositions*.

#### Cascading over Associations { #cascading-over-associations}

By default, *insert*, *update* and *delete* operations cascade over [compositions](../../guides/domain-modeling#compositions) only. For associations, this can be enabled using the `@cascade` annotation.

::: warning Avoid cascading over associations
Cascading operations over associations isn't considered good practice and should be avoided.
:::

Annotating an *association* with `@cascade: {insert, update, delete}` enables deep updates/upserts through this association.
Given the following CDS model with two entities and an association between them, only *insert* and *update* operations are cascaded through `author`:

```cds
entity Book {
  key ID : Integer;
  title  : String;

  @cascade: {insert, update}
  author : Association to Author;
}

entity Author {
  key ID : Integer;
  name   : String;
}
```

::: warning _Warning_
- For inactive draft entities `@cascade` annotations are ignored.

- The `@cascade` annotation is not respected by foreign key constraints on the database. To avoid unexpected behaviour you might have to disable a foreign key constraint with [`@assert.integrity:false`](../../guides/databases#database-constraints).
:::

#### Deep Insert / Upsert { #deep-insert-upsert}

[Insert](./query-api#insert) and [upsert](./query-api#upsert) statements for an entity have to include the keys and (optionally) data for the entity's composition targets. The targets are inserted or upserted along with the root entity.

```java
Iterable<Map<String, Object>> books;

CqnInsert insert = Insert.into("bookshop.Books").entries(books);
Result result = service.run(insert);

CqnUpsert upsert = Upsert.into("bookshop.Books").entries(books);
Result result = service.run(upsert);
```


#### Cascading Delete

The [delete](./query-api) operation is cascaded along the entity's compositions. All composition targets that are reachable from the (to be deleted) entity are deleted as well.

The following example deletes the order with ID *1000* including all its items:

```java
CqnDelete delete = Delete.from("bookshop.Orders").matching(singletonMap("OrderNo", 1000));
long deleteCount = service.run(delete).rowCount();
```

## Views and Projections { #views }

With CDS [views](../../cds/cdl#views-projections) you can derive new entities from existing ones, for example to rename or exclude certain elements, or to add [virtual elements](../../cds/cdl#virtual-elements-in-views) for specific use cases.

From the CDS model the CDS compiler generates [DDL](../../guides/databases?impl-variant=java#generating-sql-ddl) files, which include SQL views for the CDS views. These views are deployed to the [database](../cqn-services/persistence-services#database-support) and used by the CAP runtime to read data.

For *read-only* views, you can use the full feature set of [selects](../../cds/cdl#as-select-from), including *aggregations* to summarize, as well as *joins* and *unions* to combine data from multiple entities. However, such complex views are *not writable* and require a schema redeployment if the view definition is changed.

::: warning Annotate read-only views and elements
Use the `@readonly` annotation to indicate that a view or a view element is not writable, as this is not automatically detected by the CDS compiler.
:::

To [write data](#updatable-views) or [delete](#delete-via-view) through views, only use simple [projections](../../cds/cdl#as-projection-on). The CAP Java runtime attempts to resolve the CDS views to their underlying persistence entities, rewriting the statement and data accordingly, which is not supported for complex views.

For simple [projections](../../cds/cdl#as-projection-on), the generation of SQL views can be avoided by using [runtime views](#runtimeviews). This allows you to change the view definition without redeploying the database schema and is the prerequisite for lightweight extensibility via predefined extension fields.

::: tip Prefer simple views
Apply the *Interface Segregation Principle*: design multiple simple views, each for a specific use case ([Single-Purposed Services](../../guides/providing-services#single-purposed-services)), rather than one complex view for many scenarios.
:::
::: warning Avoid selecting paths over to-many Associations
Do not use [path expressions](../../cds/cql#path-expressions-in-all-other-clauses) over [*to-many associations*](../../cds/cdl#to-many-associations) in the select clause of CDS views. This blocks write operations and may cause performance issues due to record duplication on read.
:::
::: warning Avoid composition definitions in views
Avoid [defining](../../cds/cql#association-definitions) new *compositions* in CDS views and prefer *associations* instead, as [deep write](#updatable-views) and [cascading delete](#delete-via-view) are only supported for compositions in persistence entities.
:::

### Write through Views { #updatable-views }

You can run [insert](./query-api#insert), [upsert](./query-api#upsert), and [update](./query-api#update) statements on CDS views that are writable on the database or can be resolved to a single persistence entity by the CAP Java runtime.

CDS views must fulfill the following requirements to be resolvable:

- The view is a simple [projection](../../cds/cdl#as-projection-on), not using *aggregations*, *join*, *union*, or *where*.
- The projection includes all *not null* elements (incl. keys), unless they have a default or generated value.
- The projection does not include [path expressions](../../cds/cql#path-expressions) using *to-many* associations.

If the runtime cannot resolve a view, the write operation is executed directly on the database view and the execution depends on the [database](../cqn-services/persistence-services#database-support) support.

For example, the following CDS model defines two resolvable views on the `Order` entity, which has a to-many *items* and a to-one *header* composition to a Header entity with a to-one customer *association*. In the projection, you can use path expressions as shown by *headerStatus* (writable) and *customerName* (read-only):

```cds
// CDS views supporting write operations
entity OrderView1 as projection on Order excluding { createdBy };

entity OrderView2 as projection on OrderView1 {
  key ID,
      header.status          as headerStatus,  // writable composition path
      header.customer.name   as customerName @readonly,
      items                  as lineItems,        // writable composition
      toUpper(shipToCountry) as country : String  // ignored on write
};
```
```sql
UPDATE entity OrderView2
  { ID: 42, headerStatus: 'Processing', lineItems: [{ID: 1, book:251}] }
```
- Data for elements corresponding to *expressions* and *functions* (*country*) is ignored.
- [Deep write](./query-execution#deep-insert-upsert) via (aliased) compositions (*lineItems*) is supported if there are corresponding compositions (*items*) in the underlying entity definition. Deep write via compositions that are only defined in the view (for example via [mixins](../../cds/cql#association-definitions)) is not supported and the data is ignored.
- [Path expressions](../../cds/cql#path-expressions) over compositions *of one* (*header.status*) are writable. For [inserts](./query-api#insert), the view must expose all *not null* elements of the target entity and the data must include values for all of them. In the example above, the order header must have a generated key to support inserting new orders with a value for *headerStatus*.

    ::: warning Handling Compositions and Aliased Paths in Projections
    For projections that include *to-one* compositions (*header*) and aliased paths over these compositions (*headerStatus*), write structured data using the composition and make the aliased path [@readonly](../../guides/providing-services#readonly). Do not use data for the aliased path along with structured data for the composition in the same statement.
    :::

    ::: warning Path Expressions over Associations
    Path expressions navigating *associations* (*header.customer.name*) are [not writable](#cascading-over-associations) by default. To avoid issues on write, annotate them with [@readonly](../../guides/providing-services#readonly).
    :::

### Delete through Views { #delete-via-view }

The CAP Java runtime attempts to resolve [deletes](./query-api#delete) on CDS views to the underlying persistence entity definitions and the [write through views](#updatable-views) restrictions apply accordingly.

If a view cannot be resolved, the delete operation is executed directly on the database view and the execution depends on the [database](../cqn-services/persistence-services#database-support) support.

::: danger Delete cascades on persistence entity level
[Cascading delete](./query-execution#cascading-delete) is applied on persistence entity level only, including compositions that are excluded from the view.
Compositions that are [added](../../cds/cql#association-definitions) in CDS views, as well as changes to compositions (such as filters and redirects) are not considered.
:::

For example, the following CDS model defines `Order` with header and items, and `OrderView` which excludes header and exposes items as `lineItems`:

```cds
entity Order : cuid, managed {
      header : Composition of one OrderHeader;
      items  : Composition of many OrderItem on items.parent = $self;
}
entity OrderView as projection on db.Order {
  ID,
  items as lineItems,
  delivery : Composition of one Delivery on delivery.order = $self
}
```
```sql
DELETE from OrderView where ID = 42
```
The delete operation is resolved to the underlying `Order` entity with ID *42* and cascades over the `header` and `items` compositions. The `delivery` composition, which is only defined in the view, is ignored and does not cascade the delete operation to `Delivery`.

### Runtime Views { #runtimeviews }

To add or update CDS views without redeploying the database schema, annotate them with [@cds.persistence.skip](../../guides/databases#cds-persistence-skip). This advises the CDS compiler to skip generating database views for these CDS views. Instead, CAP Java resolves them *at runtime* on each request.

Runtime views must be simple [projections](../../cds/cdl#as-projection-on), not using *aggregations*, *join*, *union* or *subqueries* in the *from* clause, but may have a *where* condition if they are only used to read. On write, the restrictions for [write through views](#updatable-views) apply in the same way as for standard CDS views. However, if a runtime view cannot be resolved, a fallback to database views is not possible, and the statement fails with an error.

CAP Java provides two modes for resolving runtime views during read operations: [cte](#rtview-cte) and [resolve](#rtview-resolve).

::: details Changing the runtime view mode
To globally set the runtime view mode, use the property `cds.sql.runtimeView.mode` with value `cte` (the default) or `resolve` in the *application.yml*. To set the mode for a specific runtime view, annotate it with `@cds.java.runtimeView.mode: cte|resolve`.

To set the mode for a specific query, use a [hint](#hana-hints):

```Java
Select.from(BooksWithLowStock).hint("cds.sql.runtimeView.mode", "resolve");
```
:::

The next two sections introduce both modes using the following CDS model and query:

```cds
entity Books {
  key ID     : UUID;
      title  : String;
      stock  : Integer;
      author : Association to one Authors;
}
@cds.persistence.skip
entity BooksWithLowStock as projection on Books {
    ID, title, author.name as author
} where stock < 10; // makes the view read only
```
```sql
SELECT from BooksWithLowStock where author = 'Kafka'
```


#### Read in `cte` mode { #rtview-cte }

This is the default mode since CAP Java `4.x`. The runtime translates the [view definition](#runtimeviews) into a _Common Table Expression_ (CTE) and sends it with the query to the database.

```sql
WITH BOOKSWITHLOWSTOCK_CTE AS (
    SELECT B.ID,
           B.TITLE,
           A.NAME AS "AUTHOR"
      FROM BOOKS B
      LEFT OUTER JOIN AUTHOR A ON B.AUTHOR_ID = A.ID
     WHERE B.STOCK < 10
)
SELECT ID, TITLE, AUTHOR AS "author"
  FROM BOOKSWITHLOWSTOCK_CTE
 WHERE A.NAME = ?
```

::: tip CAP Java 3.10
Enable *cte* mode with *cds.sql.runtimeView.mode: cte*
:::

#### Read in `resolve` mode { #rtview-resolve }

The runtime _resolves_ the [view definition](#runtimeviews) to the underlying persistence entities and executes the query directly against the corresponding tables.

```sql
SELECT B.ID, B.TITLE, A.NAME AS "author"
  FROM BOOKS AS B
  LEFT OUTER JOIN AUTHORS AS A ON B.AUTHOR_ID = A.ID
 WHERE B.STOCK < 10 AND A.NAME = ?
```

::: info Limitations of `resolve` mode
Using associations that are only [defined](../../cds/cql#association-definitions) in the view, as well as complex draft queries are not supported in *resolve* mode.
:::
::: info Pessimistic locking on PostgreSQL
On PostgreSQL, some [pessimistic locking](#pessimistic-locking) queries on runtime views navigating associations require the *cte* mode.
:::

### Draft Queries on Views { #draft-views }

When draft-enabling a CDS view, the CDS Compiler creates a corresponding draft persistence table for this view. [Draft activate](../fiori-drafts#editing-drafts) updates the active entity via the view.

That means:
<br>
-> [Draft-enabled](../fiori-drafts#reading-drafts) CDS views must fulfill all requirements of [updatable views](#updatable-views).
{.indent}

Remember to run draft specific queries through the [Draft Service](../fiori-drafts#draftservices) or [Application Service](../cqn-services/application-services#application-services). The [Persistence Service](../cqn-services/persistence-services) only works for non-draft specific queries.


::: tip Draft queries on runtime views
If you define runtime views on [draft-enabled](../fiori-drafts#reading-drafts) entities and want to run draft specific queries on these views, set the [*cds.drafts.persistence*](../fiori-drafts#reading-drafts) configuration to `split`.
:::

::: warning Avoid draft-enabling runtime views
Draft-enabling runtime views is only supported in [*CTE*](#rtview-cte) mode and requires a schema deployment to update the draft table when the runtime view is changed.
:::

### Views on Remote Services

When delegating queries between Application Services and Remote Services, statements are resolved to the targeted service's entity definition by the CAP Java runtime.

For read, the CDS views are resolved similar to the runtime view [resolve](#rtview-resolve) mode. For write operations, views targeting *remote OData* services must fulfill the following:

- all requirements of [writable views](#updatable-views)
- not include [calculated elements](../../cds/cdl#calculated-elements)

If a view cannot be resolved, read and write operations are rejected.


## Concurrency Control

Concurrency control allows protecting your data against unexpected concurrent changes.

### Optimistic Locking {#optimistic}

Use _optimistic_ concurrency control to detect concurrent modification of data _across requests_. The implementation relies on an _ETag_, which changes whenever an entity instance is updated. Typically, the ETag value is stored in an element of the entity.

#### Optimistic Concurrency Control in OData

In the [OData protocol](../../guides/providing-services#etag), the implementation relies on `ETag` and `If-Match` headers in the HTTP request.

The `@odata.etag` annotation indicates to the OData protocol adapter that the value of an annotated element should be [used as the ETag for conflict detection](../../guides/providing-services#etag):

{#on-update-example}

```cds
entity Order : cuid {
    @odata.etag
    @cds.on.update : $now
    @cds.on.insert : $now
    modifiedAt : Timestamp;
    product : Association to Product;
}
```

#### The ETag Predicate {#etag-predicate}

An ETag can also be used programmatically in custom code. Use the `CqnEtagPredicate` to specify the expected ETag values in an update or delete operation. ETag checks are not executed on upsert. You can create an ETag predicate using the `CQL.eTag` or the `StructuredType.eTag` methods.

```java
PersistenceService db = ...
Instant expectedLastModification = ...;
CqnUpdate update = Update.entity(ORDER).entry(newData)
                         .where(o -> o.id().eq(85).and(
                                     o.eTag(expectedLastModification)));

Result rs = db.execute(update);

if (rs.rowCount() == 0) {
    // order 85 does not exist or was modified concurrently
}
```

In the previous example, an `Order` is updated. The update is protected with a specified ETag value (the expected last modification timestamp). The update is executed only if the expectation is met.

::: warning Application has to check the result
No exception is thrown if an ETag validation does not match. Instead, the execution of the update (or delete) succeeds but doesn't apply any changes. Ensure that the application checks the `rowCount` of the `CdsResult` and implement your error handling. If the value of `rowCount` is 0, that indicates that no row was updated (or deleted).
:::


#### Providing new ETag Values with Update Data

A convenient option to determine a new ETag value upon update is the [@cds.on.update](../../guides/domain-modeling#cds-on-update) annotation as in the [example above](#on-update-example). The CAP Java runtime automatically handles the `@cds.on.update` annotation and sets a new value in the data before the update is executed. Such _managed data_ can be used with ETags of type `Timestamp` or `UUID` only.

We do not recommend providing a new ETag value by custom code in a `@Before`-update handler. If you do set a value explicitly in custom code and an ETag element is annotated with `@cds.on.update`, the runtime does not generate a new value upon update for this element. Instead, the value that comes from your custom code is used.

#### Runtime-Managed Versions <Beta />

Alternatively, you can store ETag values in _version elements_. For version elements, the values are exclusively managed by the runtime without the option to set them in custom code. Annotate an element with `@cds.java.version` to advise the runtime to manage its value.

```cds
entity Order : cuid {
    @odata.etag
    @cds.java.version
    version : Int32;
    product : Association to Product;
}
```

Compared to `@cds.on.update`, which allows for ETag elements with type `Timestamp` or `UUID` only, `@cds.java.version` additionally supports all integral types `Uint8`, ... `Int64`. For timestamp, the value is set to `$now` upon update, for elements of type UUID a new UUID is generated, and for elements of integral type the value is incremented.

Version elements can be used with an [ETag predicate](#etag-predicate) to programmatically check an expected ETag value. Moreover, if additionally annotated with `@odata.etag`, they can be used for [conflict detection](../../guides/providing-services#etag) in OData.

##### Expected Version from Data

If the update data contains a value for a version element, this value is used as the _expected_ value for the version. This allows using version elements in a programmatic flow conveniently:

```java
PersistenceService db = ...
CqnSelect select = Select.from(ORDER).byId(85);
Order order = db.run(select).single(Order.class);

order.setAmount(5000);

CqnUpdate update = Update.entity(ORDER).entry(order);
Result rs = db.execute(update);

if (rs.rowCount() == 0) {
    // order 85 does not exist or was modified concurrently
}
```

During the execution of the update statement it's asserted that the `version` has the same value as the `version`, which was read previously and hence no concurrent modification occurred.

The same convenience can be used in bulk operations. Here the individual update counts need to be introspected.

```java
CqnSelect select = Select.from(ORDER).where(o -> amount().gt(1000));
List<Order> orders = db.run(select).listOf(Order.class);

orders.forEach(o -> o.setStatus("cancelled"));

CdsResult<Order> rs = db.execute(Update.entity(ORDER).entries(orders));

for(int i = 0; i < orders.size(); i++) if (rs.rowCount(i) == 0) {
    // order does not exist or was modified concurrently
}
```

> If an [ETag predicate is explicitly specified](#providing-new-etag-values-with-update-data), it overrules a version value given in the data.


### Pessimistic Locking { #pessimistic-locking}

Use database locks to ensure that data returned by a query isn't modified in a concurrent transaction.
_Exclusive_ locks block concurrent modification and the creation of any other lock. _Shared_ locks, however, only block concurrent modifications and exclusive locks but allow the concurrent creation of other shared locks.

To lock data:
1. Start a transaction (either manually or let the framework take care of it).
2. Query the data and set a lock on it.
3. Perform the processing and, if an exclusive lock is used, modify the data inside the same transaction.
4. Commit (or roll back) the transaction, which releases the lock.

To be able to query and lock the data until the transaction is completed, just call a [`lock()`](./query-api#write-lock) method and set an optional parameter `timeout`.

In the following example, a book with `ID` 1 is selected and locked until the transaction is finished. Thus, one can avoid situations when other threads or clients are trying to modify the same data in the meantime:

```java
// Start transaction
// Obtain and set a write lock on the book with id 1
	service.run(Select.from("bookshop.Books").byId(1).lock());
	...
// Update the book locked earlier
	Map<String, Object> data = Collections.singletonMap("title", "new title");
	service.run(Update.entity("bookshop.Books").data(data).byId(1));
// Finish transaction
```

The `lock()` method has an optional parameter `timeout` that indicates the maximum number of seconds to wait for the lock acquisition. If a lock can't be obtained within the `timeout`, a `CdsLockTimeoutException` is thrown. If `timeout` isn't specified, a database-specific default timeout will be used.

The parameter `mode` allows to specify whether an `EXCLUSIVE` or a `SHARED` lock should be set.


## Using I/O Streams in Queries

As described in section [Predefined Types](../cds-data#predefined-types) it's possible to stream the data, if the element is annotated with `@Core.MediaType`. The following example demonstrates how to allocate the stream for element `coverImage`, pass it through the API to an underlying database and close the stream.

Entity `Books` has an additional annotated element `coverImage : LargeBinary`:

```cds
entity Books {
  key ID : Integer;
  title  : String;
  ...
  @Core.MediaType
  coverImage : LargeBinary;
}
```

Java snippet for creating element `coverImage` from file `IMAGE.PNG` using `java.io.InputStream`:

```java
// Transaction started

Result result;
try (InputStream resource = getResource("IMAGE.PNG")) {
    Map<String, Object> book = new HashMap<>();
    book.put("title", "My Fancy Book");
    book.put("coverImage", resource);

    CqnInsert insert = Insert.into("bookshop.Books").entry(book);
    result = service.run(insert);
}

// Transaction finished
```

## Using Native SQL

CAP Java doesn't have a dedicated API to execute native SQL Statements. However, when using Spring as application framework you can leverage Spring's features to execute native SQL statements. See [Execute SQL statements with Spring's JdbcTemplate](../cqn-services/persistence-services#jdbctemplate) for more details.


## Query Result Processing { #result}

The result of a query is abstracted by the `CdsResult` interface, which is an iterable of [CdsData](../cds-data#cds-data) or its more specific [generated accessor interfaces](../cds-data#typed-access).
`CdsData` itself is a `Map<String, Object>` with additional convenience methods.

You can iterate over a `CdsResult`:

```java
CdsResult<?> result = ...

for (CdsData row : result) {
  System.out.println(row.get("title"));
}
```

Or process it with the [Stream API](https://docs.oracle.com/javase/8/docs/api/?java/util/stream/Stream.html):

```java
CdsResult<?> result = ...

result.forEach(r -> System.out.println(r.get("title")));

result.stream().map(r -> r.get("title")).forEach(System.out::println);
```

If your query is expected to return exactly one row, you can access it with the `single` method:

```java
CdsResult<?> result = ...

CdsData row = result.single();
```

::: tip
Set application property `cds.errors.preferServiceException` to ensure `single()` throws an appropriate 404 exception in case no row is found.
:::

You can also obtain the first row using `first`:

```java
CdsResult<?> result = ...

Optional<CdsData> row = result.first();
row.ifPresent(r -> System.out.println(r.get("title")));
```

The `CdsData`'s `getPath` method supports paths to simplify extracting values from nested maps. This also simplifies extracting values from results with to-one expands using the generic accessor. Paths with collection-valued segments and infix filters are not supported.

```java
CqnSelect select = Select.from(BOOKS).columns(
     b -> b.title(), b -> b.author().expand()).byId(101);
CdsData book = dataStore.execute(select).single();

String author = book.getPath("author.name");
```

### Null Values

A result row _may_ contain `null` values for an element of the result if no data is present for the element in the underlying data store.

Use the `get` methods to check if an element is present in the result row:

  ```java
  if (row.get("name") == null) {
     // handle mising value for name
  }
  ```

Avoid using `containsKey` to check for the presence of an element in the result row. Also, when iterating the elements of the row, keep in mind, that the data _may_ contain `null` values:

  ```java
  row.forEach((k, v) -> {
    if (v == null) {
     // handle mising value for element v
    }
 });
  ```

### Typed Result Processing

The element names and their types are checked only at runtime. Alternatively you can use interfaces to get [typed access](../cds-data#typed-access) to the result data:

```java
interface Book {
  String getTitle();
  Integer getStock();
}

CdsResult<?> result = service.run(query);
Book book = result.single(Book.class);

String title = book.getTitle();
Integer stock = book.getStock();
```

Interfaces can also be used to get a typed list or stream over the result:

```java
CdsResult<?> result = ...

List<Book> books = result.listOf(Book.class);

Map<String, String> titleToDescription =
  result.streamOf(Book.class).collect(Collectors.toMap(Book::getTitle, Book::getDescription));
```

For the entities defined in the data model, CAP Java SDK can generate interfaces for you through [a Maven plugin](../cqn-services/persistence-services#staticmodel).

When setting `linkedInterfaces` to `true` in the CDS Maven Plugin's `generate` goal, [query builder interfaces](../working-with-cql/query-api#concepts) and [data accessor interfaces](../cds-data#typed-access) are linked. This enables automatically typed results when executing a `Select` or `Update` statement, avoiding the need to explicitly pass the data accessor interface class to methods like `single(Entity.class)`, `listOf(Entity.class)` or `streamOf(Entity.class)`.

```java
import static cds.gen.catalogservice.CatalogService_.BOOKS;

var select = Select.from(BOOKS).byId(4711); // use var or Select<Books_>
CdsResult<Books> result = service.run(select);
Books book = result.single();
```

::: tip
Avoid using `CqnSelect` or `CqnUpdate` for typed query declarations, but prefer `var` to allow the Java compiler to retain the entity query type, linking to the data accessor interface: `var result = service.run(select);`
:::

### Entity References {#entity-refs}

For result rows that contain all key values of an entity, you get an [entity reference](./query-api#entity-refs) via the `ref()` method. This reference addresses the entity via the key values from the result row.

```java
// SELECT from Author[101]
CqnSelect query = Select.from(AUTHOR).byId(101);
Author authorData = service.run(query).single(Author.class);

String authorName = authorData.getName();    // data access
Author_ author    = authorData.ref();        // typed reference to Author[101]
```

Similar for untyped results:

```java
Row authorData = service.run(query).single();
StructuredType<?> author = authorData.ref(); // untyped reference to Author[101]
```

This also works for `Insert` and `Update` results:

```java
CqnUpdate update = Update.entity(AUTHOR).data("name", "James Joyce").byId(101);
Author_ joyce = service.run(update).single(Author.class).ref();
```

Using entity references you can easily write CDS QL statements targeting the source entity:

```java
// SELECT from Author[101].books { sum(stock) as stock }
CqnSelect q = Select.from(joyce.books())
     .columns(b -> func("sum", b.stock()).as("stock"));

CqnInsert i = Insert.into(joyce.books())
     .entry("title", "Ulysses");

CqnUpdate u = Update.entity(joyce.biography())
     .data("price", 29.95);

CqnDelete d = Delete.from(joyce.address())
     .where(b -> b.stock().lt(1));
```

### Introspecting the Row Type

The `rowType` method allows to introspect the element names and types of a query's `CdsResult`. It returns a `CdsStructuredType` describing the result in terms of the [Reflection API](../reflection-api):

```java
CqnSelect query = Select.from(AUTHOR)
     .columns(a -> a.name().as("authorName"), a -> a.age());

Result result = service.run(query);

CdsStructuredType rowType = result.rowType();
rowType.elements(); // "authorName", "age"
rowType.getElement("age").getType().getQualifiedName();  // "cds.Integer"
rowType.findElement("ID"); // Optional.empty()
```
