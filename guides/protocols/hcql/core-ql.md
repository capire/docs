---
description: Core QL syntax for HCQL clients and application agents.
---
# Core QL Reference

> [!IMPORTANT]
> This guide covers ***Core QL*** syntax for [HCQL](../hcql.md) and MCP data queries, as used by **application agents**. For Node.js service implementations, and hence **coding agents**, see the separate [Core QL in CAP Node.js Services](../../../node.js/core-ql.md) guide.

The language dialect described here is **Core QL**, distinct from **CDS QL** (aka **Classic CQL**).

> [!note]
> - This guide assumes **elementary knowledge of SQL**.
> - Examples assume matching model fields, relationships and key types.

[[toc]]

## Synopsis

CDS adds *Associations* and *Compositions*, exposing relationships as navigational references. Core QL extends SQL to traverse them:

- *[Path Expressions](#flattened-reads-inline)* *inline* data into *flat* results → prefer these for ***to-one***.
- *[Nested Projections](#deep-reads-expand)* *expand* data into *nested* results → for ***to-many***.
- *[Nested Records](#deep-inserts--upserts)* mirror nested projections for *deep inserts*.
- *[Infix Filters](#infix-filters-narrow)* *narrow* association targets.
- `DISTINCT`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT` work as in SQL.
- `UNION` and `JOIN` are not supported → use traversal and `exists` instead.


> [!tip]
> - **Go functional!** – filter, navigate and aggregate in queries instead of client-side loops. Combine related work server-side in one query where practical.
> - **Avoid over-fetching** – `select` only the columns you need and `limit` collections, including expands.

> [!CAUTION]
> - Use `name: value` in records only — column lists use `expr as name`, as in SQL.
> - Use `'...'` for strings, or `![...]` for delimited identifiers — `"..."` is rejected!
> - Use `''` to *escape* apostrophes *within* strings — don't use `\'`.
> - Don't include comments in query text — they are rejected.

## Flattened Reads (inline)

Path expressions traverse associations with dots `.`, flattening scalar elements into results:

```sql :cql
SELECT from Authors { *,
  books.title,
  books.genre.name
} where books.genre.name != 'Drama'
```

- Paths work in projections, `where`, `group by` and `order by`.
- Results auto-alias paths: `books.title` → `books_title`.
- **Use dotted paths in queries**, not generated names.
- Flattening *to-many* associations can multiply source rows; prefer _expands_ for these.
- Avoid aliases shadowing associations used in later `group by`/`order by` clauses.
- `*` selects all columns; named columns override rather than clash.


## Deep Reads (expand)

End an association path with a nested projection `{...}`:

```sql :cql
SELECT from Authors { ID, name,
  books {
    title, genre.name
  }
} where books.genre.name != 'Drama'
```

- Top-level projections and expands share `{ columns }` syntax and path expressions.
- *To-one* expands yield objects, *to-many* arrays of objects.
- Filter parent rows by matching children with [Concise semi-joins](#concise-semi-joins).

## Infix Filters (narrow)

Filter clauses in `[...]` narrow an association's targets in inline or expand paths. Leading `where` is optional. Distinguish these filters from positional keys in [to-one queries](#to-one-queries).

```sql :cql
SELECT from Departments { ID,
  members[role='Manager'].addresses[kind='business'].city.name
  as head_quarter
}
```

```sql :cql
SELECT from Authors { ID, name,
  books [genre.name != 'Drama'] { title, genre }
}
```

This narrows expanded books, not authors.

Infix filters support `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, in that order:

```sql :cql
SELECT from Authors {
  ID, name, books [
    where genre.name != 'Drama'
    group by genre.name
    order by sum(stock) desc
    limit 10
  ] {
    genre.name,
    sum(stock) as total_stock,
    count(*) as total_count
  }
}
where books.genre.name != 'Drama'
order by name
limit 20
```

## Concise Semi-Joins

Use paths to associations or compositions with `EXISTS`/`NOT EXISTS`:

```sql :cql
SELECT ID, name from Authors where exists books
```

Combine with infix filters:

```sql :cql
SELECT from Authors {
  ID, name, books [genre.name != 'Drama'] { title }
} where exists books [genre.name != 'Drama']
```

The `exists` predicate filters authors by the existence of books matching the given condition.

## To-one Queries

Address one row with complete, comma-separated scalar keys in `[...]`:

```sql :cql
SELECT from Books:texts[201,'de'] { title }
SELECT from Books[201] { title, author }
DELETE from Books[201]
UPDATE Books[201] with { stock: 23 } where stock > 0
UPDATE Books:texts[201,'de'] with { title: 'Sturmhöhe' }
```

- Supply the key values on the **final target**, in discovered order.
- Additional conditions can be added in the top-level `where` clause.
- Core QL also supports explicit `where` predicates for reads and writes:

```sql :cql
SELECT locale, title from Books:texts where ID=201
SELECT title, author from Books where ID=201
UPDATE Books with { stock: 23 } where ID=201
DELETE from Books where ID=201
```

> [!WARNING]
> HCQL rejects non-keyed UPDATE/DELETE by default, even for single-row predicates. Trusted integrations can independently enable `UPDATE.many` or `DELETE.many` under <Config>cds.protocols.hcql.allows</Config>; see [query policy](./config.md#default-query-policy).

## Binding Parameters

Use parameters for user-supplied values rather than concatenating query text:

```sql :cql
SELECT ... from Books where title = ?
```

| Form    | Meaning                                    |
| ------- | ------------------------------------------ |
| `?`     | Positional parameter, in placeholder order |
| `?n`    | Indexed parameter; indexes start at 1      |
| `:name` | Named parameter                            |

Bind scalar query values, not fields inside input records. See [HCQL input bindings](../hcql.md#bind-input-values) for HTTP envelopes and dynamic JSON records.


## Deep Inserts / Upserts

`INSERT`/`UPSERT` accept nested record literals `{key:value}`. Deep inserts **write composition trees**.

For a to-many composition `Authors.books`:

```sql :cql
INSERT into Authors {
  name: 'Alfred, Lord Tennyson',
  books: [
    { title: 'The Lady of Shalott', stock: 23 },
    { title: 'Ulysses', stock: 42 },
  ]
}
```

- Field values are literals only – **not** binding params, expressions, or pseudo variables.
- Multiple input records are supported, e.g.: `INSERT into Foo {x:1}, {x:2}, {x:3}`.
- For `INSERT`, single `UUID` keys are filled automatically.
- For `UPSERT`, all keys must be specified in the records.
- Deep writes only follow *compositions*, not associations.
- *Child→parent* uplinks are filled in automatically for *managed* associations.


## Deep Updates

For a to-many composition `Authors.books`:

```sql :cql
UPDATE Authors['a1'] with {
  books: [{ ID: 'b1', title: 'Revised title' }, { ID: 'b2' }]
}
```

- **Supplied collections** are reconciled by complete child keys
    - matching children are updated
    - new children are created
    - omitted children are **deleted** ⇒ include every child to keep; keys suffice.
- Entirely **omitted compositions** stay unchanged.
- Navigational child updates avoid reconciling the parent’s collection:

  ```sql :cql
  UPDATE Authors['a1']:books['b1'] with { title: 'Revised title' }
  ```

## Flat Writes / Updates

Flat writes fill an association's nested *foreign key elements*, without creating a composition tree. Writing target data is rejected.

```sql :cql
INSERT into Books {
  title: 'Poems by Edgar Allan Poe',
  author: { ID: 150 }
}
```

Update with record literals:

```sql :cql
UPDATE Books[144] with {
  title: 'Poems by Edgar Allan Poe',
  author: { ID: 150 }
}
```

Or use *UPDATE ... **SET** x = \<expr\>*:

```sql :cql
UPDATE Books[201] set stock -= 1 where stock >= 1
```

> [!warning]
> HCQL rejects `UPDATE SET` by default. Trusted integrations can enable `UPDATE.set` independently of bulk writes under <Config>cds.protocols.hcql.allows</Config>. SET expressions are not input-validated; see [query policy](./config.md#default-query-policy).

## Functions & *Operators*

**Null-safe `==`, `!=` operators** treat *null* as a comparable value:

```sql :cql
... where x != 7
... where x <> 7
```

`!=` keeps rows where `x` is null; SQL-standard `<>` skips them.

**SQL's standard** **operators** and predicates are supported as is:

- `LIKE`, `BETWEEN`, `CASE WHEN`, `IN`, `IS NULL`, `IS NOT NULL`, `||`
-  Common logic, comparison, and arithmetic operators.

**Common functions:**

| Group | Functions |
| --- | --- |
| Aggregate | `count`, `sum`, `avg`, `min`, `max` |
| Numeric | `ceil`, `floor`, `round` |
| String | `length`, `trim`, `concat`, `startswith`, `endswith`, `contains`, `tolower`, `toupper`, `substring`, `indexof` |
| Date/time | `date`, `time`, `year`, `month`, `day`, `hour`, `minute`, `second`, `days_between`, `weeks_between`, `months_between`, `years_between` |

- The string functions `substring` and `indexof` use *0-based* positions.
- Date/time functions use ISO 8601 string literals: `'2026-10-12T12:34:56.789Z'`, `'2026-10-12'`, `'12:34:56'`.

For database-specific function support and behavior, see [portable database functions](../../databases/cap-level-dbs.md#portable-functions).

## Pseudo Variables

- `$now` — current timestamp
- `$user.id` — current user ID
- Usable in supported query expressions, **except** input record values; HCQL pseudo-variable allowlists apply.

```sql :cql
SELECT from Books where createdAt < $now and createdBy = $user.id
```
