---
uacp: Linked from https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/e4a7559baf9f4e4394302442745edcd9.html
impl-variants: true
---


# CAP-level Database Integration

CAP application developers [focus on their domain](../../get-started/features#focus-on-domain), while CAP takes care of all aspects of database integration. This includes translating CDS models to native database artefacts, schema evolution, deployment, as well as runtime querying in a database-agnostic way. [SQLite](./sqlite) <sup>1</sup> in-memory databases are automatically used in [inner-loop development](../../get-started/features#fast-inner-loops), while in production, [SAP HANA](./hana) <sup>2</sup> is used by default.
{.abstract}

> _<sup>1</sup> or [H2](./h2) in case of Java_.\
> _<sup>2</sup> or [PostgreSQL](./postgres) in edge cases_.

[[toc]]


## Served Out-of-the-Box


When you run your CAP application with `cds watch`, an in-memory database service is automatically boostrapped, as indicated by such log output:

```log
[cds] - connect to db > sqlite { url: ':memory:' }
  > init from bookshop/db/data/sap.capire.bookshop-Authors.csv
  > init from bookshop/db/data/sap.capire.bookshop-Books.csv
  > init from bookshop/db/data/sap.capire.bookshop-Books.texts.csv
  > init from bookshop/db/data/sap.capire.bookshop-Genres.csv
/> successfully deployed to in-memory database.
```



## Standard Database Functions

A specified set of standard functions - inspired by [OData](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html#sec_StringandCollectionFunctions) and [SAP HANA](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/alphabetical-list-of-functions?locale=en-US) - is supported in a **database-agnostic**, hence portable way. The functions are translated to the best-possible database-specific SQL expressions at runtime and also during compilation of your CDL files.


### OData standard functions

The `@sap/cds-compiler` and the database services come with out of the box support for common OData functions.

::: warning Case Sensitivity
The OData function mappings are case-sensitive and must be written as in the list below.
:::

Assuming you have the following entity definition:

```cds
entity V as select from Books {
  startswith(title, 'Raven') as lowerCase, // mapped to native SQL equivalent
  startsWith(title, 'Raven') as camelCase, // passed as-is
}
```


Then you compile the SAP HANA artifacts:

`$ cds compile -2 sql --dialect hana`


This is the result:

```sql
CREATE VIEW V AS SELECT
  (CASE WHEN locate(title, 'Raven') = 1 THEN TRUE ELSE FALSE END) AS lowerCase,
  -- the below will most likely fail on SAP HANA
  startsWith(title, 'Raven') AS camelCase
FROM Books;
```

💡 If you want to use a DB native function or a UDF (User-Defined Function) instead of the OData function mappings, you can
do that by using a different casing than the OData function names as defined in the list below.
For example, `startsWith` instead of `startswith` will be passed as-is to the database.

#### String Functions

- `concat(x, y, ...)`
  Concatenates the given strings or numbers `x`, `y`, ....

- `trim(x)`
  Removes leading and trailing whitespaces from `x`.

- `contains(x, y)`
  Checks whether `x` contains `y` (case-sensitive).

- `startswith(x, y)`
  Checks whether `x` starts with `y` (case-sensitive).

- `endswith(x, y)`
  Checks whether `x` ends with `y` (case-sensitive).

- `matchespattern(x, y)`
  Checks whether `x` matches the regular expression `y`.

- `indexof(x, y)` <sup>1</sup>
  Returns the index of the first occurrence of `y` in `x` (case-sensitive).

- `substring(x, i, n?)` <sup>1</sup>
  Extracts a substring from `x` starting at index `i` (0-based) with an optional length `n`.

  | Parameter | Positive                | Negative                            | Omitted                              |
  |-----------|-------------------------|-------------------------------------|--------------------------------------|
  | `i`       | starts at index `i`     | starts `i` positions before the end |                                      |
  | `n`       | extracts `n` characters | invalid                             | extracts until the end of the string |

- `length(x)`
  Returns the length of the string `x`.

- `tolower(x)`
  Converts all characters in `x` to lowercase.

- `toupper(x)`
  Converts all characters in `x` to uppercase.

> <sup>1</sup> These functions work zero-based. For example, `substring('abcdef', 1, 3)` returns 'bcd'

#### Numeric Functions

- `ceiling(x)`
  Rounds the numeric parameter up to the nearest integer.

- `floor(x)`
  Rounds the numeric parameter down to the nearest integer.

- `round(x)`
  Rounds the numeric parameter to the nearest integer.
  The midpoint between two integers is rounded away from zero (e.g., `0.5` → `1` and `-0.5` → `-1`).

  ::: warning `round` function with more than one argument
  Note that most databases support `round` functions with multiple arguments,
  the second parameter being the precision. SAP HANA even has a third argument which is the rounding mode.
  If you provide more than one argument, the `round` function may behave differently depending on the database.
  :::

<div class="impl node">

#### Date and Time Functions

- `year(x)`, `month(x)`, `day(x)`, `hour(x)`, `minute(x)`, `second(x)`
  Extracts and returns specific date / time parts as integer value from a given `cds.DateTime`, `cds.Date`, or `cds.Time`.

- `time(x)`, `date(x)`
  Extracts and returns a time or date from a given `cds.DateTime`, `cds.Date`, or `cds.Time`.

- `fractionalseconds(x)`
  Returns a `Decimal` representing the fractional seconds for a given `cds.Timestamp`.

- `maxdatetime()`
  Returns the latest possible point in time: `'9999-12-31T23:59:59.999Z'`.

- `mindatetime()`
  Returns the earliest possible point in time: `'0001-01-01T00:00:00.000Z'`.

</div>

#### Aggregate Functions

- `min(x)`, `max(x)`, `sum(x)`, `average(x)`, `count(x)`, `countdistinct(x)`
  Standard aggregate functions used to calculate minimum, maximum, sum, average, count, and distinct count of values.

<div class="impl node">

### SAP HANA Functions

In addition to the OData standard functions, the `@sap/cds-compiler` and all CAP Node.js database services come with
out of the box support for some common SAP HANA functions, to further increase the scope for portable testing:

::: warning Upper- and Lowercase are supported
For the SAP HANA functions, both usages are allowed: all-lowercase as given above, as well as all-uppercase.
:::

- `years_between`
  Computes the number of years between two specified dates. ([link](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/years-between-function-datetime?locale=en-US))
- `months_between`
  Computes the number of months between two specified dates. ([link](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/months-between-function-datetime?locale=en-US))
- `days_between`
  Computes the number of days between two specified dates. ([link](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/days-between-function-datetime?locale=en-US))
- `seconds_between`
  Computes the number of seconds between two specified dates. ([link](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/seconds-between-function-datetime?locale=en-US))
- `nano100_between`
  Computes the time difference between two dates to the precision of 0.1 microseconds. ([link](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/nano100-between-function-datetime?locale=en-US))

### Special Runtime Functions

In addition to the OData and SAP HANA standard functions, the **CAP runtime** provides special functions that are only available for runtime queries:

- `search(x, y)`
  Checks whether `y` is contained in any element of `x` (fuzzy matching may apply).
  See [Searching Data](../services/served-ootb#searching-data) for more details.

- `session_context(<var>)`
  Utilizes standard variable names to maintain session context.
  Refer to [Session Variables](#session-variables) for additional information.

- `now()`
  Returns the current timestamp.

</div>

## Querying at Runtime




Most queries to databases are constructed and executed from [generic event handlers of CRUD requests](../services/served-ootb#serving-crud), so quite frequently there's nothing to do. The following is for the remaining cases where you have to provide custom logic, and as part of it execute database queries.




### DB-Agnostic Queries

<div class="impl node">

At runtime, we usually construct and execute queries using cds.ql APIs in a database-agnostic way. For example, queries like this are supported for all databases:

```js
SELECT.from (Authors, a => {
  a.ID, a.name, a.books (b => {
    b.ID, b.title
  })
})
.where ({name:{like:'A%'}})
.orderBy ('name')
```

</div>

<div class="impl java">

At runtime, we usually construct queries using the [CQL Query Builder API](../../java/working-with-cql/query-api) in a database-agnostic way. For example, queries like this are supported for all databases:

```java
Select.from(AUTHOR)
      .columns(a -> a.id(), a -> a.name(),
               a -> a.books().expand(b -> b.id(), b.title()))
      .where(a -> a.name().startWith("A"))
      .orderBy(a -> a.name());
```

</div>

### Standard Operators {.node}

The database services guarantee the identical behavior of these operators:

* `==`, `=` — with `=` null being translated to `is null`
* `!=`, `<>` — with `!=` translated to `IS NOT` in SQLite, or to `IS DISTINCT FROM` in standard SQL, or to an equivalent polyfill in SAP HANA
* `<`, `>`, `<=`, `>=`, `IN`, `LIKE` — are supported as is in standard SQL

In particular, the translation of `!=` to `IS NOT` in SQLite — or to `IS DISTINCT FROM` in standard SQL, or to an equivalent polyfill in SAP HANA — greatly improves the portability of your code.


### Session Variables {.node}

The API shown after this, which includes the function `session_context()` and specific pseudo variable names, is supported by **all** new database services, that is, *SQLite*, *PostgreSQL* and *SAP HANA*.
This allows you to write the respective code once and run it on all these databases:

```sql
SELECT session_context('$user.id')
SELECT session_context('$user.locale')
SELECT session_context('$valid.from')
SELECT session_context('$valid.to')
```

Among other things, this allows us to get rid of static helper views for localized data like `localized_de_sap_capire_Books`.

### Native DB Queries

If required you can also use native database features by executing native SQL queries:

<div class="impl node">

```js
cds.db.run (`SELECT from sqlite_schema where name like ?`, name)
```
</div>

<div class="impl java">

Use Spring's [JDBC Template](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jdbc/core/JdbcTemplate.html) to [leverage native database features](../../java/cqn-services/persistence-services#jdbctemplate) as follows:

```java
@Autowired
JdbcTemplate db;
...
db.queryForList("SELECT from sqlite_schema where name like ?", name);
```
</div>

### Reading `LargeBinary` / BLOB {.node}

Formerly, `LargeBinary` elements (or BLOBs) were always returned as any other data type. Now, they're skipped from `SELECT *` queries. Yet, you can still enforce reading BLOBs by explicitly selecting them. Then the BLOB properties are returned as readable streams.

```js
SELECT.from(Books)          //> [{ ID, title, ..., image1, image2 }] // [!code --]
SELECT.from(Books)          //> [{ ID, title, ... }]
SELECT(['image1', 'image2']).from(Books) //> [{ image1, image2 }] // [!code --]
SELECT(['image1', 'image2']).from(Books) //> [{ image1: Readable, image2: Readable }]
```

[Read more about custom streaming in Node.js.](../../node.js/best-practices#custom-streaming-beta){.learn-more}


## Using Native Features  { #native-db-functions}

In general, the CDS 2 SQL compiler doesn't 'understand' SQL functions but translates them to SQL generically as long as they follow the standard call syntax of `function(param1, param2)`. This allows you to use native database functions inside your CDS models.

Example:

```cds
entity BookPreview as select from Books {
  IFNULL (descr, title) as shorttext   //> using HANA function IFNULL
};
```

The `OVER` clause for SQL Window Functions is supported, too:

```cds
entity RankedBooks as select from Books {
  name, author,
  rank() over (partition by author order by price) as rank
};
```



#### Using Native Functions with Different DBs { #sqlite-and-hana-functions}

In case of conflicts, follow these steps to provide different models for different databases:

1. Add database-specific schema extensions in specific subfolders of `./db`:

   ::: code-group

   ```cds [db/sqlite/index.cds]
   using { AdminService } from '..';
   extend projection AdminService.Authors with {
      strftime('%Y',dateOfDeath)-strftime('%Y',dateOfBirth) as age : Integer
   }
   ```

   ```cds [db/hana/index.cds]
   using { AdminService } from '..';
   extend projection AdminService.Authors with {
      YEARS_BETWEEN(dateOfBirth, dateOfDeath) as age : Integer
   }
   ```

   :::

2. Add configuration in specific profiles to your *package.json*, to use these database-specific extensions:

   ```json
   { "cds": { "requires": {
     "db": {
      "kind": "sql",
      "[development]": { "model": "db/sqlite" },
      "[production]": { "model": "db/hana" }
    }
   }}}
   ```
<div class="impl java">

:::info The following steps are only needed when you use two different local databases.

3. For CAP Java setups you might need to reflect the different profiles in your CDS Maven plugin configuration. This might not be needed for all setups, like using a standard local database (sqlite, H2, or PostgreSQL) and a production SAP HANA setup. In that case the local build defaults to the `development` profile. But for other setups, like using a local PostgreSQL and a local SQLite you'll need two (profiled) `cds deploy` commands:

   ```xml
    <execution>
      <id>cds.build</id>
      <goals>
        <goal>cds</goal>
      </goals>
      <configuration>
        <commands>
          <command>build --for java</command>
          <command>deploy --profile development --dry --out "${project.basedir}/src/main/resources/schema-h2.sql"</command>
          <command>deploy --profile production --dry --out "${project.basedir}/src/main/resources/schema-postresql.sql"</command>
        </commands>
      </configuration>
    </execution>
   ```

4. For the Spring Boot side it's similar. If you have a local development database and a hybrid profile with a remote SAP HANA database, you only need to run in default (or any other) profile. For the SAP HANA part, the build and deploy part is done separately and the application just needs to be started using `cds bind`.
Once you have 2 non-HANA local databases, you need to have 2 distinct database configurations in your Spring Boot configuration (in most cases application.yaml).

    ```yaml
    spring:
      config:
        activate:
          on-profile: default,h2
      sql:
        init:
          schema-locations: classpath:schema-h2.sql
    ---
    spring:
      config:
        activate:
          on-profile: postgresql
      sql:
        init:
          schema-locations: classpath:schema-postgresql.sql
      datasource:
        url: "jdbc:postgresql://localhost:5432/my_schema"
        driver-class-name: org.postgresql.Driver
        hikari:
          maximum-pool-size: 1
          max-lifetime: 0
    ```
  In case you use 2 different databases you also need to make sure that you have the JDBC drivers configured (on the classpath).

:::

</div>

CAP samples demonstrate this in [@capire/bookstore](https://github.com/capire/bookstore/tree/main/db).
