---
uacp: Linked from https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/e4a7559baf9f4e4394302442745edcd9.html
---


# CAP-level Database Integration

CAP application developers [focus on their domain](../../get-started/features#focus-on-domain), while CAP takes care of all aspects of database integration. This includes translating CDS models to native persistence models, schema evolution, deployment, as well as runtime querying – all of that in a database-agnostic way. [SQLite](./sqlite) <sup>1</sup> in-memory databases are automatically used in [inner-loop development](../../get-started/features#fast-inner-loops), while in production, [SAP HANA](./hana) <sup>2</sup> is used by default.
{.abstract}

> _<sup>1</sup> or [H2](./h2) in case of Java_.\
> _<sup>2</sup> or [PostgreSQL](./postgres) in edge cases_.


### Served Out of the Box

When you launch a CAP server, for example with `cds watch`, an in-memory database service is automatically boostrapped, as indicated by such log output:

```log
[cds] - connect to db > sqlite { url: ':memory:' }
  > init from bookshop/db/data/sap.capire.bookshop-Authors.csv
  > init from bookshop/db/data/sap.capire.bookshop-Books.csv
  > init from bookshop/db/data/sap.capire.bookshop-Books.texts.csv
  > init from bookshop/db/data/sap.capire.bookshop-Genres.csv
/> successfully deployed to in-memory database.
```

The illustration below shows what happens behind the scenes:

- CDS models are compiled to native DDL 
- which get deployed to the configured database, and
- initial data from CSV files is loaded into the database tables.

![Architecture diagram showing CAP database integration flow. Initial data in CSV files and CDS models in CDL and CQL format are compiled to native SQL and DDL statements, which are then deployed to a database. CAP Services query the database using CQL. Four database types are shown as supported options: SAP HANA, SQLite, H2, and PostgreSQL, all connecting to the central database component.](assets/overview.drawio.svg)

> [!tip] Everything Served Out of the Box
> The CAP framework handles all compilation to DDL automatically, for example when you run `cds watch` or  `cds deploy`. You typically don't need to worry about the details unless you want to inspect or customize the generated DDL statements. The guides in this section explain how things work under the hood. If you are on a fast track, you can safely skip them to great extent.


### Database-independent Guides

The following guides explain the details of CAP-level database integration, which are mostly database-agnostic, and apply to all supported databases:

[CDL Compiled to DDL](cdl-to-ddl.md) 
: How CDS models in CDL format are compiled to native DDL statements for different databases.

[CQL Compiled to SQL](cql-to-sql.md) 
: How CDS queries in CQL format are compiled to native SQL statements for different databases.

[Adding Initial Data](initial-data.md) 
: How to add initial data to the database using CSV files.

[Schema Evolution](schema-evolution.md) 
: How to manage schema changes and evolution in the database.

[Performance Guide](performance.md) 
: How to optimize database performance and tuning.


### Database-specific Guides

These guides are complemented by database-specific guides that explain particularities and customizations for each supported database: [SAP HANA](hana.md), [SQLite](sqlite.md), [H2](h2.md), [PostgreSQL](postgres.md).
