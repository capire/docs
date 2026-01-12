---
uacp: Linked from https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/e4a7559baf9f4e4394302442745edcd9.html
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
