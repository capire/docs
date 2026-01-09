# CDS Compilation to Database-Specific DDLs

Databases are deployed based on the entity definitions in your CDS models. This guide explains how that works under the hood, focusing on the compilation of CDS models to database-specific artifacts like SQL `CREATE TABLE` statements for relational databases. 
{.abstract}

> [!tip] Everything Served Out of the Box
> The CAP tooling handles the all compilation to DDL automatically, for example when you run `cds watch` or  `cds deploy`. You typically don't need to worry about the details unless you want to inspect or customize the generated DDL statements. So, all information in this guide is just to explain how things work under the hood, and if you are on a fast track, you can safely skip it.

[[toc]]



CDS compilation to database-specific DDLs is handled by the `cds compile` command, which is part of the [CDS CLI](../../tools/cds-cli). When you run `cds deploy` or `cds watch`, this command is invoked automatically to generate the necessary DDL statements for your target database.

## Using `cds compile`, ...

You can also run the command manually to see the generated DDL for your models. For example, to inspect what the SQL DDL for your entire model would look like, simply run:

```shell
cds compile \* --to sql
```

The asterisk (`\*`<sup>1</sup>) can be replaced with specific .cds files or folders to compile only particular parts of your model.

```shell
cds compile db/schema.cds --to sql
cds compile db --to sql
```

::: details 
You can combine `cds compile` with other shell commands via UNIX pipes for more advanced use cases. For example, count the number of entity definitions in your models like this:

```shell
cds compile \* | grep entity | wc -l 
```
> <sup>1</sup> The backslash (`\`) before the asterisk (`*`) is used to escape it, preventing shell expansion to all files in the current directory.
:::



### Database-specific Dialects 

Add the `--dialect` option, to generate DDL for a specific databases. For example, to see the SAP HANA-specific variant, run:

```shell
cds compile \* --to sql --dialect hana
```
We can generate DDL files for different dialects in one go, and check differences between individual ones using VS Code like this: 
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
> CDS models are designed to be database-agnostic, allowing you to switch between different databases with minimal changes. The `--dialect` option helps you see how your models translate to different database-specific DDLs. \
> Learn more about [_Database-Agnostic Models_](db-agnostic-cds).


### Dialects by `cds env` Profiles

The dialect is automatically inferred from your project configuration, and the current profile, so you typically don't need to specify it explicitly. For example, if your project is configured to use SAP HANA in production and SQLite in development, the respective dialects will be applied automatically. 
Try this out using the `--profile` option:

```shell
cds compile \* --to sql --profile development
cds compile \* --to sql --profile production
```

 ::: details Use `cds env` to check your effective configurations:
```shell
cds env requires.db --profile development
cds env requires.db --profile production
```
:::

> [!tip] Dialects are inferred from profiles automatically
> You typically don't need to specify the `--dialect` option manually, as it is derived from your project configuration and the active profile.



### Using `cds deploy`

We can use `cds deploy` to inspect the generated DDL without actually deploying it, by using the `--dry` option. This will print the ultimate DDL statements to the console instead of executing them against the database, for example:

```shell
cds deploy --dry
```

This will print out the DDL for the database configured in your project for the current profile.

As for `cds compile` above, let's generate DDL files for different databases in one go like this:

```shell
echo -------------------------------------------------
cds deploy --dry --to sqlite -o _out/d/sqlite.sql
cds deploy --dry --to h2 -o _out/d/h2.sql
cds deploy --dry --to hana  -o _out/d/hana
cds deploy --dry --to postgres -o _out/d/postgres.sql
```

> [!tip] Under the hood...
> Essentially, `cds deploy --to <db>`  calls  `cds compile --to sql --dialect <db>` under the hood, but goes a step further by also considering deployment-specific aspects. For example, check the differences like so:

```shell
code --diff _out/c/sqlite.sql _out/d/sqlite.sql
```

That'll show some additional `DROP TABLE IF EXISTS ...` statements at the beginning of the `cds deploy` output, which are not part of the `cds compile` output:

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

These `DROP TABLE IF EXISTS ...` statements are a poor-man's schema evolution strategy applied during development. -> learn more about [_Schema Evolution_](#schema-evolution) below.

> [!tip] cds deploy is meant for ad-hoc deployments
>
> Without the `--dry` option, `cds deploy` would not only compile your CDS models to DDL, but would also do an ad-hoc deployment to the target database, if available. How that works is explained in more detail in the database-specific guides for [SAP HANA](hana#deploying-to-sap-hana), [SQLite](sqlite#deployment), and [PostgreSQL](postgres#deployment).



### Using `cds build`

Alternatively, you can use the `cds build` command, which compiles your CDS models and writes the generated DDL files to the `gen/` folder in your project:

```shell
cds build
```
This is particularly useful for CI/CD pipelines or when you want to keep a record of the generated DDL files.


## General Rules

The CDS-to-DDL compilation follows several general mapping principles to translate CDS constructs into database-specific artifacts, as outlined below.

### Names ⇒ Native Names

#### Qualified Names ⇒ Slugified

CDS qualified names (with dots) are converted to database-native formats, typically by replacing dots with underscores or other suitable characters, depending on the target database's naming conventions.

> [!tip]
> Use entity names like `Books.Details` in your CDS models, instead of CamelCase variants like `BooksDetails`. When deployed to databases like SAP HANA, which don't preserve case, the former will show up as `BOOKS_DETAILS`, while the latter will show up as `BOOKSDETAILS`, which is harder to read.

#### Invalid Names ⇒ Excaped

> [!warning] 
> Avoid using names that conflict with database reserved words or contain invalid characters, such as language-specific umlauts or diacritics, as this may lead to unexpected behavior or errors during deployment.

#### Reserved Words ⇒ Escaped

> [!warning] 
> Avoid using reserved words as identifiers in your CDS models, as this may lead to unexpected behavior or errors during deployment.

### Entities ⇒ Tables / Views
### Types ⇒ SQL Types
### Structs ⇒ Flattened
### Associations ⇒ JOINs 
### Managed Associations ⇒ Foreign Keys
### Compositions ⇒ Cascading Deletes
### Calculated Elements 


## Specific Keywords

### `key` ⇒ `PRIMARY KEY` Clauses
### `default` ⇒ `DEFAULT` Clauses
### `not null` ⇒ `NOT NULL` Constraints
### `virtual` ⇒ Skipped Columns


## Specific Annotations

### `@assert.unique` ⇒ `UNIQUE` Constraints
### `@cds.persistence.skip / exists / table` 
### `@sql.prepend / append`


## Schema Evolution
During development, database schemas often evolve as CDS models change. CAP provides basic schema evolution capabilities to handle such changes gracefully.

When using `cds deploy` during development, CAP generates `DROP TABLE IF EXISTS ...` statements before the `CREATE TABLE ...` statements. This approach ensures that existing tables are dropped before being recreated, allowing for a clean slate with each deployment. However, this is a simplistic approach and may lead to data loss if not handled carefully. For production deployments, more sophisticated migration strategies should be employed, such as using dedicated migration tools or scripts to preserve existing data while applying schema changes.