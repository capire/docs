# CDS Compilation to Database-specific DDLs
 
Databases are deployed based on the entity definitions in your CDS models. This guide explains how that works under the hood, focusing on the compilation of CDS models to database-specific artifacts like SQL `CREATE TABLE` statements for relational databases. 
{.abstract}


[[toc]]

## Using `cds compile --to sql` 

CDS compilation to database-specific DDLs is handled by the `cds compile` command, which is part of the [CDS CLI](../../tools/cds-cli). When you run `cds deploy` or `cds watch`, this command is invoked automatically to generate the necessary DDL statements for your target database.

You can also run the command manually to see the generated DDL for your models. For example, to inspect what the SQL DDL for your entire model would look like, simply run:

```shell
cds compile \* --to sql
```

### Different Dialects

To generate DDL for a specific database dialect, use the `--dialect` option. For example, to see the SAP HANA-specific variant, run:

```shell
cds compile \* --to sql --dialect hana
```


### Profiles and Dialects

Note, though, that the dialect is usually inferred from your project configuration, and the current profile, so you typically don't need to specify it explicitly. 

For example, if your project is configured to use SAP HANA in production and SQLite in development, running `cds compile` in `development` profile will automatically generate SQLite-compatible DDL, and and SAP HANA-compatible DDL in `production` profile. 

::: details Use `cds env` to check your effective configurations
```shell
cds env requires.db --profile development
cds env requires.db --profile production
```
:::

Try this out using the `--profile` option:

```shell
cds compile \* --to sql --profile development
cds compile \* --to sql --profile production
```



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
