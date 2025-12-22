---
synopsis: >
  API reference documentation for MTX Services.
status: released
search: false
---



# Old MTX Reference

{{ $frontmatter.synopsis }}

All APIs receive and respond with JSON payloads. Application-specific logic (for example, scope checks) can be added using [Event Handlers](#event-handlers-for-cds-mtx-apis).

::: tip _Streamlined MTX APIs_
This is the reference documentation for our old MTX implementation. To find the API reference for our new, streamlined MTX, see [MTX Services Reference](mtxs). Also find instructions about [migrating to new MTX](old-mtx-migration).
:::

## Intro & Overview

CAP provides `@sap/cds-mtx` as a Node.js module published on [npmjs.com](https://www.npmjs.com/package/@sap/cds-mtx).

It provides a number of APIs for implementing SaaS applications on SAP BTP.  All APIs are based on CDS. They can be exposed through plain REST, and/or consumed by other Node.js modules when running on the same server as `cds-mtx`:

+ _provisioning_: Implements the subscription callback API as required by SAP BTP. If a tenant subscribes to the SaaS application, the onboarding request is handled. `cds-mtx` contacts the SAP Service Manager to create a new HDI container for the tenant. Database artifacts are then deployed into this HDI container. In addition, the unsubscribe operation and the "get dependencies" operations are supported.

+ _metadata_: Can be used to get CSN and EDMX models, and to get a list of available services and languages.

+ _model_: Used to extend existing CDS models and to perform tenant model upgrades after having pushed a new version of the SaaS application.

## Provisioning API

<!-- <div id="afterprovisioningapi" /> -->

### Subscribe Tenant

```http
PUT /mtx/v1/provisioning/tenant/<tenantId> HTTP/1.1
```

Minimal request body:

```json
{
  "subscribedSubdomain": "<subdomain>",
  "eventType": "CREATE"
}
```

Only if `eventType` is set to `CREATE`, the subscription is performed.
<!-- <div id="aftersubscribetenant" />  -->

An application can mix in application-specific parameters into this payload, which it can interpret within application handlers. Use the `_application_` object to specify those parameters. There's one predefined `sap` object, which is interpreted by `cds-mtx` default handlers. With that object, you can set service creation parameters to be used by the SAP Service Manager when creating HDI container service instances. A typical use case is to provide the `database_id` to distinguish between multiple SAP HANA databases mapped to one Cloud Foundry space.

```json
{
  "subscribedSubdomain": "<subdomain>",
  "eventType": "CREATE",
  "_application_": {
    "sap": {
      "service-manager": {
        "provisioning_parameters": { "database_id": "<HANA DB GUID>" }
      }
    }
  }
}
```

> If you have more than one SAP HANA database mapped to one space, subscription doesn't work out of the box, unless you've specified a default database.
>

You can also set a default database using the <Config>cds.mtx.provisioning.container</Config> environment configuration.

As the `database_id` is only known when deploying the application, it's recommended to add the configuration as an environment variable in a _*.mtaext_ file for deployment only:

```yaml
 - name: bookshop-srv
   type: nodejs
   path: gen/srv
   properties:
     CDS_MTX_PROVISIONING_CONTAINER: { "provisioning_parameters": { "database_id": "<DB ID>" } }

```

The `provisioning_parameters` specified in the request overwrite the configured `provisioning_parameters`.

### Unsubscribe Tenant

```http
DELETE /mtx/v1/provisioning/tenant/<tenantId> HTTP/1.1
```

### Subscription Dependencies

```http
GET /mtx/v1/provisioning/dependencies HTTP/1.1
```

Response body: `Array of String`. The default implementation returns an empty array.

### GET Subscribed Tenants

```http
GET /mtx/v1/provisioning/tenant/ HTTP/1.1
```

Returns the list of subscribed tenants. For each tenant, the request body that was used for subscribing the tenant is returned.

## Model API

### Get CDS Model Content

```http
GET mtx/v1/model/content/<tenantId> HTTP/1.1
```

Returns the two objects `base` and `extension` in the response body:

```json
{
  "base": "<base model cds files>",
  "extension": "<extension cds files>"
}
```

### Activate Extensions

```http
POST mtx/v1/model/activate HTTP/1.1
```

Request body (example):

 ```json
{
  "tenant": "tenant-extended",
  "extension": "<cds extension files>",
  "undeployExtension": false
}
 ```

The `extension` element must be a JSON array of arrays. Each first-level array element corresponds to a CDS file containing CDS extensions. Each second-level array element must be a two-entry array. The first entry specifies the file name. The second entry specifies the file content. Extension files for data models must be placed in a `db` folder. Extensions for services must be placed in an `srv` folder. Entities of the base model (the non-extended model) are imported by `using ... from '_base/...'`.

If the `undeployExtension` flag is set, all extensions are undeployed from the database that are no longer part of the extensions in the current activation call.

::: warning _❗ Warning_ <!--  -->
`undeployExtension` has to be used with care as it potentially removes tables and their content from the database.
:::

Request body detailed sample:

```json
{
"tenant": "tenant-extended",
"extension": [
  [
  "db/ext-entities.cds",
  "using my.bookshop from '_base/db/data-model'; \n extend entity bookshop.Books with { \n ISBN: String; \n rating: Integer \n  }"
  ],
  [
  "db/new-entities.cds",
  "namespace com.acme.ext; \n entity Categories { \n key ID: String; \n description: String; \n }"
  ],
  [
  "srv/ext-service.cds",
  "using CatalogService from '_base/srv/cat-service'; \n using com.acme.ext from '../db/new-entities'; \n extend service CatalogService with { \n  @insertonly entity Categories as projection on ext.Categories; \n }"
  ]
  ],
"undeployExtension": false
}
```

### Deactivate Extension

```http
POST /mtx/v1/model/deactivate HTTP/1.1
```

Request body (example):

```json
{
  "tenant": "tenant-extended",
  "extension_files": [
    "srv/ext-service.cds"
  ]
}
```

`extension_files` is an array of the files that are to be removed from the extensions.

Use this API to deactivate extension. To activate and deactivate an extension in one call, use `activate` with `undeployExtension: true`.

::: warning _❗ Warning_ <!--  -->
The API has to be used with care as it removes tables and their content from the database.
:::

### Reset Extension

```http
POST /mtx/v1/model/reset HTTP/1.1
```

Request body (example):

```json
{
  "tenant": "tenant-extended"
}
```

Use this API to remove all extensions.

::: warning _❗ Warning_ <!--  -->
The API has to be used with care as it removes tables and their content from the database.
:::
<!-- Calling `deactivate` requires scope `ExtendCDSDelete`. -->

### Upgrade Base Model from Filesystem (Asynchronous)

```http
POST mtx/v1/model/asyncUpgrade HTTP/1.1
```

Request body:

```json
{
  "tenants": ["tenant-extended-1", "tenant-non-extended-2", ...],
  "autoUndeploy": <boolean>
}
```

Upgrade all tenants with request body `{ "tenants": ["all"] }`.

If `autoUndeploy` is set to `true`, the auto-undeploy mode of the HDI deployer is used. See [HDI Delta Deployment and Undeploy Allow List](https://help.sap.com/docs/HANA_CLOUD_DATABASE/c2b99f19e9264c4d9ae9221b22f6f589/ebb0a1d1d41e4ab0a06ea951717e7d3d.html) for more details.

Response (example):

```json
{ "jobID": "iy5u935lgaq" }
```

You can use the ``jobID`` to query the status of the upgrade process:

```http
GET /mtx/v1/model/status/<jobID> HTTP/1.1
```

During processing, the response can look like this:

```json
{
  "error": null,
  "status": "RUNNING",
  "result": null
}
```

Once a job is finished, the collective status is reported like this:

```json
{
  "error": null,
  "status": "FINISHED",
  "result": {
      "tenants": {
          "<tenantId1>": {
              "status": "SUCCESS",
              "message": "",
              "buildLogs": "<build logs>"
          },
          "<tenantId2>": {
              "status": "FAILURE",
              "message": "<some error log output>",
              "buildLogs": "<build logs>"
          }
      }
  }
}
```

The status of a job can be `QUEUED` (not started yet), `RUNNING`, `FINISHED`, or `FAILED`.

The result status of the upgrade operation per tenant can be `RUNNING`, `SUCCESS`, or `FAILURE`.

> Logs are persisted for a period of 30 minutes before they get deleted automatically. If you request the job status after that, you'll get a `404 Not Found` response.

## Metadata API

All metadata APIs support eTags. By [setting the corresponding header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag), you can check for model updates.

### GET EDMX

```http
GET /mtx/v1/metadata/edmx/<tenantId> HTTP/1.1
```

Returns the EDMX metadata of the (extended) model of the application.

Optional URL parameters

```http
name=<service-name>
language=<language-code>
```

### GET CSN

```http
GET /mtx/v1/metadata/csn/<tenantId> HTTP/1.1
```

Returns the compiled (extended) model of the application.

### GET Languages

```http
GET /mtx/v1/metadata/languages/<tenantId> HTTP/1.1
```

Returns the supported languages of the (extended) model of the application.

### GET Services

```http
GET /mtx/v1/metadata/services/<tenantId> HTTP/1.1
```

Returns the services of the (extended) model of the application.

## Diagnose API

### GET Jobs

```http
GET /mtx/v1/diagnose/jobs HTTP/1.1
```

Returns information about the job queue, including waiting or running jobs.

### GET Memory

```http
GET /mtx/v1/diagnose/memory HTTP/1.1
```

Returns information about the memory usage.

### GET Container

```http
GET /mtx/v1/diagnose/container/<tenantId> HTTP/1.1
```

Returns information about a tenant's HDI container.

<span id="aftergetcontainer" />

## Adding Custom Handlers { #event-handlers-for-cds-mtx-apis}

> ---
>
> If you're using a CAP Java server, it re-exposes the APIs required by SAP BTP's SaaS Manager (the Provisioning API). We recommended leveraging the corresponding [Java-based mechanisms to add handlers](../../java/multitenancy#custom-logic) to these APIs. Handlers for the Model-API of `cds-mtx` must always be implemented on the Node.js server, because this API isn't re-exposed by the CAP Java runtime.
>
> ---

`cds-mtx` APIs are implemented as CDS services. Therefore, service implementations can be overridden using [CDS event handlers](../../node.js/core-services#srv-on-before-after).
For `cds-mtx` APIs, custom handlers have to be registered on the `mtx` event in a [custom `server.js`](../../node.js/cds-serve#custom-server-js):

```js
const cds = require('@sap/cds')

cds.on('mtx', async () => {
  const provisioning = await cds.connect.to('ProvisioningService')
  provisioning.prepend(() => {
    provisioning.on('UPDATE', 'tenant', async (req, next) => {
      await next() // default implementation creating HDI container
      return '<bookshop-srv-url>/admin'
    })
  })
})
```

See the following use cases for more examples.

### Use Case: Implement a Tenant Provisioning Handler { #event-handlers-for-cds-mtx-provisioning}

You can set an application entry point for the subscription in the SAP BTP Cockpit (usually a UI).

Create a `provisioning.js` file in the `srv` folder:

```js
module.exports = (service) => {
  service.on('UPDATE', 'tenant', async (req, next) => {
    await next() // default implementation creating HDI container
    return '<bookshop-srv-url>/admin'
  })
}
```

In the provided code sample, you have to replace `<bookshop-srv-url>` with the URL of your `bookshop-srv` application on Cloud Foundry. In this example, the _/admin_ endpoint is returned. It's important that this endpoint isn't protected (doesn't require a JWT token).

Custom code after **asynchronous** provisioning can be invoked with handlers for the internal endpoint to create tenants. This endpoint is called for both synchronous and asynchronous provisioning:

```js
module.exports = (service) => {
  service.on('createTenant', async (req, next) => {
    await next() // default implementation creating HDI container
    const { subscriptionData } = req.data // original request payload
    // custom code
    return '<bookshop-srv-url>/admin'
  })
}
```

### Use Case: Handler for Tenant Upgrade { #event-handlers-for-cds-mtx-upgrade}

To execute custom code for tenant upgrades (see also [Tenant upgrade API](old-mtx-apis)), you can add handlers for the upgrade API that is called by `cds-mtx`. This API is called for the synchronous, as well as the asynchronous upgrade for each tenant.

```js
module.exports = (service) => {
  service.on('upgradeTenant', async (req, next) => {
    await next() // call the upgrade
    const {
      instanceData, // HDI container metadata
      deploymentOptions // additional deployment options, for example, `autoUndeploy`
    } = cds.context.req.body
    // custom code
  })
}
```

### Use Case: Handler for Database Deployment { #event-handlers-for-cds-mtx-hana-deployment}

To add custom code to the deployment of your application model to the SAP HANA database, you can add handlers for the deployment API called by `cds-mtx`.

This example dynamically adds an additional SAP HANA service to the environment, so it can be used through synonyms (see also [Enable Access to Objects in Another HDI Container](https://help.sap.com/docs/HANA_CLOUD_DATABASE/c2b99f19e9264c4d9ae9221b22f6f589/4adba34bd86544a880db8f9f1e32efb7.html)):

```js
module.exports = (service) => {
  service.before('deployToDb', async (context) => {
    const {
      sourceDir, // directory with generated SAP HANA sources
      instanceData, // HDI container metadata
      deploymentOptions // additional deployment options, for example, `autoUndeploy`
    } = cds.context.req.body;
    // ...
    const hana = [{
     "label": "hana",
     "provider": null,
     "plan": "hdi-shared",
     "name": "common-db-sample",
     "<custom-key>": "value"
    }];
    context.data.additionalServices.hana = hana;
  });
}
```

## Appendix — Configuration

### App Router { #approuter-config}

Configure your App Router as follows.

1. Enable token forwarding, for example:

   ::: code-group

   ```yaml [mta.yaml]
     - name: approuter
       requires:
         - name: mtx-sidecar
           group: destinations
           properties:
             name: mtx-sidecar
             url: ~{url}
             forwardAuthToken: true
   ```

   :::

2. Configure a [route to MTX-Sidecar](../extensibility/customization#app-router) with authentication data being passed on to MTX for verification.

   You may have to adjust the `destination` name according to your configuration for MTX in [mta.yaml](https://help.sap.com/docs/CP_CONNECTIVITY/cca91383641e40ffbe03bdc78f00f681/8aeea65eb9d64267b554f64a3db8a349.html)
    or [manifest.yml](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/3cc788ebc00e40a091505c6b3fa485e7.html#destinations), for example:

    ```yaml
    modules:
      - name: sidecar
        provides:
          - name: mtx-sidecar
            properties:
              url: ${default-url}
    ```

<div id="appendix-configuration" />

<div id="shared-service-manager" />


## Further Readings

SAP BTP concepts for multitenancy are described in detail:

+ [Developing Multitenant Applications in the Cloud Foundry Environment](https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/5e8a2b74e4f2442b8257c850ed912f48.html)

<!-- <div id="afterfurtherreadings" /> -->
