---
label: Databases
synopsis: >
  Class <code>cds.DatabaseService</code> and subclasses thereof are technical services representing persistent storage.
status: released
---

# Database Services

<div v-html="$frontmatter?.synopsis" />

[[toc]]


## cds.**DatabaseService**  <i>  class </i> {#cds-db-service }

### class cds.**DatabaseService**  <i>  extends cds.Service </i>



### <span style="color:grey">srv</span>.begin <i> () → this </i> {#db-begin }

Creates a transaction out of the DatabaseService. Is called by `cds.tx` automatically.

### <span style="color:grey">srv</span>.commit <i> () → this </i> {#db-commit }

Commits all the write operations executed on the transaction. Is called by `cds.tx` automatically.

### <span style="color:grey">srv</span>.rollback <i> () → this </i> {#db-rollback }

Reverts all the write operations executed on the transaction. Is called by `cds.tx` automatically.

### <span style="color:grey">srv</span>.factory <i> () → this </i> {#db-factory }

The factory property provides an object which implements the pool APIs. Allowing the current DatabaseService to re use the physical database connections improving overall performance.

### <span style="color:grey">srv</span>.acquire <i> () → this </i> {#db-acquire }

Creates a connection for the current DatabaseService. Is called by [begin](#db-begin) automatically.

### <span style="color:grey">srv</span>.release <i> () → this </i> {#db-release }

Releases the connection for the current DatabaseService. Allowing the connection to be used again for future [acquire](#db-acquire) calls. Is Called by [commit](#db-commit) and [rollback](#db-rollback) automatically.

### <span style="color:grey">srv</span>.destroy <i> () → this </i> {#db-destroy }

Destroys the connection for the current DatabaseService. Can be called to completely remove the connection from the DatabaseService. Is required to be called when the connection transaction is in an `unknown` state.

### <span style="color:grey">srv</span>.disconnect <i> () → this </i> {#db-disconnect }

Disconnects all connections of the current DatabaseService. This is required for database connections that leverage network connections. As the connections are kept alive while inside the `pool`. Which prevents the process from reaching the `idle` state required for the processes to grasefully shutdown. Is called by `cds.on('shutdown')` automatically.

### <span style="color:grey">srv</span>.infer <i> () → this </i> {#db-infer }

Uses the current DatabaseService model to `infer` a provided `cds.ql.Query`. It is best to use `cds.infer` instead. (deprecated?)

### <span style="color:grey">srv</span>.set <i> () → this </i> {#db-set }

Sets the provided key value pairs as variables for the current connection. The values can be access by using the `session_context('<key>')` function inside any Queries. Is called by [begin](#db-begin) automatically.

### <span style="color:grey">srv</span>.run <i> () → this </i> {#db-run }

Runs the provided `cds.ql.Query` using the current DatabaseService.



## cds.DatabaseService — Consumption {#databaseservice-consumption }
[databaseservice consumption]: #databaseservice-consumption


<!--- % assign tx = '<span style="color:grey">srv</span>' %} -->


### `InsertResult` (Beta)

- On INSERT, DatabaseServices return an instance of `InsertResult` defined as follows:
  - Iterator that returns the keys of the created entries, for example:
    - Example: `[...result]` -> `[{ ID: 1 }, { ID: 2 }, ...]`
    - In case of `INSERT...as(SELECT...)`, the iterator returns `{}` for each row
  - `affectedRows`: the number inserted (root) entries or the number of affectedRows in case of INSERT into SELECT
  - `valueOf()`: returns `affectedRows` such that comparisons like `result > 0` can be used
    ::: tip
    `===` can't be used as it also compares the type
    :::


## cds.DatabaseService — Configuration {#databaseservice-configuration }
[databaseservice configuration]: #databaseservice-configuration

### Pool

Instead of opening and closing a database connection for every request, we use a [`generic-pool`](https://www.npmjs.com/package/generic-pool)-based pool to reuse connections.

The _generic-pool_ has a built-in pool evictor, which inspects idle database connections in the pool and destroys them if they are too old.

The following parameters are provided in the pool configuration:

- _acquireTimeoutMillis_: The parameter specifies how much time it is allowed to wait an existing connection is fetched from the pool or a new connection is established.
- _evictionRunIntervalMillis_: The parameter specifies how often to run eviction checks. In case of 0 the check is not run.
- _min_: Minimum number of database connections to keep in pool at any given time.
  ::: warning
  This should be kept at the default 0. Otherwise every eviction run destroys all unused connections older than `idleTimeoutMillis` and afterwards creates new connections until `min` is reached.
  :::

- _max_: Maximum number of database connections to keep in pool at any given time.
- _numTestsPerEvictionRun_: Number of database connections to be checked with one eviction run.
- _softIdleTimeoutMillis_: Amount of time database connection may sit idle in the pool before it is eligible for eviction. At least "min" connections should stay in the pool. In case of -1 no connection can get evicted.
- _idleTimeoutMillis_: The minimum amount of time that a database connection may stay idle in the pool before it is eligible for eviction due to idle time.
This parameter supercedes softIdleTimeoutMillis.
- _testOnBorrow_: Should the pool validate the database connections before giving them to the clients?
- _fifo_: If false, the most recently released resources will be the first to be allocated (stack). If true, the oldest resources will be first to be allocated (queue). Default value: false.

Pool configuration can be adjusted by setting the `pool` option as shown in the following example:

```json
{
  "cds": {
    "requires": {
      "db": {
        "kind": "hana",
        "pool": {
          "acquireTimeoutMillis": 5000,
          "min": 0,
          "max": 100,
          "fifo": true
        }
      }
    }
  }
}
```

::: warning 
The parameters are very specific to the current technical setup, such as the application environment and database location.
Even though we provide a default pool configuration, we expect that each application provides its own configuration based on its specific needs.
:::



<div id="afterpool" />


## cds.DatabaseService — UPSERT {#databaseservice-upsert }
[databaseservice upsert]: #databaseservice-upsert


<!--- % assign tx = '<span style="color:grey">srv</span>' %} -->

The main use case of upsert is data replication. [Upsert](../cds/cqn.md#upsert) updates existing entity records from the given data or inserts new ones if they don't exist in the database.

`UPSERT` statements can be created with the [UPSERT](cds-ql#upsert) query API:

```js
UPSERT.into('db.Books')
  .entries({ ID: 4711, title: 'Wuthering Heights', stock: 100 })
```

`UPSERT` queries are translated into DB native upsert statements, more specifically they unfold to an [UPSERT SQL statement](https://help.sap.com/docs/HANA_CLOUD_DATABASE/c1d3f60099654ecfb3fe36ac93c121bb/ea8b6773be584203bcd99da76844c5ed.html) on SAP HANA and to an [INSERT ON CONFLICT SQL statement](https://www.sqlite.org/lang_upsert.html) on SQLite.

- The upsert data must contain all key elements of the entity.
- If upsert data is incomplete only the given values are updated or inserted, which means the `UPSERT` statement has "PATCH semantics".
- `UPSERT` statements don't have a where clause. The key values of the entity that is upserted are extracted from the data.

The following actions are *not* performed on upsert:
 * UUID key values are _not generated_.
 * Generic CAP handlers, such as audit logging, are not invoked.

::: warning
In contrast to the Java runtime, deep upserts and delta payloads are not yet supported.
:::

## `@cap-js/db-service`

The `node.js` DatabaseService core class is implemented by the `@cap-js/db-service` module. With more database specific implementation in `@cap-js/hana`, `@cap-js/sqlite` and `@cap-js/postgres`. Which can be used interchangably depening on the underlying database used.

### Architecture

The core principle of the `@cap-js` database services is "don't look at the data". As the database services are the foundational service of all CAP applications the performance of these services is especially important. The heaviest work the database service has to do is handling the `data`.

#### JSON {#databaseservice-json }

In CAP applications all the `data` uses the `JSON` format. It would be nice if the databases could understand the same format. As this would allow the CAP applications to not transform the `data` between different formats. While `SQL` doesn't specify how `data` should be stored by the database implementing the specification. It does provide certain paradigms which require computationally heavy operations. Which has most implementations pick heavily optimized internal `data` formats that allow for improved performance. Over time the `JSON` format has gained wide popularity and has resulted in many modern databases implement the specification. Which allows CAP applications to convey its intentions to the database through these `JSON` APIs. Removing the need to transform the `data` when reading or writing.

##### Transform {#databaseservice-architecture-transform }

It is important to understand the special challenges that come with using javascript. As most database protocols use their internal `data` format to communicate with clients. It is required for the javascript client to convert the javascript types into the database native binary format.

Probably the most simplistic data type for all programming languages and databases will be an `integer`. For javascript this type doesn't actually exist it is a subset of the `Number` type. Therefor when the database driver has to convert the `Number` type into an `integer` it has to do more work then you might expect. To give a real reference the publicly available `hdb` driver will be used. Which has an implementation for the [`int32`](https://github.com/SAP/node-hdb/blob/6f38a473278730c5edce969a87891420ce4baecb/lib/protocol/data/Int32.js#L35), [`int64`](https://github.com/SAP/node-hdb/blob/6f38a473278730c5edce969a87891420ce4baecb/lib/util/bignum.js#L379) and [`int128`](https://github.com/SAP/node-hdb/blob/6f38a473278730c5edce969a87891420ce4baecb/lib/util/bignum.js#L600) types. Here is a breakdown of the amount of objects and operations each type require before they can be send to the database.

`int32`
- Objects: 1 (Buffer)
- Operations: 1 (Function)

`int64`
- Objects: 14 (dynamic Numbers) 40 (static Numbers) 1 (String)
- Operations: 90 (operators) 11 (Functions)

`int128`
- Objects: 22 (dynamic Numbers) 80 (static Numbers) 1 (String)
- Operations: 192 (operators) 18 (Functions)

As for comparison when these types are used in a compiled language there are no operations required it will be a pointer. With the only exception being when the database and client use a different endianness. In which case one of them has to swap the bytes around.

##### Read

When reading `data` from the database the new implementations rely on the database responding in the `JSON` format. Allowing the CAP application to not have to do any postprocessing on the response. It is possible for the ODataService to take the result of the DatabaseService as is. The way this is achieved is by using output converts which are baked into the `SQL` statement. Allowing the database to convert the internal format into the OData specified format of that type. The output converter is a function attached to the element of any entity or query. Which enables protocol adapters to generate queries with protocol specific converters. The output converters are database specific so depending on the database internal `data` structure the output converter might be more or less computationally intensive or be completely omitted when the database is OData compliant.

Another big benefit that reading in the `JSON` format directly from the database enables. Is the ability to read deep nested data structures. While `SQL` only allows a single scalar value to be selected by sub queries. By converting a multi column / row result into a single `JSON` result it is possible to create database native `expand` queries. Which means that the database can optimize the execution better. Where in the past it was required for the application to send multiple requests for the different levels of `expand` queries or convert flattened to-one `expand` queries.

When the CAP applications know that there is no post processing required (e.g. no `after` handlers). It can skip the `JSON.parse` and `JSON.stringify` which are required to grand javascript access to the result for manipulations. With the ultimate goal of not having to load the whole result into memory, but instead stream the database result chunks directly into the http response connection. Allowing CAP applications to handle much larger `data` sets while using significantly less memory and cpu.

##### Write

Using the `JSON` format for writing operations comes with many cascading improvements.

When using the standard way of executing `INSERT` and `UPSERT` queries. It is required to match the `SQL` to the data structure. Which goes against the main principle of the new database services. 

A simple example of the impact is as follows:

```javascript
await INSERT([
  {ID:1},
  {ID:2, name: ''},
  {ID:3, descr: ''}
])
```

Which will actually `prepare` and `execute` the following queries:

```SQL
INSERT INTO (ID) VALUES (?)
INSERT INTO (ID,name) VALUES (?,?)
INSERT INTO (ID,descr) VALUES (?,?)
```

Where the usage of the `JSON` format allows the database services to only `prepare` and `execute` the following query:

```SQL
INSERT INTO (ID,name,descr,...) AS SELECT ID, name, descr,... FROM JSON_EACH(?)
```

Where the placeholder will be provided with the `JSON.stringify` of the provided `entries`. Which means that the query will only be executed once. Reducing the number of network round trips required to do the same amount of work. Greatly improving through put as multiple rows can fit within a single network packet and the transformation to a `JSON` string is much cheaper then the native transformation steps as mentioned in the [transform](#databaseservice-architecture-transform) section.

By having a single `JSON` placeholder it is possible to stream the dataset through the CAP application. By taking the `req` object which natively is a `Readable` stream and providing it as the `entries` of the `INSERT` statement.

```javascript
app.post('/upload', async (req,res) => {
  try{
    await INSERT(req).into('entity')
    res.status(201)
    res.end()
  } catch (err) {
    res.status(400)
    res.end(err.message)
  }
})
```

As the `JSON` is converted into an intermediate table it is also possible to improve the way that `UPSERT` statements are handled. It has all the same benefits as `INSERT` query have and a bit more.

```SQL
UPSERT INTO (ID,name,createdAt,modifiedAt,...) AS 
SELECT 
  ID,
  new.name ? new.name : old.name, -- only update name when provided
  old.ID ? old.createdAt : $now,  -- only apply @cds.on.insert when no OLD entry exists
  old.ID ? $now : null            -- only apply @cds.on.update when an OLD entry exists
FROM JSON_EACH(?) AS NEW 
JOIN OLD ON OLD.ID = NEW.ID
```

##### Match

For `@cap-js/hana` specifically there is a `JSON` optimization that assists HANA in re-using execution plans. As HANA has a very advanced execution plan optimizer it is very valuable to be able to re-use the already existing execution plans. One kind of query was always preventing HANA from using the existing execution plans as the `SQL` query would always change based upon the data provided.

```javascript
const IDs = [{val:1},{val:2},...]
cds.ql`SELECT * FROM ${entity} WHERE ID in ${IDs}`
```

Which would create a slightly different variant of the following query based upon then number of `val`s provided:

```SQL
SELECT * FROM entity WHERE ID IN (?,?,...)
```

Where now this query will always prodice the same `SQL` statement. Allowing HANA to use the existing execution plan.

```SQL
SELECT * FROM entity WHERE ID IN (SELECT VAL FROM JSON_TABLE(?,'$' COLUMNS(VAL DOUBLE PATH '$.val')))
```


#### Unification

One of the primary features that had to be supported by all new `@cap-js` database services is path expressions. One of the most powerfull features was not being supported by the development focused `SQLite` database service. Which resulted in many applications developing around the missing feature. Allowing the usage of `SQLite`, but remove the possibility of using a very important fundamental feature. When extrapolating this requirement into a more general requirement it becomes unification.

Therefor the following features are added to the new `@cap-js` database services to greatly improve the behavior of all the database services.

##### Path expressions

One of the most complex parts of the `@cap-js` database services. It allows for executing all `cqn` queries natively on all the database services. Providing improved overall performance, query definition simplification, inherent query optimizations.

###### Expand

When a `cqn` query contains an `expand` column this column is converted into an `sub select` which has the `on` conditions as its `where` clause referencing directly to the outer query. Allowing the database to create internal relationships between the different data sources and removes the inherent data duplication that comes with using `to-many` join conditions.

###### Property navigation

When a `cqn` query contains one or more property access that goes through an path expression these are translated into a `join`. The column name behavior is by default the path expression with the `.` replaced with `_`, but these can be overwritten by providing an `as` alias.

###### Entity navigation

When a `cqn` query references an entity through a path expression this is translated into a direct access into the final entity with a `where` clause that uses `exists` clauses to reduce the resulting data to match the restrictions applied by the path expression. This provides an innate benefit over using a `join` between the entities that it won't return duplicate data.

##### Functions

One of the features most databases provide, but are not extensively specified by the `SQL` standard are functions. So while there are a few functions which are universally supported by all databases. Most databases provide more functionalities that can be used, but will behave differently between databases or might just have a different function name. Therefor the `@cap-js` database services provide a set of universal functions that are supported by all the database services. The primary focus of the functions is to allow the `OData` protocol to be executed natively on the database.

There are some functions that are provided by `HANA` which are not supported by other databases, but the primary goal of the application might be to run `HANA` in production. Therefor it is impossible or impractical to use `SQLite` for development. To improve this primary use case the `@cap-js` services are able to leverage the function framework to provide `HANA` function APIs. Not all functions will be available so when your application requires a `HANA` specific function [contributions](https://github.com/cap-js/cds-dbs/pulls) are always welcome. There are already some functions implemented of varied complexity from [`current_timestamp`](https://github.com/cap-js/cds-dbs/blob/7c6b2f5a6837afbeb1e24daef9a49e25cf7e92f0/db-service/lib/cql-functions.js#L186) to [`months_between`](https://github.com/cap-js/cds-dbs/blob/7c6b2f5a6837afbeb1e24daef9a49e25cf7e92f0/sqlite/lib/cql-functions.js#L129C3-L129C17) to [`hierarchy`](https://github.com/cap-js/cds-dbs/blob/7c6b2f5a6837afbeb1e24daef9a49e25cf7e92f0/db-service/lib/cql-functions.js#L200) allowing anyone with `cql` knowledge to implement any missing functions.

##### Data structure

A very common issue has been so far that applications where getting different results based upon which database or even which database driver they where using. Causing many un expected side effects when writing custom handlers. One of the primary root causes where `cds.Int64` and `cds.Decimal` which would either return as a `Number` or as a `String`. Which resulted in many application developers to write a custom handler that expected a `Number` to be returned for their productive system to receive a `String` which caused their computational logic to produce the wrong result. As javascript is very lenient it doesn't have a problem doing `1 + 1` or `'1' + 1`, but the produced result will very drastically.

The way that the unified data structures is achieved is by leveraging the [`JSON`](#databaseservice-json) format as return type. Which results in all the database drivers only every handling arbitrary string contents. Which prevents the drivers from influencing the data structure.


##  <i>  More to Come </i>

This documentation is not complete yet, or the APIs are not released for general availability.
Stay tuned to upcoming releases for further updates.
