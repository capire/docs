---
status: released
---


# Querying in JavaScript



[[toc]]



## Constructing Queries

Module `cds.ql` provides facilities to construct queries in [*Core Query Notation (CQN)*](../cds/cqn) in different flavours and styles:

1. Fluent API style, with query-by-example objects for where clauses and order by clauses:

```js
let q = SELECT.from('Books').where({ID:201}).orderBy({title:1})
```

2. Using with [tagged template literals (TTL)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates):

```js
let q = cds.ql `SELECT from Books where ID=${201} order by title`
```

3. Fluent API with interspersed [tagged template literals (TTL)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates):

```js
let q = SELECT.from `Books where ID=${201} order by title`
let p = SELECT.from `Books`.where`ID=${201}`.orderBy`title`
```

4. Manually constructing CQN objects:

```js
const { expr, ref, val, columns, expand, where, orderBy } = cds.ql
```
```js
let q = {
  SELECT: {
    from: ref`Books`,
    where: [ref`ID`, '=', val(201)],
    orderBy: [ref`title`],
  }
}
```
```js
let q = {
  SELECT: {
    from: ref`Authors`,
    columns: [
      ref`ID`,
      ref`name`,
      expand (ref`books`, where`stock>7`, orderBy`title`,
        columns`ID,title`
      )
    ],
    where: [ref`name`, 'like', val('%Poe%')]
  }
}
```

#### API Facades

The API is made available through global objects `SELECT`, `INSERT`, `UPSERT`, `UPDATE`, `DELETE`. Alternatively, you can obtain these objects from `cds.ql` like so:

```js
const cds = require('@sap/cds')
const { SELECT, INSERT, UPDATE, DELETE } = cds.ql
```

#### Using Reflected Definitions

It is recommended best practice to use entity definitions reflected from a service's model to construct queries. Doing so simplifies code as it avoids repeating namespaces all over the place.

```js
const { Books } = cds.entities
let q1 = SELECT.from (Books) .where `ID=${201}`
```

[Learn more about using reflected definitions from a service's model](core-services#entities){.learn-more}

####  Not Locked in to SQL

While both [CQL](../cds/cql) / [CQN](../cds/cqn) as well as the fluent API of `cds.ql` resemble well-known SQL syntax neither of them are locked in to SQL. In fact, queries can be sent to any kind of services, including NoSQL databases or remote services for execution.




## Executing Queries

Queries are executed by passing them to a service's [`srv.run()`](core-services#srv-run-query) method, for example, to the primary database:

```js
let query = SELECT `ID,title` .from `Books`
let books = await cds.db.run (query)
```

Alternatively, you can just `await` a constructed query, which by default passes the query to `cds.db.run()`. So, the following is equivalent to the above:

```js
let books = await SELECT `ID,title` .from `Books`
```
Instead of a database service, you can also send queries to other services, local or remote ones. For example:

```js
const cats = await cds.connect.to ('CatalogService')
let books = await cats.run (query)
```

> `CatalogService` might be a remote service connected via OData. In this case, the query would be translated to an OData request sent via http.

The APIs are also available through [`cds.Service`'s CRUD-style Convenience API](core-services#crud-style-api), e.g.:

```js
const db = cds.db
let books = await db.read`Books`.where`ID=${201}`.orderBy`title`
```



## First-Class Objects

Constructing queries doesn't execute them immediately, but just captures the given query information. Very much like functions in JavaScript, queries are first-class objects, which can be assigned to variables, modified, passed as arguments, or returned from functions. Let's investigate this somewhat more, given this example:

```js
let cats = await cds.connect.to('CatalogService') //> connected via OData
let PoesBooks = SELECT.from (Books) .where `name like '%Poe%'`
let books = await cats.get (PoesBooks)
```

This is what happens behind the scenes:

1. We use the fluent API to construct a query as a CQN and assign it to `PoesBooks`
2. We pass the query as an argument to function `cats.get()`
3. The get event handler translates the query to an OData request sent to the remote service
4. The remote OData protocol adapter translates the inbound query back to CQN
5. This CQN query is passed on to the remote service provider
6. A registered event handler forwards that query to the local `cds.db` service
7. The database service implementation translates the query to plain SQL and sends that to the database for execution



####  Leveraging Late Materialization

You can also combine queries much like sub selects in SQL to form more complex queries as shown in this example:

```sql
let input = '%Brontë%'
let Authors = SELECT `ID` .from `Authors` .where `name like ${ input }`
let Books = SELECT.from `Books` .where `author_ID in ${ Authors }`
```
```js
await cds.run (Books) //> late/no materialization of Authors
```

With that we leverage late materialization, offered by SQL databases.
Compare that to inferior imperative programming:

```js
let input = '%Brontë%'
let Authors = await SELECT `ID` .from `Authors` .where `name like ${ input }`
for (let a of Authors) { //> looping over eagerly materialized Authors
  let Books = await SELECT.from `Books` .where `author_ID = ${ a.ID }`
}
```





## Avoiding SQL Injection
All the APIs are designed to avoid [SQL Injection](https://wikipedia.org/wiki/SQL_injection) by default. For example, let's see how the following code would be executed:

```js
let input = 201 //> might be entered by end users
let books = await SELECT.from `Books` .where `ID=${input}`
```

The query is...

1. captured as a CQN object with the where clause represented as:
```js
..., where:[ {ref:['ID']}, '=', {val:201} ]
```

2. translated to plain SQL string with binding parameters
```sql
SELECT ID from Books where ID=?
```

3. executed with binding parameters provided from `{val}`entries in CQN
```js
dbc.run (sql, [201])
```

The only mistake you could make is to imperatively concatenate user input with CQL or SQL fragments, instead of using the tagged strings or other options promoted by `cds.ql`. For example, assumed you had written the above code sample like that:

```js
let input = 201 //> might be entered by end users
let books = await SELECT.from `Books` .where ('ID='+input)
let bookz = await SELECT.from `Books` .where (`ID=${input}`)
```
> **Note** also that tagged template strings never have surrounding parentheses! I.e., the third line above does the very same string concatenation as the second line.


A malicious user might enter some SQL code fragment like that:
```sql
0; DELETE from Books; -- gotcha!
```
{style="margin: 10px 40px"}

In effect, your generated SQL statements would effectively look like that:

```sql
SELECT ID from Books where ID=0;
DELETE from Books; -- gotcha!
```
::: danger Whenever there's user input involved...
Never use string concatenation when constructing queries!

Never surround tagged template strings with parentheses!
:::

## Using `cds repl`

Event though being a reference doc, the sections below will never be able to cover any possible query you might want to construct. For that reason, we recommend to use the `cds repl` command to experiment with queries interactively. It is a great way to learn how to construct queries and to experiment with them. Here is an example session:

```sh
cds repl -u ql
```
```js
cds.ql`SELECT from Authors {
  ID, name, books [order by title] {
    ID, title, genre.name as genre
  }
} where exists books.genre[name = 'Mystery']`
```
... which will display this:
```js
cds.ql {
  SELECT: {
    from: { ref: [ 'Authors' ] },
    columns: [
      { ref: [ 'ID' ] },
      { ref: [ 'name' ] },
      {
        ref: [
          {
            id: 'books',
            orderBy: [ { ref: [ 'title' ] } ]
          }
        ],
        expand: [
          { ref: [ 'ID' ] },
          { ref: [ 'title' ] },
          { ref: [ 'genre', 'name' ], as: 'genre' }
        ]
      }
    ],
    where: [
      'exists',
      {
        ref: [
          'books',
          {
            id: 'genre',
            where: [ { ref: [ 'name' ] }, '=', { val: 'Mystery' } ]
          }
        ]
      }
    ]
  }
}
```

You can also test-drive the query by executing it with a running application:

```sh
cds repl -u ql -r cap/samples/bookshpop
```
```js
await cds.ql`SELECT from Authors {
  ID, name, books [order by title] {
    ID, title, genre.name as genre
  }
} where exists books.genre[name = 'Mystery']`
```
... which would display the results like that:
```js
[
  {
    ID: 150,
    name: 'Edgar Allen Poe',
    books: [
      { ID: 251, title: 'The Raven', genre: 'Mystery' },
      { ID: 252, title: 'Eleonora', genre: 'Romance' }
    ]
  }
]
```

> [!TIP]
> Using `cds repl` as shown above is likely the best way to learn how to construct queries in detail.
> When doing so, ensure to use the `cds.ql` functions with full queries in CQL syntax, as shown in the example above, as that is the most reliable way to ensure correctness.

[An article by DJ Adams exploring `cds repl`.](https://qmacro.org/blog/posts/2025/03/21/level-up-your-cap-skills-by-learning-how-to-use-the-cds-repl/){.learn-more}

## cds.ql() {.method}

Use the `cds.ql()` method to construct instances of [`cds.Query`](#class-cds-ql-query) from these inputs:

- tagged template strings (SELECT only)
- normal strings (SELECT only)
- plain CQN objects

For example:

```js
let q = cds.ql ({ SELECT: { from: {ref:[ Books.name ]} }})
let q = cds.ql (`SELECT from Books { ID, title }`)
let q = cds.ql `SELECT from ${Books} { ID, title }`
q instanceof cds.ql.Query //> true
```

If the input is already a `cds.Query` instance, it is returned unchanged:

```js
let q1 = cds.ql `SELECT from Books`
let q2 = cds.ql (q1)
q1 === q2 //> true
```


## cds.ql. Query {#class-cds-ql-query .class}

Instances of `cds.Query` capture queries at runtime. Subclasses provide [fluent APIs](#constructing-queries) to construct queries as highlighted below.



### .kind {.property}

The kind of query, that is one of these strings:

- `'SELECT'`
- `'INSERT'`
- `'UPSERT'`
- `'UPDATE'`
- `'DELETE'`

This is usefull for generic query processors, such as outbound protocol adapters or database services, which need to translate given queries into target representations.



### then() {.method}

Instances of `cds.Query` are thenables. `await`ing them executes the query with the bound service or the primary database service.

```js
await SELECT.from(Books) // is equivalent to:
await cds.db.run( SELECT.from(Books) )
```



### bind (srv) {.method}

Binds a query for execution with the given `srv` .

```js
let srv = new cds.Service
await SELECT.from(Books).bind(srv) // is equivalent to:
await srv.run( SELECT.from(Books) )
```





## SELECT {.class}

Fluent API to construct [CQN SELECT](../cds/cqn#select) query objects in a [CQL](../cds/cql)/SQL-like style. In contrast to SQL, though, the clauses can be arrayed in arbitrary order.

`SELECT` itself is a function acting as a shortcut to `SELECT.columns`, thereby resembling SQL syntax:

```sql
SELECT `a, b` .from `Foo`  -- is a shortcut for:
SELECT .columns `a, b` .from `Foo`
```

Moreover, it accepts a single tagged template string starting with `from`:

```js
const limit = 11, sort_column = 'a'
const q = SELECT `from Foo {
   a, b as c, sum(d)
} where x < ${limit}
group by a,b
order by ${sort_column} asc`
const foos = await q
```

This allows constructing [CQN](../cds/cqn) query objects using [CQL](../cds/cql) language constructs which are not covered by `cds.ql` fluent API.



### .one {.property}


Start constructing a query with `SELECT.one` to indicate we're interested in only the first row. At runtime, a single entry, if any, is returned instead of an array:

```js
const one = await SELECT.one.from (Authors)
```

> same effect, but potentially more expensive:

```js
const [one] = await SELECT.from (Authors)
```



### .elements {.property}


The CSN outline of the selected elements as an object. Key is the selected element or alias, value is the CSN definition:

Let's assume the following query:
```js
SELECT.from('sap.capire.bookshop.Books').columns('ID', 'title')
```

This query is represented within `.elements` as:

```js
{
  ID: number { key: true, type: 'cds.Integer' },
  title: string {
    '@mandatory': true,
    localized: true,
    type: 'cds.String',
    length: 111,
    '@Common.FieldControl': { '#': 'Mandatory' }
  }
}
```

This is useful for custom implementations that act on the selection of specific elements.



### .distinct {.property}

Start the query with `SELECT.distinct` to skip duplicates as in SQL:

```js
SELECT.distinct.from (Authors)
```



### columns() {.method}

```tsx
function SELECT.columns ( projection : function )
function SELECT.columns ( cql : tagged template string )
function SELECT.columns ( columns[] : CQL expr string | CQN expr object )
function SELECT.columns ( ...columns[] : CQL expr string | CQN expr object )
```

Specifies which columns to be fetched, very much like SQL select clauses, enhanced by [CQL](../cds/cql) projections and path expressions. The arguments can be a projection function, a tagged template string, or individual column expressions as CQL string snippets, or as [CQN column expression objects](../cds/cqn.md#select).

```sql
SELECT.from `Books` .columns (b => { b.title, b.author.name.as('author') })
SELECT.from `Books` .columns `{ title, author.name as author }`
SELECT.from `Books` .columns `title, author.name as author`
SELECT.from `Books` .columns ( 'title', 'author.name as author')
SELECT.from `Books` .columns ( 'title', {ref:['author','name'],as:'author'} )
SELECT.from `Books` .columns (['title', {ref:['author','name'],as:'author'} ])
```

Projection functions are the **most recommended** way to specify projections as they have several advantages (with tagged templates coming closest):

- they support nested projections, aka expands
- they don't need to call a parser
- they resemble CQL very much
- they use standard JavaScript constructs
- we can perspectively offer type inference and code completion

With respect to resembling CQL let's compare this query in CQL using entity aliases to the `cds.ql` code sample below:

```sql
SELECT from Authors a {
   a.ID, a.name, a.books {
     *, createdAt as since,
     suppliers[city='Paris']{*}
   }
}
```

Here is the same using `cds.ql` with projection functions:

```js
SELECT.from ('Authors', a => {
   a.ID, a.name, a.books (b => {
     b`.*`, b.createdAt`as since`,
     b.suppliers`[city='Paris']`('*')
   })
})
```

Projection functions use these mechanisms:

- projections are single-argument arrow functions: `a => { ... }`
- with the argument as entity alias in column expressions: `a.name`
- with functions for nested projections: `a.books (b => {...})`
- with `*` as special case of that: ```b`.*` ```, and `b.suppliers('*')`
- with template strings for aliases: ```b.createdAt`as since` ```
- as well as for infix filters: ```b.suppliers`[city='Paris']` ```

**Note:** Not every CQL or SQL construct can be expressed with projection functions. This is where tagged template strings kick in



### from() {.method #select-from}

```tsx
function SELECT.from (
   entity : string | CSN definition | tagged template string,
   key?   : string | number | object,
   cols?  : array  | projection
)
```

Fills in [CQN `from` clauses](../cds/cqn.md#select), optionally adding a primary key, and a projection.
The latter are alternatives for using separate `.one`, `.where` and  `.columns` clauses. <br/>
For example, these queries:

```js
SELECT.from (Books,201)
SELECT.from (Books,201, b => { b.ID, b.title })
```

... are equivalent to these:

```js
SELECT.one.from (Books) .where ({ID:201})
SELECT.one.from (Books) .where ({ID:201})
.columns (b => { b.ID, b.title })
```

> NOTE: Specifying a `key` argument automatically [enables `SELECT.one`](#one).



Argument `key` can be a single string or number value, or a [query-by-example](#where) object:

```js
SELECT.from (Books,201) //> shortcut for {ID:201}
SELECT.from (Books, {ID:201})
SELECT.from (Books.texts, {ID:201, locale:'de'})
```

Argument `cols` is a projection [as accepted by `.columns (cols)`](#columns)



### alias() {.method}

Specifies the alias which you can refer to in other functions:

```js
SELECT.from ('Authors').alias('a').where({
   exists: SELECT.from('Books').where('author_ID = a.ID')
})
```



### where(){.method alt="The following documentation on having also applies to where"}

### having() {.method}

These two methods fill in corresponding  [CQL](../cds/cql) clauses with predicate  expressions.

```tsx
function SELECT.where/having ( qbeobj : query-by-example object )
function SELECT.where/having ( clause : tagged template string )
function SELECT.where/having ( expr: string, value: any, ... )
```

Expressions can be specified as a query-by-example object, a tagged template string, or as an alternating string / value arguments list:

```js
SELECT.from `Books` .where ({ ID: req.data.ID }) // qbe
SELECT.from `Books` .where `ID = ${req.data.ID}` // tts
SELECT.from `Books` .where ('ID =', req.data.ID) // expr/value list
```
Assumed we got some user input as follows:

```js
const name='foo', kinds=[1,2,3], min=0.1, max=0.9, stock=111
```

With tagged template strings we could construct a query like that:

```js
SELECT.from `Foo` .where `name like ${name} and (
   kind in ${kinds}
   or ratio between ${min} and ${max}
   or stock >= ${stock}
)`
```

Doing the same with object literals would look like that:

```js
SELECT.from('Foo') .where ({ name: {like:'%foo%'}, and: {
   kind: { in: kinds },
   or: { ratio: { between: min, and: max },
     or: { stock: { '>=': stock } }
    }
}})
```

The provided expression is consistently accounted for by wrapping the existing where clause in an `xpr` if needed.



### groupBy() {.method}

Fills in SQL `group by` clauses. Arguments are a single tagged template string, or column expression strings or [CXN](../cds/cxn.md) objects, like that:

```js
SELECT ... .groupBy `a.name, b`
SELECT ... .groupBy ('a.name', 'b')
SELECT ... .groupBy ({ref:['a','name']}, {ref:['b']})
```



### orderBy() {.method}

Fills in SQL `order by` clauses. Arguments are a single tagged template string, or column expression strings, optionally followed by `asc` or `desc`, or [CXN](../cds/cxn.md) objects, like that:

```js
SELECT ... .orderBy `a.name, b desc`
SELECT ... .orderBy ('a.name', 'b desc')
SELECT ... .orderBy ({ref:['a','name']}, {ref:['b'],sort:'desc'})
```



### limit() {.method}

Equivalent of the standard SQL `limit` and `offset` clauses.
Arguments can be standard numbers or [CXN](../cds/cxn.md) expression objects.

```js
SELECT ... .limit (25)      //> first page
SELECT ... .limit (25,100)  //> fifth page
```



### forUpdate() {.method}


Exclusively locks the selected rows for subsequent updates in the current transaction, thereby preventing concurrent updates by other parallel transactions.

```js
try {
   let book = await SELECT.from(Books,201).forUpdate()
   //> book is locked for other transactions
   await UPDATE (Books,201) .with ({...})
} catch (e) {
   //> failed to acquire the lock, likely because of timeout
}
```

The `options` argument is optional; currently supported is:

* `wait` — an integer specifying the timeout after which to fail with an error in case a lock couldn't be obtained. The time unit is database-specific. On SAP HANA, for example, the time unit is seconds. A default `wait` value that is used if `options.wait == null` can be specified via <Config keyOnly>cds.sql.lock_acquire_timeout: -1</Config>. A value of `-1` can be used to deactivate the default for the individual call. If the wait option isn't specified, the database-specific default behavior applies.

All acquired locks are released when the current transaction is finished, that is, committed  or rolled back.



### forShareLock() {.method}

Locks the selected rows in the current transaction, thereby preventing concurrent updates by other parallel
transactions, until the transaction is committed or rolled back. Using a shared lock allows all transactions to read the locked record.

If a queried record is already exclusively locked by another transaction, the `.forShareLock()` method waits for the lock to be released.



### hints() {.method}

Passes hints to the database query optimizer that can influence the execution plan. The hints can be passed as individual arguments or as an array.

```js
SELECT ... .hints ('IGNORE_PLAN_CACHE')
SELECT ... .hints ('IGNORE_PLAN_CACHE', 'MAX_CONCURRENCY(1)')
SELECT ... .hints (['IGNORE_PLAN_CACHE', 'MAX_CONCURRENCY(1)'])
```


### pipeline() {.method}

Pipes the data from the database into the given writable stream.

```js
SELECT ... .pipeline (cds.context.http.res)
```

> Please note that the after handlers don't have effect if this stream is piped to the HTTP response.


### stream() {.method}

Returns the data from the database as a raw stream.

```js
SELECT ... .stream ()
```


### foreach() {.method}

Creates an object stream and calls the provided callback for each object.

```js
await SELECT.from(Books).foreach ((book) => { ... })
```

Since the SELECT query implements the async iterator protocol, you can also use it with `for await`.

```js
for await (const book of SELECT.from(Books)) { ... }
```

:::warning Streaming APIs only implemented by Database Services
As of now, `SELECT.foreach()` and `SELECT.pipeline()` are only supported by `cds.DatabaseService`. `cds.RemoteService` does not support the streaming APIs yet.
:::



## INSERT {.class}

Fluent API to construct [CQN INSERT](../cds/cqn#insert) query objects in a [CQL](../cds/cql)/SQL-like style. In contrast to SQL, though, the clauses can be arrayed in arbitrary order.


 `INSERT` itself is a function acting as a shortcut to `INSERT.entries`, allowing uses like that:


```js
const books = [
   { ID:201, title:'Wuthering Heights', author_id:101, stock:12 },
   { ID:251, title:'The Raven', author_id:150, stock:333 },
   { ID:271, title:'Catweazle', author_id:170, stock:222 }
]
INSERT (books) .into (Books)
```



### into() {.method}

```tsx
function INSERT.into (
  entity   : string | CSN definition | tagged template string,
  entries? : object[]
)
```


Specifies the target entity to insert data into, either as a string or a reflected definition:


```js
const { Books } = cds.entities
INSERT.into (Books) .entries (...)
INSERT.into ('Books') .entries (...)
INSERT.into `Books` .entries (...)
```

You can optionally pass records of data [as  accepted by `.entries`](#insert-entries) as a shortcut to which:

```js
INSERT.into (Books, [
   { ID:201, title:'Wuthering Heights', author_id:101, stock:12 },
   { ID:251, title:'The Raven', author_id:150, stock:333 },
   { ID:271, title:'Catweazle', author_id:170, stock:222 }
])
```



### entries() {.method #insert-entries}

```tsx
function INSERT.entries (records : object[] | Query | Readable)
```

Allows inserting multiple rows with one statement.

The arguments can be one of...

- one or more records as variable list of arguments
- an array of one or more records
- a readable stream
- a sub SELECT query

Using individual records:


```js
await INSERT.into (Books) .entries (
   { ID:201, title:'Wuthering Heights', author_id:101, stock:12 },
   { ID:251, title:'The Raven', author_id:150, stock:333 },
   { ID:271, title:'Catweazle', author_id:170, stock:222 }
)
```

Using an **array** of records, read from a JSON:

```js
let books = JSON.parse (fs.readFileSync('books.json'))
await INSERT(books).into(Books) // same as INSERT.into(Books).entries(books)
```

Using a **stream** instead of reading and parsing the full JSON into memory:

```js
let stream = fs.createReadStream('books.json')
await INSERT(stream).into(Books) // same as INSERT.into(Books).entries(stream)
```

Using a **subselect** query to copy *within* the database:

```js
await INSERT.into (Books) .entries (SELECT.from(Products))
```

::: details Pushed down to database....

Note that the sub select variant creates a single [native  `INSERT INTO SELECT` SQL statement](https://www.w3schools.com/sql/sql_insert_into_select.asp), which is most efficient, as the data is copied **within** the database. In contrast to that, ...

```js
INSERT.into(Books).entries(await SELECT.from(Products))
```
... would also work, but would be much less efficient, as it would (1) first read all data from database into the client and then (2) insert the read data back into the database.


:::



### values() {.method alt="The following documentation on rows also applies to values. "}

### rows() {.method}


Use `.columns` with `.values` as in SQL:

```js
INSERT.into (Books) .columns (
   'ID', 'title', 'author_id', 'stock'
) .values (
   201, 'Wuthering Heights', 101, 12
)
```

>  Both, `.columns` and `.values` can alternatively wrapped into an array.

Use  `.rows` instead of `.values` to insert multiple rows with one statement:

```js
INSERT.into (Books) .columns (
   'ID', 'title', 'author_id', 'stock'
) .rows (
   [ 201, 'Wuthering Heights', 101, 12 ],
   [ 251, 'The Raven', 150, 333 ],
   [ 252, 'Eleonora', 150, 234 ]
)
```
### from() {.method #from}


Constructs a _INSERT into SELECT_ statement.
```js
INSERT.into('Bar') .from (SELECT.from('Foo'))
```


## UPSERT {.class}

Fluent API to construct [CQN UPSERT](../cds/cqn#upsert) query objects in a [CQL](../cds/cql)/SQL-like style. In contrast to SQL, though, the clauses can be arrayed in arbitrary order.


 `UPSERT`  itself is a function acting as a shortcut to `UPSERT.entries`, allowing uses like that:


```js
const books = [
   { ID:201, title:'Wuthering Heights', author_id:101, stock:12 },
   { ID:251, title:'The Raven', author_id:150, stock:333 },
   { ID:271, title:'Catweazle', author_id:170, stock:222 }
]
UPSERT (books) .into (Books)
```

### into() {.method #upsert-entries}

```tsx
function UPSERT.into (
  entity   : string | CSN definition | tagged template string,
  entries? : object[]
)
```


Specifies the target entity to upsert data into, either as a string or a reflected definition..


```js
const { Books } = cds.entities
UPSERT.into (Books) .entries (...)
UPSERT.into ('Books') .entries (...)
UPSERT.into `Books` .entries (...)
```

You can optionally pass records of data [as  accepted by `.entries`](#upsert-entries) as a shortcut to which:

```js
UPSERT.into (Books, [
   { ID:201, title:'Wuthering Heights', author_id:101, stock:12 },
   { ID:251, title:'The Raven', author_id:150, stock:333 },
   { ID:271, title:'Catweazle', author_id:170, stock:222 }
])
```


### entries() {.method}


Allows upserting multiple rows with one statement where each row
is a record with named values, for example, as could be read from a JSON
source.


```js
UPSERT.into (Books) .entries (
   { ID:201, title:'Wuthering Heights', author_id:101, stock:12 },
   { ID:251, title:'The Raven', author_id:150, stock:333 },
   { ID:271, title:'Catweazle', author_id:170, stock:222 }
)
```

The entries can be specified as individual method parameters of type object — as shown above —, or as a single array of which.

[Learn more about limitations when using it with databases.](databases#databaseservice-upsert){.learn-more}

## UPDATE {.class}

Fluent API to construct [CQN UPDATE](../cds/cqn#update) query objects in a [CQL](../cds/cql)/SQL-like style. In contrast to SQL, though, the clauses can be arrayed in arbitrary order.

 `UPDATE` itself is a function acting as a shortcut to `UPDATE.entity`, allowing usages like this:


```sql
UPDATE `Books` .set `stock = stock - ${quantity}` -- as shortcut to:
UPDATE.entity `Books` .set `stock = stock - ${quantity}`
```

### entity() {.method}

```tsx
function UPDATE.entity (
   entity : string | CSN definition | tagged template string,
   key?   : string | number | object,
)
```

Specifies the target of the update operation, optionally followed by a primary key, and a projection.
The latter provides an alternative for using separate  `.where` clauses. <br/>
For example, these queries are equivalent:

```js
UPDATE (Books,201)...
UPDATE (Books) .where ({ID:201}) ...
```

Argument `key` can be a single string or number value, or a [query-by-example](#where) object:

```js
UPDATE (Books,201) ... //> shortcut for {ID:201}
UPDATE (Books, {ID:201}) ...
UPDATE (Books.texts, {ID:201, locale:'de'}) ...
```



### set() {.method alt="The following documentation on with also applies to set. "}

### with() {.method}


 Specifies the data to update...

1. As a single-expression tagged template string
```js
let [ ID, quantity ] = [ 201, 1 ]
UPDATE `Books` .set `stock = stock - ${quantity}` .where `ID=${ID}`
```

2. As an object with keys being element names of the target entity and values being simple values, [query-by-example](#where) expressions,  or [CQN](../cds/cqn.md) expressions:
```js
let [ ID, quantity ] = [ 201, 1 ]
UPDATE (Books,ID) .with ({
  title: 'Sturmhöhe',       //>  simple value
  stock: {'-=': quantity},    //>  qbe expression
  descr: {xpr: [{ref:[descr]}, '||', 'Some addition to descr.']}
})
```

> Method `.set` and `.with` are aliases to the same method.



### where() {.method}

[As in SELECT.where](#where) {.learn-more}





## DELETE {.class}

Fluent API to construct [CQN DELETE](../cds/cqn#delete) query objects in a [CQL](../cds/cql)/SQL-like style. In contrast to SQL, though, the clauses can be arrayed in arbitrary order.

```js
DELETE.from('Books').where ({stock:{'<':1}})
```



### from() {.method #delete-from}

```tsx
function DELETE.from (
   entity : string | CSN definition | tagged template string,
   key?   : string | number | object
)
```

[As in SELECT.from](#select-from) {.learn-more}



### where() {.method}

[As in SELECT.where](#where) {.learn-more}



## Expressions

The following methods facilitate constructing CXN objects manually.

> [!note]
> Many sections below are still under construction. We are working on it... Please refer to the [CXL](../cds/cxn) documentation for more information on the CXN syntax for the time being.

### expr() {.method}

Constructs a CXN expression object from given input.
Same as [`xpr`](#xpr), but if the result contains only single
entries these are returned as is.

```js
const { expr } = cds.ql
expr([ref`foo`,'=',val(11)]) //> {xpr:[{ref:['foo']},'=',{val:11}]}
expr(ref`foo`,'=',val(11))   //> {xpr:[{ref:['foo']},'=',{val:11}]}
expr`foo = 11`               //> {xpr:[{ref:['foo']},'=',{val:11}]}
expr`foo`                    //> {ref:['foo']}
expr`11`                     //> {val:11}
```

### ref() {.method}

Constructs a CXN `{ref}` object from given input, which can be one of:

- several path segment strings
- a single array of the same
- a tagged template literal in CXL path syntax


```js
const { ref } = cds.ql
ref('foo')        //> {ref:['foo']}
ref('foo','bar')  //> {ref:['foo','bar']}
ref`foo.bar`      //> {ref:['foo','bar']}
ref`foo`          //> {ref:['foo']}
```

Note that only simple paths are supported, that is, without infix filters or functions.

[Use `expr()` to parse paths with infix filters via a tagged template literals.](#expr) {.learn-more}


### val() {.method}

Constructs CXN `{val}` object from given input, which can be one of:
- a single `string`, `number`, `boolean`, or `null`
- a tagged template literal in CXL literal syntax

```js
const { val } = cds.ql
val(`foo`) //> {val:'foo'}`
val`foo`   //> {val:'foo'}
val`11`    //> {val:11}
val(11)    //> {val:11}
```

### xpr() {.method}

Constructs a CXN `xpr` object from given input, which can be one of:
- multiple CXN `expr` objects, or strings representing keywords or operators
- a single array of the same
- a tagged template literal in CXL syntax

```js
const { xpr } = cds.ql
xpr([ref`foo`,'=',val(11)]) //> {xpr:[{ref:['foo']},'=',{val:11}]}
xpr(ref`foo`,'=',val(11))   //> {xpr:[{ref:['foo']},'=',{val:11}]}
xpr`foo = 11`               //> {xpr:[{ref:['foo']},'=',{val:11}]}
xpr`foo`                    //> {xpr:[{ref:['foo']}]}
xpr`'foo'`                  //> {xpr:[{val:'foo'}]}
xpr`11`                     //> {xpr:[{val:11}]}
xpr('=')                    //> {xpr:['=']}
xpr('like')                 //> {xpr:['like']}
```

[See also `expr()`](#expr) {.learn-more}


### list() {.method}

 Constructs a CXN `list` object from given input, with can be one of:
 - multiple CXN `expr` objects, or values turned into `{val}`s, including strings
 - a single array of the same
 ```js
 const { list } = cds.ql
 list([`foo`,11]) //> {list:[{val:'foo'},{val:11}]}
 list(`foo`,11)   //> {list:[{val:'foo'},{val:11}]}
 expr`'foo',11`   //> {list:[{val:'foo'},{val:11}]}
 expr`foo,11`     //> {list:[{ref:['foo']},{val:11}]}
 ```
[Use `expr()` to get the same via a tagged template literals.](#expr) {.learn-more}


### func() {.method}

Constructs a CXN `func` object from given input. The first argument is the
function name, the remaining `args` can the same as in {@link ql.list `list()`},
and are handled the same way.
```js
const { func } = cds.ql
func('substring',[`foo`,1]) //> {func:'substring',args:[{val:'foo'},{val:1}]}
func('substring',`foo`,1)   //> {func:'substring',args:[{val:'foo'},{val:1}]}
expr`substring('foo',1)`    //> {func:'substring',args:[{val:'foo'},{val:1}]}
expr`substring(foo,1)`      //> {func:'substring',args:[{ref:['foo']},{val:1}]}
expr`substring(foo,1)`      //> {func:'substring',args:[{ref:['foo']},{val:1}]}
```
[Use `expr()` to get the same via a tagged template literals.](#expr) {.learn-more}


### predicate() {.method}
<UnderConstruction/>

TODO: Add description

```js
const { predicate } = cds.ql
predicate`a=1 and b=2 or c=3 and d=4`
predicate ({ a:1, b:2, or:{ c:3, d:4 }})
predicate ('a=',1,'and ( b=',2,'or c=',3,')')
```

### columns() {.method}
<UnderConstruction/>

TODO

### nested() {.method}
<UnderConstruction/>

TODO

### expand() {.method}
<UnderConstruction/>

TODO: Add description

```js
expand (ref`books`, where`stock>7`, orderBy`title`,
   columns`ID,title`
)
```

### inline() {.method}
<UnderConstruction/>

TODO

### where() {.method}
<UnderConstruction/>

TODO

### orderBy() {.method}
<UnderConstruction/>

TODO

### orders() {.method}
<UnderConstruction/>

TODO