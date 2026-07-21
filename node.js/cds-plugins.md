---
status: released
---

# CDS Plugin Packages



The `cds-plugin` technique allows to provide extension packages with auto-configuration.

[[toc]]



## Add a `cds-plugin.js`

Simply add a file `cds-plugin.js` next to the `package.json` of your package to have this detected and loaded automatically when bootstrapping CAP Node.js servers through `cds serve`, or other CLI commands.

Within such `cds-plugin.js` modules you can use [the `cds` facade](cds-facade) object, to register to lifecycle events or plugin to other parts of the framework. For example, they can react to lifecycle events, the very same way as in [custom `server.js`](cds-server#custom-server-js) modules:

::: code-group

```js [cds-plugin.js]
const cds = require('@sap/cds')
cds.on('served', ()=>{ ... })
```

:::

Sometimes `cds-plugin.js` files can also be empty, for example if your plugin only registers new settings.



## Auto-Configuration

Plugins can also add new configuration settings, thereby providing auto configuration. Simply add a `cds` section to your *package.json* file, as you would do in a project's *package.json*.

For example, this is the configuration provided by the new SQLite service package `@cap-js/sqlite`:

::: code-group

```json [package.json]
{
  "cds": {
    "requires": {
      "db": "sql",
      "kinds": {
        "sql": {
          "[development]": {
            "kind": "sqlite"
          }
        },
        "sqlite": {
          "impl": "@cap-js/sqlite"
        }
      },
    }
  }
}
```

:::

In effect this automatically configures a required `db` service using the `sql` preset. This preset is configured below to use the `sqlite` preset in development. The `sqlite` preset is in turn configured below, to use the plugin package's main as implementation.



## cds. plugins {.property}

This property refers to a module that implements the plugin machinery in cds, by fetching and loading installed plugins along these lines:

1. For all entries in your *package.json*'s `dependencies` and `devDependencies` ...
2. Select all target packages having a `cds-plugin.js` file in their roots ...
3. Add all target packages' `cds` entry in their *package.json* to [`cds.env`](cds-env)
4. Load all target packages' `cds-plugin.js` module

The plugin mechanism is activated by adding this to CLI commands:

```js
await cds.plugins
```

Currently, the following commands support plugins: `cds-serve`, `cds watch`, `cds run`, `cds env`, `cds deploy`, `cds build`, `cds.test()`.

## Configuration Schema <Beta /> { #configuration-schema }

To help developers conveniently add configuration for a plugin with code completion, plugin developers can declare additions to the `cds` schema in their plugin.

#### Declaration in Plugin

All schema definitions must be below the `schema` node:

::: code-group

```jsonc [package.json]
"cds": {
  "schema": {
    "buildTaskType": {
      "name": "new-buildTaskType",
      "description": "A text describing the new build task type."
    },
    "databaseType": {
      "name": "new-databaseType",
      "description": "A text describing the new database type."
    },
    "cds": {
      "swagger": {    // example from cds-swagger-ui-express
        "description": "Swagger setup",
        "oneOf": [
          ...
        ]
      }
    }
  }
}
```

:::

Currently, the following schema contribution points are supported:

| Contribution Point | Description                               |
|--------------------|-------------------------------------------|
| `buildTaskType`    | Additional build task type                |
| `databaseType`     | Additional database type                  |
| `cds`              | One or more additional top level settings |


#### Usage In a CAP Project

<video src="./assets/schema-usage_compressed.mp4" autoplay loop muted webkit-playsinline playsinline />{.ignore-dark style="width: 688px"}
