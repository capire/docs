---
synopsis: >
  API to fluently build CQL statements in Java.
status: released
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html
---

# Building CQL Statements
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

API to fluently build [CQL](../../cds/cql) statements in Java.

## Introduction

The [CDS Query Language (CQL)](../../cds/cql) statement builders allow to fluently construct [CQL](../../cds/cql) statements, which can be [executed](query-execution) by [CDS Services](../cqn-services/#cdsservices).

## Concepts

### The CQL Statement Builders

Use the builder classes `Select`, `Insert`, `Upsert`, `Update`, and `Delete` to construct [CQL](../../cds/cql) statements.
The following example shows a [CQL](../../cds/cql) query and how it's constructed with the `Select` builder:

```sql
-- CQL
SELECT from bookshop.Books { title } where ID = 101
```

```java
// Java CQL (dynamic)
Select.from("bookshop.Books").columns("title").byId(101);
```

Instead of using strings to refer to CDS entities and elements, you can also build statements using constants and interfaces [generated](../cqn-services/persistence-services#staticmodel) from the CDS model:

```java
import static bookshop.Bookshop_.BOOKS;

// Java CQL (static)
Select.from(BOOKS).columns(b -> b.title()).byId(101);
```

Using the static model has several advantages:

* The names of entities and elements are checked at design time.
* Use code completion in the IDE.
* Predicates and expressions can be composed in a type-safe way.
* More compact code.
::: tip
In general, it's recommended to use the static style when implementing business logic that requires accessing particular elements of entities. Using the dynamic style is appropriate for generic code.
:::

### Lambda Expressions

To construct complex statements, the [CQL](../../cds/cql) builders leverage [lambda expressions](https://docs.oracle.com/javase/tutorial/java/javaOO/lambdaexpressions.html) to fluently compose [expressions](#expressions) and [path expressions](#path-expressions) that are used in the statements' clauses.

```sql
-- CQL
SELECT from bookshop.Books { title } where year < 2000
```

```java
// Java CQL
Select.from(BOOKS)
    .columns(b -> b.title().as("Book"))
    .where(b -> b.year().lt(2000));
```

Here, the lambda expression `b -> b.title().as("Book")` references the element `title` of the entity Book `b` under the alias 'Book'. This aliased reference is put on the query's [select list](#projections) using the `columns` method.

The lambda expression `b -> b.year().lt(2000)` defines a predicate that compares the book's element `year` with the value 2000, which is then used to define the [where clause](#where-clause) of the select statement.

### Path Expressions

Use path expressions to access elements of [related](../../cds/cdl#associations) entities. The following example selects books with authors starting with 'A'.

```java
// Java CQL (static)
Select.from(BOOKS)
    .columns(b -> b.title(), b -> b.author().name().as("author"))
    .where(b -> b.author().name().startsWith("A"));

// Java CQL (dynamic)
Select.from("bookshop.Books")
    .columns(b -> b.get("title"), b -> b.get("author.name").as("author"))
    .where(b -> b.to("author").get("name").startsWith("A"));
```

The CQL query accesses the `name` element of the `Authors` entity, which is reached from `Books` via the `author` [association](../../cds/cdl#associations). In the dynamic CQL builders, you can follow associations and compositions using the `to` method or use `get` with a path using a dot to separate the segments.

### Target Entity Sets {#target-entity-sets}

All [CDS Query Language (CQL)](/cds/cql) statements operate on a _target entity set_, which is specified via the `from`, `into`, and `entity` methods of `Select`/`Delete`, `Insert`/`Upsert`, and `Update` statements.

In the simplest case, the target entity set identifies a complete CDS entity set:

```java
import static bookshop.Bookshop_.BOOKS;

// static
Select.from(BOOKS);

// dynamic
Insert.into("bookshop.Books").entry(book);

Update.entity("bookshop.Authors").data(author);
```

The _target entity set_ can also be defined by an [entity reference](#entity-refs), which allows using paths over associations and _infix filters_. Entity references can be defined inline using lambda expressions.

```sql
-- CQL
SELECT from Orders[3].items { quantity, book.title as book }
```

```java
// Java CQL
Select.from(ORDERS, o -> o.filter(o.id().eq(3)).items())
    .columns(i -> i.quantity(),
             i -> i.book().title().as("book"));
```

The _target entity set_ in the query is defined by the entity reference in the from clause. The reference targets the `items` of the `Order` with ID 3 via an _infix filter_. From this target entity set (of type `OrderItems`), the query selects the `quantity` and the `title` of the `book`. Infix filters can be defined on any path segment using the `filter` method, which overwrites any existing filter on the path segment. Defining an infix filter on the last path segment is equivalent to adding the filter via the statement's `where` method. However, inside infix filters, path expressions are not supported.

In the [CDS Query Language (CQL)](/cds/cql) builder, the lambda expression `o -> o.filter(o.id().eq(3)).items()` is evaluated relative to the root entity `Orders` (o). All lambda expressions that occur in the other clauses of the query are relative to the target entity set `OrderItems`, for example, `i -> i.quantity()` accesses the element `quantity` of `OrderItems`.
::: tip
To target components of a structured document, we recommend using path expressions with infix filters.
:::


### Filters {#target-entity-filters}

Besides using infix filters in path expressions, the `Select`, `Update`, and `Delete` builders support filtering the [target entity set](#target-entity-sets) via the `where` method. Using `where` is equivalent to defining an infix filter on the last segment of a path expression in the statement's `from` / `entity` clause. For statements that have both, an infix filter on the last path segment and a `where` filter, the resulting target filter is the conjunction (`and`) of the infix filter and the `where` filter.
For simple filters, you can use `byId`, `matching`, or `byParams` as an alternative to `where`. All of these filter methods overwrite existing filters, except for infix filters.


#### Using `where` {#concepts-where-clause}

Using the `where` method, you can define complex predicate [expressions](#expressions) to compose the filter:

```java
Select.from(BOOKS)
   .where(b -> b.author().name().eq("Twain")
     .and(b.title().startsWith("A").or(b.title().endsWith("Z"))));
```

#### Using `byID`

To find an entity with a single key element via its key value, you can use the `byId` method. The following example retrieves the `Author` entity with key 101.

```java
Select.from("bookshop.Authors").byId(101);
```
::: tip
The `byId` method isn't supported for entities with compound keys.
:::

#### Using `matching`

`matching` is a query-by-example style alternative to define the `where` clause. This method adds a predicate to the query that filters out all entities where the elements' values are equal to values given by a key-value filter map. The filter map can contain path keys, referring to elements of an associated entity. In the following example, `bookshop.Books` has a to-one association to the `Author` entity and the path `author.name` refers to the name element within the `Author` entity.

```java
Map<String, Object> filter = new HashMap<>();
filter.put("author.name", "Edgar Allen Poe");
filter.put("stock", 0);

Select.from("bookshop.Books").matching(filter);
```

#### Using `byParams`

`byParams` simplifies filtering by parameters as an alternative to `where` and `CQL.param`:

```java
import static bookshop.Bookshop_.BOOKS;

// using where
Select.from(BOOKS)
    .where(b -> b.title().eq(param("title"))
           .and(b.author().name().eq(param("author.name"))));

// using byParams
Select.from(BOOKS).byParams("title", "author.name");
```

### Parameters

The [CQL](../../cds/cql) builders support [parameters](#expr-param) in the `where` clause and in infix filters for [parameterized execution](query-execution#parameterized-execution):

The following example selects the books of the `Author` with name 'Jules Verne'.

```java
import static com.sap.cds.ql.CQL.param;

CqnSelect q = Select.from(BOOKS).where(b -> b.author().name().eq(param(0)));
dataStore.execute(q, "Jules Verne");
```

As an alternative, the where clauses can be constructed using the `byParams` method.

```java
CqnSelect q = Select.from(BOOKS).byParams("author.name");
dataStore.execute(q, singletonMap("author.name", "Jules Verne"));
```

Parameterized infix filters can be constructed using the `filterByParams` method. Path expressions are not supported.
The following example selects the books of the `Author` with ID 101.

```java
CqnSelect q = Select.from(AUTHORS, o -> o.filterByParams("ID").books());
dataStore.execute(q, singletonMap("ID", 101));
```

### Constant and Non-Constant Literal Values

In addition to parameters, the [CQL](../../cds/cql) builders also support literal values, which are already known at design time. These can be constructed using `CQL.constant()`  for constant literals and `CQL.val()` for non-constant literals:

```java
import static com.sap.cds.ql.CQL.val;

Select.from(BOOKS).columns(b -> b.title(), val("available").as("status"))
	.where(b -> b.stock().gt(0));
```

In case your application runs against a SQL datastore, for example SAP HANA, the CDS runtime takes literal values constructed with `CQL.val(value)` as a hint to bind the value to a parameter marker. The binding is handled implicitly and not explicitly as with `CQL.param()`.

The `CQL.constant(value)` method gives the hint that the literal value should be handled as a constant. For SQL datastores this means that the value is rendered directly into the SQL statement.

```java
import static com.sap.cds.ql.CQL.constant;

Select.from(BOOKS).columns(b -> b.title())
	.where(b -> b.cover().eq(constant("paperback")));
```

It strongly depends on your application's domain model and business logic, which one of the methods is to be preferred. As a rule of thumb:

* Use `val()` for values that change at runtime or depend on external input.
* Only use `constant()` for values that don't change at runtime and _don't depend on external input_.

With constant literals directly rendered into the statement, a SQL datastore has better options optimizing the statement. On the other hand, using constant literals limits the data store's options to cache statements.
::: warning
Constant literals are directly rendered into SQL and therefore **must not** contain external input!
:::

## Select

### Source

The source of the select statement determines the data set to which the query is applied. It's specified by the `from` method.

#### `FROM` Entity Set {#from-entity-set}

Typically a select statement selects from an [entity set](#target-entity-sets):

```sql
--CQL query
SELECT from bookshop.Books { title, author.name }
```

```java
// Query Builder API (dynamic usage)

CqnSelect query = Select.from("bookshop.Books")
    .columns("title", "author.name");
```

#### `FROM` Reference {#from-reference}

The source can also be defined by a [path expression](#path-expressions) referencing an entity set.

This query selects from the items of the order 23.

```sql
--CQL query
SELECT from Orders[ID = 23]:items
```

```java
// Query Builder API (static usage)
import static bookshop.Bookshop_.ORDERS;

Select.from(ORDERS, o -> o.filter(o.ID().eq(23)).items());
```

#### `FROM` Subquery {#from-select}

It's also possible to execute a nested select where an _outer_ query operates on the result of a _subquery_.

```sql
--CQL query
SELECT from (SELECT from Authors order by age asc limit 10) order by name
```

```java
// Query Builder API
CqnSelect youngestAuthors = Select.from(AUTHORS).orderBy(a -> age()).limit(10);
Select.from(youngestAuthors).orderBy("name");
```

This subquery selects the youngest authors, which the outer query [sorts](#ordering-and-pagination) by name.

Limitations:
* The subquery must not expand [to-many associations](../../cds/cdl#to-many-associations).
* The outer query can only be defined with the dynamic builder style.


### Projections {#projections}

By default, `Select` statements return all elements of the target entity. You can change this by defining a projection
via the `columns` method of the `Select` builder. Elements can be addressed via their name, including path expressions such as _author.name_:

```java
CqnSelect query = Select.from("bookshop.Books")
    .columns("title", "author.name");
```

To define more complex projections and benefit from code completion, use lambda expressions:

```java
// dynamic
Select.from("bookshop.Books")
    .columns(b -> b.get("title"),
             b -> b.get("author.name").as("authorName"));
```

```java
// static
import static bookshop.Bookshop_.BOOKS;

Select.from(BOOKS)
    .columns(b -> b.title(),
             b -> b.author().name().as("authorName"));
```

The path expression `b.author().name()` is automatically evaluated at runtime. For an SQL data store, it's converted to a LEFT OUTER join.

#### Deep Read with `expand` {#expand}

Use `expand` to read deeply structured documents and entity graphs into a structured result.

```java
// Java example
// using expand
import static bookshop.Bookshop_.AUTHORS;

Select.from(AUTHORS)
    .columns(a -> a.name().as("author"),
             a -> a.books().expand(
                      b -> b.title().as("book"),
                      b -> b.year()));
```

It expands the elements `title`, and `year` of the `Books` entity into a substructure with the name of the association `books`:

```json
[
  {
    "author" : "Bram Stoker",
    "books" :
    [
      {
        "title" : "Dracula",
        "year" : 1897
      },
      {
        "title" : "Miss Betty",
        "year" : 1898
      }
    ]
  }, ...
]
```

<span id="indeepread" />

To only expand entities that fulfill a certain condition, use [infix filters](#target-entity-sets) on the association:

```java
Select.from(AUTHORS)
    .columns(a -> a.name(),
             a -> a.books()
                   .filter(b -> b.year().eq(1897))
                   .expand(b -> b.title()))
    .where(a -> name().in("Bram Stroker", "Edgar Allen Poe"));
```

This query expands only books that were written in 1897:

```json
[
  {
    "name" : "Bram Stoker",
    "books" : [ { "title" : "Dracula" } ]
  },
  {
    "name" : "Edgar Allen Poe",
    "books" : [ ]
  }
]
```

Expands can be nested and have an alias, for example, to further expand the publisher names of the author's books:

```java
Select.from(AUTHORS)
    .columns(a -> a.name(),
             a -> a.books().as("novels").expand(
                      b -> b.title(),
                      b -> b.publisher().expand(p -> p.name())));
```

Which returns a deeply structured result:

```json
[
  {
    "name" : "Bram Stoker",
    "novels" :
    [
      {
        "title" : "Dracula",
        "publisher" : { "name": "Constable" }
      }, ...
    ]
  }, ...
]
```

To expand all non-association elements of an associated entity, use the `expand()` method without parameters after the association you want to expand.
For example, the following query expands _all_ elements of the book's author:

```java
Select.from(BOOKS)
      .columns(b -> b.title(),
               b -> b.author().expand());
```

To expand all first level associations of an entity, use `expand()` on the entity level:

```java
Select.from(BOOKS).columns(b -> b.expand());
```

::: warning Don't use distinct together with expand
The `distinct` clause removes duplicate rows from the root entity and effectively aggregates rows. Expanding child entities from aggregated rows is not well-defined and can lead to issues that can be resolved by removing distinct.
:::

::: tip Resolving duplicates in to-many expands
Duplicates in to-many expands can occur on associations that are mapped as many-to-many without using a [link entity](../../guides/domain-modeling#many-to-many-associations) and don't correctly define the source cardinality. This can be resolved by adding the cardinality in the CDS model: `Association [*,*] to Entity`.
:::

##### Optimized Expand Execution {#expand-optimization}

For *to-one expands*:
- The expand item list mustn't contain any literal value.
- The expand item list mustn't contain expression.

For *to-many expands*:
- The `on` condition of the association must only use equality predicates and conjunction (`AND`).
- The `from` clause isn't a [subquery](#from-select).
- The `where` clause doesn't contain [path expressions](#path-expressions).
- The query doesn't use [groupBy](#group-by) or `distinct`.
- The `columns`/`items` clause must contain at least one [element reference](#element-references).

In case the default query optimization leads to issues, annotate the association with
`@cds.java.expand: {using: 'parent-keys'}` to fall back to the unoptimized expand execution
and make sure the parent entity has all key elements exposed.

#### Flattened Results with `inline` {#inline}

To flatten deeply structured documents or include elements of associated entities into a flat result,
you can use `inline` as a short notation for using multiple paths.

```java
// Java example
import static bookshop.Bookshop_.AUTHORS;

// using multiple path expressions
Select.from(AUTHORS)
    .columns(a -> a.name(),
             a -> a.books().title().as("book"),
             a -> a.books().year());

// using inline
Select.from(AUTHORS)
    .columns(a -> a.name(),
             a -> a.books().inline(
                      b -> b.title().as("book"),
                      b -> b.year()));
```

Both queries are equivalent and have the same result: a _flat_ structure:

```json
[
  {
    "name" : "Bram Stoker",
    "book" : "Dracula",
    "year" : 1897
  },
  {
    "name" : "Bram Stoker",
    "book" : "Miss Betty",
    "year" : 1898
  }
]
```

<span id="inflattenedresults" />

#### Managed Associations on the Select List

To select the key elements of a [managed to-one association](../../cds/cdl#managed-associations)'s target entity, simply put the association on the select list. This will return the target key elements as structured result:

```java
// dynamic
Select.from("bookshop.Books")
      .columns(b -> b.get("author"));

// static
import static bookshop.Bookshop_.BOOKS;

CqnSelect q = Select.from(BOOKS)
    .columns(b -> b.author());

Row book = dataStore.execute(q).single();
Object authorId = book.get("author.Id"); // path access
```

::: tip
Only to-one associations that are mapped via the primary key elements of the target entity are supported on the select list. The execution is optimized and gives no guarantee that the target entity exists, if this is required use expand or enable [integrity constraints](../../guides/databases#database-constraints) on the database.
:::


### Filtering and Searching { #filtering}

The `Select` builder supports [filtering](#target-entity-filters) the target entity set via `where`, `byId`, `matching` and `byParams`. In contrast to infix filters, `where` filters of `Select` statements support path expressions. Additionally, `Select` supports `search` clauses.

The `search` method adds a predicate to the query that filters out all entities where any searchable element contains a given [search term](#search-term) or matches a [search expression](#search-expression).

1. Define searchable elements {#searchable-elements}

By default all elements of type `cds.String` of an entity are searchable. However, using the `@cds.search` annotation the set of elements to be searched can be defined. You can extend the search also to associated entities. For more information on `@cds.search`, refer to [Search Capabilities](../../guides/providing-services#searching-data).

Consider following CDS Entity. There are two elements, `title` and `name`, of type String, making them both searchable by default.

```cds
entity Book {
  key ID : Integer;
  name   : String;
  title  : String;
}
```
In the following example, element `title` is included in `@cds.search`. Only this particular element is searchable then.

```cds
@cds.search: {title}
entity Book {
  key ID : Integer;
  name   : String;
  title  : String;
}
```

<div id="infilteringandsearching" />


2. Construct queries with `search`

Let's consider the following Book entity once again:

```cds
entity Book {
  key ID : Integer;
  name   : String;
  title  : String;
}
```

* Use search terms {#search-term}

The following Select statement shows how to search for an entity containing the single _search term_ "Allen".

```java
// Book record - (ID, title, name) VALUES (1, "The greatest works of James Allen", "Unwin")

Select.from("bookshop.Books")
        .columns("id", "name")
        .search("Allen");
```

> The element `title` is [searchable](#searchable-elements), even though `title` isn't selected.

* Use search expressions {#search-expression}

It's also possible to create a more complex _search expression_ using `AND`, `OR`, and `NOT` operators. Following examples show how you can search for entities containing either term "Allen" or "Heights".

```java
// Book records -
// (ID, title, name) VALUES (1, "The greatest works of James Allen", "Unwin")
// (ID, title, name) VALUES (2, "The greatest works of Emily Bronte", "Wuthering Heights")

Select.from("bookshop.Books")
        .columns("id", "name")
        .search(term -> term.has("Allen").or(term.has("Heights")));
```


#### Using `where` Clause {#where-clause}

In a where clause, leverage the full power of [CDS Query Language (CQL)](/cds/cql) [expressions](#expressions) to compose the query's filter:

```java
Select.from("bookshop.Books")
	.where(b -> b.get("ID").eq(251).or(
              b.get("title").startsWith("Wuth")));
```


### Aggregating <Beta /> { #aggregating }

Use the aggregation methods `min`, `max`, `sum`, and `count` to calculate minimums, maximums, totals, and counts of values of associated entities directly in your CQL queries. You can use these aggregation methods in *columns* to include the aggregated values in the result set, or in the *where* clause to filter the result set based on aggregated values.

::: tip
Use [infix filters](/cds/cql#with-infix-filters) to aggregate only a subset of a collection.
:::

#### min

Find the minimum value of an element in a collection.

```java
Select.from(ORDERS).columns(
    o -> o.id(),
    o -> o.items()
       .filter(i -> i.amount().gt(0)) // optional filter
       .min(i -> i.amount()).as("minAmount")
);
```

This query selects each order’s id and the minimum item amount greater than 0 as "minAmount".

#### max

Find the maximum value of an element in a collection.

```java
Select.from(ORDERS)
    .where(o -> o.items().max(i -> i.amount()).gt(100));
```

This query selects all orders where the maximum item amount is greater than 100.

#### sum

Calculate the total of a numeric element across related entities.

```java
Select.from(ORDERS).columns(
    o -> o.id(),
    o -> o.items().sum(i -> i.amount()).as("totalAmount")
);
```

This query selects each order’s id and the sum of its item amounts as "totalAmount".

#### count

Count non-null values of an element in a collection.

```java
Select.from(ORDERS)
    .where(o -> o.items().count(i -> i.discount()).gt(0));
```

This query selects all orders where at least one item has a discount.


### Grouping

The Query Builder API offers a way to group the results into summarized rows (in most cases these are aggregate functions) and apply certain criteria on it.

Let's assume the following dataset for our examples:

|ID  |NAME  |
|----|------|
|100 |Smith |
|101 |Miller|
|102 |Smith |
|103 |Hugo  |
|104 |Smith |

#### Group By

The `groupBy` clause groups by one or more elements and usually involves aggregate [functions](query-api#scalar-functions), such as `count`, `countDistinct`, `sum`, `max`, `avg`, and so on. It returns one row for each group.

In the following example, we select the authors' name and, using the aggregate function `count`, determine how many authors with the same name exist in `bookshop.Authors`.

```java
import com.sap.cds.ql.CQL;

Select.from("bookshop.Authors")
	.columns(c -> c.get("name"), c -> CQL.count(c.get("name")).as("count"))
	.groupBy(g -> g.get("name"));
```

If we execute the query on our dataset, we get the following result:

|name  |count|
|------|-----|
|Smith |3    |
|Miller|1    |
|Hugo  |1    |


#### Having

To filter the [grouped](#group-by) result, `having` is used. Both, `having` and `where`, filter the result before `group by` is applied and can be used in the same query.

The following example selects authors where count is higher than 2:

```java
Select.from("bookshop.Authors")
    .columns(c -> c.get("name"), c -> func("count", c.get("name")).as("count"))
    .groupBy(c -> c.get("name"))
    .having(c -> func("count", c.get("name")).gt(2));
```

If we execute the query on our dataset, we get the following result:

|name  |count|
|------|-----|
|Smith |3    |


### Ordering and Pagination

The Query Builder API allows to specify the sort order of query results. The _sort specification_ governs, according to which elements the result is sorted, and which sort order (ascending or descending) is applied.

By default `Select` returns the rows in no particular order.

#### Order By

To ensure a specific order in a query use [`orderBy`](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Select.html#orderBy-java.util.function.Function...-), which allows sorting by one or more columns in ascending or descending order.

```java
Select.from("bookshop.Books")
    .columns(c -> c.get("ID"), c -> c.get("title"))
    .orderBy(c -> c.get("ID").desc(), c -> c.get("title").asc());
```

You can order by the alias of a column of the select list or a column that is defined as a result of the function call.

```java
Select.from("bookshop.Person")
    .columns(p -> p.get("name").toUpper().as("aliasForName"))
    .orderBy(p -> p.get("aliasForName").asc());
```

Aliases of columns have precedence over the element names when `orderBy` is evaluated.

::: warning
Aliases may shadow elements names. To avoid shadowing, don't use element names as aliases.
::::

On SAP HANA, the user's locale is passed to the database, resulting in locale-specific sorting of string-based columns.

By default, `null` values come before non-`null` values when sorting in ascending order and after non-`null` values when sorting in descending order. Use the `ascNullsLast` and `descNullsFirst` methods if you need to change this behavior.

The following query would sort `null` values for the element `nickname` last:

```java
Select.from("bookshop.Person")
    .orderBy(p -> p.get("name").asc(), p -> c.get("nickname").ascNullsLast());
```

If we execute the query on our dataset, we get the following result:

| name    | nickname |
| --------|----------|
| William | Bill     |
| William | null     |

#### Pagination

Pagination (dividing the result set into discrete subsets of a certain size) can be achieved by using [limit](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Select.html#limit-int-int-), which has the following optional parameters:
* `rows`: A number of rows to be returned. It's useful when dealing with large amounts of data, as returning all records in one shot can impact performance.
* `offset`: A particular number of rows to be skipped.

The following example selects all books, skip the first 20 rows, and return only 10 subsequent books:

```java
Select.from("bookshop.Books").limit(10, 20);
```

In this example, it's assumed that the total number of books is more or equal to 20. Otherwise, result set is empty.
::: tip
The pagination isn't stateful. If rows are inserted or removed before a subsequent page is requested, the next page could contain rows that were already contained in a previous page or rows could be skipped.
:::

### Pessimistic Locking { #write-lock}

Use the `lock()` method to enforce [Pessimistic Locking](../../guides/providing-services#select-for-update).

The following example shows how to build a select query with an _exclusive_ (write) lock. The query tries to acquire a lock for a maximum of 5 seconds, as specified by an optional parameter `timeout`:

```java
Select.from("bookshop.Books").byId(1).lock(5);
...
Update.entity("bookshop.Books").data("price", 18).byId(1);
```

To set a _shared_ (read) lock, specify the lock mode `SHARED` in the lock method:

```java
import static com.sap.cds.ql.cqn.CqnLock.Mode.SHARED;

Select.from("bookshop.Books").byId(1).lock(SHARED);
```

Not every entity exposed via a CDS entity can be locked with the `lock()` clause. To use the `lock()` clause, databases require that the target of such statements is represented by one of the following:
- a single table
- a simple view, so that the database can unambiguously identify which rows to lock

Views that use joins, aggregate data, include calculated or coalesced fields cannot be locked. Some databases might have additional restrictions or limitations specific to them.

There are few notable examples of such restrictions:

* You cannot use the `lock()` together with a `distinct()` or a `groupBy()`.
* You cannot use the `lock()` in a statement with the subquery as a source.
* Localized entities can be locked only if your query is run without a locale, as described in the chapter: [Modifying Request Context](../event-handlers/request-contexts#modifying-requestcontext). Alternatively, they can be locked by removing the localized element from the select list (columns).
* Entities that contain "on-read" calculated elements can't be locked when the statement references them in the select list or a filter.

As a general rule, prefer the statements that select primary keys with a simple condition, such as `byId` or `matching`, to select the target entity set that is locked.

## Insert

The [Insert](../../cds/cqn#insert) statement inserts new data into a target entity set.
An `Insert` statement is created by the [Insert](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Insert.html) builder class.

The target of the insert is specified by the `into` method.

As in the following example, the target of the insert can be specified by a fully qualified entity name or by a [CdsEntity](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/reflect/CdsEntity.html) you obtain from the [Reflection API](../../node.js/cds-reflect):

```java
Map<String, Object> book = new HashMap<>();
book.put("ID", 101);
book.put("title", "Capire");

CqnInsert insert = Insert.into("bookshop.Books").entry(book);
```

 or it can be a [path expression](#path-expressions), for example to add an item for Order 1001:

 ```java
import static bookshop.Bookshop_.ORDERS;

Insert.into(ORDERS, o -> o.matching(Map.of("ID", 1001))).items())
	.entry(Map.of("book", Map.of("ID", 251), "amount", 1));
```


### Single Insert

To insert a single entry, provide the data as a map to the [entry](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Insert.html#entry-java.util.Map-) method:

```java
Map<String, Object> book;
book.put("ID", 101);
book.put("title", "Capire 2");

CqnInsert insert = Insert.into("bookshop.Books").entry(book);
```

### Bulk Insert

`Insert` also supports a bulk operation. Here the data is passed as an Iterable of maps to the [entries](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Insert.html#entries-java.lang.Iterable-) method:

```java
import static bookshop.Bookshop_.BOOKS;

var data = List.of(
	Map.of("ID", 101, "title", "Capire"),
	Map.of("ID", 103, "title", "CAP Java"));

CqnInsert insert = Insert.into(BOOKS).entries(data);
```
::: tip
A bulk insert can also perform deep inserts.
:::

### Deep Insert

To build a deep insert, the input data maps can contain maps or list of maps as values, such as items of an order. By default, the insert operation cascades over compositions only. To cascade it also over selected associations, use the [@cascade](query-execution#cascading-over-associations) annotation.

CDS Model:

```cds
entity Orders {
  key OrderNo : String;
  Items       : Composition of many OrderItems on Items.parent = $self;
  ...
}
entity OrderItems {
  key ID : Integer;
  book   : Association to Books;
  quantity : Integer;
  ...
}
```
[Find this source also in **cap/samples**.](https://github.com/sap-samples/cloud-cap-samples-java/blob/5396b0eb043f9145b369371cfdfda7827fedd039/db/schema.cds#L24-L36){.learn-more}


Java:

```java
import static bookshop.Bookshop_.ORDERS;

var items = List.of(Map.of("ID", 1, "book_ID", 101, "quantity", 1));
var order = Map.of("OrderNo", "1000", "Items", items);

CqnInsert insert = Insert.into(ORDERS).entry(order);
```
::: tip
On SQL data stores the execution order of the generated insert statements is parent first.
:::

## Upsert { #upsert}

[Upsert](../../cds/cqn#upsert) updates existing entities or inserts new ones if they don't exist in the database.
`Upsert` statements are created with the [Upsert](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Upsert.html) builder and are translated into DB native upsert statements by the CAP runtime whenever possible.

The main use case of upsert is data replication.

If upsert data is incomplete only the given values are updated or inserted, which means the `Upsert` statement has "PATCH semantics".
::: warning
Upsert is **not** equivalent to Insert, even if an entity doesn't exist in the database.
:::

The following actions are *not* performed on Upsert:
 * UUID key values are _not generated_.
 * The `@cds.on.insert` annotation is _not handled_.
 * Elements are _not initialized_ with default values if the element's value is not given.
 * Generic CAP handlers, such as audit logging, are not invoked.

`Upsert` statements don't have a where clause. Just as with bulk [Updates](#bulk-update) and
[Inserts](#single-insert), the key values of the entity that is upserted are extracted from the data.
::: tip
The upsert data must contain values for all mandatory and key elements.
:::


### Single Upsert

To upsert a single entry, provide the data as a map to the [entry](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Upsert.html#entry-java.util.Map-) method:

```java
import static bookshop.Bookshop_.BOOKS;
import bookshop.Books;

Books book = Books.create();
book.setId(101);
book.setTitle("CAP for Beginners");

CqnUpsert upsert = Upsert.into(BOOKS).entry(book);
```

### Bulk Upsert

The `Upsert` also supports bulk operations. Here an `Iterable` of data maps is passed to the [entries](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Upsert.html#entries-java.lang.Iterable-) method:

```java
import static bookshop.Bookshop_.BOOKS;
import bookshop.Books;

Books b1 = Books.create(101);
b1.setTitle("Odyssey");

Books b2 = Books.create(103);
b2.put("title", "Ulysses");

List<Books> data = Arrays.asList(b1, b2);

CqnUpsert upsert = Upsert.into(BOOKS).entries(data);
```
::: tip
Bulk upserts with entries updating/inserting the same set of elements can be executed more efficiently than individual upsert operations and bulk upserts with heterogeneous data.
:::


### Deep Upsert { #deep-upsert}

Upsert can operate on deep [document structures](../cds-data#nested-structures-and-associations) modeled via [compositions](../../guides/domain-modeling#compositions), such as an `Order` with many `OrderItems`.
Such a _Deep Upsert_ is similar to [Deep Update](#deep-update), but it creates the root entity if it doesn't exist and comes with some [limitations](#upsert) as already mentioned.

The [full set](#deep-update-full-set) and [delta](#deep-update-delta) representation for to-many compositions are supported as well.
::: warning
Upsert doesn't allow changing the key of a child of a composition `of one`.
:::

## Update

Use the [Update](../../cds/cqn#update) statement to update existing entities with new data. The update data can be partial (patch semantics), elements without update values keep their old value, except for elements annotated with `@cds.on.update`, which are updated with the annotation value.

Depending on the filter condition, the `Update` can target [individual](#update-individual-entities) or [multiple](#searched-update) entity records.
::: tip
Check the [row count](query-execution#batch-execution) of the update result to get the number of updated records. It is 0 if no entity matched the filter condition.
:::

Use the [Update](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Update.html) builder to create an update statement.

### Updating Individual Entities {#update-individual-entities}

The target entity set of the update is specified by the [entity](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Update.html#entity-java.lang.String-) method.

In the following example, the update target is an entity of the [static model](../cqn-services/persistence-services#staticmodel). The update data is provided as a map to the [data](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Update.html#data-java.util.Map-) method, using [accessor interfaces](../cds-data#typed-access) to construct the data in a typed way. The filter condition of the update is constructed from the key values in the update data:

```java
import static bookshop.Bookshop_.BOOKS;
import bookshop.Books;

Books book = Books.create();
book.setId(100); // key value filter in data
book.setTitle("CAP Matters");

CqnUpdate update = Update.entity(BOOKS).data(book);
```

As an alternative to adding the key values to the data, you can use the [byId](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Update.html#byId-java.lang.Object-) filter for entities with a single key element or [matching](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Update.html#matching-java.util.Map-) for entities with compound key.

```java
Update.entity(BOOKS)
   .data("title", "CAP Matters").byId(100);
```

Furthermore, you can use filters in [path expressions](#path-expressions) to specify the update target:

```java
Update.entity(BOOKS, b -> b.matching(Books.create(100)))
   .data("title", "CAP Matters");
```

::: danger
If key values are not contained in the data and no filter (`where`, `byId`, `matching`) is specified a [searched update](#searched-update) is performed, which updates _all_ entities with the given data.
:::

### Update with Expressions {#update-expressions}

The [data](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Update.html#data(java.util.Map)), [entry](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Update.html#entry(java.util.Map)), and  [entries](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Update.html#entries(java.lang.Iterable)) methods allow to specify the new values as plain Java values. In addition/alternatively you can use the `set` method to specify the new [value](#values) as a [CqnValue](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/cqn/CqnValue.html), which can even be an [arithmetic expression](#arithmetic-expressions). This allows, for example, to decrease the stock of Book 101 by 1:

```java
// dynamic
Update.entity(BOOKS).byId(101).set("stock", CQL.get("stock").minus(1));

// static
Update.entity(BOOKS).byId(101).set(b -> b.stock(), s -> s.minus(1));
```

You can also combine update data with expressions:

```java
Update.entity(BOOKS).where(b -> b.stock().eq(0))
   .data("available", true)
   .set(b -> b.stock(), s -> s.plus(CQL.param("addStock")));
```

### Deep Update { #deep-update}

Use deep updates to update _document structures_. A document structure comprises a single root entity and one or multiple related entities that are linked via compositions into a [contained-in-relationship](../../guides/domain-modeling#compositions). Linked entities can have compositions to other entities, which become also part of the document structure.

By default, only target entities of [compositions](../../guides/domain-modeling#compositions) are updated in deep updates. Nested data for managed to-one associations is used only to [set the reference](../cds-data#setting-managed-associations-to-existing-target-entities) to the given target entity. This can be changed via the [@cascade](query-execution#cascading-over-associations) annotation.

For to-many compositions there are two ways to represent changes in the nested entities of a structured document: *full set* and *delta*.  In contrast to *full set* representation which describes the target state of the entities explicitly, a change request with *delta* payload describes only the differences that need to be applied to the structured document to match the target state. For instance, in deltas, entities that are not included remain untouched, whereas in full set representation they are deleted.

#### Full Set Representation { #deep-update-full-set}

In the update data, nested entity collections in **full set** representation have to be _complete_. All pre-existing entities that are not contained in the collection are deleted.
The full set representation requires the runtime to execute additional queries to determine which entities to delete and is therefore not as efficient to process as the [delta representation](#deep-update-delta).

Given the following *Order*:

```json
{
   "OrderNo": "1000",
   "status": "new",
   "createdAt": "2020-03-01T12:21:34.000Z",
   "items": [{"Id":1, "book":{"ID":100}, "quantity":1},
             {"Id":2, "book":{"ID":200}, "quantity":2},
             {"Id":3, "book":{"ID":200}, "quantity":3}]
}
```

Do a deep update `Update.entity(ORDERS).data(order)` with the following order data:

```json
{
   "OrderNo": "1000",
   "status": "in process",
   "items": [{"Id":1, "quantity":2},
             {"Id":4, "book":{"ID":400}, "quantity":4}]
}
```
> Constructed using `CdsData`, `CdsList` and the generated [accessor interfaces](../cds-data#typed-access).

See the result of the updated *Order*:

```json
{
   "OrderNo": "1000",
   "status": "in process",
   "createdAt": "2020-03-01T12:21:34.000Z",
   "items": [{"Id":1, "book":{"ID":100}, "quantity":2},
             {"Id":4, "book":{"ID":400}, "quantity":4}]
}
```

- Order `status` changed to "in process"
- Item 1 `quantity` changed to 2
- Items 2 and 3 removed from `items` and deleted
- Item 4 created and added to `items`


#### Delta Representation { #deep-update-delta}

In **delta** representation, nested entity collections in the update data can be partial: the runtime only processes entities that are contained in the collection but entities that aren't contained remain untouched.
Entities that shall be removed need to be included in the list and explicitly _marked for removal_.

Using the same sample _Order_ as in the previous full-set chapter, do a deep delta update with the following update data:

```java
import static com.sap.cds.CdsList.delta;

Order order = Order.create(1000);
order.setStatus("in process");
OrderItem item1 = OrderItem.create(1);
item1.setQuantity(2);
OrderItem item2 = OrderItem.create(2);
OrderItem item4 = OrderItem.create(4);
item4.setBook(Book.create(400));
item4.setQuantity(4);

// items delta with order item 2 marked for removal
order.setItems(delta(item1, item2.forRemoval(), item4));

Update.entity(ORDER).data(order);
```
> Create delta collections via `CdsList` and `CdsData`.

The deep update with order items in delta representation has similar effects as the update with items in full set representation. The only difference is that `OrderItem 3` is not deleted.


### Bulk Update: Update Multiple Entity Records with Individual Data {#bulk-update}

To update multiple entity records with individual update data, use the [entries](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Update.html#entries-java.lang.Iterable-) method and provide the key values of the entities in the data.
The individual update entries can be [deep](#deep-update). The following example illustrates this, using the generated accessor interfaces. The statement updates the status of order 1 and 2 and the header comment of order 3:

```java
Orders o1 = Orders.create(1);
o1.setStatus("canceled");

Orders o2 = Orders.create(2);
o2.setStatus("in process");

Orders o3 = Orders.create(3);
o3.put("header.comment", "Deliver with Order 2");

List<Orders> orders = Arrays.asList(o1, o2, o3);
CqnUpdate update = Update.entity(ORDERS).entries(orders);
```
::: tip
In general, a bulk update can be executed more efficiently than multiple individual updates,
especially if all bulk update entries update the same set of elements.
:::


### Update Multiple Entity Records with the same Data

To update multiple entity records with the same update data, use searched or batch updates.

#### Searched Update {#searched-update}

Use the [where](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Update.html#where-java.util.function.Function-) clause or [matching](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/Update.html#matching-java.util.Map-) to update _all_ entities that match the [filter](#expressions) with _the same_ update data. In the following example, the `stock` of all books with the title containing *CAP* is set to 100:

```java
Update.entity(BOOKS).data("stock", 100)
   .where(b -> b.title().contains("CAP"));
```

#### Parameterized Batch Update {#batch-update}

Use `CQL.param` in the `where` clause or `byParams` to create a parameterized update statement to execute the statement with one or multiple [parameter value sets](query-execution#batch-execution).

```java
// using where
CqnUpdate update = Update.entity(BOOKS).data("stock", 0)
    .where(b -> b.title().eq(CQL.param("title"))
           .and(b.author().name().eq(CQL.param("author.name"))));

// using byParams
CqnUpdate update = Update.entity(BOOKS).data("stock", 0)
    .byParams("title", "author.name");

Map<String, Object> paramSet1 = new HashMap<>();
paramSet1.put("author.name", "Victor Hugo");
paramSet1.put("title", "Les Misérables");
Map<String, Object> paramSet2 = new HashMap<>();
paramSet2.put("author.name", "Emily Brontë");
paramSet2.put("title", "Wuthering Heights");

Result result = service.run(update, asList(paramSet1, paramSet2));
```

## Delete

The [Delete](../../cds/cqn#delete) operation can be constructed as follows:

```cds
// CDS model
entity Orders {
  key OrderNo : String;
  Items       : Composition of many OrderItems on Items.parent = $self;
  ...
}
entity OrderItems {
  book   : Association to Books;
  ...
}
```

```java
// dynamic
CqnDelete delete = Delete.from("my.bookshop.Orders")
    .where(b -> b.get("OrderNo").eq(1000));
```

```java
// static
import static bookshop.Bookshop_.ORDERS;

CqnDelete delete = Delete.from(ORDERS)
    .where(b -> b.OrderNo().eq(1000));
```

By default, delete operations are cascaded along compositions. In the example, the `delete` statement would delete the order with id 1000 including its items, but no books since this relationship is modeled as an association. To enable cascading deletes over selected associations, use the [@cascade](query-execution#cascading-over-associations) annotation.

### Using `matching`

As an alternative to `where`, you can use `matching` to define the delete filter based on a map. In the following example, the entity `bookshop.Article` has a composite primary key made up of `ID` and `journalID`.

```java
import static com.sap.cds.ql.CQL.param;

Map<String, Object> params = new HashMap<>();
params.put("ID", param("ID"));
params.put("journalID", 101);

// using matching
CqnDelete delete = Delete.from("bookshop.Article").matching(params);

// using where
CqnDelete delete = Delete.from("bookshop.Article")
	.where(t -> t.get("ID").eq(param("ID"))
	.and(t.get("journalID").eq(101)));

// execution
Map<String, Object> row1 = singletonMap("ID", 1);
Map<String, Object> row2 = singletonMap("ID", 2);
dataStore.execute(delete, asList(row1, row2));
```

#### Using `byParams`

To delete multiple records of an entity you can use `byParams` as an alternative to parameters in `matching`/`where`. The records are then identified by the parameter values, which are given on statement [execution](query-execution#batch-execution):

```java
import static bookshop.Bookshop_.BOOKS;

// using where
Delete.from(BOOKS)
    .where(b -> b.title().eq(param("title"))
           .and(b.author().name().eq(param("author.name"))));

// using byParams
Delete.from(BOOKS).byParams("title", "author.name");
```

## Expressions

The Query Builder API supports using expressions in many places. Expressions consist of [values](#values), which can be used, for example, in [Select.columns](#projections) to specify the select list of the statement. Values can also be used in [predicates](#predicates) that allow, for example, to specify filter criteria for [Select](#select) or [Delete](#delete) statements.

### Entity References {#entity-refs}

Entity references specify entity sets. They can be used to define the target entity set of a [CQL](../../cds/cql) statement. They can either be defined inline using lambda expressions in the Query Builder (see [Target Entity Sets](#target-entity-sets)) or via the `CQL.entity` method, which is available in an _untyped_ version as well as in a _typed_ version that uses the generated [model interfaces](../cqn-services/persistence-services#model-interfaces). The following example shows an entity reference describing the set of *authors* that have published books in the year 2020:

```java
import com.sap.cds.ql.CQL;

// bookshop.Books[year = 2020].author // [!code focus]
Authors_ authors = CQL.entity(Books_.class).filter(b -> b.year().eq(2020)).author(); // [!code focus]

// or as untyped entity ref
StructuredType<?> authors =
   CQL.entity("bookshop.Books").filter(b -> b.get("year").eq(2020)).to("author");

// SELECT from bookshop.Books[year = 2020]:author { name } // [!code focus]
Select.from(authors).columns("name"); // [!code focus]
```

You can also get [entity references](query-execution#entity-refs) from the result of a CDS QL statement to address an entity via its key values in other statements.


### Values

Use values in a query's [select list](#projections) as well as in order-by. In addition, values are useful to compose filter [expressions](#expressions).

#### Element References

Element references reference elements of entities. To compose an element reference, the Query Builder API uses lambda expressions. Here the function `b -> e.title()` accesses the book's title. The dynamic usage `b.to("author").get("name")` accesses the name of a book's author, as a shortcut `b.get("author.name")` can be used.

```java
import static com.sap.cds.ql.CQL.literal;

Select.from(BOOKS)
      .columns(b -> b.title(),
               b -> b.author().name());
```

---

#### Literal Values

Specify values that are already known when the query is built. The `val` method of `CQL` is used to create a literal value that can be used in the Query Builder API:

```java
import static com.sap.cds.ql.CQL.val;

Select.from(EMPLOYEE)
      .columns(e -> e.name())
      .where(e -> val(50).gt(e.age()));
```

Alternatively, the factory methods for comparison predicates directly accept Java values. The query could also be written as:

```java
Select.from(EMPLOYEE)
      .columns(e -> e.name())
      .where(e -> e.age().le(50));
```

Use `CQL.constant` if the literal value shall be treated as [constant](#constant-and-non-constant-literal-values).

---

#### List Values

Combine multiple values with `CQL.list` to a list value (row value), which you can use in comparisons.

For example, the following query returns all sales after Q2/2012:

```java
import static com.sap.cds.ql.CQL.*;

CqnListValue props = list(get("year"), get("quarter"));
CqnListValue vals  = list(val(2012), val(2));
CqnSelect q = Select.from(SALES).where(comparison(props, GT, vals));
```
You can also compare multiple list values at once using an [`IN` predicate](#in-predicate).
#### Parameters {#expr-param}

The [`param`](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/CQL.html#param--) method can be statically imported from the helper class [CQL](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/CQL.html). It provides an option to use a parameter marker in a query that is bound to an actual value only upon query execution. Using parameters you can execute a query multiple times with different parameter values.

Parameters are either _indexed_ or _named_. Using _indexed_ parameters means, the values are bound to the parameters according to their index. Using _named_ parameters means, the values are given as a map:

```java
// indexed
import static com.sap.cds.ql.CQL.param;

Select.from("bookshop.Authors")
      .where(a -> a.firstName().eq(param(0)).and(
                  a.lastName().eq(param(1))));
dataStore.execute(query, "Paul", "Mueller");
```

```java
// named
import static com.sap.cds.ql.CQL.param;

Select.from("bookshop.Authors")
      .where(a -> a.firstName().eq(param("first")).and(
                  a.lastName().eq(param("last"))));

Map<String, Object> paramValues = new HashMap<>();
paramValues.put("first", "Paul");
paramValues.put("last", "Mueller");

dataStore.execute(query, paramValues);
```
::: tip
When using named parameters, `Update` and `Delete` statements can be executed as [batch](query-execution#batch-execution)) with multiple parameter sets.
:::


#### Scalar Functions

Scalar functions are values that are calculated from other values. This calculation can be executing a function on the underlying data store or applying an operation, like an addition, to its parameters. The Query Builder API supports the generic `func` function, as well as a number of build-in functions.

* Generic Scalar Function

    The generic function `func`, creates a scalar function call that is executed by the underlying data store. The first argument, being the native query language function name, and the remaining arguments are passed on as arguments of the specified function. In the following example, the native query language `count` function is called on the `name` element. This function returns the count of number of elements with name `Monika`.

    ```java
    import static com.sap.cds.ql.CQL.func;
    Select.from(EMPLOYEE)
      .columns(e -> e.name(), e -> func("COUNT", e.name()).as("count"))
      .where(e -> e.name().eq("Monika"));
    ```

* To Lower

    The `toLower` function is a built-in string function for converting a given string value to lower case using the rules of the underlying data store.

    ```java
    import static com.sap.cds.ql.CQL.toLower;
    Select.from(EMPLOYEE).columns(e -> e.name())
      .where(e -> e.name().endsWith(toLower("IKA")));
    ```

    In the following example, the `toLower` function is applied on the `name` element before applying the equals predicate.

    ```java
    Select.from(EMPLOYEE).columns(e -> e.name())
      .where(e -> e.name().toLower().eq("monika"));
    ```

* To Upper

    The `toUpper` function is a built-in string function for converting a given string value to upper case using the rules of the underlying data store.

    ```java
    import static com.sap.cds.ql.CQL.toUpper;
    Select.from(EMPLOYEE).columns(e -> e.name())
      .where(e -> e.name().endsWith(toUpper("ika")));
    ```

    In the following example, the `toUpper` function is applied on the `name` element before applying the equals predicate.

    ```java
    Select.from(EMPLOYEE).columns(e -> e.name())
      .where(e -> e.name().toUpper().eq("MONIKA"));
    ```

* Substring

    The `substring` method creates an expression for substring extraction from a string value. Extract a substring from a specified starting position of either a given length or to the end of the string. The first position is zero.

    ```java
    Select.from("bookshop.Authors")
      .columns(a -> a.get("name").substring(0,2).as("shortname"))
    ```
    In the following example, the `substring` function is applied as part of a predicate to test whether a subset of characters matches a given string.

    ```java
    Select.from("bookshop.Authors")
      .where(e -> e.get("name").substring(2).eq("ter"));
    ```

#### Case-When-Then Expressions

Use a case expression to compute a value based on the evaluation of conditions. The following query converts the stock of Books into a textual representation as 'stockLevel':

```java
Select.from(BOOKS).columns(
  b -> b.title(),
  b -> b.when(b.stock().lt(10)).then("low")
        .when(b.stock().gt(100)).then("high")
        .orElse("medium").as("stockLevel").type(CdsBaseType.STRING));
```

#### Arithmetic Expressions

Arithmetic Expressions are captured by scalar functions as well:

* Plus

    Function `plus` creates an arithmetic expression to add a specified value to this value.

    ```java
    // SELECT from Author {id + 2 as x : Integer}
    Select.from(AUTHOR)
      .columns(a -> a.id().plus(2).as("x"));
    ```

* Minus
    Function `minus` creates an arithmetic expression to subtract a specified value with this value.

    ```java
    Select.from("bookshop.Authors")
      .columns("name")
      .limit(a -> literal(3).minus(1));
    ```

* Times

    Function `times` creates an arithmetic expression to multiply a specified value with this value. In the following example, `p` is an Integer parameter value passed when executing the query.

    ```java
    Parameter<Integer> p = param("p");
    Select.from(AUTHOR)
      .where(a -> a.id().between(10, p.times(30)));
    ```

* Divided By

    Function `dividedBy` creates an arithmetic expression to divide this value with the specified value.

    ```java
    Select.from(AUTHOR)
      .where(a -> a.id().between(10, literal(30).dividedBy(2)));
    ```

### Predicates

Predicates are expressions with a Boolean value, which are used in [filters](#where-clause) to restrict the result set or to specify a [target entity set](#target-entity-sets).

#### `Comparison Operators` {#comparison-operators}

These comparison operators are supported:

<table>
<thead>
<tr>
<th colspan="2" align=center>Operator</th><th/><th/>
</tr>
<tr>
<th>
    CAP Java
</th>
<th>
    CDL
</th>
<th width="400">
    Description
</th>
<th>
     Example
</th>
</tr>
</thead>

<tbody>
<tr>
<td>EQ</td><td>=</td>
<td>
    Test if this value equals a given value. NULL values might be treated as unknown resulting in a <i>three-valued logic</i> as in SQL.
</td>
<td align="left">
<code>Select.from("bookshop.Books")
  .where(b -> b.get("stock")
  .<span class="na">eq</span>(15));</code>
</td>
</tr>

<tr>
<td>NE</td><td>&lt;&gt;</td>
<td>
    Test if this value is NOT equal to a given value. NULL values might be treated as unknown resulting in a <i>three-valued logic</i> as in SQL.
</td>
<td>
<code>Select.from("bookshop.Books")
  .where(b -> b.get("stock")
  .<span class="na">ne</span>(25));</code>
</td>
</tr>

<tr>
<td>IS</td><td>==</td>
<td>
    Test if this value equals a given value. NULL values are treated as any other value (<i>Boolean logic</i>).
</td>
<td>

<code>Select.from("bookshop.Books")
  .where(b -> b.get("stock")
  .<span class="na">is</span>(15));</code>

</td>
</tr>

<tr>
<td>IS NOT</td><td>!=</td>
<td>
    Test if this value is NOT equal to a given value. NULL values are treated as any other value (<i>Boolean logic</i>).
</td>
<td>

<code>Select.from("bookshop.Books")
  .where(b -> b.get("stock")
  .<span class="na">isNot</span>(25));</code>

</td>
</tr>

<tr>
<td>GT</td><td>&gt;</td>
<td>
    Test if this value is greater than a given value.
</td>
<td>

<code>Select.from("bookshop.Books")
  .where(b -> b.get("stock")
  .<span class="na">gt</span>(5));</code>

</td>
</tr>

<tr>
<td>GE</td><td>&gt;=</td>
<td>
    Test if this value is greater than or equal to a given value.
</td>
<td>

<code>Select.from("bookshop.Books")
  .where(b -> b.get("stock")
  .<span class="na">ge</span>(5));</code>

</td>
</tr>

<tr>
<td>LT</td><td>&lt;</td>
<td>
    Test if this value is less than a given value.
</td>
<td>

<code>Select.from("bookshop.Books")
  .where(b -> b.get("stock")
  .<span class="na">lt</span>(5));</code>

</td>
</tr>

<tr>
<td>LE</td><td>&lt;=</td>
<td>
    Test if this value is less than or equal to a given value.
</td>
<td>

<code>Select.from("bookshop.Books")
  .where(b -> b.get("stock")
  .<span class="na">le</span>(5));</code>

</td>
</tr>

<tr>
<td colspan="2">
BETWEEN
</td>
<td>
    Test if this value is between<sup>1</sup> a range of values.
</td>
<td>

<code>Select.from("bookshop.Books")
  .where(b -> b.get("stock")
  .<span class="na">between</span>(5, 10));</code>

</td>
</tr>
</tbody>
</table>

<sup>1</sup> upper and lower bound are included

#### `IN` Predicate

The `IN` predicate tests if a value is equal to any value in a given list.

The following example, filters for books written by Poe or Hemingway:

```java
Select.from(BOOKS)
  .where(b -> b.author().name().in("Poe", "Hemingway"));
```

The values can also be given as a list:

```java
List<String> authorNames = List.of("Poe", "Hemingway");

Select.from(BOOKS)
  .where(b -> b.author().name().in(authorNames));
```

You can also use the `IN` predicate to compare multiple [list values](#list-values) at once - for example to efficiently filter by multiple key value sets:

```java
import static com.sap.cds.ql.CQL.*;

CqnListValue elements = list(get("AirlineID"), get("ConnectionID"));
CqnListValue lh454  = list(val("LH"), val(454));
CqnListValue ba119  = list(val("BA"), val(119));

Select.from(FLIGHT_CONNECTION).where(in(elements, List.of(lh454, ba119)));
```

#### `IN` Subquery Predicate

Use the `in` subquery to test if an element (or tuple of elements) of an outer query is contained in the result of a subquery.

```java
// fluent style
Select.from(AUTHORS).where(author -> author.name().in(
    Select.from(JOURNALISTS).columns(journalist -> journalist.name())
));
```

In this example we check whether the tuple (`firstName`, `lastName`) is contained in the result of the subquery:

```java
// generic tree style via CQL api
CqnListValue fullName = CQL.list(CQL.get("firstName"), CQL.get("lastName"));
CqnSelect subquery = Select.from("socialmedia.Journalists").columns("firstName", "lastName");
Select.from("bookshop.Authors").where(CQL.in(fullName, subquery));
```

#### `ETag Predicate` {#etag-predicate}

The [ETag predicate](query-execution#etag-predicate) specifies expected ETag values for [conflict detection](query-execution#optimistic) in an [update](#update) or [delete](#delete) statement:

```java
Instant expectedLastModification = ...;
Update.entity(ORDER)
      .entry(newData)
      .where(o -> o.id().eq(85).and(o.eTag(expectedLastModification)));
```

You can also use the `eTag` methods of the `CQL` interface to construct an ETag predicate in [tree style](#cql-helper-interface):

```java
import static com.sap.cds.ql.CQL.*;

Instant expectedLastModification = ...;
Update.entity(ORDER)
      .entry(newData)
      .where(and(get("id").eq(85), eTag(expectedLastModification)));
```

#### `Logical Operators` {#logical-operators}

Predicates can be combined using logical operators:

<table>
<thead>
<tr>
<th>
    Operator
</th>
<th width="400">
    Description
</th>
<th>
     Example
</th>
</tr>
</thead>

<tbody>
<tr>
<td>
AND
</td>
<td>
    Returns a predicate that represents a logical AND of this predicate and another.
</td>
<td>

<code>Select.from("bookshop.Authors")
.where(a ->
  a.get("name").eq("Peter)
   .<span class="na">and</span>(a.get("Id").eq(1)));</code>

</td>
</tr>

<tr>
<td>
OR
</td>
<td>
    Returns a predicate that represents a logical OR of this predicate and another.
</td>
<td>

<code>Select.from("bookshop.Authors")
.where(a ->
  a.get("name").eq("Peter)
   .<span class="na">or</span>(a.get("Id").eq(1)));</code>

</td>
</tr>

<tr>
<td>
NOT
</td>
<td>
    Returns a predicate that represents the logical negation of this predicate.
</td>
<td>

<code>Select.from("bookshop.Authors")
.where(a ->
  <span class="na">not</span>(a.get("Id").eq(3)));</code>

</td>
</tr>
</tbody>
</table>

#### `Predicate Functions` {#predicate-functions}

These boolean-valued functions can be used in filters:

<table>
<thead>
<tr>
<th>
    Operator
</th>
<th width="400">
    Description
</th>
<th>
     Example
</th>
</tr>
</thead>

<tbody>
<tr>
<td>
CONTAINS
</td>
<td>
    Test if this string value contains a given substring.
</td>
<td>

<code>Select.from(EMPLOYEE)
  .where(e -> e.name()
  .<span class="na">contains</span>("oni"));</code>

</td>
</tr>

<tr>
<td>
STARTS WITH
</td>
<td>
    Test if this string value starts with a given prefix.
</td>
<td>

<code>Select.from("bookshop.Books")
  .where(b -> b.get("title")
  .<span class="na">startsWith</span>("The"));</code>

</td>
</tr>

<tr>
<td>
ENDS WITH
</td>
<td>
    Test if this string value ends with a given suffix.
</td>
<td>

<code>Select.from("bookshop.Books")
  .where(b -> b.get("title")
  .<span class="na">endsWith</span>("Raven"));</code>

</td>
</tr>
</tbody>
</table>

#### `matchesPattern` Predicate {#matches-pattern}

The `matchesPattern` predicate is applied to a String value and tests if it matches a given regular expression.

The regular expressions are evaluated on the database. Therefore, the supported syntax of the regular expression and the options you can use depends on the database you are using.

For example, following code matches title of the book that contains the word "CAP" in the title:

```java
Select.from("bookshop.Books").where(t -> t.get("title").matchesPattern("CAP"));
```

::: tip
As a general rule, consider regular expressions as a last resort. They are powerful, but also complex and hard to read. For simple string operations, prefer other simpler functions like `contains`.
::::

In the following example, the title of the book must start with the letter `C` and end with the letter `e` and contains any number of letters in between:

```java
Select.from("bookshop.Books").where(t -> t.get("title").matchesPattern("^C\\w*e$"));
```

The behavior of the regular expression can be customized with the options that can be passed as a second argument of the predicate. The set of the supported options and their semantics depends on the underlying database.

For example, the following code matches that the title of the book begins with the word "CAP" while ignoring the case of the letters:

```java
Select.from("bookshop.Books").where(t -> t.get("title").matchesPattern(CQL.val("^CAP.+$"), CQL.val("i")));
```

#### `anyMatch/allMatch` Predicate {#any-match}

The `anyMatch` and `allMatch` predicates are applied to an association and test if _any_ instance/_all_ instances of the associated entity set match a given filter condition. They are supported in filter conditions of [Select](#select), [Update](#update) and [Delete](#delete) statements.

This query selects the Authors that have written any book in the year 2000 that is published by a publisher starting with 'X':

```java
import static bookshop.Bookshop_.AUTHORS;

Select.from(AUTHORS)
  .where(a -> a.books().anyMatch(b ->
    b.year().eq(2000).and(b.publisher().name().startsWith("X"))));
```

The next statement deletes all Authors that have published all their books with publisher 'A':

```java
Delete.from(AUTHORS).where(a -> a.books().allMatch(b -> b.publisher().name().eq("A")));
```

The reference, to which `anyMatch`/`allMatch` is applied, may navigate multiple path segments. The following query selects all authors, for which the publisher of all books is named "CAP Publications":

```java
Select.from(AUTHORS).where(a -> a.books().publisher().allMatch(p -> p.name().eq("CAP Publications")));
```

This is equivalent to

```java
Select.from(AUTHORS).where(a -> a.books().allMatch(b -> b.publisher().name().eq("CAP Publications")));
```

Like in the previous example, a reference used in a match predicate filter may navigate to-one associations. Nested match predicates need to be used, if you want to express a condition in a match predicate filter on a reference that navigates to-many associations. The following example selects authors that have written a book where the word "unicorn" occurs on all pages:

```java
Select.from(AUTHORS).where(a -> a.books().anyMatch(
    b -> b.pages().allMatch(p ->
        p.text().contains("unicorn"))));
```

#### `EXISTS` Subquery {#exists-subquery}

An `exists` subquery is used to test if a subquery returns any records. Typically a subquery is correlated with the enclosing _outer_ query.
You construct an `exists` subquery with the [`exists`](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/StructuredType.html#exists-java.util.function.Function-) method, which takes a [function](#lambda-expressions) that creates the subquery from a reference to the _outer_ query. To access elements of the outer query from within the subquery, this _outer_ reference must be used:

```java
import static bookshop.Bookshop_.AUTHORS;
import static socialmedia.Journalists_.JOURNALISTS;

// fluent style
Select.from(AUTHORS)
  .where(author -> author.exists($outer ->
      Select.from(JOURNALISTS).where(journalist -> journalist.name().eq($outer.name()))
    )
  );
```

This query selects all authors with the name of an journalist.
::: tip
With an `exists` subquery, you can correlate entities that aren't linked with associations.
:::

When using the [tree-style API](#composing-predicates) the _outer_ query is addressed by the special reference name `"$outer"`:

```java
// tree style
CqnSelect subquery =
  Select.from("Journalists")
        .where(a -> a.get("name").eq(CQL.get("$outer.name")));
Select.from("Authors").where(CQL.exists(subquery));
```

> **Note:** Chaining `$outer` in nested subqueries is not supported.

## Parsing CQN

[CQL](../../cds/cql) queries can also be constructed from a [CQN](../../cds/cqn) string<sup>*</sup>:

```java
String cqnQuery = """
    {'SELECT': {'from': {'ref': ['my.bookshop.Books']},
    'where': [{'ref': ['title']}, '=', {'val': 'Capire'}]}}
    """;
CqnSelect query = Select.cqn(cqnQuery);
```

> <sup>*</sup> For readability reasons, we used single quotes instead of double quotes as required by the JSON specification.

The constructed queries can then be modified using the query builder API:

```java
String cqnQuery = ...
CqnSelect query = Select.cqn(cqnQuery).columns("price");
```

For `Insert`, `Update`, and `Delete` this is supported as well.

## CQL Expression Trees { #cql-helper-interface}

As an alternative to fluent API the [CQL](../../cds/cql) statement can be built, copied, and modified using [CQL Interface](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/CQL.html), which allows to build and reuse the parts of the statement.

### Composing Predicates

As opposed to fluent API it's possible to build the queries in a tree-style. Consider the following example:

```java
// CQL: SELECT from Books where year >= 2000 and year <= 2010
//
//                      AND
//                       |
//             +---------+---------+
//             |                   |
//             =>                 <=
//             |                   |
//        +----+----+         +----+----+
//        |         |         |         |
//      year       2000      year     2010

import static com.sap.cds.ql.CQL.*;
import com.sap.cds.sql.cqn.CqnComparisonPredicate;

CqnValue year = get("year");
CqnPredicate filter = and(comparison(year, Operator.GE, val(2000)), comparison(year, Operator.LE, val(2010)));
```

In the previous example using the `CQL.and`, a predicate limiting the `year` between 2000 and 2010 was built.

Using CQL Interface can be handy when the part of the statement should be built on the fly based on some condition. The following example demonstrates that, showing the usage of a `CQL.in` expression:

```java
// CQL: SELECT from Books where year >= 2000 and year <= 2010
//                         OR
//      SELECT from Books where year in (2000, 2001, ...)

List<Integer> years = ...;
List<Value<Integer>> yearValues = years.stream().map(y -> val(y)).collect(toList());
CqnElementRef year = CQL.get("year");

CqnPredicate filter;
if (years.isEmpty()) {
   filter = and(comparison(year, Operator.GE, val(2000)), comparison(year, Operator.LE, val(2010)));
} else {
   filter = CQL.in(year, yearValues);
}

Select.from("bookshop.Books").where(filter);
```

#### Connecting Streams of Predicates

You can leverage the Java Stream API to connect a stream of predicates with `AND` or `OR` using the `Collector`s `withAnd` or `withOr`. In this example we build a predicate that tests if a Person matches any first name/last name pair in a list:

```java
List<Name> names = ...
CqnPredicate filter =
  names.stream()
       .map(n -> CQL.and(
           CQL.get("firstName").eq(n.first()),
           CQL.get("lastName").eq(n.last())))
       .collect(CQL.withOr());
```

### Working with Select List Items

In addition to `CQL.get`, which creates a reference to a particular element, it's also possible to reference all elements using `CQL.star` method and use the expands as well. The next example demonstrates how to select all elements of `Book` and expand elements of associated `Author` of the book with `CQL.to(...).expand`:

```java
// SELECT from Books {*, author {*}}

Expand<?> authorItems = CQL.to("author").expand();
Select.from("bookshop.Books").columns(CQL.star(), authorItems);
```

### Using Functions and Arithmetic Expressions

CQL Interface provides multiple well-known functions such as: `min`, `max`, `average`, and so on. The following example shows how to use the function call to query the `min` and `max` stock of the `Books`:

```java
// CQL: SELECT from Books { MIN(stock) as minStock, MAX(stock) as maxStock }

CqnElementRef stock = CQL.get("stock");
Select.from("bookshop.Books").columns(
   CQL.min(stock).as("minStock"),
   CQL.max(stock).as("maxStock"));
```

In addition to that it's also possible to build a custom function using `CQL.func`:

```java
// CQL: SELECT from Books { LENGTH(title) as titleLength }

CqnElementRef title = CQL.get("title");
Select.from("bookshop.Books").columns(func("LENGTH", title).as("titleLength"));
```

Other than `CQL.func`, which returns a value, the `CQL.booleanFunc` constructs the function, which returns a predicate and thus can be used in `where` clause of a query. In the following example, SAP HANA function `CONTAINS` is used to execute fuzzy search on the column of the entity:

```java
Select.from("bookshop.Books")
   .where(e -> booleanFunc("CONTAINS",
            Arrays.asList(CQL.get(Books.TITLE).asRef(), val("Wuthering"), plain("FUZZY(0.5)"))));
```

Assume the `Book` has an element `price : Decimal`. One can calculate the discount price by subtracting the fixed value. This can be done using `CQL.expression`:

```java
// CQL: SELECT from Books { *, price - 5 as discountPrice }

CqnSelectListValue discountPrice = CQL.expression(
   CQL.get("price"), Operator.SUB, CQL.val(5)).as("discountPrice"); // Price reduced by 5
Select.from("bookshop.Books").columns(CQL.star(), discountPrice);
```

When using custom functions or expressions, you sometimes want to ensure that the return value is typed with a specific CDS type. You can use a CDL cast for this, by leveraging the `type` method.
By default, values returned by custom functions or expressions are not typed. If no explicit CDL cast is applied, the representation of the return value in Java is dependent on the database and its JDBC driver implementation.
In the following example, the result of the `ADD_SECONDS` function is ensured to be represented as a CDS `Timestamp` type. This ensures the return value is typed as an `Instant` in Java.

```java
// CQL: SELECT from Books { ADD_SECONDS(modifiedAt, 30) as addedSeconds : Timestamp }

CqnElementRef modified = CQL.get("modifiedAt");
Select.from("bookshop.Books").columns(
   CQL.func("ADD_SECONDS", modified, CQL.constant(30))
      .type(CdsBaseType.TIMESTAMP).as("addedSeconds"));
```

## Copying & Modifying CDS QL Statements {#copying-modifying-cql-statements}

Use [`CQL::copy`](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/CQL.html#copy-S-com.sap.cds.ql.cqn.Modifier-) and a modifier to copy and modify CDS QL statements and their components such as values and predicates:

```java
import com.sap.cds.ql.CQL;

// CQL: SELECT from Books where title = 'Capire'
CqnSelect query = Select.from(BOOKS).where(b -> b.title().eq("Capire"));
CqnSelect copy  = CQL.copy(query, modifier);  // implement Modifier
```

By overriding the default implementations of the `Modifier` interface, different parts of a statement or predicate can be replaced in the copy.

The following sections show some common examples of statement modifications, for a complete list of modifier methods, check the [Modifier](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/cqn/Modifier.html) interface.

### Replacing Predicates {#modify-where}

The following modifier replaces the `where` clause of the copy with a new predicate that connects the `where` clause of the query with `or` to `title = 'CAP Java'`.

```java
import com.sap.cds.ql.CQL;

// query: SELECT from Books where title = 'Capire'
// copy:  SELECT from Books where title = 'Capire' or title = 'CAP Java'

CqnSelect copy = CQL.copy(query, new Modifier() {
   @Override
   public Predicate where(Predicate where) {
      return CQL.or(where, CQL.get("title").eq("CAP Java"));
   }
});
```

To replace comparison predicates, override the [`Modifier::comparison`](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/cqn/Modifier.html#comparison-com.sap.cds.ql.Value-com.sap.cds.ql.cqn.CqnComparisonPredicate.Operator-com.sap.cds.ql.Value-) method. The following modifier replaces the value of the `title` comparison with `'CAP'`.

```java
// query: SELECT from Books where title = 'Capire'
// copy:  SELECT from Books where title = 'CAP'

CqnSelect copy = CQL.copy(query, new Modifier() {
   @Override
   public Predicate comparison(Value<?> lhs, Operator op, Value<?> rhs) {
      if (lhs.isRef() && lhs.asRef().lastSegment().equals("title")) {
         rhs = CQL.val("CAP");
      }
      return CQL.comparison(lhs, op, rhs);
   }
});
```

### Replacing References {#modify-ref}

References to elements and structured types are _immutable_. You can replace them by overriding the `Modifier::ref` methods.

The following modifier replaces the ref to the `Books` entity (1) in the copy of the query with a new ref that has a filter `year > 2000` and replaces the `title` ref (2) with a new ref with "book" as alias.

```java
// query: SELECT from Books { title }
// copy:  SELECT from Books[year > 2000] { title as book }

CqnSelect copy = CQL.copy(query, new Modifier() {
   @Override // (1)
   public CqnStructuredTypeRef ref(CqnStructuredTypeRef ref) {
      return CQL.to(ref.firstSegment())
            .filter(CQL.get("year").gt(2000))
            .asRef();
   }

   @Override // (2)
   public CqnValue ref(CqnElementRef ref) {
      return CQL.get(ref.segments()).as("book");
   }
});
```

### Modify the Select List {#modify-select}

The modifier can also be used to add or remove select list items via [`Modifier::items`](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/cqn/Modifier.html#items-java.util.List-):

```java
// query: SELECT from Books where title = 'Capire'
// copy:  SELECT from Books {title, author {name}} where title = 'Capire'

CqnSelect copy = CQL.copy(query, new Modifier() {
   @Override
   public List<CqnSelectListItem> items(List<CqnSelectListItem> items) {
      items.add(CQL.get("title"));                // add title
      items.add(CQL.to("author").expand("name")); // expand author name
      return items;
   }
});
```

### Modify the Order-By Clause {#modify-order-by}

To modify the `orderBy` clause of a query, override [`Modifier::orderBy`](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/cqn/Modifier.html#orderBy-java.util.List-):

```java
// query: SELECT from Books where title = 'Capire'
// copy:  SELECT from Books where title = 'Capire' ORDER BY title desc

CqnSelect copy = CQL.copy(query, new Modifier() {
   @Override
   public List<CqnSortSpecification> orderBy(List<CqnSortSpecification> order) {
      order.add(CQL.get("title").desc());
      return order;
   }
});
```
