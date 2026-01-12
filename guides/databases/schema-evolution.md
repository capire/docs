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


## Schema Upgrades by CAP


In production environments, a drop-create strategy is not feasible, as it would result in data loss. CAP provides mechanisms to handle schema evolution in a more controlled manner, along these lines:

1. Capture the former states of the database schema.
2. Compare it with the updated CDS model.
3. Generate migration scripts to evolve the schema.

Let's simulate this with the [@capire/bookshop](https://github.com/capire/bookshop) example. First, we deploy the initial model to a SQL database:

1. Capture the current state of the database schema:
   ```shell
   cds deploy --dry --model-only -o _out/former.csn
   ```
2. Make changes to the CDS model, for example, by adding a new field to an entity.
3. Use CAP's schema evolution tools to compare the two CSN files and generate migration scripts:
   ```shell
   cds deploy --dry --delta-from _out/former.csn -o _out/migration.sql
   ```


When changes are made to the CDS model, CAP can compare the new model with the existing database schema and determine the necessary changes to evolve the schema accordingly.

This typically involves generating migration scripts that can be executed to update the database schema without losing existing data. CAP can generate these migration scripts based on the differences between the current CDS model and the previous version of the model.

When using CAP in production scenarios, it is essential to manage schema evolution carefully to avoid data loss and ensure data integrity. CAP provides tools to generate migration scripts that can be reviewed and executed against the production database. These scripts include SQL statements to add, modify, or remove database objects as required by the changes in the CDS model.


When deploying changes to a production database, you would typically follow these steps:
1. Generate migration scripts using CAP tools.
2. Review and, if necessary, modify the generated scripts to ensure data integrity.
3. Execute the migration scripts against the production database to apply the schema changes.   


## Managed Schema Upgrades


## Automatic Migration by HDI

When deploying CAP applications to SAP HANA databases using the HDI (HANA Deployment Infrastructure) service, schema evolution is handled automatically by HDI. HDI manages the lifecycle of database artifacts and applies necessary schema changes based on the deployed CDS models. This includes creating, altering, or dropping database objects as needed to align with the current CDS model.

When using HDI, developers typically do not need to manually generate or execute migration scripts, as HDI takes care of applying the necessary changes during the deployment process. However, it is still important to test schema changes in a non-production environment before deploying to production to ensure that data integrity is maintained.

## Using Liquibase