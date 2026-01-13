# Schema Evolution

Schema evolution is the capability of a database to adapt its schema (tables, columns, indexes, constraints, etc.) to changes in the data model over time, without losing existing data. CAP provides built-in support for schema evolution across the supported databases, allowing developers to modify their CDS models and have the underlying database schema updated accordingly.
{.abstract}

[[toc]]


## Drop-Create in Development

During development, schema evolution is typically handled using a "drop-create" strategy, where the existing databases or schemas are dropped and recreated based on the current CDS model. This approach is simple and effective, and most suitable for development phases, as it:

- allows developers to quickly iterate on their data models 
- with incompatible changes being the standard, such as
- adding, removing, or renaming entities and fields

We see that in action when running `cds deploy`, which generates the necessary SQL statements to drop existing tables and recreate them or new ones according to the current CDS definitions:

```shell
cds deploy --dry
```
```sql [=> output]
DROP TABLE IF EXISTS sap_capire_bookshop_Authors; 
DROP TABLE IF EXISTS sap_capire_bookshop_Books; 
DROP TABLE IF EXISTS sap_capire_bookshop_Genres; 
... 
CREATE TABLE sap_capire_bookshop_Authors ...;
CREATE TABLE sap_capire_bookshop_Books ...;
CREATE TABLE sap_capire_bookshop_Genres ...;
...
```

This is also what happens automatically when running `cds watch` during development.

In addition to dropping and recreating tables in-place, you can and should also drop and recreate the entire database or schema, depending on the database system in use. This ensures a clean state that fully reflects the current CDS model.


## Schema Evolution by CAP


In production environments, a drop-create strategy is not feasible, as it would result in data loss. CAP provides mechanisms to handle schema evolution in a more controlled manner, by generating migration scripts that can be reviewed and applied to the database. 

Let's simulate the workflow with the [@capire/bookshop](https://github.com/capire/bookshop) example. 

1. Capture the current state of the database schema:
   ```shell
   cds deploy --dry --model-only -o former.csn
   ```

2. Make changes to our models, for example let's edit `db/schema.cds` like this:

   ::: code-group
   ```cds [db/schema.cds]
   entity Books { ...
      title : localized String(300);     //> increase length to 300
      foo : Association to Foo;          //> add a new relationship // [!code ++]
      bar : String;                      //> add a new element // [!code ++]
   }
   entity Foo { key ID: UUID }           //> add a new entity // [!code ++]
   ```
   :::

3. Generate a migration script based on the differences between the former and the current model:

   ```sh
   cds deploy --script --delta-from former.csn -o migration.sql
   ```

4. Inspect the generated SQL statements, which should look like this:
   ::: code-group

   ```sql:line-numbers {13,14} [delta.sql]
   -- Drop Affected Views
   DROP VIEW localized_CatalogService_ListOfBooks;
   DROP VIEW localized_CatalogService_Books;
   DROP VIEW localized_AdminService_Books;
   DROP VIEW CatalogService_ListOfBooks;
   DROP VIEW localized_sap_capire_bookshop_Books;
   DROP VIEW CatalogService_Books_texts;
   DROP VIEW AdminService_Books_texts;
   DROP VIEW CatalogService_Books;
   DROP VIEW AdminService_Books;

   -- Alter Tables for New or Altered Columns
   ALTER TABLE sap_capire_bookshop_Books ALTER title TYPE VARCHAR(300);
   ALTER TABLE sap_capire_bookshop_Books_texts ALTER title TYPE VARCHAR(300);
   ALTER TABLE sap_capire_bookshop_Books ADD foo_ID VARCHAR(36);
   ALTER TABLE sap_capire_bookshop_Books ADD bar VARCHAR(255);

   -- Create New Tables
   CREATE TABLE sap_capire_bookshop_Foo (
     ID VARCHAR(36) NOT NULL,
     PRIMARY KEY(ID)
   );

   -- Re-Create Affected Views
   CREATE VIEW AdminService_Books AS SELECT ... FROM sap_capire_bookshop_Books AS Books_0;
   CREATE VIEW CatalogService_Books AS SELECT ... FROM sap_capire_bookshop_Books AS Books_0 LEFT JOIN sap_capire_bookshop_Authors AS author_1 O ... ;
   CREATE VIEW AdminService_Books_texts AS SELECT ... FROM sap_capire_bookshop_Books_texts AS texts_0;
   CREATE VIEW CatalogService_Books_texts AS SELECT ... FROM sap_capire_bookshop_Books_texts AS texts_0;
   CREATE VIEW localized_sap_capire_bookshop_Books AS SELECT ... FROM sap_capire_bookshop_Books AS L_0 LEFT JOIN sap_capire_bookshop_Books_texts AS localized_1 ON localized_1.ID = L_0.ID AND localized_1.locale = session_context( '$user.locale' );
   CREATE VIEW CatalogService_ListOfBooks AS SELECT ... FROM CatalogService_Books AS Books_0;
   CREATE VIEW localized_AdminService_Books AS SELECT ... FROM localized_sap_capire_bookshop_Books AS Books_0;
   CREATE VIEW localized_CatalogService_Books AS SELECT ... FROM localized_sap_capire_bookshop_Books AS Books_0 LEFT JOIN localized_sap_capire_bookshop_Authors AS author_1 O ... ;
   CREATE VIEW localized_CatalogService_ListOfBooks AS SELECT ... FROM localized_CatalogService_Books AS Books_0;
   ```
   :::

   > [!note]
   > If you use SQLite, `ALTER ... TYPE` commands are not necessary and so, are not supported, as SQLite is essentially typeless. That means, statements for changing the type or length of a column will not show up in migration scripts for SQLite (lines 13,14 above).



### Disallowed Changes

Some changes to the CDS model are considered disallowed in the context of schema evolution, as they could lead to data loss or inconsistencies. Examples of such changes include:

- Renaming entities or fields (instead, add new ones and migrate data)
- Changing data types in incompatible ways (e.g., from String to Integer)
- Removing entities or fields (instead, consider deprecating them first)
- Reducing the length of strings or binary fields
- Reducing the precision of numeric fields

When such disallowed changes are detected during the generation of migration scripts, `cds deploy --script` will print a warning, and also add corresponding comments to the generated SQL script, which can then be reviewed and addressed manually.

For example, if we would rename the `descr` field to `details` like that:

   ::: code-group
   ```cds [db/schema.cds]
   entity Books { ...
      descr : localized String(2000);    //> rename former `descr` ... // [!code --]
      details : localized String(2000);  //> ... to `details` // [!code ++]
   }
   entity Foo { key ID: UUID }           //> add a new entity // [!code ++]
   ```
   :::

... `cds deploy --script` would print warnings like this:

```js
[WARNING] db/schema.cds:4:8: Dropping elements leads to data loss (in entity:“sap.capire.bookshop.Books”/element:“descr”)
[WARNING] db/schema.cds:4:24: Dropping elements leads to data loss (in entity:“sap.capire.bookshop.Books.texts”/element:“descr”)
[WARNING] Found potentially lossy changes - check generated SQL statements
```

And the generated SQL script would contain comments like these:

::: code-group
```sql [delta.sql]
-- [WARNING] this statement is lossy
ALTER TABLE sap_capire_bookshop_Books DROP descr;
-- [WARNING] this statement is lossy
ALTER TABLE sap_capire_bookshop_Books_texts DROP descr;
```
:::


### Automatic Migration

You can enable automatic schema evolution in your `db` configuration:

   ::: code-group
   ```json [package.json]
   { "cds": { "requires": {
      "db": {
         "kind": "sqlite",
         "credentials": { "url": "db.sqlite" },
         "schema_evolution": "auto" // [!code focus]
      }
   }}}
   ```
   :::

This will enable automatic schema migration when running `cds deploy` in production-like environments as follows:

- Whenever a `cds deploy` is executed successfully, the resulting state of the database schema is stored in an internal table.

- Before applying any changes, CAP compares the new state of the CDS models with the stored state. Any differences are translated into appropriate SQL statements to migrate the schema.

> [!important] 
> Only non-lossy changes are applied automatically. If lossy changes are detected, `cds deploy` will abort with respective errors and include comments in the generated SQL script, similar to the general approach described above.


## Schema Evolution by HDI

When deploying to SAP HANA, the so-called HANA Deployment Infrastructure (HDI) handles schema evolution automatically. 

HDI manages the lifecycle of database artifacts and applies necessary schema changes based on the deployed CDS models. This includes creating, altering, or dropping database objects as needed to align with the current CDS model.

Learn more about that in the [SAP HANA](hana.md) guide, section [HDI Schema Evolution](hana#hdi-schema-evolution).



## Liquibase for Java Projects

For Java-based CAP projects, you can also use [Liquibase](https://www.liquibase.org/) to control when, where, and how database changes are deployed. 

Learn more about that in the [PostgreSQL](postgres.md) guide, section [Using Liquibase (Java)](postgres#using-liquibase-java).
