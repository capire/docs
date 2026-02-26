# CDL Compilation to Database-Specific DDLs

Databases are deployed based on the entity definitions in your CDS models. This guide explains the internal steps, with a focus on compiling CDS models into database-specific artifacts like SQL `CREATE TABLE` statements for relational databases.
{.abstract}

[toc]:./
[[toc]]

> [!tip] Everything Served Out of the Box
> The CAP framework handles all compilation to DDL automatically, for example when you run `cds watch` or `cds deploy`. You typically do not need to focus on the details unless you want to inspect or customize the generated DDL statements. This guide explains the internal behavior, so if you are in a hurry, you can skip it.



## Using `cds compile`

CDS compilation to database-specific DDLs uses the `cds compile` command, which is part of the [`cds` CLI](../../tools/cds-cli). When you run `cds deploy` or `cds watch`, the command runs automatically to generate the DDL statements for your target database.

You can also run the command manually to view the generated DDL for your models. For example, to inspect the SQL DDL for your full model, run:

```shell
cds compile \* --to sql
```

You can replace the asterisk (`\*`) with specific .cds files or folders to compile only particular parts of your model. Escape the asterisk with a backslash to prevent shell expansion.

```shell
cds compile db/schema.cds --to sql
cds compile db --to sql
```

::: details
You can combine `cds compile` with other shell commands via UNIX pipes for more advanced use cases. For example, count the number of entity definitions in your models like this:

```shell
cds compile \* | grep entity | wc -l
```
:::



### Database-Specific Dialects

Add the `--dialect` option to generate DDL for specific databases. For example, to view the SAP HANA-specific variant, run:

```shell
cds compile \* --to sql --dialect hana
```
You can generate DDL files for different dialects in one run, and compare them in VS Code like this:
```shell
cds compile \* --to sql --dialect sqlite -o _out/c/sqlite.sql
cds compile \* --to sql --dialect h2 -o _out/c/h2.sql
cds compile \* --to sql --dialect hana -o _out/c/hana.sql
cds compile \* --to sql --dialect postgres -o _out/c/postgres.sql
```
```shell
code --diff _out/c/sqlite.sql _out/c/h2.sql
```

> [!tip] CDS models are database-agnostic
> CDS models are designed to be database-agnostic, so you can switch between databases with minimal changes. The `--dialect` option shows how your models translate to database-specific DDLs. \


### Dialects by `cds env` Profiles

The dialect is automatically inferred from your project configuration and the current profile, so you typically do not need to specify it explicitly. For example, if your project is configured to use SAP HANA in production and SQLite in development, the respective dialects are applied automatically.
You can try this using the `--profile` option:

```shell
cds compile \* --to sql --profile development
cds compile \* --to sql --profile production
```

::: details Use `cds env` to check your effective configuration:
```shell
cds env requires.db --profile development
cds env requires.db --profile production
```
:::

> [!tip] Dialects are inferred from profiles automatically
> You typically do not need to specify the `--dialect` option manually, as it is derived from your project configuration and the active profile.



### Using `cds deploy`

You can use `cds deploy` to inspect the generated DDL without deploying it by using the `--dry` option. This prints the final DDL statements to the console instead of running them against the database. For example:

```shell
cds deploy --dry
```

This prints the DDL for the database configured in your project for the current profile.

As with `cds compile` above, you can generate DDL files for different databases in one run, and compare them to the output from `cds compile` like this:

```shell
cds deploy --dry --to sqlite -o _out/d/sqlite.sql
cds deploy --dry --to h2 -o _out/d/h2.sql
cds deploy --dry --to hana  -o _out/d/hana
cds deploy --dry --to postgres -o _out/d/postgres.sql
```
```shell
code --diff _out/c/sqlite.sql _out/d/sqlite.sql
```


::: code-group
```sql [cds deploy output]
DROP TABLE IF EXISTS sap_capire_bookshop_Authors; -- [!code ++]
DROP TABLE IF EXISTS sap_capire_bookshop_Books; -- [!code ++]
DROP TABLE IF EXISTS sap_capire_bookshop_Genres; -- [!code ++]
... -- [!code ++]
CREATE TABLE sap_capire_bookshop_Authors ...;
CREATE TABLE sap_capire_bookshop_Books ...;
CREATE TABLE sap_capire_bookshop_Genres ...;
...
```
```sql [cds compile output]
CREATE TABLE sap_capire_bookshop_Authors ...;
CREATE TABLE sap_capire_bookshop_Books ...;
CREATE TABLE sap_capire_bookshop_Genres ...;
...
```
:::

`cds deploy` calls `cds compile --to sql`, and it also considers deployment-specific aspects, such as:

- **Schema Evolution** – the `diff` shows additional `DROP TABLE` statements. This schema evolution strategy fits development best. For production, more sophisticated strategies apply. Learn more in the [_Schema Evolution_](schema-evolution) guide.

- **Database-Specific Artifacts** – for [SAP HANA](hana), the output of `cds deploy` is not a single SQL DDL script anymore. Instead, it generates a set of `.hdbtable`, `.hdbview`, and other HDI artifacts.

> [!note] Ad-hoc Deployments
> Without the `--dry` option, `cds deploy` not only compiles your CDS models to DDL, but also performs an ad hoc deployment to the target database, if available. For details, see the database-specific guides for [_SAP HANA_](hana), [_SQLite_](sqlite), and [_PostgreSQL_](postgres).



## CDL ⇒ DDL Translation

The CDL-to-DDL compilation follows general mapping principles to translate CDS constructs into database-specific artifacts, as outlined below.



### Entities ⇒ Tables / Views

Declared entities become tables, projected entities become views:

::: code-group
```cds [CDS Source]
entity SomeEntity { ... }
entity SomeView as select from SomeEntity { ... };
entity SomeProjection as projection on SomeEntity { ... };
```
```sql [=> &nbsp; Generated DDL]
CREATE TABLE SomeEntity ( ... );
CREATE VIEW SomeView AS SELECT ... FROM SomeEntity;
CREATE VIEW SomeProjection AS SELECT ... FROM SomeEntity;
```
:::

> [!tip] Views are defined using CQL
> Both views defined with `as projection on` and those defined with `as select from` use CQL, which supports a broad scope of database-agnostic features. Learn more in [_CQL Compilation to SQL_](cap-level-dbs).

#### Qualified Names ⇒ Slugified

Entities in CDS models have fully qualified names with dots. These are converted to database-native names by replacing dots with underscores. This is called slugification:

::: code-group
```cds [CDS Source]
namespace sap.capire.bookshop;
entity Books { ... }
entity Books.Details { ... }
```
:::

::: code-group
```sql[=> Generated DDL]
CREATE TABLE sap_capire_bookshop_Books ( ... );
CREATE TABLE sap_capire_bookshop_Books_Details ( ... );
```
:::

> [!tip] Guaranteed and stable slugification
> The slugification effects are guaranteed and stable, so you can rely on them and use the slugified names in native SQL queries. For example, both of the following CQL queries are equivalent and work as expected:

```js
await cds.run `SELECT from sap.capire.bookshop.Books`
await cds.run `SELECT from sap_capire_bookshop_Books`
```

> [!tip]
> Prefer entity names like `Books.Details` over _CamelCase_ variants like `BooksDetails`. Both work, but they show up differently in tools for databases that do not preserve case. For example, in SAP HANA, the former shows as `BOOKS_DETAILS`, while the latter shows as `BOOKSDETAILS`, which is harder to read.




### Types ⇒ Native Types

[CDS types](../../cds/types) are mapped to database-specific SQL types based on the target database dialect, as outlined in the table below:

<style>
  #types-mapping table td { font-size: 90%; font-style: italic; font-weight: 500; white-space: nowrap; }
  #types-mapping table td + td { font-size: 77%; font-weight: 400; }
  #types-mapping table td + td +td { font-size: 77%; }
  #types-mapping table td + td +td + td { font-size: 77%; }
</style>
<span id="types-mapping">

| CDS Type    | SAP HANA      | SQLite        | H2          | PostgreSQL   |
|---------------|-----------------|-------------------|-----------------|---------------|
| UUID       | NVARCHAR(36)   | NVARCHAR(36)    | NVARCHAR(36)   | NVARCHAR(36)  |
| String      | NVARCHAR(5e3)  | NVARCHAR(255)    | NVARCHAR(255)  | NVARCHAR(255) |
| String (n)   | NVARCHAR(n)    | NVARCHAR(n)     | NVARCHAR(n)    | NVARCHAR(n)  |
| Boolean     | BOOLEAN      | BOOLEAN        | BOOLEAN      | BOOLEAN     |
| Integer     | INTEGER      | INTEGER        | INTEGER      | INTEGER     |
| Int16      | SMALLINT      | SMALLINT       | SMALLINT      | SMALLINT    |
| Int32      | INTEGER      | INTEGER        | INTEGER      | INTEGER     |
| Int64      | BIGINT       | BIGINT        | BIGINT       | BIGINT      |
| UInt8      | TINYINT      | TINYINT        | SMALLINT      | SMALLINT    |
| Decimal (p,s) | DECIMAL(p,s)   | DECIMAL(p,s)    | DECIMAL(p,s)   | DECIMAL(p,s)  |
| Decimal     | DECIMAL      | DECIMAL        | DECFLOAT      | DECIMAL     |
| Double      | DOUBLE       | DOUBLE        | DOUBLE       | FLOAT8      |
| DateTime    | SECONDDATE    | DATETIME_TEXT    | TIMESTAMP(0)   | TIMESTAMP    |
| Date       | DATE        | DATE_TEXT      | DATE        | DATE       |
| Time       | TIME        | TIME_TEXT      | TIME        | TIME       |
| Timestamp    | TIMESTAMP     | TIMESTAMP_TEXT   | TIMESTAMP(7)   | TIMESTAMP    |
| Binary      | VARBINARY(5e3) | BINARY_BLOB(5e3) | VARBINARY(5e3) | BYTEA      |
| Binary (n)   | VARBINARY(n)   | BINARY_BLOB(n)   | VARBINARY(n)   | BYTEA      |
| LargeBinary  | BLOB        | BLOB          | BIN. LARGE OBJ. | BYTEA      |
| LargeString  | NCLOB        | NCLOB         | NCLOB        | TEXT       |
| Map        | NCLOB        | JSON_TEXT      | JSON        | JSONB      |
| Vector      | REAL_VECTOR    |             |            |          |

</span>

[Refer to _CDS Types Documentation_ for a specification of the CDS types.](../../cds/types){.learn-more}

Custom-defined types based on built-in CDS types are mapped according to their base type:

::: code-group
```cds [CDS Source]
entity Foo { bar : Text(44); }
type Text : String(111);
```
```sql [=> &nbsp; Generated DDL]
CREATE TABLE Foo ( bar NVARCHAR(44) );
```
:::



### Structs ⇒ Flattened
###### flattened-structs

Elements with [structured types](../../cds/cdl#structured-types) are flattened into their parent entities, with the struct name used as a prefix for the contained elements:

::: code-group
```cds [CDS Source]
entity Books {
  title : String;
  price : {
   amount  : Decimal;
   currency : String(3);
  }
}
```
:::
::: code-group
```sql [=> &nbsp; Generated DDL]
CREATE TABLE Books (
  title       NVARCHAR(255),
  price_amount  DECIMAL,
  price_currency NVARCHAR(3)
);
```
:::

> [!tip] Guaranteed and stable flattening
> The flattening effects are guaranteed and stable, so you can rely on them and use the flattened elements in native SQL queries. For example, both of the following CQL queries are equivalent and work as expected:

```js
await cds.run `SELECT price.amount from Books`
await cds.run `SELECT price_amount from Books`
```


### Associations ⇒ JOINs


Given this CDS model with both [managed](../../cds/cdl#managed-associations) to-one and [unmanaged](../../cds/cdl#unmanaged-associations) to-many associations, as in the [_@capire/bookshop_](https://github.com/capire/bookshop) sample:

```cds
entity Books { ...
  author : Association to Authors; // managed
  genre  : Association to Genres; // managed
}
entity Authors { ...
  books : Association to many Books on books.author = $self;
}
entity Genres { ... }
```

Managed associations are _unfolded_ into unmanaged ones as follows:

```cds
entity Books { ... // with managed associations unfolded to:
  author : Association to Authors on author_ID = author.ID;
  author_ID : Integer; // added foreign key element
  genre : Association to Genres on genre_ID = genre.ID;
  genre_ID : Integer; // added foreign key element
}
entity Authors {/* as above */}
entity Genres {/* as above */}
```

This unfolded model is then compiled to DDL, with unmanaged associations **skipped**:

```sql
CREATE TABLE Authors (/* no columns for unmanaged assocs */... )
CREATE TABLE Books (/* no columns for unmanaged assocs */ ...
  author_ID INTEGER -- added foreign key column
  genre_ID  INTEGER -- added foreign key column
);
```

###### Associations as Forward-declared JOINs

CQL queries that use such associations, for example:

::: code-group
```sql [CQL query using associations]
SELECT title, author.name, genre.name from Books
/* Note: use author and genre like table aliases */
```
:::

Are enhanced with JOINs based on the association definitions:

::: code-group
```sql [=>&nbsp; Compiled SQL query]
SELECT title, author.name, genre.name from Books --> same as above
LEFT JOIN Authors as author on author_ID = author.ID; -- [!code ++]
LEFT JOIN Genres as genre on genre_ID = genre.ID; -- [!code ++]
```
:::

> [!note] Associations as <i>Forward-declared JOINs</i>
> Looking closely at the compiled SQL, you can treat associations like _forward-declared JOINs_:
>
> - One, association names `a.name` appear in queries as standard _table aliases_.
> - Two, _JOINs_ are added automatically based on the following construction rule:
>
> _JOIN `a.target` as `a.name` on `a.on`_
> {style="margin: 1em 3em; font-weight: 600;"}
>
> - Three, for _managed_ associations with unfolded on conditions:
>
> _JOIN `a.target` as `a.name` on `a.keys` = `a.name` . `a.target.keys`_
> {style="margin: 1em 3em; font-weight: 600;"}
>
>  where `a` is an association definition with these properties:
>  <br/> `a.target` – the target entity name
>  <br/> `a.name` – the association name
>  <br/> `a.on` – the on condition of an unmanaged association
>  <br/> `a.keys` – the foreign key element(s), added to the source entity
>  <br/> `a.target.keys` – the target's respective primary key element(s)


### Calculated Elements

[_Materialized_ calculated elements](../../cds/cdl#on-write), which have a trailing `stored` keyword, are translated into corresponding database columns with `GENERATED ALWAYS AS` clauses. In contrast, [_virtual_ calculated elements](../../cds/cdl#on-read) are not represented in the database schema and are applied at runtime by the CAP database layers when reading data from the database.

::: code-group
```cds [CDS Source]
entity Orders {
 quantity : Integer;
 price : Decimal;
 total : Decimal = price * quantity stored; // [!code focus]
 gross : Decimal = total * (1+VAT); // virtual // [!code focus]
}
```
:::
::: code-group
```sql [=> &nbsp; Generated DDL]
CREATE TABLE Orders (
  quantity INTEGER,
  price DECIMAL,
  total DECIMAL GENERATED ALWAYS AS (price * quantity) STORED -- [!code focus]
);
```
:::

[_Virtual_ calculated elements](../../cds/cdl#on-read) are applied at runtime whenever data is read from the database. For example, a CQL query like this:

::: code-group
```sql [CQL source query]
SELECT total, gross from Orders;
```
:::

would be compiled to the following SQL query:

::: code-group
```sql [=>&nbsp; Compiled SQL query]
SELECT total, total * (1+VAT) as gross from Orders;
```
:::


### Virtual Elements

[Virtual elements](../../cds/cdl#virtual-elements) are not represented in the database schema at all, similar to virtual calculated elements above. They exist only at the CAP runtime layer, and are typically used to represent data coming from external services or other non-persistent sources.


### Default Values

You can specify default values for elements using the `default` keyword in element definitions. These defaults are translated into SQL `DEFAULT` clauses in the generated DDL in a one-to-one manner.

::: code-group
```cds [CDS Source]
entity Books {
  available : Boolean default true;
  createdAt : DateTime default current_timestamp;
}
```
```sql [=> &nbsp; Generated DDL]
CREATE TABLE Books (
  available BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT current_timestamp
);
```
:::

> [!tip] Consider using <code>@cds.on.insert</code> instead
> Instead of using `default` values, consider using the [`@cds.on.insert`](../domain/index#cds-on-insert) annotation. It provides more flexibility and fits typical application scenarios.


### Invalid Names

When you use names in your CDS models that conflict with reserved words of underlying databases, or names that contain non-ASCII characters, special characters, or spaces, these names are considered invalid in many databases. CAP escapes these names in the generated DDL and all queries sent to the database.

For example, the following is a valid CDS model with database-invalid named elements. The generated DDL escapes them with double quotes:

::: code-group
```cds [CDS Source]
entity BadNames {
  ![a name] : String;  // invalid whitespaces
  ![drôle]  : String;  // invalid diacritics
  ![select] : String;  // reserved word in SQL and CDS
  group    : String;  // reserved word in SQL
}
```
```sql [=> &nbsp; Generated DDL]
CREATE TABLE BadNames (
  "a name" NVARCHAR(255),
  "drôle"  NVARCHAR(255),
  "select" NVARCHAR(255),
  "group"  NVARCHAR(255)
);
```
:::

CAP allows this and handles all accesses correctly. Even so, it is strongly discouraged to use such names in your CDS models because it can lead to unexpected issues in scenarios outside CAP control, such as native SQL queries, third-party tools, or integration with non-CAP applications.

> [!warning] Do not use database-invalid names
> It is **strongly discouraged** to use names that contain non-ASCII characters or conflict with database reserved words. Avoid [delimited names](../../cds/cdl#keywords-identifiers) in CDS models because they reduce readability.

###### reserved-words
> [!tip] Lists of Reserved Words
> Check the reserved words for the databases you are targeting: \
> [_SAP HANA_](https://help.sap.com/docs/HANA_CLOUD_DATABASE/c1d3f60099654ecfb3fe36ac93c121bb/28bcd6af3eb6437892719f7c27a8a285.html)
> , [_SQLite_](https://www.sqlite.org/lang_keywords.html)
> , [_H2_](https://www.h2database.com/html/advanced.html#keywords)
> , [_PostgreSQL_](https://www.postgresql.org/docs/current/sql-keywords-appendix.html)




## Keys, Constraints
###### Database Constraints

CAP supports the generation of various database constraints based on CDS model definitions, as outlined below.


::: warning Do not use for end-user input validation
Database constraints protect against data corruption due to programming errors and are not intended for application-level input validation.
If a constraint violation occurs, the error messages from the database are not standardized by the runtimes and are presented as-is.
:::

### Primary Key Constraints

The compiler translates primary keys defined in CDS entities into SQL `PRIMARY KEY` constraints in the generated DDL. For example:

::: code-group
```cds [CDS Source]
entity OrderItems {
  key order: Association to Orders;
  key pos: Integer;
  ...
}
```
:::

::: code-group
```sql [=> &nbsp; Generated DDL]
CREATE TABLE OrderItems (
  order_ID NVARCHAR(36),
  pos INTEGER,
  ...
  PRIMARY KEY (order_ID, pos)    -- [!code focus]
);
```
:::


### Not Null Constraints

You can specify that a column value must not be `NULL` by adding the [`not null` constraint](../../cds/cdl#null-values) to the element. For example:

```cds
entity Books { ...
  title: String not null;
}
```

> [!tip] Consider using <code>@mandatory</code> instead
> Instead of, or in addition to, using database-level `not null` constraints, consider using the [`@mandatory`](../services/constraints#mandatory) annotation. It provides more flexibility and fits typical application scenarios.


### Unique Constraints

Annotate an entity with `@assert.unique.<constraint>` to express one or more named uniqueness checks on a combination of columns. These are translated to SQL `UNIQUE` constraints in the generated DDL.

For example, given an entity definition like this:
```cds
entity OrderItems { ...
  order : Association to Orders;
  product : Association to Products;
}
```

Use `@assert.unique` to ensure that each product appears only once per order:

```cds [CDS Source]
annotate OrderItems with @assert.unique.product: [ order, product ];
```

Which would translate to the following SQL `UNIQUE` constraint in the generated DDL:

```sql [=> &nbsp; Generated DDL]
CREATE TABLE OrderItems (
  ...
  CONSTRAINT OrderItems_products UNIQUE (order_ID, product_ID)    -- [!code focus]
);
```

Multiple named unique constraints per entity are supported, for example:

```cds [CDS Source]
annotate OrderItems with @assert.unique.product: [ order, product ];
annotate OrderItems with @assert.unique.someOtherConstraint: [ ... ];
```

- The `<constraint>` name in `@assert.unique.<constraint>` becomes the database constraint name.

- The argument is expected to be an array of flat [element references](../../cds/cdl#annotation-values) referring to elements in the entity. These elements may have the following types:

  - scalar types - `String`, `Integer`, and so on
  - structured types – **not** elements _within_ structs.
  - _managed_ associations – **not** _unmanaged_ associations.

- For structs, all [flattened columns](#flattened-structs) stemming from the struct are included. For managed associations, all foreign key columns are included.

::: tip Primary Keys are Unique Constraints
You do not need to specify `@assert.unique` constraints for the [primary keys](#primary-key-constraints) of an entity because a SQL `PRIMARY KEY` constraint already enforces uniqueness.
:::


### Foreign Key Constraints

[managed to-one associations]: ../../cds/cdl#managed-to-one-associations

For [managed to-one associations], CAP can automatically generate foreign key constraints in the database. Enable this globally with the config option <Config>cds.features.assert_integrity = db</Config>.

With this setting, `FOREIGN KEY` constraints are added to `CREATE TABLE` statements for [managed to-one associations] like this:

::: code-group
```cds [CDS Source]
entity Books {
  author : Association to Authors;
}
```
:::
::: code-group
```sql [=> &nbsp; Generated DDL]
CREATE TABLE Books ( ...
  ID INTEGER NOT NULL,
  author_ID INTEGER,       -- added foreign key field
  CONSTRAINT Books_author  -- added foreign key constraint
   FOREIGN KEY(author_ID)
   REFERENCES Authors(ID)
   ON UPDATE RESTRICT
   ON DELETE RESTRICT
   VALIDATED
   ENFORCED
   INITIALLY DEFERRED
)
```
:::

> [!tip] Consider using <code>@assert.target</code> instead
> Database constraints protect against data corruption due to programming errors. Prefer using [`@assert.target`](../services/constraints#assert-target) for application-level input validation. It fits typical application scenarios and provides error messages tailored for end users.

#### Skipping with `@assert.integrity:false`

You can skip foreign key constraint generation for specific associations by annotating them with `@assert.integrity:false`. For example:

```cds
entity Books {
  author : Association to Authors @assert.integrity:false;
}
```


#### Deferred Enforcement

Referential integrity is enforced at the time of transaction commit. This uses the database's [deferred foreign key constraints](https://www.sqlite.org/foreignkeys.html), which are supported by most relational databases, including SAP HANA, SQLite, and PostgreSQL. However, H2 does not support deferred constraints:

> [!note]  Database constraints are not supported for H2



## Customizing Options

You can customize the generated DDL using specific CDS annotations, as outlined below.

### @cds.persistence.skip

Annotate an entity with `@cds.persistence.skip` to indicate that this entity should be skipped from generated DDL scripts. No SQL views are generated on top of it:

::: code-group
```cds [CDS Source]
entity Foo {...}
entity Bar as select from Foo;
annotate Foo with @cds.persistence.skip;
```
```sql [=> &nbsp; Generated DDL]
CREATE TABLE Foo ( ... )); -- skipped [!code --]
CREATE VIEW Bar AS SELECT ... FROM Foo; -- skipped [!code --]
```
:::



### @cds.persistence.exists

Annotate an entity with `@cds.persistence.exists` to indicate that this entity should be skipped from generated DDL scripts. In contrast to `@cds.persistence.skip`, a database table or view is expected to exist, so SQL views are generated on top.

::: code-group
```cds [CDS Source]
entity Foo {...}
entity Bar as select from Foo;
annotate Foo with @cds.persistence.exists;
```
```sql [=> &nbsp; Generated DDL]
CREATE TABLE Foo ( ... )); -- skipped, but expected to exist [!code --]
CREATE VIEW Bar AS SELECT ... FROM Foo; -- generated as usual
```
:::

::: details On SAP HANA
When using `@cds.persistence.exists` for the following, add the related annotations:

- User-defined functions (UDFs), annotate it with `@cds.persistence.udf` in addition.
- Calculation views, annotate it with `@cds.persistence.calcview` in addition.

Refer to [Calculated Views and User-Defined Functions](./hana-native#calculated-views-and-user-defined-functions) for more details.
:::



### @cds.persistence.table

Annotate a view entity with `@cds.persistence.table` to create a table with the effective signature of the view definition instead of an SQL view.

::: code-group
```cds [CDS Source]
entity Foo { key ID : Integer; tag : String; foo : Timestamp; }
entity Bar as select from Foo { ID, tag, true as bar : Boolean; };
annotate Bar with @cds.persistence.table;
```
```sql [=> &nbsp; Generated DDL]
CREATE TABLE Foo ( ID INTEGER, tag NVARCHAR(255), foo TIMESTAMP );
CREATE TABLE Bar ( ID INTEGER, tag NVARCHAR(255), bar BOOLEAN ); -- [!code ++]
CREATE VIEW Bar AS SELECT ... FROM Foo; -- skipped [!code --]
```
:::

> [!note] Irrelevant parts are ignored
> All parts of the view definition not relevant for the signature, such as `where`, `group by`, `having`, `order by`, or `limit`, are ignored.

> [!tip] Use Case: Replica Caching Tables
A common use case for this annotation is to create projections on entities from imported APIs, which are called _consumption views_, and at the same time use them as replica cache tables.



### `@sql.prepend / append`

Annotate entities or elements with `@sql.prepend` and `@sql.append` to add native SQL clauses before or after the generated SQL output.

::: code-group
```cds [CDS Source]
entity Books { ..., title: String }
entity ListOfBooks as select from Books { ... };

annotate Books:title with @sql.append: 'FUZZY SEARCH INDEX ON';
annotate Books with @sql.append: ```sql
  GROUP TYPE foo
  GROUP SUBTYPE bar
```;
annotate ListOfBooks with @sql.append: 'WITH DDL ONLY';
```

```sql [=> &nbsp; Generated DDL]
CREATE TABLE Books ( ...,
  title NVARCHAR(100) FUZZY SEARCH INDEX ON
) GROUP TYPE foo
GROUP SUBTYPE bar;
CREATE VIEW ListOfBooks AS SELECT ... FROM Books WITH DDL ONLY;
```
:::

- Values for the annotations must be [string literals](../../cds/cdl#literals) or [multiline string literals](../../cds/cdl#multiline-literals).
- `@sql.prepend` is only supported for entities translating to tables. It cannot be used with views or elements.

> [!note] Note for SAP HANA
> Review [Schema Evolution Support of Native Database Clauses](hana#schema-evolution-native-db-clauses) if you plan to use these annotations in combination with [`@cds.persistence.journal`](hana#enabling-hdbmigrationtable-generation).

> [!caution]
> The content of these annotations is inserted as-is into the generated DDL statements without validation or other processing by the compiler. Use this feature with caution, as incorrect SQL clauses may lead to deployment failures or runtime errors. You are responsible for ensuring that the resulting statement is valid and does not negatively impact your database or application. **Support is not available for problems caused by using this feature.**



#### Column vs Row Tables on SAP HANA

CAP creates columnar tables by default on SAP HANA, which is accomplished by an implicit `@sql.prepend:'COLUMN'` applied to all entities translating to tables. You can override this by using `@sql.prepend:'ROW'` to create a row table instead.

::: warning
Whenever you use `@sql.prepend`, the default `@sql.prepend:'COLUMN'` is overridden.
:::



## Database-Specific Models

All the above translations are designed to be portable across different SQL databases supported by CAP. In some scenarios, you may need to add database-specific definitions. You can do this by using database-specific subfolders in your `./db` folder and configuring your project to use these submodels based on the target database as follows:

- First, add database-specific models in the respective subfolders of `./db`:

   ::: code-group
   ```cds [db/sqlite/native.cds]
   using { AdminService } from '@capire/bookshop';
   extend projection AdminService.Authors with {
      strftime('%Y',dateOfDeath)-strftime('%Y',dateOfBirth) as age : Integer
   }
   ```
   ```cds [db/hana/native.cds]
   using { AdminService } from '@capire/bookshop';
   extend projection AdminService.Authors with {
      YEARS_BETWEEN(dateOfBirth, dateOfDeath) as age : Integer
   }
   ```
   :::

- Second, add [profile-specific configuration](../../node.js/cds-env#profiles) to use these database-specific extensions:

   ```json
   { "cds": { "requires": {
     "db": {
       "[development]": { "model": "db/sqlite" },
       "[production]": { "model": "db/hana" }
     }
   }}}
   ```

You can find that sample in [@capire/bookstore](https://github.com/capire/bookstore/tree/main/db).
