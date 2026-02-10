# CAP-Level Database Support

CAP supports a number of portable functions and operators in CQL. The compiler automatically translates these to the best-possible database-specific native SQL equivalents. You can safely use these in CDS view definitions and runtime queries expressed in CQL.
{.abstract}

[[toc]]


## Mocked Out of the Box

When using CAP's mocked out-of-the-box database integration, these functions and operators are supported in the in-memory SQLite database used for development and testing.

#### TODO:

- Mocked by in-memory SQLite or H2 databases
- With SAP HANA or PostgreSQL for production
- With a defined set of portable functions and operators

## Standard Operators

This chapter lists standardized operators supported by CAP, and guaranteed to work across all supported databases with feature parity. You can safely use these in CDS view definitions and runtime queries expressed in CQL. The compiler translates them to the best-possible database-specific native SQL equivalents.

### Standard SQL Operators

Most native SQL operators are supported in CQL as-is, like these from the SQL92 standard:

- Arithmetic operators: `+`, `-`, `*`, `/`, `%`
- Comparison operators: `<`, `>`, `<=`, `>=`, `=`, `<>`
- Logical operators: `AND`, `OR`, `NOT`
- Other operators: `IN`, `LIKE`, `BETWEEN`, `IS NULL`, `IS NOT NULL`, etc.

In addition, CQL provides some extended operators as described below.

### Bivalent `==` and `!=` Operators

CQL supports `==` and `!=` operators as bivalent logic variants for SQL's three-valued logic `=` and `<>`. The differences are as follows:

::: code-group
```SQL [CQL's Two-Valued Logic Operators]
SELECT 1 == null, 1 != null, null == null, null != null;
--> false, true, true, false
```
:::
::: code-group
```SQL [SQL's Three-Valued Logic]
SELECT 1 = null, 1 <> null, null = null, null <> null;
--> null, null, null, null
```
:::

In other words:

- CQL's `x == null` -> `true` if `x` is `null`, otherwise `false`
- CQL's `x != null` -> `false` if `x` is `null`, otherwise `true`
- SQL's `x = null` -> `null` for all `x` (even if `x` is `null`)
- SQL's `x <> null` -> `null` for all `x` (even if `x` is not `null`)

A real-world example makes this clearer. Consider this CQL query:

```sql
SELECT from Books where genre.name != 'Science Fiction';
```

The result set includes all books where genre is not 'Science Fiction', including the ones with an unspecified genre. In contrast, using SQL's `<>` operator, the ones with unspecified genre would be excluded.

The CQL behavior is consistent with common programming languages like JavaScript and Java, as well as with OData semantics. It is implemented in database by, the translation of `!=` to `IS NOT` in SQLite, or to `IS DISTINCT FROM` in standard SQL, and to an equivalent polyfill in SAP HANA.

> [!tip] Prefer == and !=
> Prefer using `==` and `!=` in most cases to avoid unexpected `null` results. Only use `=` and `<>` if you _really_ want SQL's three-valued logic behavior.

### Ternary `?:` Operator

CQL supports the ternary conditional operator `condition ? expr1 : expr2`, similar to many programming languages like JavaScript and Java. It evaluates `condition`, and returns the value of `expr1` if `condition` is true, or the value of `expr2` otherwise.

::: code-group
```sql [CQL example]
SELECT price > 100 ? 'expensive' : 'affordable' as priceCategory
from Books;
```
:::
::: code-group
```sql [=>&nbsp; Compiled SQL query]
SELECT CASE
  WHEN price > 100 THEN 'expensive'
  ELSE 'affordable'
END as priceCategory
FROM Books;
```
:::

The compiler translates this operator to the best-possible equivalent in the target database: `CASE WHEN ... THEN ... ELSE ... END` in standard SQL, or `IF(..., ..., ...)` in SAP HANA.


## Standard Functions
###### Portable Functions

The following sections list standardized string, numeric, date/time, and aggregate functions supported by CAP, and guaranteed to work across all supported databases with feature parity. You can safely use these in CDS view definitions and runtime queries expressed in CQL. The compiler, and the CAP runtimes, translate them to the best-possible database-specific native SQL equivalents.

> [!important] Function names are case-sensitive
> The names for standardized functions must be written exactly as listed below. For example, `toUpper` is invalid, while `toupper` is valid. Differently cased names might also work if they match native functions of the specific database, but are not guaranteed to be portable -> always use the exact casing as listed.


### String Functions

- `concat(x,y,...)`
- `length(x)`
- `trim(x)`
- `tolower(x)`
- `toupper(x)`
- `contains(x,substring)`
- `startswith(x,substring)`
- `endswith(x,substring)`
- `indexof(x,substring)`
- `substring(x,start, length)`
- `matchespattern(x,pattern)`

In addition to `concat()`, CAP also supports the common `||` operator for string concatenation in CQL queries, same as in SQL queries. For example, these two queries are equivalent:

```sql
SELECT concat (firstName,' ',lastName) as fullName from Authors;
```
```sql
SELECT firstName || ' ' || lastName as fullName from Authors;
```


> [!important] Indexes and Substring Details
> The return value of `indexof()` as well as the `start` parameter in `substring()` are zero-based index values. If the substring is not found, `indexof()` returns `-1`. If the `start` index in `substring()` is negative, it is counted from the end of the string. If the `length` parameter is omitted, the substring to the end of the string is returned.


### Numeric Functions

- `ceil(x)`, `ceiling(x)`
- `floor(x)`
- `round(x)`

> [!warning] Non-portable <code>round()</code> function with more than one argument
> Note that databases support `round()` functions with multiple arguments, the second parameter being the precision. If you use that option, the `round()` function may behave differently depending on the database.


### Date / Time Functions

- `date(x)` -> `yyyy-MM-dd` strings
- `time(x)` -> `HH:mm:ss` strings
   <br/><br/>
- `year(x)` -> integer
- `month(x)` -> integer
- `day(x)` -> integer
- `hour(x)` -> integer
- `minute(x)` -> integer
- `second(x)` -> integer
   <br/><br/>
- `years_between(x,y)` -> number
- `months_between(x,y)` -> number
- `days_between(x,y)` -> number
- `seconds_between(x,y)` -> number

> [!note] CAP Java support coming soon...
> The above date / time functions are currently only supported by CAP Node.js. \
> Support for CAP Java is planned for a future release.


### Aggregate Functions

- `avg(x)`, `average(x)`
- `min(x)`, `max(x)`
- `sum(x)`
- `count(x)`
<!-- - `countdistinct(x)` -->



## Native Functions

In general, the CDS compiler doesn't 'understand' SQL functions but translates them to SQL _generically_ as long as they follow the standard call syntax of `fn(x,y,...)`. This allows to use all native database functions inside your CDS models, like this:

```cds
SELECT from Books {
  ifnull (descr, title)  //> using HANA's native `ifnull` function
}
```

> [!warning] Native functions are less portable
> Using native functions like this makes your CDS models database-specific, and thus less portable. Therefore, prefer using the [portable functions](#portable-functions) listed above whenever possible.


## Window Functions

[SQL window functions](https://en.wikipedia.org/wiki/Window_function_(SQL)) with `OVER` clauses are supported as well, for example:

```sql
SELECT from Books {
  rank() over (partition by author order by price) as rank
}
```
