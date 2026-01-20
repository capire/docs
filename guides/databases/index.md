
# CAP-level Database Integration

CAP application developers [focus on their domain](../../get-started/features#focus-on-domain), while CAP takes care of all aspects of database integration. This includes translating CDS models to native persistence models, schema evolution, deployment, as well as runtime querying – all of that in a database-agnostic way. [SQLite](./sqlite) <sup>1</sup> in-memory databases are automatically used in inner-loop development, while in production, [SAP HANA](./hana) <sup>2</sup> is used by default.
{.abstract}

> _<sup>1</sup> or [H2](./h2) in case of CAP Java-based projects_.\
> _<sup>2</sup> or [PostgreSQL](./postgres) in edge cases_.


### Best Practices, Served Out of the Box

> [!tip] Served Out of the Box
> The CAP framework handles all compilation to DDL automatically, for example when you run `cds watch` or  `cds deploy`. You typically don't need to worry about the details unless you want to inspect or customize the generated DDL statements. The guides in this section explain how things work under the hood. If you are on a fast track, you can safely skip them to great extent.

The illustration below shows what happens automatically under the hood:

- CDS models are compiled to database-native SQL/DDL 
- which get deployed to the configured database, and
- initial data from CSV files is loaded into the database tables
- CQL queries from CAP services are served automatically.

![Architecture diagram showing CAP database integration flow. Initial data in CSV files and CDS models in CDL and CQL format are compiled to native SQL and DDL statements, which are then deployed to a database. CAP Services query the database using CQL. Four database types are shown as supported options: SAP HANA, SQLite, H2, and PostgreSQL, all connecting to the central database component.](assets/overview.drawio.svg)

> [!tip] Following the Calesi Pattern
> The implementations of the CAP database layers follow the design principles of CAP-level Service Integration:
> - Database Services are CAP services themselves, which...
> - provide database-agnostic interfaces to applications
> - provide mocks for local development out of the box
> - can be extended through event handlers, as any other CAP service

> [!tip] Promoting Fast Inner-Loop Development
> Through the ability to easily swap production-grade databases like SAP HANA with SQLite or H2 in-memory databases during development, without any changes to CDS models nor implementations, we greatly promote inner-loop development with fast turnaround cycles, as well as speeding up test pipelines and minimize TCD.


### Database-independent Guides

The following guides explain the details of CAP-level database integration, which are mostly database-agnostic, and apply to all supported databases:

[CDL Compiled to DDL](cdl-to-ddl.md) 
: How database-agnostic CDS models in CDL format are compiled to native DDL statements for different databases.

[CQL Compiled to SQL](cql-to-sql.md) 
: How database-agnostic CDS queries in CQL format are compiled to native SQL statements for different databases.

[Adding Initial Data](initial-data.md) 
: How to provide initial data and test data using CSV files, which are loaded into the database automatically.

[Schema Evolution](schema-evolution.md) 
: How to manage schema changes with appropriate schema evolution strategies for development and production.

[Performance Guide](performance.md) 
: Pointing out performance considerations, and common pitfalls.


### Database-specific Guides

These guides are complemented by database-specific guides that explain particularities and customizations for each supported database: [SAP HANA](hana.md), [SQLite](sqlite.md), [H2](h2.md), [PostgreSQL](postgres.md).
