---
description: >
  Core QL in CAP Node.js service implementations: syntax comparison, writes, positional keys, binding parameters and compound assignments.
---

# New Core QL tuned for runtime

[Core QL](../guides/protocols/hcql/core-ql.md) is the new target implementation of [`cds.ql`](cds-ql.md), centered on a runtime-oriented parser supporting the full range of query statements, including reads and writes. Planned to become the default in upcoming major releases, it can already be used alongside CDS QL (aka Classic CQL).
{.abstract}

[[toc]]


## Import from `@sap/cds/core.js`

The language dialects are **Core QL** and **CDS QL** (aka **Classic CQL**). In this Node.js service-integration guide, `cql` refers to the Core QL API and `cds.ql` to the CDS QL API.

On a supporting CAP Node.js runtime, use Core QL alongside CDS QL by importing the `cql` function from the `@sap/cds/core.js` facade:

```js
import cds from '@sap/cds'
import { cql } from '@sap/cds/core.js'
```

> [!IMPORTANT]
> The examples below describe the checked local CAP integration, not a qualified released CAP version. Core QL [2.5.6](https://github.com/cap-js/ql/releases/tag/2.5.6) is released, but its standalone binding fix does not supply the CAP facade integration. Check the installed CAP runtime before using these examples; use CDS QL ([`cds.ql`](cds-ql.md)) for database-backed bound queries until that runtime is qualified.

Use `cql` to construct queries. Awaiting a query executes it against the primary database; pass it to `srv.run()` to select another service:

```js
await cql`SELECT ID, title from Books where stock > ${111}`
await CatalogService.run (cql`SELECT ID, title from Books`)
```

### Query Interoperability and Service Selection

The facade's `cql` function already returns CDS queries. For a query constructed directly through the underlying Core QL API, use `cds.ql()` to obtain CDS execution semantics:

```js
import { ql } from '@sap/cds/core.js'

const original = ql.cql`SELECT from Books where ID=${201}`
const query = cds.ql(original)
query === original //> true
await query.for(CatalogService)
```

Supported Core QL queries are upgraded in place, preserving their CQN body, parameter metadata and selected service. Plain CQN inputs receive a new CDS wrapper. The underlying Core QL API requires an explicitly selected service; CDS queries also support the primary-database fallback and CAP's async context. Parser choice does not bypass service authorization, input validation or transactions.

Use `.for(service)` to select the executing service and `.bind(...)` to supply parameter values. The legacy `.bind(service)` overload remains supported for an actual `cds.Service` instance, including a transaction. See [Binding Parameters](#binding-parameters) for the qualified scope and lifecycle limits; do not share mutable queries across overlapping executions.


## Insert, Upsert, Update, Delete

Core QL adds textual write statements. Interpolate JavaScript records for `INSERT`, `UPSERT` and `UPDATE`; supply complete keys for `UPSERT` and keyed writes:

```js
await cql`INSERT into Books ${{ title:'inserted' }}`
await cql`UPSERT into Books ${{ ID:11, title:'upserted' }}`
await cql`UPDATE Books[${11}] with ${{ title:'updated' }}`
await cql`DELETE Books[${11}]`
```

Record literals also work directly in CQL. Nested records describe deep writes through compositions; omitted collections in a deep update remain unchanged, while supplied collections are reconciled. See [Core QL write syntax](../guides/protocols/hcql/core-ql.md#deep-inserts--upserts).

## Calling Unbound Actions and Functions

On a supporting runtime, Core QL also constructs unbound operation requests:

```js
await CatalogService.run (cql`CALL greet with {name:'Ada'}`)
```

The operation name is local to the selected service; arguments are literal record data. These queries use normal service handlers, parameter validation, authorization and transactions. They have no entity subject and do not address entity-bound operations. See the [CDS QL CALL facade](cds-ql.md#call) and [HCQL operation requests](cds-ql.md#hcql-operation-requests) for equivalent entry points. The released-runtime qualification warning above applies to CALL integration too.

## Positional Key Predicates

Use scalar values in `[...]` to address an entity by its primary key. For composite keys, supply every value in the model's declared key order, separated by commas:

```sql :cql
SELECT from Books:texts[201,'de'] { locale, title }
SELECT from Books[201] { title, author }
DELETE from Books[201]
UPDATE Books[201] with { stock: 23 }
```

These forms assume `Books` has key `ID`, and `Books:texts` has keys `ID, locale`. They differ from explicit field predicates, which both dialects support:

```sql :cql
SELECT from Books:texts[ID=201 and locale='de'] { title }
```

Positional addressing needs model-aware consumer support. Single-key queries work in the current local runtime, but positional composite keys are not yet supported on the checked SQL database path; use explicit field predicates there. The syntax does not by itself establish the result shape or uniqueness.

## Binding Parameters

Bind values rather than concatenating query text. Core QL supports three parameter forms:

| Form | Binding |
| --- | --- |
| `?` | Positional values, in placeholder order |
| `?n` | Indexed values, starting at 1; repeated indexes reuse a value |
| `:name` | Named values from an object; repeated names reuse a value |

Supply the arguments with `q.bind(...)` immediately before execution:

```js
await cql`UPDATE Books[201] set stock -= ? where stock >= ?`.bind(1,1)
await cql`UPDATE Books[201] set stock -= ?1 where stock >= ?1`.bind(1)
await cql`UPDATE Books[201] set stock -= :n where stock >= :n`.bind({n:1})
```

The checked local facade supports initial bindings and rebinding **within an active transaction**. Select that transaction explicitly and await each execution before changing the values:

```js
await cds.db.tx (async tx => {
  const q = cql`SELECT ID, title from Books where ID=:ID`.for(tx)
  const first = await q.bind ({ID:201})
  const second = await q.bind ({ID:202})
})
```

Reuse after an implicitly selected transaction commits remains a separate lifecycle limitation. Construct fresh queries per request; do not retain a transaction-bound query across requests or share one mutable query between overlapping executions. Interleaved-request isolation and positional composite-key database support remain unqualified. The [database-services feature request](https://github.com/cap-js/cds-dbs/issues/1796) remains relevant to live-binding integration; local facade behavior is not proof of released-runtime support.

## Assignment Shortcuts

Use `+=` and `-=` in `UPDATE ... SET` as convenience shortcuts to change a field relative to its current value:

```sql :cql
UPDATE Books[201] set stock += 10
UPDATE Books[201] set stock -= 1 where stock >= 1
```

`stock -= expr` means `stock = stock - (expr)`; the complete right-hand expression is grouped. For example, `stock -= 1 + 2` subtracts 3, not 1 followed by adding 2.

Bound increments combine this syntax with the parameter forms above:

```js
await cql`UPDATE Books[201] set stock -= :n where stock >= :n`.bind({n:2})
```

The condition and change belong to one database statement, avoiding a separate read–compute–write cycle. Whether a write is allowed still depends on the target service's authorization and validation.

## High-level Comparison

The following tables compare **language dialects only**, not fluent APIs, JavaScript interpolation, binding APIs or execution. CDS QL uses the compiler-backed CQL parser; Core QL uses the runtime-oriented parser.

**In short:** both share association-oriented SELECT syntax. CDS QL has a broader SQL-oriented SELECT grammar, mainly needed for persistence models.
Core QL puts primary focus on runtime queries, and adds support for write statements and compact addressing.

### New features in Core QL

| CQL feature                                                   | CDS QL          | Core QL |
| ------------------------------------------------------------- | :--------------: | :-----: |
| *INSERT, UPSERT, UPDATE, DELETE*                              |        No        |   Yes   |
| Positional key predicates, i.e.: <br>*Books:texts [201,'de']* |        No        |   Yes   |
| Indexed parameters: `?n`                                      |        No        |   Yes   |
| Compound assignments: `+=`, `-=`                              |        No        |   Yes   |

Core QL also supports named `:name` parameters; see [Binding Parameters](#binding-parameters).

### Not supported in Core QL

| CQL feature                        | CDS QL          |       Core QL       |
| ---------------------------------- | :--------------: | :-----------------: |
| _SELECT from Foo **as foo**_       |       Yes        |         No          |
| *JOIN, UNION*                      |       Yes        |         No          |
| *EXCLUDING*                        |       Yes        |         No          |
| SQL casts / CDL type annotations   |       Yes        |         No          |
| Query-local associations (`mixin`) |       Yes        |         No          |
| Comments: `//`, `/* ... */`        |       Yes        |         No          |
| Delimited names: `![...]`          |       Yes        | column aliases only |

### Common Features

| CQL feature                                                      | CDS QL          | Core QL |
| ---------------------------------------------------------------- | :--------------: | :-----: |
| Key predicates, i.e.: <br>*Books:texts [ID=201 and locale='de']* |       Yes        |   Yes   |
| *SELECT one, distinct, aliases, `*`*                             |       Yes        |   Yes   |
| Prefix and postfix projections                                   |       Yes        |   Yes   |
| Paths, expands, inlines                                          |       Yes        |   Yes   |
| Infix filters, incl. group by, order by, limit                   |       Yes        |   Yes   |
| Association `EXISTS` / semi-joins                                |       Yes        |   Yes   |
| Filtering, aggregation, pagination                               |       Yes        |   Yes   |
| `CASE`, functions, predicates, operators                         |       Yes        |   Yes   |
| Subqueries                                                       |       Yes        |   Yes   |
| Positional parameters: `?`                                      |       Yes        |   Yes   |

CDS QL also parses `Books[201]`; yet, this does not give it Core QL's primary-key addressing convention, with comma-separated lists of multiple key values.


### Performance

Recorded query-construction timings show Core QL parsing about **4× faster** than compiler-backed CQL parsing on a shared SELECT corpus:

| Uncached workload           | CDS QL      | Core QL |
| --------------------------- | ----------: | ------: |
| Parse SELECT → CQN          |       38 µs |    9 µs |
| Static tagged templates     |       50 µs |   16 µs |
| Changing values + rebinding |       55 µs |   19 µs |

**Key message:** Core QL prioritizes runtime parsing over compiler-language breadth, editor assistance and diagnostic detail.

On a separate OData-compatible query corpus, Core QL used about **15% less time** than the public API on that corpus:

| OData | Core QL |
| ----: | ------: |
| 13 µs |   11 µs |

These are uncached mixed-corpus medians from separate experiments, not current-release benchmarks. The CDS QL comparison used an optimized Core QL 2.5.1 working tree and compiler 7.2.1 on Node.js 26.13.1 / Apple M4. They exclude HTTP, model resolution and database execution — not application latency measurements.

**Key message:** Core QL is competitive with OData parsing on this corpus.

For uncached request-level measurements and their separate version snapshot, see [HCQL Performance Considerations](../guides/protocols/hcql/performance.md). Parser speedups do not imply equal application speedups or safe shared-query reuse; see [binding limitations](#binding-parameters).

Human background: [cached query-construction outlook](../guides/protocols/hcql/performance.md#cached-queries). **Keep caching disabled with CDS services today.**



## Fluent API Differences

Core QL also provides a fluent API very close to CDS QL's `cds.ql`. Yet, because of subtle, intentional differences, using both APIs in parallel would cause confusion. Prefer tagged template literals for query construction with either dialect; leave Core query caching disabled with CDS services today.
