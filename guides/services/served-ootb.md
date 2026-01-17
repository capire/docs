---
status: released
---


# Generic Service Providers
Served Out-of-the-Box  {.subtitle}


[[toc]]



## Introduction

The CAP runtimes for [Node.js](../../node.js/index) and [Java](../../java/index) provide a wealth of generic implementations, which serve most requests automatically, with out-of-the-box solutions to recurring tasks such as search, pagination, or input validation — the majority of this guide focuses on these generic features.

In effect, a service definition [as introduced above](providing-services) is all we need to run a full-fledged server out of the box. The need for coding reduces to real custom logic specific to a project's domain &rarr; section [Custom Logic](custom-code) picks that up.


## Serving CRUD Requests {#serving-crud}

The CAP runtimes for [Node.js](../../node.js/index) and [Java](../../java/index) provide generic handlers, which automatically serve all CRUD requests to entities for CDS-modelled services on top of a default [primary database](../databases/index).

This comprises read and write operations like that:

* `GET /Books/201` → reading single data entities
* `GET /Books?...` → reading data entity sets with advanced query options
* `POST /Books {....}` → creating new data entities
* `PUT/PATCH /Books/201 {...}` → updating data entities
* `DELETE /Books/201` → deleting data entities

<br>

::: warning No filtering and sorting for virtual elements
CAP runtimes delegate filtering and sorting to the database. Therefore
filtering and sorting is not available for `virtual` elements.
:::


## Deep Reads and Writes

CDS and the runtimes have advanced support for modeling and serving document-oriented data.
The runtimes provide generic handlers for serving deeply nested document structures out of the box as documented in here.


### Deep `READ`

You can read deeply nested documents by *expanding* along associations or compositions.
For example, like this in OData:

:::code-group
```http
GET .../Orders?$expand=header($expand=items)
```
```js[cds.ql]
SELECT.from ('Orders', o => {
  o.ID, o.title, o.header (h => {
    h.ID, h.status, h.items('*')
  })
})
```
[Learn more about `cds.ql`](../../node.js/cds-ql){.learn-more}
:::

Both would return an array of nested structures as follows:

```js
[{
    ID:1, title: 'first order', header: { // to-one
      ID:2, status: 'open', items: [{     // to-many
        ID:3, description: 'first order item'
      },{
        ID:4, description: 'second order item'
      }]
    }
  },
  ...
]
```



### Deep `INSERT`

Create a parent entity along with child entities in a single operation, for example, like that:

:::code-group
```http
POST .../Orders {
  ID:1, title: 'new order', header: { // to-one
    ID:2, status: 'open', items: [{   // to-many
      ID:3, description: 'child of child entity'
    },{
      ID:4, description: 'another child of child entity'
    }]
  }
}
```
:::

Note that Associations and Compositions are handled differently in (deep) inserts and updates:

- Compositions → runtime **deeply creates or updates** entries in target entities
- Associations → runtime **fills in foreign keys** to *existing* target entries

For example, the following request would create a new `Book` with a *reference* to an existing `Author`, with `{ID:12}` being the foreign key value filled in for association `author`:

```http
POST .../Books {
  ID:121, title: 'Jane Eyre', author: {ID:12}
}
```



### Deep `UPDATE`

Deep `UPDATE` of the deeply nested documents look very similar to deep `INSERT`:

:::code-group
```http
PUT .../Orders/1 {
  title: 'changed title of existing order', header: {
    ID:2, items: [{
      ID:3, description: 'modified child of child entity'
    },{
      ID:5, description: 'new child of child entity'
    }]
  }]
}
```
:::

Depending on existing data, child entities will be created, updated, or deleted as follows:

- entries existing on the database, but not in the payload, are deleted → for example, `ID:4`
- entries existing on the database, and in the payload are updated → for example, `ID:3`
- entries not existing on the database are created → for example, `ID:5`

**`PUT` vs `PATCH`** — Omitted fields get reset to `default` values or `null` in case of `PUT` requests; they are left untouched for `PATCH` requests.

Omitted compositions have no effect, whether during `PATCH` or during `PUT`. That is, to delete all children, the payload must specify `null` or `[]`, respectively, for the to-one or to-many composition.



### Deep `DELETE`

Deleting a root of a composition hierarchy results in a cascaded delete of all nested children.

:::code-group
```sql
DELETE .../Orders/1  -- would also delete all headers and items
```
:::

### Limitations

Note that deep `WRITE` operations are only supported out of the box if the following conditions are met:

1. The on-condition of the composition only uses comparison predicates with an `=` operator.
2. The predicates are only connected with the logical operator `AND`.
3. The operands are references or `$self`. CAP Java also supports pseudo variables like `$user.locale`.

```cds
entity Orders {
  key ID : UUID;
  title  : String;
  Items  : Composition of many OrderItems on substring(title, 0, 1) <= 'F' or Items.pos > 12; // [!code --]
  Items  : Composition of many OrderItems on Items.order = $self; // [!code ++]
}
entity OrderItems {
  key order : Association to Orders;
  key pos  : Integer;
  descr: String;
}
```

## Auto-Generated Keys


On `CREATE` operations, `key` elements of type `UUID` are filled in automatically. In addition, on deep inserts and upserts, respective foreign keys of newly created nested objects are filled in accordingly.

For example, given a model like that:

```cds
entity Orders {
  key ID : UUID;
  title  : String;
  Items  : Composition of many OrderItems on Items.order = $self;
}
entity OrderItems {
  key order : Association to Orders;
  key pos  : Integer;
  descr: String;
}
```

When creating a new `Order` with nested `OrderItems` like that:

```js
POST .../Orders {
  title: 'Order #1', Items: [
    { pos:1, descr: 'Item #1' },
    { pos:2, descr: 'Item #2' }
  ]
}
```

CAP runtimes will automatically fill in `Orders.ID` with a new uuid, as well as the nested `OrderItems.order.ID` referring to the parent.



## Searching Data


CAP runtimes provide out-of-the-box support for advanced search of a given text in all textual elements of an entity including nested entities along composition hierarchies.

A typical search request looks like that:

```js
GET .../Books?$search=Heights
```

That would basically search for occurrences of `"Heights"` in all text fields of Books, that is, in `title` and `descr` using database-specific `contains` operations (for example, using `like '%Heights%'` in standard SQL).

### The `@cds.search` Annotation {#cds-search}

By default search is limited to the elements of type `String` of an entity that aren't [calculated](../../cds/cdl#calculated-elements) or [virtual](../../cds/cdl#virtual-elements). Yet, sometimes you may want to deviate from this default and specify a different set of searchable elements, or to extend the search to associated entities. Use the `@cds.search` annotation to do so. The general usage is:

```cds
@cds.search: {
    element1,         // included
    element2 : true,  // included
    element3 : false, // excluded
    assoc1,           // extend to searchable elements in target entity
    assoc2.elementA   // extend to a specific element in target entity
}
entity E { }
```

[Learn more about the syntax of annotations.](../../cds/cdl#annotations){.learn-more}

### Including Fields

```cds
@cds.search: { title }
entity Books { ... }
```

Searches the `title` element only.

#### Extend Search to *Associated* Entities

```cds
@cds.search: { author }
entity Books { ... }

@cds.search: { biography: false }
entity Authors { ... }
```

Searches all elements of the `Books` entity, as well as all searchable elements of the associated `Authors` entity. Which elements of the associated entity are searchable is determined by the `@cds.search` annotation on the associated entity. So, from `Authors`, all elements of type `String` are searched but `biography` is excluded.

#### Extend to Individual Elements in Associated Entities

```cds
@cds.search: { author.name }
entity Books { ... }
```

Searches only in the element `name` of the associated `Authors` entity.

### Excluding Fields

```cds
@cds.search: { isbn: false }
entity Books { ... }
```

Searches all elements of type `String` excluding the element `isbn`, which leaves the `title` and `descr` elements to be searched.

::: tip
You can explicitly annotate calculated elements to make them searchable, even though they aren't searchable by default. The virtual elements won't be searchable even if they're explicitly annotated.
:::

### The `@Common.Text` Annotation

If an entity has an element annotated with the `@Common.Text` annotation, then the property that holds the display text is added to the list of searchable elements (see exception below).

For example, with the following model, the list of searchable elements for `Books` is `title` and `author.name`:

```cds
entity Books : cuid {
  title  : String;
  @Common.Text : author.name
  author : Association to Author;
}
entity Author : cuid {
  name : String;
}
```

::: warning `@cds.search` takes precedence over `@Common.Text`
As a result, `@Common.Text` is ignored as soon as `@cds.search` defines anything in including mode. Only if you exclusively exclude properties using `@cds-search`, the `@Common.Text` is kept.
:::

To illustrate the above:
- `@cds.search: { title: false }` on `Books` would only exclude properties, so `author.name` would still be searched.
- `@cds.search: { title }` on `Books` defines an include list, so `author.name` is not searched. In this mode, `@cds.search` is expected to include all properties that should be searched. Hence, `author.name` would need to be added to `@cds.search` itself: `@cds.search: { title, author.name }`.

### Fuzzy Search on SAP HANA Cloud <Beta /> {#fuzzy-search}

> Prerequisite: For CAP Java, you need to run in [`HEX` optimization mode](../../java/cqn-services/persistence-services#sql-optimization-mode) on SAP HANA Cloud and enable <Config java keyOnly>cds.sql.hana.search.fuzzy = true</Config>

Fuzzy search is a fault-tolerant search feature of SAP HANA Cloud, which returns records even if the search term contains additional characters, is missing characters, or has typographical errors.

You can configure the fuzziness in the range `[0.0, 1.0]`. The value `1.0` enforces the least fuzzy search, if not overwritten by annotations on elements.

- Java: <Config java keyOnly>cds.sql.hana.search.fuzzinessThreshold = 0.8</Config>
- Node.js:<Config keyOnly>cds.hana.fuzzy = 0.7</Config><sup>(1)</sup>

<sup>(1)</sup> If set to `false`, fuzzy search is disabled and falls back to a case insensitive substring search.

Override the fuzziness for elements, using the `@Search.fuzzinessThreshold` annotation:

```cds
entity Books {
   @Search.fuzzinessThreshold: 0.7
   title : String;
}
```

The relevance of a search match depends on the weight of the element causing the match. By default, all [searchable elements](#cds-search) have equal weight. To adjust the weight of an element, use the `@Search.ranking` annotation. Allowed values are HIGH, MEDIUM (default), and LOW:

```cds
entity Books {
   @Search.ranking: HIGH
   title         : String;

   @Search.ranking: LOW
   publisherName : String;
}
```

::: tip Wildcards in search terms
When using wildcards in search terms, an *exact pattern search* is performed.
Supported wildcards are '*' matching zero or more characters and '?' matching a single character. You can escape wildcards using '\\'.
:::



## Pagination & Sorting


### Implicit Pagination

By default, the generic handlers for READ requests automatically **truncate** result sets to a size of 1,000 records max.
If there are more entries available, a link is added to the response allowing clients to fetch the next page of records.

The OData response body for truncated result sets contains a `nextLink` as follows:

```http
GET .../Books
>{
  value: [
    {... first record ...},
    {... second record ...},
    ...
  ],
  @odata.nextLink: "Books?$skiptoken=1000"
}
```

To retrieve the next page of records from the server, the client would use this `nextLink` in a follow-up request, like so:

```http
GET .../Books?$skiptoken=1000
```

On firing this query, you get the second set of 1,000 records with a link to the next page, and so on, until the last page is returned, with the response not containing a `nextLink`.
::: warning
Per OData specification for [Server Side Paging](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_ServerDrivenPaging), the value of the `nextLink` returned by the server must not be interpreted or changed by the clients.
:::

### Reliable Pagination

> Note: This feature is available only for OData V4 endpoints.

Using a numeric skip token based on the values of `$skip` and `$top` can result in duplicate or missing rows if the entity set is modified between the calls. _Reliable Pagination_ avoids this inconsistency by generating a skip token based on the values of the last row of a page.

The reliable pagination is available with following limitations:

- Results of functions or arithmetic expressions can't be used in the `$orderby` option (explicit ordering).
- The elements used in the `$orderby` of the request must be of simple type.
- All elements used in `$orderby` must also be included in the `$select` option, if it's set.
- Complex [concatenations](../protocols/odata#concat) of result sets aren't supported.
::: warning
Don't use reliable pagination if an entity set is sorted by elements that contain sensitive information, the skip token could reveal the values of these elements.
:::

The feature can be enabled with the following [configuration options](../../node.js/cds-env#project-settings) set to `true`:
- Java: <Config java keyOnly>cds.query.limit.reliablePaging.enabled: true</Config>
- Node.js: <Config keyOnly>cds.query.limit.reliablePaging: true</Config>


### Paging Limits


You can configure default and maximum page size limits in your [project configuration](../../node.js/cds-env#project-settings) as follows:

```json
"cds": {
  "query": {
    "limit": {
      "default": 20, //> no default
      "max": 100     //> default 1000
    }
  }
}
```

- The **maximum limit** defines the maximum number of items that can get retrieved, regardless of `$top`.
- The **default limit** defines the number of items that are retrieved if no `$top` was specified.


#### Annotation `@cds.query.limit` {#annotation-cds-query-limit}

You can override the defaults by applying the `@cds.query.limit` annotation on the service or entity level, as follows:

<!-- cds-mode: ignore, because it shows expected format, not CDS snippet -->
```cds
@cds.query.limit: { default?, max? } | Number
```

The limit definitions for `CatalogService` and `AdminService` in the following example are equivalent.

```cds
@cds.query.limit.default: 20
@cds.query.limit.max: 100
service CatalogService {
  // ...
}
@cds.query.limit: { default: 20, max: 100 }
service AdminService {
  // ...
}
```

`@cds.query.limit` can be used as shorthand if no default limit needs to be specified at the same level.

```cds
@cds.query.limit: 100
service CatalogService {
  entity Books as projection on my.Books;     //> pages at 100
  @cds.query.limit: 20
  entity Authors as projection on my.Authors; //> pages at 20
}
service AdminService {
  entity Books as projection on my.Books;     //> pages at 1000 (default)
}
```

#### Precedence

The closest limit applies, that means, an entity-level limit overrides that of its service, and a service-level limit overrides the global setting. The value `0` disables the respective limit at the respective level.

```cds
@cds.query.limit.default: 20
service CatalogService {
  @cds.query.limit.max: 100
  entity Books as projection on my.Books;     //> default = 20 (from CatalogService), max = 100
  @cds.query.limit: 0
  entity Authors as projection on my.Authors; //> no default, max = 1,000 (from environment)
}
```


### Implicit Sorting


Paging requires implied sorting, otherwise records might be skipped accidentally when reading follow-up pages.
By default the entity's primary key is used as a sort criterion.

For example, given a service definition like this:

```cds
service CatalogService {
  entity Books as projection on my.Books;
}
```

The SQL query executed in response to incoming requests to Books will be enhanced with an additional order-by clause as follows:

```sql
SELECT ... from my_Books
ORDER BY ID; -- default: order by the entity's primary key
```

If the request specifies a sort order, for example, `GET .../Books?$orderby=author`, both are applied as follows:

```sql
SELECT ... from my_Books ORDER BY
  author,     -- request-specific order has precedence
  ID;         -- default order still applied in addition
```

We can also define a default order when serving books as follows:

```cds
service CatalogService {
  entity Books as projection on my.Books order by title asc;
}
```

Now, the resulting order by clauses are as follows for `GET .../Books`:

```sql
SELECT ... from my_Books ORDER BY
  title asc,  -- from entity definition
  ID;         -- default order still applied in addition
```

... and for `GET .../Books?$orderby=author`:

```sql
SELECT ... from my_Books ORDER BY
  author,     -- request-specific order has precedence
  title asc,  -- from entity definition
  ID;         -- default order still applied in addition
```





## Concurrency Control

CAP runtimes support different ways to avoid lost-update situations as documented in the following.

Use _optimistic locking_ to _detect_ concurrent modification of data _across requests_. The implementation relies on [ETags](#etag).

Use _pessimistic locking_ to _protect_ data from concurrent modification by concurrent _transactions_. CAP leverages database locks for [pessimistic locking](#select-for-update).

### Conflict Detection Using ETags {#etag}

The CAP runtimes support optimistic concurrency control and caching techniques using ETags.
An ETag identifies a specific version of a resource found at a URL.

Enable ETags by adding the `@odata.etag` annotation to an element to be used to calculate an ETag value as follows:

```cds
using { managed } from '@sap/cds/common';
entity Foo : managed {...}
annotate Foo with { modifiedAt @odata.etag }
```

> The value of an ETag element should uniquely change with each update per row.
> The `modifiedAt` element from the [pre-defined `managed` aspect](../../cds/common#aspect-managed) is a good candidate, as this is automatically updated.
> You could also use update counters or UUIDs, which are recalculated on each update.

You use ETags when updating, deleting, or invoking the action bound to an entity by using the ETag value in an `If-Match` or `If-None-Match` header.
The following examples represent typical requests and responses:

```http
POST Employees { ID:111, name:'Name' }
> 201 Created {'@odata.etag': 'W/"2000-01-01T01:10:10.100Z"',...}
//> Got new ETag to be used for subsequent requests...
```

```http
GET Employees/111
If-None-Match: "2000-01-01T01:10:10.100Z"
> 304 Not Modified // Record was not changed
```

```http
GET Employees/111
If-Match: "2000-01-01T01:10:10.100Z"
> 412 Precondition Failed // Record was changed by another user
```

```http
UPDATE Employees/111
If-Match: "2000-01-01T01:10:10.100Z"
> 200 Ok {'@odata.etag': 'W/"2000-02-02T02:20:20.200Z"',...}
//> Got new ETag to be used for subsequent requests...
```

```http
UPDATE Employees/111
If-Match: "2000-02-02T02:20:20.200Z"
> 412 Precondition Failed // Record was modified by another user
```

```http
DELETE Employees/111
If-Match: "2000-02-02T02:20:20.200Z"
> 412 Precondition Failed // Record was modified by another user
```

If the ETag validation detects a conflict, the request typically needs to be retried by the client. Hence, optimistic concurrency should be used if conflicts occur rarely.

### Pessimistic Locking {#select-for-update}

_Pessimistic locking_ allows you to lock the selected records so that other transactions are blocked from changing the records in any way.

Use _exclusive_ locks when reading entity data with the _intention to update_ it in the same transaction and you want to prevent the data to be locked or updated in a concurrent transaction.

Use _shared_ locks if you only need to prevent the entity data to be locked exclusively by an update in a concurrent transaction or by a read operation with lock mode _exclusive_. Non-locking read operations or read operations with lock mode _shared_ are not prevented.

The records are locked until the end of the transaction by commit or rollback statement.

Here's an overview table:

| State              | Select Without Lock   | Select With Shared Lock |  Select With Exclusive Lock/Update |
| --------------- | ----------------------- | -------------------------- |  ------------------------------------- |
| not locked      | passes | passes  | passes |
| shared lock     | passes | passes  | waits |
| exclusive lock | passes | waits  | waits |


[Learn more about using the `SELECT ... FOR UPDATE` statement in the Node.js runtime.](../../node.js/cds-ql#forupdate){.learn-more}

[Learn more about using the `Select.lock()` method in the Java runtime.](../../java/working-with-cql/query-api#write-lock){.learn-more}


::: warning Restrictions
-  Pessimistic locking is supported for domain entities (DB table rows). The locking is not possible for projections and views.
-  Pessimistic locking is not supported by SQLite. H2 supports exclusive locks only.
:::
