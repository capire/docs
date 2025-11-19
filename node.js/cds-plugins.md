---
status: released
---

# CDS Plugin Packages



The `cds-plugin` technique allows to provide extension packages with auto-configuration.

[[toc]]



## Starting a new plugin

Simply add a file `cds-plugin.js` next to the `package.json` of your reuse package to have this detected and loaded automatically when starting CAP Node.js servers.

Meaning when an application downloads your package `npm i my-plugin` and afterwards starts the CAP server with `cds watch`, the packages `cds-plugin.js` file will automatically be detected and executed during startup.

Within such `cds-plugin.js` modules you can use [the `cds` facade](cds-facade) object, to register to lifecycle events or plugin to other parts of the framework. For example, they can react to lifecycle events, the very same way as in [custom `server.js`](cds-server#custom-server-js) modules:

::: code-group

```js [cds-plugin.js]
const cds = require('@sap/cds')
cds.on('served', ()=>{ /**...*/ })
```
```json [package.json]
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Sample to explain how CDS plugins work",
  "main": "cds-plugin.js",
  "files": [
    "_i18n",
    "lib",
    "srv",
    "db",
    "index.cds",
    "cds-plugin.js",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "peerDependencies": {
    "@sap/cds": ">=9"
  },
  "devDependencies": {
    "@cap-js/cds-test": "^0.4.0",
    "@cap-js/sqlite": "^2"
  },
  "engines": {
    "node": "^20"
  },
  "scripts": {
    "lint": "npx eslint .",
    "test": "npx jest --silent"
  },
  "cds": {
    "requires": {
      "my-service": {
        "[production]": {
          "kind": "kind1"
        },
        "[development]": {
          "kind": "kind2"
        },
        "[hybrid]": {
          "kind": "kind1"
        },
        "kinds": {
          "my-service-kind1": {
            "impl": "my-plugin/srv/myservice"
          },
          "my-service-kind2": {
            "impl": "my-plugin/srv/myservice-mock"
          }
        }
      }
    }
  }
}
```

```js [srv/myservice]
const cds = require('@sap/cds')
const LOG = cds.log('my-plugin')

module.exports = class MyService extends cds.Service {
  init() {
    // Register handlers to execute logic ...

    this.on('MyEvent', async req => {
      const credentials = cds.env.requires["my-service"].credentials
      // Do something
    })
    return super.init()
  }
}
```

```js [srv/myservice-mock]
const cds = require('@sap/cds')
const LOG = cds.log('my-plugin')

module.exports = class MyServiceMock extends cds.Service {
  init() {
    // Register the same handlers as in MyService but have a mocked impl
    return super.init()
  }
}
```
:::

Sometimes `cds-plugin.js` files can also be empty, for example if your plugin only registers new settings.

::: danger Avoiding state in services

Keep in mind in multi-tenant scenarios the CAP service is shared across all tenants! Thus you must store any tenant specific state, like credentials for a remote BTP service, in a map with the tenant ID as the key to maintain tenant separation.

:::


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
        "db-sql": {
          "[development]": {
            "kind": "sqlite"
          }
        },
        "db-sqlite": {
          "impl": "@cap-js/sqlite"
        }
      },
    }
  }
}
```

:::

In effect this automatically configures a required `db` service using the `sql` preset. 

This preset is configured below to use the `sqlite` preset in development. The `sqlite` preset is in turn configured, to use the plugin package's main as the implementation.

The profiles, like "development", are explained in the [Configuration Profiles](./cds-env#profiles) section.

::: danger Prefix kinds
All kinds need to be prefixed with the service for which they are intended to be used. Else they might clash with kinds from other plugins.
:::

The following example is from the data privacy plugin. Here the Information service uses a model property to specify a `.cds` file used as the domain model for that service. The domain model imported via that path is then added to the domain model of the application.

::: code-group

```json [package.json]
{
  "cds": {
    "requires": {
      "sap.dpp.RetentionService": {
        "kind": "TableHeaderBlocking"
      },
      "sap.dpp.InformationService": {
        "model": "@sap/cds-dpi/srv/DPIInformation"
      },
      "kinds": {
        "sap.dpp.RetentionService-TableHeaderBlocking": {
          "impl": "@sap/cds-dpi/srv/TableHeaderBlocking",
          "model": "@sap/cds-dpi/srv/TableHeaderBlocking"
        }
      }
    }
  }
}
```

:::

### Service variants

As seen above in the sample the different kinds can be used to offer different variants of your plugin. This makes sense to for example have one `db` service but variants for different databases or one `audit-log` but variants for different Audit logging service plans.

The service variants are especially handy to provide a mocked version of the service, in case your plugin integrates with a Cloud Service, so applications can still run locally and test basic functionality without needing to connect to the Cloud Service during development.

The mocked variant usually just logs the events send to your service to the console. For example `@cap-js/audit-logging` logs the audit logs to the console when in development and `@cap-js/attachments` only logs that a malware scan is triggered without actually scanning as the Malware Scanning service is locally not connected.

Variant independent applications can connect to your service via `cds.connect` and depending on the kind configured a different service is returned.

```js
// Returns "MyService" in hybrid or production mode, 
// but with the development profile it returns "MyServiceMock"
await cds.connect.to('my-service');
```

### Reading BTP service bindings / credentials

To access the service credentials, refer to the [service binding documentation](./cds-connect.md#service-bindings).

It describes how you can map a CAP service listed under `cds.requires` to a BTP service.

During runtime the credentials are then part of [`cds.env`](./cds-env.md#cds-env):

```js
srv.before('UPDATE', 'myEntity', req => {
  const credentials = cds.env.requires["my-service"].credentials
  // Do something
})
```

#### Connecting to BTP services

Before you use `axios` or `node:fetch`, you can use the [`Cloud SDK`](https://sap.github.io/cloud-sdk/) and its functions `executeHttpRequest` and `getDestination` to retrieve a destination from BTP and run an HTTP request against it. This takes full care of doing the authentication and is the preferred method for communicating with BTP services so your plugin does not need to fetch the token itself.

If you do not have a destination at hand the Cloud SDK supports service bindings as well.

### Early exit

Have an early exit option for your plugin so apps can easily disable the plugin in specific profiles. Disablement should be done by setting your service in the requires section to `null`.

```json
"cds": {
  "requires": {
    "myservice": null
  }
}
```

Early on in your logic, you should have some logic, like this:

::: code-group

```js [cds-plugin.js]
if (cds.env.requires['my-service']) {
  const cds = require('@sap/cds')
  cds.on('served', ()=>{ /**...*/ })
}
```
:::

## Reusable CDS Artifacts

There are two options for adding additional artifacts (properties, entities, services, …) to the CAP data model. The first is by modelling the CDS artifact in your plugin in a `.cds` file. The second is by injecting it via JavaScript code during the CAP build step or when CAP loads the data model. 
The first option is described below:

Add an `index.cds` file in the root folder of your plugin. In this file, you can model as many artifacts as you wish. But for code separation, it is recommended to have a `db` or `srv` folder for your artifacts and only reference the cds files subsequently in the `index.cds`.

An example could look like:

`db/schema.cds`:
```cds
namespace sap.reuse;

aspect ReuseArtifact {
  key ID: UUID;
  prop1: String;
}
```

`index.cds`:
```cds
using from './db/schema.cds';
```

The reuse [aspect](../cds/cdl#aspects) is then referenced in the CAP application by writing the following, referencing the `index.cds` file from the npm package as which the plugin is published.

`Some CDS file in the consuming project`:
```cds
using {sap.reuse.ReuseArtifact} from '@cap-js/plugin-sample';
```

::: tip Domain modelling best-practices
When modelling and naming your artifacts, consider CAP [best-practices](../guides/domain-modeling#best-practices) for domain modelling, which detail naming conventions and design principles.
:::

## Domain model interactions

The [CSN](../cds/csn.md) file is CAPs compiled data model. All `.cds` files are compiled to a single CSN, which is used at runtime to serve the OData services and respond to queries.

#### Traversing the model

The model is available after bootstrapping via `cds.context.model ?? cds.model`. During bootstrapping each service which gets instantiated has its model attached which you can also access.

`cds.context.model` is only available at runtime because it is based on the tenant from which the request originates.

```js
cds.on('compile.for.runtime', model => {
  model.definitions
})
```

The definitions is an object which contains all artifacts from the model, like type definitions, aspects, entities, projections, services. Each has a "type" property via which you can filter for your desired artifacts to modify or inspect.

Entities exposed as part of a service have either a "query" or "projection" property, via which you can get down the chain of entities till you reach the base entity, used for the database table definition.

You can also reflect the model via `cds.reflect(<csn>)` which enhances the `CSN` with a variety of helper methods, making it easier to traverse the model. However keep in mind changes to the model must be made to the plain model handed over by the event!

For example `cds.reflect` adds the `_target` property to associations to easily get to the artifact the association points to. 

Regarding compositions and associations keep in mind that compositions are just a special kind of associations so the associations property contains both plain associations and compositions.

#### Reading annotations

[Annotations](../cds/cdl#annotations) are used for marking up CDS artifacts with additional information. In the CSN they are normalised object properties, e.g. flattened, meaning

```cds
@Common : {
  Text : currency.name,
  TextArrangement : #TextOnly,
  ValueListWithFixedValues,
  ValueList : {
    CollectionPath : 'Currencies',
    Parameters : [
      {
        $Type : 'Common.ValueListParameterInOut',
        LocalDataProperty : code,
        ValueListProperty : 'code',
      }
    ]
  }
}
currency: Association to one Currencies;
```

would result in

```json
"currency": {
  "@Common.Text": {"=": "currency.name"},
  "@Common.TextArrangement" : {"#": "TextOnly"},
  "@Common.ValueListWithFixedValues": true,
  "@Common.ValueList.CollectionPath": "Currencies",
  "@Common.ValueList.Parameters": [{
    "$Type" : "Common.ValueListParameterInOut",
    "LocalDataProperty" : {"=": "code"},
    "ValueListProperty" : "code",
  }],
  "type": "cds.Association",
  "cardinality": {"max": 1}
}
```

When defining own annotations consider the section [Code completion](../../plugins/development-guide#code-completion).

#### Dynamically modifying the model

Via [lifecycle events](./cds-compile#compile-to-edmx) you can modify the model before it is used by the CAP for various purposes, like creating the database artifacts, the runtime model or the OData services.

```js
const cds = require('@sap/cds')
cds.on('compile.for.runtime', m => enhanceModel(m))
cds.on('compile.to.dbx', m => enhanceModel(m))
cds.on('compile.to.edmx', m => enhanceModel(m))
```

In there you can add additional associations or properties based on annotations, add additional services or in general modify artifacts as needed.

Because the events can trigger multiple times set a flag in the meta information to not run your modifications twice on the same model.

```js
function enhanceModel(m) {
  const meta = m.meta ??= {};
  if (meta['sap.myservice.enhancements']) return;

  //Do modifications to m.definitions

  meta['sap.myservice.enhancements'] = true;

}
```

Importantly you need to consider, that in multi-tenancy setups the model is owned by the MTX micro-service and as such your plugin must then also be part of the MTX micro-service `package.json` file to ensure the model modifications are done to the models used by every tenant.

## Registering additional handler

CAPs powerful handler loop allow plugins to add additional handlers to react on requests and modify responses.

#### Registering handlers

While usually, handlers are registered when defining the service, plugins often have to register additional handlers in existing services to add in logic of the plugin. 

Commonly the [server lifecycle](./cds-server#lifecycle-events) events are used to register additional handlers on existing services:

::: code-group
```js [Bad practice]
cds.on('served', services => {
  for (const name in services) {
    const srv = services[name]
    if (srv instanceof cds.ApplicationService /* && scenario check when to add handlers*/) {
      for (const entity in srv.entities) {
        if (/** Some check on entity */) continue;
        srv.before('READ', srv.entities[entity], req => {
          // Additional logic;
        });
      }
    }
  }
});
```
:::

However this approach has two downsides:

1. The `served` lifecycle event is used, which makes it harder for consuming applications to register additional handlers on top of the plugin. If the plugin registers `on` handlers via `srv.prepend` the consuming application cannot add their own on handlers via `srv.prepend` with good conscious during that stage as it is undefined which event handler for `served` is executed first, leading to an ambiguous situation where it is not clear which on handler has precedence.
2. The handlers are registered per entity. While this works fine for plugins only consumed by single-tenant applications, it will cause problems in multi-tenancy scenarios. `srv.entities` is based on the base model of the CAP service `cds.model`. However in multi-tenant scenarios the model can be extended at runtime for each tenant, be it via [feature toggles](../guides/extensibility/feature-toggles.md) or [customer extensions](../guides/extensibility/index.md#extensibility). At runtime `cds.context.model` contains the model which is currently active for the tenant of an incoming request and during server startup the tenant-specifc models are not available. For example the attachments entity from `@cap-js/attachments` could be placed behind a feature toggle. This means `cds.model` won't contain any reference to attachments, but at runtime `cds.context.model` will, when the feature toggle is activated.

To avoid these two problems, use CAPs way for [adding generic handler](./app-services.md#adding-generic-handlers). This means, that when an application service is initialized, first the handlers from the application service are registered, thus having precedence, and afterwards the generic handlers from CAP itself and your plugin are added.

::: code-group
```js [Good practice]
const cds = require('@sap/cds')

cds.ApplicationService.handle_my_service = cds.service.impl (function(){
  if (!cds.env.requires['my-service']) return;
  this.before('*', req => {
    if (/** Some check on req.target */) continue;
    // Additional logic;
  })
})
```
:::

::: danger The dangers of generic handlers
While registering handlers assume the least possible and always check for your use case. Generic handlers are quite powerful but as they are generic all kinds of requests will go through them, like messaging request, analytical OData calls, $count calls or file stream requests.

- Check the dangers of [`req.query`](./events.md#query) to be aware of
- Check the dangers of [`req.data`](./events.md#data) to be aware of
- Check out the [performance considerations](./core-services.md#performance-considerations) for event handlers
- Check out the [implications of data modification in after handlers](./core-services.md#implication-when-modifying-data-in-after-handlers)
:::

While `before` and `after` handlers are called by CAP in parallel, `on` handlers behave like express middlewares, where the next middleware must be explicitly called. For plugins this means each `on` handler must always call next `on` handler when the conditions they check for are not met!

If you want to enhance the generic authentication and authorization consider [initial handlers](./core-services.md#initial-handlers)

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


## How the plugins hook is implemented in CAP

#### cds. plugins {.property}
This property refers to a module that implements the plugin machinery in cds, by fetching and loading installed plugins along these lines:

1. For all entries in your *package.json*'s `dependencies` and `devDependencies` ...
2. Select all target packages having a `cds-plugin.js` file in their roots ...
3. Add all target packages' `cds` entry in their *package.json* to [`cds.env`](cds-env)
4. Load all target packages' `cds-plugin.js` module

The plugin mechanism is activated by adding this to CLI commands:

```js
await cds.plugins
```

Meaning on server startup CAP itself calls `await cds.plugins` to load and activate all plugins before continuing to serve the application services.

Currently, the following commands support plugins: `cds-serve`, `cds watch`, `cds run`, `cds env`, `cds deploy`, `cds build`, `cds.test()`.
