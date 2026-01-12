---
synopsis: >
  This guide provides instructions on how to use databases with CAP applications.
  Out of the box-support is provided for SAP HANA, SQLite, H2 (Java only), and PostgreSQL.
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

With CDS 8, the [`@cap-js`](https://github.com/cap-js/cds-dbs) database services for SQLite, PostgreSQL, and SAP HANA are generally available. It's highly recommended to migrate. You can find instructions in the [migration guide](./sqlite#migration). Although the guide is written in the context of the SQLite Service, the same hints apply to PostgreSQL and SAP HANA.

### Adding Database Packages  {.node}

Following are cds-plugin packages for CAP Node.js runtime that support the respective databases:

| Database                       | Package                                                      | Remarks                            |
| ------------------------------ | ------------------------------------------------------------ | ---------------------------------- |
| **[SAP HANA Cloud](./hana)**     | [`@cap-js/hana`](https://www.npmjs.com/package/@cap-js/hana) | recommended for production         |
| **[SQLite](./sqlite)**       | [`@cap-js/sqlite`](https://www.npmjs.com/package/@cap-js/sqlite) | recommended for development        |
| **[PostgreSQL](./postgres)** | [`@cap-js/postgres`](https://www.npmjs.com/package/@cap-js/postgres) | maintained by community + CAP team |

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

... which also does the equivalent of `npm add @cap-js/hana` but in addition cares for updating `mta.yaml` and other deployment resources as documented in the [deployment guide](../deploy/to-cf#_1-sap-hana-database).

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
| **[SAP HANA Cloud](./hana)**     | `com.sap.cloud.db.jdbc:ngdbc` | Recommended for productive use         |
| **[H2](./h2)**       | `com.h2database:h2` | Recommended for development and CI     |
| **[SQLite](./sqlite)**       | `org.xerial:sqlite-jdbc` | Supported for development and CI <br> Recommended for local MTX |
| **[PostgreSQL](./postgres)** | `org.postgresql:postgresql` | Supported for productive use |

[Learn more about supported databases in CAP Java and their configuration](../../java/cqn-services/persistence-services#database-support){ .learn-more}
