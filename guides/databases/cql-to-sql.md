# CDS Compilation to Database-Specific SQL

CAP supports a number of portable functions and operators in CQL, which are automatically translated to the best-possible database-specific native SQL equivalents. These can safely be used in CDS view definitions as well as in runtime queries expressed in CQL.
{.abstract}

[[toc]]


## Operators

Most native SQL operators are supported in CQL as-is, like these from the SQL92 standard:

- Arithmetic operators: `+`, `-`, `*`, `/` <sup>1</sup>
- Comparison operators: `<`, `>`, `<=`, `>=`, `=`, `<>`
- Logical operators: `AND`, `OR`, `NOT`
- Other operators: `IN`, `LIKE`, `BETWEEN`, `IS NULL`, `IS NOT NULL`, etc.

<sup>1</sup> CAP Node.js additionally supports `%`.

In addition, CQL provides some extended comparison operators as described below.

### Bivalent `==` and `!=` Operators

CQL supports `==` and `!=` operators as two-valued logic variants for SQL's three-valued logic `=` and `<>`. 

::: details 
The differences are captured in these truth tables:

#### two-valued equality (`==`, CQL)

| == | 1 | 0 | `null` |
|---|---|---|---|
| 1 | `true` | `false` | `false` |
| 0 | `false` | `true` | `false` |
| `null` | `false` | `false` | `true` |

#### three-valued equality (`=`, CQL & SQL)

| = | 1 | 0 | `null` |
|---|---|---|---|
| 1 | `true` | `false` | `unknown` |
| 0 | `false` | `true` | `unknown` |
| `null` | `unknown` | `unknown` | `unknown` |

#### two-valued inequality (`!=`, CQL)

| != | 1 | 0 | `null` |
|---|---|---|---|
| 1 | `false` | `true` | `true` |
| 0 | `true` | `false` | `true` |
| `null` | `true` | `true` | `false` |

#### three-valued inequality (`<>`, CQL & SQL)

| <> | 1 | 0 | `null` |
|---|---|---|---|
| 1 | `false` | `true` | `unknown` |
| 0 | `true` | `false` | `unknown` |
| `null` | `unknown` | `unknown` | `unknown` |
:::

In other words:

- CQL's `x == null` -> `true` if `x` is `null`
- CQL's `x != null` -> `true` if `x` is not `null`
- SQL's `x = null` -> `unknown` for all `x` (even if `x` is `null`)
- SQL's `x <> null` -> `unknown` for all `x` (even if `x` is not `null`)

A real-world example makes this clearer. Consider this CQL query:

```sql
SELECT from Books where genre.name != 'Science Fiction';
```

The result set includes all books where genre is not 'Science Fiction', including the ones with an unspecified genre. In contrast, using SQL's `<>` operator, the ones with unspecified genre would be excluded.

The behavior of CQL two-valued comparison operators `==` and `!=` is consistent with common programming languages like JavaScript and Java, as well as with the semantics of the OData operators `eq` and `ne`. On the database `==` and `!=` are translated to `IS NOT DISTINCT FROM` and `IS DISTINCT FROM` in standard SQL, to `IS` and `IS NOT` on SQLite, and to an equivalent polyfill on SAP HANA.

> [!tip] Usage Recommendation
> Prefer using  `==` and `!=` in the very most cases to avoid unexpected `null` results. Only use `=` and `<>` if you _really_ want SQL's three-valued logic behavior.

> [!tip] Avoid using `null` values
> Declare elements as `not null` where applicable. Or use a non-null value to represent "initial" state.

> [!tip] Compare list values in CAP Java
> In CAP Java, you may use the comparison operators to compare [list values](../../java/working-with-cql/query-api#list-values) like in this CQL query:
> ```sql
> SELECT from Books where (year, month) > (2014, 7)
> ```

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

This operator is translated to the best-possible equivalent in the target database, for example to `CASE WHEN ... THEN ... ELSE ... END` in standard SQL, or to `IF(..., ..., ...)` in SAP HANA.


## Functions

### Portable Functions

Following are portable functions guaranteed by CAP. These can safely be used in CDS view definitions as well as in runtime queries expressed in CQL, and are translated to the best-possible database-specific native SQL equivalents.

**String functions:**

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

**Numeric functions:**

- `ceiling(x)`
- `floor(x)`
- `round(x)`

**Aggregate functions:**

- `avg(x)`, `average(x)`
- `min(x)`, `max(x)`
- `sum(x)`
- `count(x)`
- `countdistinct(x)`<sup>1</sup>

**Date/time functions:**<sup>2</sup>

- `date(x)` -> `yyyy-MM-dd`
- `time(x)` -> `HH:mm:ss`
- `year(x)`
- `month(x)`
- `day(x)`
- `hour(x)`
- `minute(x)`
- `second(x)`

**SAP HANA date/time functions:**<sup>2</sup>

- `years_between(x,y)`
- `months_between(x,y)`
- `days_between(x,y)`
- `seconds_between(x,y)`

---

* <sup>1</sup> `countdistinct` is only supported by CAP Java.
* <sup>2</sup> Date/time functions are not supported by CAP Java.

> [!note] Indexes and Substring Details
> The return value of `indexof()` as well as the `start` parameter in `substring()` are zero-based index values. If the substring is not found, `indexof()` returns `-1`. If the `start` index in `substring()` is negative, it is counted from the end of the string. If the `length` parameter is omitted, the substring to the end of the string is returned. 

> [!important] Function names are case-sensitive
> The function names must be written exactly as listed above. For example, `toUpper` is invalid, while `toupper` is valid. Differently cased names might also work if they match native functions of the specific database, but are not guaranteed to be portable -> always use the exact casing as listed.

> [!warning] Non-portable <code>round()</code> function with more than one argument
> Note that databases support `round()` functions with multiple arguments, the second parameter being the precision. If you use that option, the `round()` function may behave differently depending on the database.



### Native Functions

In general, the CDS compiler doesn't 'understand' SQL functions but translates them to SQL generically as long as they follow the standard call syntax of `fn(x,y,...)`. This allows to use all native database functions inside your CDS models, like this:

```cds
SELECT from Books {
  ifnull (descr, title)  //> using HANA's native `ifnull` function
}
```

> [!warning] 
> Using native functions like this makes your CDS models database-specific, and thus less portable. Therefore, prefer using the [portable functions](#portable-functions) listed above whenever possible.


### Window Functions

Window functions with `OVER` clauses are supported as well; for example:

```sql
SELECT from Books {
  rank() over (partition by author order by price) as rank
}
```
