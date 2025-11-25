---
label: Databases
synopsis: >
  Class <code>cds.DatabaseService</code> and subclasses thereof are technical services representing persistent storage.
status: released
---

# Database Services

<div v-html="$frontmatter?.synopsis" />

[[toc]]


## cds.**DatabaseService**  <i>  class </i> { #cds-db-service}

### class cds.**DatabaseService**  <i>  extends cds.Service </i>




### <span style="color:grey">srv</span>.begin <i> () → this </i> {#db-begin }

In case of database services this actually starts the transaction by acquiring a physical connection from the connection pool, and optionally sends a command to the database like `BEGIN TRANSACTION`.

This method is called automatically by the framework on the first query, so **you never have to call it** in application coding. There are only very rare cases where you'd want to do so, for example to reuse a `tx` object to start subsequent physical transactions after a former `commit` or `rollback`. But this is not considered good practice.


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

::: warning _❗ Warning_
The parameters are very specific to the current technical setup, such as the application environment and database location.
Even though we provide a default pool configuration, we expect that each application provides its own configuration based on its specific needs.
:::



<div id="afterpool" />


## cds.DatabaseService — UPSERT {#databaseservice-upsert }
[databaseservice upsert]: #databaseservice-upsert


<!--- % assign tx = '<span style="color:grey">srv</span>' %} -->

The main use case of upsert is data replication. [Upsert](../cds/cqn.md#upsert) updates existing entity records from the given data or inserts new ones if they don't exist in the database.

::: warning
Even if an entity doesn't exist in the database:<br> &rarr; Upsert is **not** equivalent to Insert.
:::

`UPSERT` statements can be created with the [UPSERT](cds-ql#upsert) query API:

```js
UPSERT.into('db.Books')
  .entries({ ID: 4711, title: 'Wuthering Heights', stock: 100 })
```

`UPSERT` queries are translated into DB native upsert statements, more specifically they unfold to an [UPSERT SQL statement](https://help.sap.com/docs/HANA_CLOUD_DATABASE/c1d3f60099654ecfb3fe36ac93c121bb/ea8b6773be584203bcd99da76844c5ed.html) on SAP HANA and to an [INSERT ON CONFLICT SQL statement](https://www.sqlite.org/lang_upsert.html) on SQLite.

- The rows to be upserted need to have the same structure, that is, all rows needs to specify the same named values.
- The upsert data must contain all key elements of the entity.
- If upsert data is incomplete only the given values are updated or inserted, which means the `UPSERT` statement has "PATCH semantics".
- `UPSERT` statements don't have a where clause. The key values of the entity that is upserted are extracted from the data.

The following actions are *not* performed on upsert:
 * UUID key values are _not generated_.
 * Generic CAP handlers, such as audit logging, are not invoked.

::: warning
In contrast to the Java runtime, deep upserts and delta payloads are not yet supported.
:::

##  <i>  More to Come </i>

This documentation is not complete yet, or the APIs are not released for general availability.
Stay tuned to upcoming releases for further updates.
