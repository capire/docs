---
synopsis: >
  This page describes how to build plugins for CAP Node.js.
status: released
---

# CDS Plugin Packages


The `cds-plugin` approach enables you to deliver extension packages with built-in auto-configuration. 


> [!NOTE] Before you start
> Read through the [Calesi](../guides/integration/calesi.md) pattern and the [Plugin Development](../guides/integration/calipso.md) guide. These patterns help ensure your plugin follows best practices for quality and consistency.


## Starting a new plugin

To get started, ensure you have created a [valid CAP project](../get-started/index.md#cds-init).

Next, place a `cds-plugin.js` file in the same directory as your package's `package.json`. CAP Node.js servers will automatically detect and load this file when starting up.

When a user installs your package (e.g., with `npm i my-plugin`) and runs the CAP server using `cds watch`, your `cds-plugin.js` will be executed automatically during server startup.

Inside `cds-plugin.js`, you can use the [CDS facade](./cds-facade) to hook into CAP lifecycle events or extend framework functionality. This works similarly to how you would use lifecycle events in a [custom `server.js`](./cds-server#custom-server-js) module.

::: code-group

```js [cds-plugin.js]
const cds = require('@sap/cds')
const LOG = cds.log('my-plugin')
cds.on('served', ()=>{
  LOG.info('Hello! My Plugin Service is up!')
})
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

```js [srv/myservice.js]
const cds = require('@sap/cds')
const LOG = cds.log('my-plugin')

module.exports = class MyService extends require('myservice-mock.js') {
  init() {
    // Register handlers to execute logic ...

    this.on('MyEvent', async req => {
      const credentials = cds.env.requires["my-service"].credentials

      LOG.info('Received MyEvent, now what to do next?')
      // Do something
    })
    return super.init()
  }
}
```

```js [srv/myservice-mock.js]
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

Example:
```js
const cds = require('@sap/cds')

const myTenantStates = {}

updateState(myState) {
  myTenantStates[cds.context.tenant] = myState
}
```

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

The following example is from the [attachments](../plugins/index.md#attachments) plugin. In this case, the malware scanning service uses a `model` property to specify a `.cds` file that defines the domain model for the service. By referencing this file, the plugin automatically imports its domain model into the application's overall data model.

This approach is beneficial because it allows plugins to seamlessly extend the application's domain model with additional entities, services, or aspects—without requiring manual integration steps from the application developer. As a result, the application can immediately leverage new features or data structures provided by the plugin, ensuring consistency and reducing boilerplate. This also promotes modularity and reusability, as plugins can encapsulate their own domain logic and expose it in a standardized way to any consuming CAP application.

::: code-group

```json [package.json]
{
  "cds": {
    "requires": {
      "malwareScanner": {
        "kind": "malwareScanner-mocked"
      },
      "kinds": {
        "malwareScanner-mocked": {
          "model": "@cap-js/attachments/srv/malwareScanner-mocked",
          "impl": "@cap-js/attachments/srv/malwareScanner-mocked"
        },
        "malwareScanner-btp": {
          "model": "@cap-js/attachments/srv/malwareScanner",
          "impl": "@cap-js/attachments/srv/malwareScanner"
        },
      }
    }
  }
}
```


```cds [malwareScanner-mocked.cds]
using {malwareScanner} from './malwareScanner';

annotate malwareScanner with @impl : './malwareScanner-mocked';
```

```cds [malwareScanner.cds]
@protocol : 'none'
service malwareScanner {

  event ScanAttachmentsFile {
    target: String; //CSN name of Attachments entity to scan
    keys: Map; //Key value pairs of attachments entity to scan
  };

  action scan(file: LargeBinary) returns {
    isMalware: Boolean;
    encryptedContentDetected: Boolean;
    scanSize: Integer;
    finding: String;
    /**
     * Returns "empty" if no type could be detected
     */
    mimeType: String;
    /**
     * SHA256 hash of file
     */
    hash: String;
  }
}
```

:::

### Service variants

As seen above, you can use different kinds to offer multiple variants of your plugin. This is especially useful when you want to provide, for example, a mocked version of your service for local development and a real version for production. The [attachments](../plugins/index.md#attachments) plugin demonstrates this pattern: in development, the `malwareScanner-mocked` kind is used, which simply logs that a malware scan was triggered, while in production, the `malwareScanner-btp` kind connects to the actual Malware Scanning service in BTP.

By configuring these variants in your plugin's `package.json`, applications can connect to your service using `cds.connect`, and CAP will automatically provide the correct implementation based on the current profile. This allows applications to run and test basic functionality locally without needing access to the real cloud service, while seamlessly switching to the real implementation in production.

For example, with the attachments plugin:

```js
// Returns the mocked service in development, 
// and the real service in production
await cds.connect.to('malwareScanner')
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

::: danger Do not access `VCAP_SERVICES` directly
Do not read the credentials from `process.env.VCAP_SERVICES`! `VCAP_SERVICES` is set by Cloud Foundry and as such not available in Kyma scenarios or when `VCAP_SERVICES_PATH` is given. Thus always prefer reading from `cds.env` to stay platform agnostic.
:::

#### Connecting to BTP services

Before you use http clients such as `axios` or `node:fetch`, you can use the [`Cloud SDK`](https://sap.github.io/cloud-sdk/) and its functions `executeHttpRequest` and `getDestination` to retrieve a destination from BTP and run an HTTP request against it. This takes full care of doing the authentication and is the preferred method for communicating with BTP services so your plugin does not need to fetch the token itself.

If you do not have a destination at hand the Cloud SDK supports service bindings as well.

### Early Exit

Sometimes, you may want to disable a service for certain environments or profiles (such as local development, testing, or specific deployments). CAP makes this easy by allowing you to "turn off" a plugin through configuration—without uninstalling or changing your code.

To disable a service, set the corresponding service entry in the `cds.requires` section to `null` in your application's configuration (for example, in your `package.json` or a profile-specific `.cdsrc.json`):

```json
"cds": {
  "requires": {
    "my-service": null
  }
}
```

This tells CAP to skip loading and initializing the service.

**Best Practice:**  
Always check if your service is enabled before registering handlers or running plugin logic. This ensures your plugin is only active when explicitly configured.

::: code-group

```js [cds-plugin.js]
const cds = require('@sap/cds')
// Only activate plugin if the service is enabled
if (cds.env.requires['my-service']) {
  cds.on('served', () => {
    // Plugin logic here
  })
}
```
:::

By following this pattern, you give application developers full control to enable or disable your plugin as needed, simply by adjusting configuration—no code changes required.

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

Annotations in CDS are used to enrich artifacts (entities, properties, associations, etc.) with metadata or additional semantics. In the compiled CSN (Core Schema Notation), these annotations are normalized and flattened into object properties for easier programmatic access.

For example, consider the following CDS snippet with several annotations:

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

After compilation, the CSN representation of the `currency` association would look like this:

```json
{
  "currency": {
    "@Common.Text": {"=": "currency.name"},
    "@Common.TextArrangement": {"#": "TextOnly"},
    "@Common.ValueListWithFixedValues": true,
    "@Common.ValueList.CollectionPath": "Currencies",
    "@Common.ValueList.Parameters": [{
      "$Type": "Common.ValueListParameterInOut",
      "LocalDataProperty": {"=": "code"},
      "ValueListProperty": "code"
    }],
    "type": "cds.Association",
    "cardinality": {"max": 1}
  }
}
```

Notice how each annotation is flattened into a property prefixed with `@`, and complex annotation values (like objects or arrays) are preserved.

### Accessing Annotations Programmatically

You can access these annotations in your plugin or service handlers by inspecting the CSN model. For example, within an event handler:

```js
const myService = await cds.connect.to("myService")
myService.after("SAVE", async function saveDraftAttachments(res, req) {
  const entity = req.target

  // Check for a specific annotation value
  if (entity?.['@Common.Text']?.['='] === "currency.name") {
    // Custom logic based on annotation
  }
})
```

This approach allows you to implement logic that reacts to specific annotations, enabling advanced scenarios such as dynamic behavior, validation, or UI hints.

> **Tip:**  
> When defining custom annotations, refer to the [Code completion](../../plugins/development-guide#code-completion) section to ensure your annotations are discoverable and usable with tooling support.


#### Dynamically modifying the model

You can change the CAP data model dynamically before it is used by CAP, for example to add new properties or associations, by listening to special [lifecycle events](./cds-compile#compile-to-edmx). These events let you modify the model just before it is used for things like creating the database, generating OData services, or running the application.

Here’s how you can do it:

```js
const cds = require('@sap/cds')

// Listen to model compilation events and enhance the model
cds.on('compile.for.runtime', model => enhanceModel(model))
cds.on('compile.to.dbx', model => enhanceModel(model))
cds.on('compile.to.edmx', model => enhanceModel(model))
```

In the `enhanceModel` function, you can add or change definitions in the model. For example, you might add new associations, properties, or even services based on certain annotations or conditions.

**Important:**  
These events can be triggered more than once for the same model. To avoid running your changes multiple times, set a flag in the model’s metadata after you’ve made your modifications:

::: code-group
```js [cds-plugin.js]
function enhanceModel(model) {
  // Use a flag to ensure modifications are only applied once
  const meta = model.meta ??= {};
  if (meta['sap.myservice.enhancements']) return;

  // Make your changes to model.definitions here

  // Set the flag so this block doesn't run again for the same model
  meta['sap.myservice.enhancements'] = true;
}
```
:::

> [!NOTE] Multi-tenancy scenarios
> If your CAP project uses multi-tenancy (MTX), the model is managed by the MTX microservice. In this case, your plugin must also be listed as a dependency in the MTX microservice’s `package.json`. This ensures your model changes are applied for every tenant.


## Registering additional handler

CAPs powerful handler loop allow plugins to add additional handlers to react on requests and modify responses.

#### Registering handlers

While usually, handlers are registered when defining the service, plugins often have to register additional handlers in existing services to add in logic of the plugin. 

Commonly the [server lifecycle](./cds-server#lifecycle-events) events are used to register additional handlers on existing services:

::: code-group
```js [❌ Bad practice]
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

The above approach has two main drawbacks:

1. **Ambiguous Handler Precedence:**  
  Using the `served` lifecycle event to register handlers can make it unclear which handler takes precedence if both your plugin and the consuming application use `srv.prepend` to add their own handlers. Since the order in which `served` event handlers are executed is not guaranteed, it's ambiguous which handler will run first. This can lead to unpredictable behavior, making it difficult for consuming applications to reliably extend or override plugin logic.

2. **Issues in Multi-Tenancy Scenarios:**  
  Registering handlers per entity at startup works for single-tenant applications, but causes problems in multi-tenant setups. The list of entities (`srv.entities`) is based on the base model (`cds.model`), which does not include tenant-specific extensions or feature toggles. In multi-tenant scenarios, the model can be extended at runtime for each tenant (for example, via [feature toggles](../guides/extensibility/feature-toggles.md) or [customer extensions](../guides/extensibility/index.md#extensibility)). At runtime, `cds.context.model` reflects the active model for the current tenant, which may include additional entities not present at startup. For example, an attachments entity from `@cap-js/attachments` might only be available when a feature toggle is enabled, so it would not appear in `cds.model` at startup but would be present in `cds.context.model` at runtime.

**Recommended Approach:**  
To avoid these issues, use CAP's mechanism for [adding generic handlers](./app-services.md#adding-generic-handlers). With this approach, application service handlers are registered first (giving them precedence), followed by generic handlers from CAP and your plugin. This ensures that plugins do not unintentionally override application logic and that handlers are correctly registered for tenant-specific models.

::: code-group
```js [✅ Good practice]
const cds = require('@sap/cds')

cds.ApplicationService.handle_my_service = cds.service.impl(function () {
  if (!cds.env.requires['my-service']) return;
  this.before('*', req => {
   if (/** Some check on req.target */) return;
   // Additional logic here
  })
})
```
:::

::: danger The dangers of generic handlers
Generic handlers are powerful but must be used with care. They will process all kinds of requests, including messaging, analytical OData calls, `$count` queries, and file streams.

- Be aware of the risks when accessing [`req.query`](./events.md#query)
- Understand the implications of using [`req.data`](./events.md#data)
- Review [performance considerations](./core-services.md#performance-considerations) for event handlers
- Consider the [effects of modifying data in after handlers](./core-services.md#implication-when-modifying-data-in-after-handlers)
:::

> [!NOTE] 
> While `before` and `after` handlers are executed in parallel by CAP, `on` handlers work like Express middlewares and must explicitly call the next handler if their conditions are not met. Always ensure your plugin's `on` handlers call the next handler when appropriate.

If you want to enhance authentication or authorization, consider using [initial handlers](./core-services.md#initial-handlers).

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
| ------------------ | ----------------------------------------- |
| `buildTaskType`    | Additional build task type                |
| `databaseType`     | Additional database type                  |
| `cds`              | One or more additional top level settings |


#### Usage In a CAP Project

<video src="./assets/schema-usage_compressed.mp4" autoplay loop muted webkit-playsinline playsinline style="border-radius: 10px" />{.ignore-dark style="width: 688px;"}


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
