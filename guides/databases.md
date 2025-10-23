---
synopsis: >
  This guide provides instructions on how to use databases with CAP applications.
  Out of the box-support is provided for SAP HANA, SQLite, H2 (Java only), and PostgreSQL.
status: released
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/e4a7559baf9f4e4394302442745edcd9.html
impl-variants: true
---


# Using Databases

<!-- REVISIT: Didn't we say no synopsis any more, but toc straight away? -->
{{ $frontmatter.synopsis }}

<ImplVariantsHint />

[[toc]]


## Setup & Configuration

<div class="impl node">

### Migrating to the `@cap-js/` Database Services?  {.node}

With CDS 8, the [`@cap-js`](https://github.com/cap-js/cds-dbs) database services for SQLite, PostgreSQL, and SAP HANA are generally available. It's highly recommended to migrate. You can find instructions in the [migration guide](databases-sqlite#migration). Although the guide is written in the context of the SQLite Service, the same hints apply to PostgreSQL and SAP HANA.

### Adding Database Packages  {.node}

Following are cds-plugin packages for CAP Node.js runtime that support the respective databases:

| Database                       | Package                                                      | Remarks                            |
| ------------------------------ | ------------------------------------------------------------ | ---------------------------------- |
| **[SAP HANA Cloud](databases-hana)**     | [`@cap-js/hana`](https://www.npmjs.com/package/@cap-js/hana) | recommended for production         |
| **[SQLite](databases-sqlite)**       | [`@cap-js/sqlite`](https://www.npmjs.com/package/@cap-js/sqlite) | recommended for development        |
| **[PostgreSQL](databases-postgres)** | [`@cap-js/postgres`](https://www.npmjs.com/package/@cap-js/postgres) | maintained by community + CAP team |

<!-- Do we really need to say that? -->
> Follow the preceding links to find specific information for each.

In general, all you need to do is to install one of the database packages, as follows:

Using SQLite for development:

```sh
npm add @cap-js/sqlite -D
```

Using SAP HANA for production:

```sh
npm add @cap-js/hana
```

<!-- REVISIT: A bit confusing to prefer the non-copiable variant that doesn't get its own code fence -->
::: details Prefer `cds add hana` ...

... which also does the equivalent of `npm add @cap-js/hana` but in addition cares for updating `mta.yaml` and other deployment resources as documented in the [deployment guide](deployment/to-cf#_1-sap-hana-database).

:::

### Auto-Wired Configuration  {.node}

The afore-mentioned packages use `cds-plugin` techniques to automatically configure the primary database with `cds.env`. For example, if you added SQLite and SAP HANA, this effectively results in this auto-wired configuration:

<!-- REVISIT: hdbtable is now default, should we mention it anyway? -->
```json
{"cds":{
  "requires": {
    "db": {
      "[development]": { "kind": "sqlite", "impl": "@cap-js/sqlite", "credentials": { "url": ":memory:" } },
      "[production]": { "kind": "hana", "impl": "@cap-js/hana", "deploy-format": "hdbtable" }
    }
  }
}}
```

::: details In contrast to pre-CDS 7 setups this means...

1. You don't need to — and should not — add direct dependencies to driver packages, like [`hdb`](https://www.npmjs.com/package/hdb) or [`sqlite3`](https://www.npmjs.com/package/sqlite3) anymore in your *package.json* files.
2. You don't need to configure `cds.requires.db` anymore, unless you want to override defaults brought with the new packages.

:::



### Custom Configuration  {.node}

The auto-wired configuration uses configuration presets, which are automatically enabled via `cds-plugin` techniques. You can always use the basic configuration and override individual properties to create a different setup:

1. Install a database driver package, for example:
   ```sh
   npm add @cap-js/sqlite
   ```

   > Add option `-D` if you want this for development only.

2. Configure the primary database as a required service through `cds.requires.db`, for example:

   ```json
   {"cds":{
     "requires": {
       "db": {
         "kind": "sqlite",
         "impl": "@cap-js/sqlite",
         "credentials": {
           "url": "db.sqlite"
         }
       }
     }
   }}
   ```

The config options are as follows:

- `kind` — a name of a preset, like `sql`, `sqlite`, `postgres`, or `hana`
- `impl` — the module name of a CAP database service implementation
- `credentials` — an object with db-specific configurations, most commonly `url`

::: warning Don't configure credentials

Credentials like `username` and  `password` should **not** be added here but provided through service bindings, for example, via `cds bind`.

:::

::: tip Use `cds env` to inspect effective configuration

For example, running this command:

```sh
cds env cds.requires.db
```
→ prints:

```sh
{
  kind: 'sqlite',
  impl: '@cap-js/sqlite',
  credentials: { url: 'db.sqlite' }
}
```

:::

</div>

### Built-in Database Support {.java}

CAP Java has built-in support for different SQL-based databases via JDBC. This section describes the different databases and any differences between them with respect to CAP features. There's out of the box support for SAP HANA with CAP currently as well as H2 and SQLite. However, it's important to note that H2 and SQLite aren't enterprise grade databases and are recommended for non-productive use like local development or CI tests only. PostgreSQL is supported in addition, but has various limitations in comparison to SAP HANA, most notably in the area of schema evolution.

Database support is enabled by adding a Maven dependency to the JDBC driver, as shown in the following table:

| Database                       | JDBC Driver                                                 | Remarks                            |
| ------------------------------ | ------------------------------------------------------------ | ---------------------------------- |
| **[SAP HANA Cloud](databases-hana)**     | `com.sap.cloud.db.jdbc:ngdbc` | Recommended for productive use         |
| **[H2](databases-h2)**       | `com.h2database:h2` | Recommended for development and CI     |
| **[SQLite](databases-sqlite)**       | `org.xerial:sqlite-jdbc` | Supported for development and CI <br> Recommended for local MTX |
| **[PostgreSQL](databases-postgres)** | `org.postgresql:postgresql` | Supported for productive use |

[Learn more about supported databases in CAP Java and their configuration](../java/cqn-services/persistence-services#database-support){ .learn-more}

## Providing Initial Data

You can use CSV files to fill your database with initial data - see [Location of CSV Files](#location-of-csv-files).

<div class="impl node">

For example, in our [*capire/bookshop*](https://github.com/capire/bookshop/tree/main/db/data) application, we do so for *Books*, *Authors*, and *Genres* as follows:

```zsh
bookshop/
├─ db/
│ ├─ data/ # place your .csv files here
│ │ ├─ sap.capire.bookshop-Authors.csv
│ │ ├─ sap.capire.bookshop-Books.csv
│ │ ├─ sap.capire.bookshop-Books.texts.csv
│ │ └─ sap.capire.bookshop-Genres.csv
│ └─ schema.cds
└─ ...
```
</div>

<div class="impl java">

For example, in our [CAP Samples for Java](https://github.com/SAP-samples/cloud-cap-samples-java/tree/main/db/data) application, we do so for some entities such as *Books*, *Authors*, and *Genres* as follows:

```zsh
db/
├─ data/ # place your .csv files here
│ ├─ my.bookshop-Authors.csv
│ ├─ my.bookshop-Books.csv
│ ├─ my.bookshop-Books.texts.csv
│ ├─ my.bookshop-Genres.csv
│ └─ ...
└─ index.cds
```
</div>


The **filenames** are expected to match fully qualified names of respective entity definitions in your CDS models, optionally using a dash `-` instead of a dot `.` for cosmetic reasons.

### Using `.csv` Files

The **content** of these files is standard CSV content with the column titles corresponding to declared element names, like for `Books`:

::: code-group

```csvc [db/data/sap.capire.bookshop-Books.csv]
ID,title,author_ID,stock
201,Wuthering Heights,101,12
207,Jane Eyre,107,11
251,The Raven,150,333
252,Eleonora,150,555
271,Catweazle,170,22
```

:::

> Note: `author_ID` is the generated foreign key for the managed Association  `author` → learn more about that in the [Generating SQL DDL](#generating-sql-ddl) section.

If your content contains ...

- commas or line breaks → enclose it in double quotes `"..."`
- double quotes → escape them with doubled double quotes: `""...""`

```csvc
ID,title,descr
252,Eleonora,"""Eleonora"" is a short story by Edgar Allan Poe, first published in 1842 in Philadelphia in the literary annual The Gift."
```

::: danger
On SAP HANA, only use CSV files for _configuration data_ that can't be changed by application users.
→ See [CSV data gets overridden in the SAP HANA guide for details](databases-hana#csv-data-gets-overridden).
:::

### Use `cds add data`

Run this to generate an initial set of empty `.csv` files with header lines based on your CDS model:

```sh
cds add data
```

### Location of CSV Files

CSV files can be found in the folders _db/data_ and _test/data_, as well as in any _data_ folder next to your CDS model files. When you use `cds watch` or `cds deploy`, CSV files are loaded by default from _test/data_. However, when preparing for production deployments using `cds build`, CSV files from _test/data_ are not loaded.

::: details Adding initial data next to your data model
The content of these 'co-located' `.cds` files actually doesn't matter, but they need to be included in your data model, through a `using` clause in another file for example.

If you need to use certain CSV files exclusively for your production deployments, but not for tests, you can achieve this by including them in a separate data folder, for example, _db/hana/data_. Create an empty _index.cds_ file in the _hana_ folder. Then, set up this model location in a dummy cds service, for example _hanaDataSrv_, using the `[production]` profile.

```json
"cds": {
  "requires": {
    "[production]": {
      "hanaDataSrv ": { "model": "db/hana" }
     }
  }
}
````

As a consequence, when you run `cds build -–production` the model folder _hana_ is added, but it's not added when you run `cds deploy` or `cds watch` because the development profile is used by default. You can verify this by checking the cds build logs for the hana build task. Of course, this mechanism can also be used for PostgreSQL database deployments.
:::

::: details On SAP HANA ...
CSV and _hdbtabledata_ files found in the _src_ folder of your database module are treated as native SAP HANA artifacts and deployed as they are. This approach offers the advantage of customizing the _hdbtabledata_ files if needed, such as adding a custom `include_filter` setting to mix initial and customer data in one table. However, the downside is that you must redundantly maintain them to keep them in sync with your CSV files.
:::

Quite frequently you need to distinguish between sample data and real initial data. CAP supports this by allowing you to provide initial data in two places:

<div class="impl node">

| Location    | Deployed...          | Purpose                                                  |
| ----------- | -------------------- | -------------------------------------------------------- |
| `db/data`   | always               | initial data for configurations, code lists, and similar |
| `test/data` | if not in production | sample data for tests and demos                          |

</div>

<div class="impl java">

Use the properties [cds.dataSource.csv.*](../java/developing-applications/properties#cds-dataSource-csv) to configure the location of the CSV files. You can configure different sets of CSV files in different [Spring profiles](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#features.profiles). This configuration reads CSV data from `test/data` if the profile `test` is active:

::: code-group

```yaml [srv/src/main/resources/application.yaml]
---
spring:
  config.activate.on-profile: test
cds:
  dataSource.csv.paths:
  - test/data/**
```

:::
</div>





## Querying at Runtime




Most queries to databases are constructed and executed from [generic event handlers of CRUD requests](providing-services#serving-crud), so quite frequently there's nothing to do. The following is for the remaining cases where you have to provide custom logic, and as part of it execute database queries.




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

At runtime, we usually construct queries using the [CQL Query Builder API](../java/working-with-cql/query-api) in a database-agnostic way. For example, queries like this are supported for all databases:

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

Use Spring's [JDBC Template](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jdbc/core/JdbcTemplate.html) to [leverage native database features](../java/cqn-services/persistence-services#jdbctemplate) as follows:

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

[Read more about custom streaming in Node.js.](../node.js/best-practices#custom-streaming-beta){.learn-more}


## Generating DDL Files {#generating-sql-ddl}

<div class="impl node">


When you run your server with `cds watch` during development, an in-memory database is bootstrapped automatically, with SQL DDL statements generated based on your CDS models.

You can also do this manually with the CLI command `cds compile --to <dialect>`.

</div>

<div class="impl java">

When you've created a CAP Java application with `cds init --java` or with CAP Java's [Maven archetype](../java/developing-applications/building#the-maven-archetype), the Maven build invokes the CDS compiler to generate a `schema.sql` file for your target database. In the `default` profile (development mode), an in-memory database is [initialized by Spring](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#howto.data-initialization) and the schema is bootstrapped from the `schema.sql` file.

[Learn more about adding an initial database schema.](../java/cqn-services/persistence-services#initial-database-schema){.learn-more}

</div>

### Using `cds compile`


For example, given these CDS models (derived from [*capire/bookshop*](https://github.com/capire/bookshop)):

::: code-group

```cds [db/schema.cds]
using { Currency } from '@sap/cds/common';
namespace sap.capire.bookshop;

entity Books {
  key ID : UUID;
  title  : localized String;
  descr  : localized String;
  author : Association to Authors;
  price  : {
    amount   : Decimal;
    currency : Currency;
  }
}

entity Authors {
  key ID : UUID;
  name  : String;
  books : Association to many Books on books.author = $self;
}
```
:::
::: code-group

```cds [srv/cat-service.cds]
using { sap.capire.bookshop as my } from '../db/schema';
service CatalogService {
  entity ListOfBooks as projection on Books {
    *, author.name as author
  }
}
```
:::


Generate an SQL DDL script by running this in the root directory containing both *.cds* files:

<div class="impl node">


```sh
cds compile srv/cat-service --to sql --dialect sqlite > schema.sql
```

Output:

::: code-group

```sql [schema.sql]
CREATE TABLE sap_capire_bookshop_Books (
  ID NVARCHAR(36) NOT NULL,
  title NVARCHAR(5000),
  descr NVARCHAR(5000),
  author_ID NVARCHAR(36),
  price_amount DECIMAL,
  price_currency_code NVARCHAR(3),
  PRIMARY KEY(ID)
);

CREATE TABLE sap_capire_bookshop_Authors (
  ID NVARCHAR(36) NOT NULL,
  name NVARCHAR(5000),
  PRIMARY KEY(ID)
);

CREATE TABLE sap_common_Currencies (
  name NVARCHAR(255),
  descr NVARCHAR(1000),
  code NVARCHAR(3) NOT NULL,
  symbol NVARCHAR(5),
  minorUnit SMALLINT,
  PRIMARY KEY(code)
);

CREATE TABLE sap_capire_bookshop_Books_texts (
  locale NVARCHAR(14) NOT NULL,
  ID NVARCHAR(36) NOT NULL,
  title NVARCHAR(5000),
  descr NVARCHAR(5000),
  PRIMARY KEY(locale, ID)
);

CREATE VIEW CatalogService_ListOfBooks AS SELECT
  Books.ID,
  Books.title,
  Books.descr,
  author.name AS author,
  Books.price_amount,
  Books.price_currency_code
FROM sap_capire_bookshop_Books AS Books
LEFT JOIN sap_capire_bookshop_Authors AS author
ON Books.author_ID = author.ID;

--- some more technical views skipped ...
```

:::

</div>


<div class="impl java">

```sh
cds compile srv/cat-service --to sql > schema.sql
```

Output:

::: code-group

```sql [schema.sql]
CREATE TABLE sap_capire_bookshop_Books (
  createdAt TIMESTAMP(7),
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP(7),
  modifiedBy NVARCHAR(255),
  ID INTEGER NOT NULL,
  title NVARCHAR(111),
  descr NVARCHAR(1111),
  author_ID INTEGER,
  genre_ID INTEGER,
  stock INTEGER,
  price DECFLOAT,
  currency_code NVARCHAR(3),
  image BINARY LARGE OBJECT,
  PRIMARY KEY(ID)
);
CREATE TABLE sap_capire_bookshop_Books (
  ID NVARCHAR(36) NOT NULL,
  title NVARCHAR(5000),
  descr NVARCHAR(5000),
  author_ID NVARCHAR(36),
  price_amount DECIMAL,
  price_currency_code NVARCHAR(3),
  PRIMARY KEY(ID)
);

CREATE TABLE sap_capire_bookshop_Authors (
  ID NVARCHAR(36) NOT NULL,
  name NVARCHAR(5000),
  PRIMARY KEY(ID)
);

CREATE TABLE sap_common_Currencies (
  name NVARCHAR(255),
  descr NVARCHAR(1000),
  code NVARCHAR(3) NOT NULL,
  symbol NVARCHAR(5),
  minorUnit SMALLINT,
  PRIMARY KEY(code)
);

CREATE TABLE sap_capire_bookshop_Books_texts (
  locale NVARCHAR(14) NOT NULL,
  ID NVARCHAR(36) NOT NULL,
  title NVARCHAR(5000),
  descr NVARCHAR(5000),
  PRIMARY KEY(locale, ID)
);

CREATE VIEW CatalogService_ListOfBooks AS SELECT
  Books_0.createdAt,
  Books_0.modifiedAt,
  Books_0.ID,
  Books_0.title,
  Books_0.author,
  Books_0.genre_ID,
  Books_0.stock,
  Books_0.price,
  Books_0.currency_code,
  Books_0.image
FROM CatalogService_Books AS Books_0;
CREATE VIEW CatalogService_ListOfBooks AS SELECT
  Books.ID,
  Books.title,
  Books.descr,
  author.name AS author,
  Books.price_amount,
  Books.price_currency_code
FROM sap_capire_bookshop_Books AS Books
LEFT JOIN sap_capire_bookshop_Authors AS author
ON Books.author_ID = author.ID;

--- some more technical views skipped ...
```

:::

</div>

::: tip
Use the specific SQL dialect (`hana`, `sqlite`, `h2`, `postgres`) with `cds compile --to sql --dialect <dialect>` to get DDL that matches the target database.
:::


### Rules for Generated DDL

A few observations on the generated SQL DDL output:

1. **Tables / Views** — Declared entities become tables, projected entities become views.
2. **Type Mapping** — [CDS types are mapped to database-specific SQL types](../cds/types).
3. **Slugified FQNs** — Dots in fully qualified CDS names become underscores in SQL names.
4. **Flattened Structs** — Structured elements like `Books:price` are flattened with underscores.
5. **Generated Foreign Keys** — For managed to-one Associations, foreign key columns are created. For example, this applies to `Books:author`.





In addition, you can use the following annotations to fine-tune generated SQL.



### @cds.persistence.skip

Add `@cds.persistence.skip` to an entity to indicate that this entity should be skipped from generated DDL scripts, and also no SQL views to be generated on top of it:

```cds
@cds.persistence.skip
entity Foo {...}                 //> No SQL table will be generated
entity Bar as select from Foo;   //> No SQL view will be generated
```



### @cds.persistence.exists

Add `@cds.persistence.exists` to an entity to indicate that this entity should be skipped from generated DDL scripts. In contrast to `@cds.persistence.skip` a database relation is expected to exist, so we can generate SQL views on top.

```cds
@cds.persistence.exists
entity Foo {...}                 //> No SQL table will be generated
entity Bar as select from Foo;   //> The SQL view will be generated
```

::: details On SAP HANA ...

If the respective entity is a user-defined function or a calculation view, one of the annotations `@cds.persistence.udf` or `@cds.persistence.calcview` also needs to be assigned. See [Calculated Views and User-Defined Functions](../advanced/hana#calculated-views-and-user-defined-functions) for more details.

:::



### @cds.persistence.table

Annotate an entity with `@cds.persistence.table` to create a table with the effective signature of the view definition instead of an SQL view.

```cds
@cds.persistence.table
entity Foo as projection on Bar {...}
```

> All parts of the view definition not relevant for the signature (like `where`, `group by`, ...) are ignored.

Use case for this annotation: Use projections on imported APIs as replica cache tables.



### @sql.prepend / append

Use `@sql.prepend` and `@sql.append` to add native SQL clauses to before or after generated SQL output of CDS entities or elements.

Example:

````cds
@sql.append: ```sql
  GROUP TYPE foo
  GROUP SUBTYPE bar
```
entity E { ...,
  @sql.append: 'FUZZY SEARCH INDEX ON'
  text: String(100);
}

@sql.append: 'WITH DDL ONLY'
entity V as select from E { ... };
````

Output:

```sql
CREATE TABLE E ( ...,
  text NVARCHAR(100) FUZZY SEARCH INDEX ON
) GROUP TYPE foo
GROUP SUBTYPE bar;

CREATE VIEW V AS SELECT ... FROM E WITH DDL ONLY;
```

The following rules apply:

- The value of the annotation must be a [string literal](../cds/cdl#multiline-literals).

- The compiler doesn't check or process the provided SQL snippets in any way. You're responsible to ensure that the resulting statement is valid and doesn't negatively impact your database or your application. We don't provide support for problems caused by using this feature.

- If you refer to a column name in the annotation, you need to take care of
  a potential name mapping yourself, for example, for structured elements.

- Annotation `@sql.prepend` is only supported for entities translating to tables. It can't be used with views or with elements.
- For SAP HANA tables, there's an implicit `@sql.prepend: 'COLUMN'` that is overwritten by an explicitly provided `@sql.prepend`.

* Both `@sql.prepend` and `@sql.append` are disallowed in SaaS extension projects.

If you use native database clauses in combination with `@cds.persistence.journal`, see [Schema Evolution Support of Native Database Clauses](databases-hana#schema-evolution-native-db-clauses).



#### Creating a Row Table on SAP HANA

By using `@sql.prepend: 'ROW'`, you can create a row table:

```cds
@sql.prepend: 'ROW'
entity E {
  key id: Integer;
}
```

Run `cds compile - 2 hdbtable` on the previous sample and this is the result:

```sql [E.hdbtable]
ROW TABLE E (
  id INTEGER NOT NULL,
  PRIMARY KEY(id)
)
```

[Learn more about Columnar and Row-Based Data Storage](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-administration-guide/columnar-and-row-based-data-storage){.learn-more}
### Reserved Words

The CDS compiler and CAP runtimes provide smart quoting for reserved words in SQLite and in SAP HANA so that they can still be used in most situations. But in general reserved words can't be used as identifiers. The list of reserved words varies per database.

Find here a collection of resources on selected databases and their reference documentation:

* [SAP HANA SQL Reference Guide for SAP HANA Platform (Cloud Version)](https://help.sap.com/docs/HANA_SERVICE_CF/7c78579ce9b14a669c1f3295b0d8ca16/28bcd6af3eb6437892719f7c27a8a285.html)
* [SAP HANA SQL Reference Guide for SAP HANA Cloud](https://help.sap.com/docs/HANA_CLOUD_DATABASE/c1d3f60099654ecfb3fe36ac93c121bb/28bcd6af3eb6437892719f7c27a8a285.html)
* [SQLite Keywords](https://www.sqlite.org/lang_keywords.html)
* [H2 Keywords/Reserved Words](https://www.h2database.com/html/advanced.html#keywords)
* [PostgreSQL SQL Key Words](https://www.postgresql.org/docs/current/sql-keywords-appendix.html)

[There are also reserved words related to SAP Fiori.](../advanced/fiori#reserved-words){.learn-more}





## Database Constraints

### Not Null

You can specify that a column's value must not be `NULL` by adding the [`not null` constraint](../cds/cdl#null-values) to the element, for example:

```cds
entity Books {
  key ID: Integer;
  title: String not null;
}
```


### Unique

Annotate an entity with `@assert.unique.<constraintName>`, specifying one or more element combinations to enforce uniqueness checks on all CREATE and UPDATE operations. For example:

```cds
@assert.unique: {
  locale: [ parent, locale ],
  timeslice: [ parent, validFrom ],
}
entity LocalizedTemporalData {
  key record_ID : UUID; // technical primary key
  parent    : Association to Data;
  locale    : String;
  validFrom : Date;
  validTo : Date;
}
```
{.indent}

The value of the annotation is an array of paths referring to elements in the entity. These elements may be of a scalar type, structs, or managed associations. Individual foreign keys or unmanaged associations are not supported.

If structured elements are specified, the unique constraint will contain all columns stemming from it. If the path points to a managed association, the unique constraint will contain all foreign key columns stemming from it.
::: tip
You don't need to specify `@assert.unique` constraints for the primary key elements of an entity as these are automatically secured by a SQL `PRIMARY KEY` constraint.
:::

### Foreign Keys

The information about foreign key relations contained in the associations of CDS models can be used to generate foreign key constraints on the database tables. Within CAP, referential consistency is established only at commit. The ["deferred" concept for foreign key constraints](https://www.sqlite.org/foreignkeys.html) in SQL databases allows the constraints to be checked and enforced at the time of the [COMMIT statement within a transaction](https://www.sqlite.org/lang_transaction.html) rather than immediately when the data is modified, providing more flexibility in maintaining data integrity.

Enable generation of foreign key constraints on the database with:

<Config>cds.features.assert_integrity = db</Config>

::: warning Database constraints are not supported for H2
Referential constraints on H2 cannot be defined as "deferred", which is needed for database constraints within CAP.
:::

With that switched on, foreign key constraints are generated for managed to-one associations. For example, given this model:

```cds
entity Books {
  key ID : Integer; ...
  author : Association to Authors;
}
entity Authors {
  key ID : Integer; ...
}
```

The following `Books_author` constraint would be added to table `Books`:

```sql
CREATE TABLE Authors (
  ID INTEGER NOT NULL,  -- primary key referenced by the constraint
  ...,
  PRIMARY KEY(ID)
);
CREATE TABLE Books (
  ID INTEGER NOT NULL,
  author_ID INTEGER,    -- generated foreign key field
  ...,
  PRIMARY KEY(ID),
  CONSTRAINT Books_author   -- constraint is explicitly named // [!code focus]
    FOREIGN KEY(author_ID)  -- link generated foreign key field author_ID ...
    REFERENCES Authors(ID)  -- ... with primary key field ID of table Authors
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
    VALIDATED           -- validate existing entries when constraint is created
    ENFORCED            -- validate changes by insert/update/delete
    INITIALLY DEFERRED  -- validate only at commit
)
```

No constraints are generated for...
* Unmanaged associations or compositions
* To-many associations or compositions
* Associations annotated with `@assert.integrity: false`
* Associations where the source or target entity is annotated with `@cds.persistence.exists` or `@cds.persistence.skip`

If the association is the backlink of a **composition**, the constraint's delete rule changes to `CASCADE`.
That applies, for example, to the `parent` association in here:

```cds
entity Genres {
  key ID   : Integer;
  parent   : Association to Genres;
  children : Composition of many Genres on children.parent = $self;
}
```

As a special case, a referential constraint with `delete cascade` is also generated
for the text table of a [localized entity](../guides/localized-data#localized-data),
although no managed association is present in the `texts` entity.

Add a localized element to entity `Books` from the previous example:
```cds
entity Books {
  key ID : Integer; ...
  title : localized String;
}
```

The generated text table then is:
```sql
CREATE TABLE Books_texts (
  locale NVARCHAR(14) NOT NULL,
  ID INTEGER NOT NULL,
  title NVARCHAR(5000),
  PRIMARY KEY(locale, ID),
  CONSTRAINT Books_texts_texts // [!code focus]
    FOREIGN KEY(ID)
    REFERENCES Books(ID)
    ON UPDATE RESTRICT
    ON DELETE CASCADE
    VALIDATED
    ENFORCED
    INITIALLY DEFERRED
)
```

::: warning Database constraints aren't intended for checking user input
Instead, they protect the integrity of your data in the database layer against programming errors. If a constraint violation occurs, the error messages coming from the database aren't standardized by the runtimes but presented as-is.

→ Use [`@assert.target`](providing-services#assert-target) for corresponding input validations.
:::

## Standard Database Functions

A specified set of standard functions - inspired by [OData](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html#sec_StringandCollectionFunctions) and [SAP HANA](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/alphabetical-list-of-functions?locale=en-US) - is supported in a **database-agnostic**, hence portable way. The functions are translated to the best-possible native SQL functions or polyfills during runtime and also during compilation of your CDL files.


### OData standard functions

The `@sap/cds-compiler` and all CAP (Node.js & Java) database services come with out of the box support for common OData functions.

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

  | Parameter | Positive | Negative | Omitted
  | --- | --- | --- | -- |
  | `i` | starts at index `i` | starts `i` positions before the end |
  | `n` | extracts `n` characters | invalid |  extracts until the end of the string

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

#### Aggregate Functions

- `min(x)`, `max(x)`, `sum(x)`, `average(x)`, `count(x)`, `countdistinct(x)`
  Standard aggregate functions used to calculate minimum, maximum, sum, average, count, and distinct count of values.


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

</div>

### Special Runtime Functions

In addition to the OData and SAP HANA standard functions, the **CAP runtimes** provides special functions that are only available for runtime queries:

- `search(x, y)`
  Checks whether `y` is contained in any element of `x` (fuzzy matching may apply).
  See [Searching Data](../guides/providing-services#searching-data) for more details.

- `session_context(<var>)`
  Utilizes standard variable names to maintain session context.
  Refer to [Session Variables](#session-variables) for additional information.

- `now()`
  Returns the current timestamp.

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