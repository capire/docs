---
# layout: cds-ref
status: released
---

# Moving From _.hdbcds_ To _.hdbtable_

::: info Not relevant for SAP HANA Cloud
If you are already using SAP HANA Cloud, there is no SAP HANA CDS.
:::

The deployment format `hdbcds` for SAP HANA together with the function [`to.hdbcds`](../../node.js/cds-compile#hdbcds) have been deprecated with `@sap/cds-compiler@5` and `@sap/cds@8`. Users are advised to switch to the default format `hdbtable`. This guide provides step-by-step instructions for making the switch, including potential issues and work-arounds, such as handling annotations `@sql.prepend/append` and dealing with associations.

New CDS features will not be available for `hdbcds` format, and will be removed in a major release.

::: info Deployment Format
The format only determines the "medium" through which your database model is brought to the database. The resulting database tables and views are still the same, independent of the format.
:::

## Migration Procedure

If your database deployment currently uses `hdbcds`, it's recommended to switch to the default format, `hdbtable`. This guide assumes you use cds7 or higher. Make sure you read the entire guide before starting the migration process.

1. Ensure that your current data model matches the deployed data model.

2. Switch the deployment format from `hdbcds` to the default `hdbtable`. You can do this by removing option `cds.requires.db.deploy-format` from your configuration files.
   <!-- requires @sap/cds v7 -->
   <!-- this option is not documented, but mentioned in release notes and the changelog -->

3. Undeploy the CAP-generated _.hdbcds_ files by adding an entry to `db/undeploy.json`:
    ::: code-group
    ```json [db/undeploy.json]
    [
      ...,
      "src/gen/**/*.hdbcds"
    ]
    ```
    :::

    :::details Possible error message
    Without this entry, during HDI deployment you get errors like the following:
    ```log
    Error: "db://E": the object cannot be provided more than once [8212002]
    "src/E.hdbtable": the file would provide it
    "$cds.merge/E": the deployed file already provides it
    Merged from "src/E.hdbcds"
    ```
    :::

4. Build and re-deploy your data model.


By following these steps, the internal handover mechanism of HDI automatically transfers ownership of the tables to the `hdbtable` plugin. There are some caveats, however:

* If you used annotations `@sql.append` or `sql.prepend`, your model very likely needs to be adapted manually
  before the migration can be done. See the corresponding section below for more details.
* In some scenarios, the generated _.hdbcds_ and _.hdbtable_ files do not allow a seamless switchover,
  and a full migration is done for the respective tables.
  The scenarios we have identified so far are explained in separate sections below, for two of them there is a work-around.

::: info Full Table Migration

If HDI detects a difference between the CREATE statement in a _.hdbtable_ file and the version of a table that is deployed already, it creates a temporary shadow table based on the new structure and copies existing data into this shadow table.

If the table doesn't contain much data, this process won't significantly impact the system. However, if the table contains a large amount of data, be prepared for a more time-consuming and resource-intensive deployment.

:::


## Annotations

Annotations [`@sql.append/prepend`](../../guides/databases/cdl-to-ddl#sql-prepend-append) are used to generate native SQL clauses to the _.hdbtable_ files, or add native SAP HANA CDS clauses to the _.hdbcds_ files.

If you have used these annotations in your model, a simple switchover from `hdbcds` to `hdbtable` is unlikely as such an annotation written for `hdbcds` in general is not valid for `hdbtable`. You'll have to adapt your model before the migration.

As these clauses are custom, we cannot offer any further guidance here.


## Associations

Associations cause issues in the _.hdbcds_ to _.hdbtable_ handover. For each entity that has associations, the resulting table or view contains a `WITH ASSOCIATIONS` clause, representing native SAP HANA associations.

When deploying via `hdbcds`, the compiler writes associations in a CAP CDS entity with corresponding associations to the _.hdbcds_ file. Upon deployment, the `hdbcds` plugin of HDI generates a `CREATE TABLE` statement, where the associations are represented in a `WITH ASSOCIATIONS` clause.
When deploying via `hdbtable`, the compiler writes the `CREATE TABLE` statements with the `WITH ASSOCIATIONS` clause directly into the generated _.hdbtable_ and _.hdbview_ files. These clauses slightly differ, which causes a full table migration when switching from `hdbcds` to `hdbtable`.

The CAP Java runtime and the CAP Nodejs runtime with the new SAP HANA service (`@cap-js/hana`, default in cds8)
don't need the `WITH ASSOCIATIONS` clause anymore. This can be used to avoid a full table migration by removing the associations from the `hdbcds` sources __before__ the actual `hdbcds` to `hdbtable` migration.

First switch off the generation of the associations (that option accounts for associations in the `hdbcds` sources as well as the `WITH ASSOCIATIONS` found in the `hdbtable` sources):

::: code-group

```json [.cdsrc.json]
{
  "sql": {
    "native_hana_associations": false
  }
}
```
:::
<!-- this option is available only with CDS 8 -->

Then run a new build and deploy the newly generated _.hdbcds_ files.

In contrast to the `hdbtable` plugin, the `hdbcds` plugin is able to handle removal of the native associations without a full table migration. The resulting database tables and views won't contain any associations anymore.

::: warning Requirements for this work-around
* cds8
* The new SAP HANA database service `@cap-js/hana`
* Your custom coding doesn't use the native associations on the database

:::


<!--
  full syntax in mta for try_fast is:
  com.sap.hana.di.table/try_fast_table_migration: "true"
-->


## Multiline Doc Comments

This is only relevant if you have switched on [Doc Comments](../../cds/cdl#doc-comment)
and if you have enabled translation of doc comments to the `COMMENT` feature in the database.

Doc comments can span across multiple lines:

```cds
entity Employees {
  key ID : Integer;
  /**
    * I am the description for "name".
    * I span across multiple lines.
    */
  name : String;
}
```

When deploying via `hdbcds`, doc comments in a CAP CDS entity are reflected by corresponding `@Comment` annotations in the _.hdbcds_ file generated by the compiler. Upon deployment, the `hdbcds` plugin of HDI generates a `CREATE TABLE` statement, where the doc comments are represented by `COMMENT` clauses.
When deploying via `hdbtable`, the compiler directly writes the `CREATE TABLE` statements with the `COMMENT` clauses into the generated _.hdbtable_ and _.hdbview_ files. These `COMMENT` clauses slightly differ, which causes a full table migration when switching from `hdbcds` to `hdbtable`.

If you don't actually need the comments in the database, you can remove them as a preparation step __before__ you do the `hdbcds` to `hdbtable` migration. This is similar to the work-around described above for the `WITH ASSOCIATIONS` clause.

::: tip Full table migration if you need the comments
If you need the comments in the database, this work-around will not help, because switching them back on after moving to `hdbtable` will then result in a full table migration.
:::

First disable the doc comments by adapting your `.cdsrc.json`:
::: code-group
```json [cdsrc.json]
{
  "hana": {
    "comments": false
  }
}
```
:::

Then run a new build and deploy the newly generated _.hdbcds_ files. The `@Comment` annotations are removed from the _.hdbcds_ files and the resulting database tables and views won't contain the `COMMENT` clause anymore. Unlike the `hdbtable` plugin, the `hdbcds` plugin handles the removal of the `COMMENT`s without a full table migration.


## Temporal Data With Time Slice IDs <Concept />

Temporal Data with Time Slice IDs is a conceptual feature, thus it shouldn't occur in productive applications. Nevertheless, we mention it here for completeness.

Example:
```cds
// usually taken from '@sap/cds/common'
aspect temporal {
  validFrom : Timestamp @cds.valid.from;
  validTo   : Timestamp @cds.valid.to;
}

entity TimeDependentData : temporal {
  key ID  : UUID;
  sliceId : UUID @cds.valid.key;
  someData : String;
}
```

In this example, entity `TimeDependentData` can't be seamlessly migrated and a full table migration will take place.
