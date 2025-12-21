---
index: 26
label: Querying
synopsis: >
  Learn about CAP's intrinsic querying capabilities, which allows
  clients to request the exact data they need, and are key enablers for
  serving requests automatically.
# layout: cookbook
breadcrumbs:
  - Cookbook
  - Querying
#status: released (add link in /guides/databases/index#db-agnostic-queries to this guide when released)
search: false
---

# Querying and View Building

{{ $frontmatter.synopsis }}

[[toc]]


## Overview — Why Querying?

We all know querying from SQL databases: we use queries to express which data we're interested in, by applying *selection* — that is, filtering the *rows* to fetch data for —, and *projection* — choosing data attributes. The database engine interprets the query and calculates an optimized execution plan, to collect and return the requested data.

### Example Using Querying

Here is a typical case reading nested data using `cds.ql` in Node.js:

```js
let authors = await SELECT.from `Authors` .columns `{
   ID, name, books [where stock>4] {
      ID, title, stock,
      genre.name as genre
   }
}` .where `born < 1900`
.orderBy `name asc`
```

What data excerpt is required is expressed in a single query statement; all data is read in a single operation. This is frequently called the *functional/intentional* programming approach: in the code the programmer expresses *what* s/he wants not *how*, leaving it to the runtime framework to **optimize behind the scenes**.

### Querying vs Imperative Coding

Assumed we'd have to read from data sources, which don't support querying — that is, no projections, no expands, no filtering, no sorting — doing the equivalent of the above might end up in *imperative* coding like that:

```js
let db = //... be some REST-like data source
let authors = [] //... to be filled in below
let allAuthors = db.get('Authors')   //> all data of all authors!
let allBooks = db.get('Books')       //> all data of all books!
for (let a of allAuthors) {
  if (a.born >= 1900) continue       //> ignoring unwanted rows
  let a2 = {                         //> ignoring unwanted data
      ID    : a.ID,
      name  : a.name,
      books : []
  }
  for (let b of allBooks) {
    if (b.author !== a.ID) continue  //> ignoring unwanted rows
    let b2 = {                       //> ignoring unwanted data
      ID    : b.ID,
      title : b.title,
      stock : b.stock
    }
    let gid = b.genre.ID
    let g = db.get('Genre/'+b.genre) //> expensive single fetch
    b2.genre = g.name                //> ignoring unwanted data
    a2.books.push (b2)
  }
  authors.push (a2)
}
return authors
```

Clearly this example shows that data-oriented applications need data sources which at least some kind of querying support.

### Querying vs. ORM

If we'd use an Object-Relational Mapper (ORM) instead, we would benefit from the ORM-typical deferred fetching of related data, like `author.books` and `books.genre` in our example.

```typescript
let authors = [] //... to be filled in below
let _authors = Authors.where({       //> all data of selected authors
  born: { gt: 1900 }
})
for (let a of _authors) {
  let a2 = {                         //> ignoring unwanted data
      ID    : a.ID,
      name  : a.name,
      books : []
  }
  for (let b of a.books) {           //> ORM-typical deferred fetch
    let b2 = {                       //> ignoring unwanted data
      ID    : b.ID,
      title : b.title,
      stock : b.stock
    }
    b2.genre = b.genre.name          //> ignoring unwanted data
    a2.books.push (b2)
  }
  authors.push (a2)
}
return authors
```

Typically with ORMs:

- navigating along relationship looks convenient → like object references, yet...
- still rather poor re projections → reading all attributes
- and at the cost of 1+n queries syndromes
- which requires object identity and caching to perform
- which conflicts with scalability in clusters

## View and Projections (in CDL) {#views}

Similar to SQL, CDS allows to declare new entities as views on underlying entities, using queries to capture the respective mappings.

```sql
entity MyFavoriteBooks as select from Books {
   ID, title, author.name as author
} where ID in (SELECT book from MyFavorites)
```

```sql
entity LatestBooks as projection on Books {
   ID, title, author.name as author
} where publication >= $now - 1 year
```

[Learn more about Views and Projections in CDL.](../../cds/cdl#views){.learn-more}

CDS provides two syntax variants for declaring views:

### `as select from`

allows full native SQL feature sets of underlying databases → use that only if you are sure you can map to such a database.
{.indent}


### `as projection on`

is restricted to projections and filters → use that if the views might be served from other sources than databases.
{.indent}

Things only supported with `as select from` comprise JOINs, UNIONs, sub selects, aggregations, DB-native features.

## CDS Query Language (CQL)

Within the CDS language family, CQL is the human-readable language to express queries. Such queries can be executed at runtime, or used to define new entities as views on underlying ones, [as introduced above](#views).

### Designed as an Extension to SQL

CQL is designed as an extension to SQL, so, queries written in CQL look familiar to all who know SQL, and all the commonly known SQL constructs are supported.

For example, this is valid SQL, as well as valid CQL:

```sql
SELECT ID, title as Title, descr as Description from Books
```

Moreover, this allows CQL to be used as a stand-in to SQL when talking to databases as also things like `JOINs`, `UNIONs`, etc. up to native features from underlying databases can be used.

### Path Expressions

The most important extension to SQL is path expressions allow to navigate along associations, thereby eliminating the need for joins.

For example, this query written in **SQL**:

```sql
SELECT ID, title, author.name as author from Books
JOIN Authors ON Books.author_ID = Authors.ID
```

... simplifies to that in **CQL**:

```sql
SELECT ID, title, author.name as author from Books
```

[Learn more about Path Expressions in CQL.](../../cds/cql#path-expressions){.learn-more}

### Nested Projections

Another important extensions are deeply nestable projections, which allow to expand result sets to data read from association targets. We saw this already above:

```sql
SELECT from Authors {   -- postfix projection
  ID, name, books {     -- nested projection to-many
    ID, title, genre {  -- nested projection to-one
      name
    }
  }
}
```

[Learn more about projections in CQL.](../../cds/cql#postfix-projections){.learn-more}

## Core Query Notation (CQN)

### Constructing Queries ...

For example all these would result in the same CQN as shown below:

* by parsing incoming OData request URLs:
  ```js
  const OData = { URL: cds.odata.parse }
  let q = OData.URL `/Authors?$select=name&$expand=books`
  ```

* by parsing CQL:
  ```js
  let q = CQL `SELECT from Authors { name, books{*} }`
  ```

* using `cds.ql` APIs:
  ```js
  let q = SELECT.from (Authors, a=>{
    a.ID, a.name, a.books('*')
  })
  ```

* using `cds.Service` Querying APIs:
  ```js
  let q = db.read (Authors, a=>{
    a.ID, a.name, a.books('*')
  })
  ```

* by simply constructing plain CQN objects:
  ```js
  let q = {
    SELECT: {
      from: { ref: [ 'Authors' ] },
      columns: [
        { ref: [ 'name' ] },
        { ref: [ 'books' ], expand: [ '*' ] }
      ]
    }
  }
  ```






### Translating Queries to SQL, CQL, OData, GraphQL





## First-Class Query Objects

### Queries on Queries on Queries ...

### Views as Named Queries

### Pushing down Query Execution

### Late Materialization

## Generic Providers

### Database services translate CQN to native (S)QL



### Generic Providers Delegate Queries



### Middlewares Enhance Queries



## CQL, SQL, OData, GraphQL

This is a brief comparison

|                       | CQL  | SQL  | OData | GraphQL |
| --------------------- | ---- | ---- | ----- | ------- |
| Applicable to non-database services? | yes |  | yes | yes |
| Project, Expand, Transform <sup>***1)***</sup> | +++ | + + | ++ | ++ |
| Filtering, Infix Filters | ++ | + | ++ | <sup>***2)***</sup> |
| Pagination, Sorting   | ++ | ++ | ++ | <sup>***2)***</sup> |
| Views → Generic Providers | ++ | ++ |       |         |
| Late Materialization, 1st-class Queries | ++ | + | <sup>***3)***</sup> | <sup>***3)***</sup> |
| JOINs, UNIONs, Native DB Features | +++ | +++ | | |

> <sup>***1)***</sup> for example, `foo.bar.car as baz`
> <sup>***2)***</sup> through custom operations
> <sup>***3)***</sup> through custom implementations
