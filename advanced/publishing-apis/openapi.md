---
shorty: OpenAPI
synopsis: >
  About how to publish service APIs in OpenAPI format.
status: released
---

<style scoped>
  /* expand this extra wide table on big screens */
  @media screen and (min-width: 1600px) {
    table { width: max-content; }
  }
</style>


# Publishing to OpenAPI

You can convert CDS models to the [OpenAPI Specification](https://www.openapis.org), a widely adopted API description standard.

[[toc]]

## Usage from CLI { #cli}

For example, this is how you convert all services in `srv/` and store the API files in the `docs/` folder:

```sh
cds compile srv --service all -o docs --to openapi
```

With the `--openapi:diagram` parameter, you can also include a [yuml](https://yuml.me/) entity-relationship diagram of the service entities in the Open API file.

![A screenshot of the entity-relationship diagram.](assets/openapi-diagram.png){ .adapt }

The default value of the server URL is the service base path as declared in the CDS source.

If you have a **single server** and you want to set the server URL, use `--openapi:url <Server URL for Open API export>` option. Include the service path in the URL. For that, you can use the `${service-path}` variable.

If you want to configure **multiple servers**, you can use `--openapi:servers <JSON_Object_defining_servers>` which accepts stringified JSON of the server object.
Here, you can pass multiple server objects by passing the stringified JSON objects as an array.

```sh
cds compile srv service.cds --to openapi --openapi:servers "\"'[{\\\"url\\\":\\\"api.sandbox.com\\\",\\\"description\\\":\\\"Test URL\\\"},{\\\"url\\\":\\\"api.prod.com\\\",\\\"description\\\":\\\"Production URL\\\"}]'\""
```

_Note:_ `--openapi:url` is ignored when this option is specified.

Use the `--openapi:config-file <JSON_config_filepath>` option to provide configurations for all supported options in a configuration file. This file accepts a JSON format that incorporates all the OpenAPI compile options. Inline options take precedence over those defined in the configuration file.

```sh
cds compile srv service.cds --to openapi --openapi:config-file configFile.json
```

Here is an example where `--openapi:config-file` option is used with other inline options:

```sh
cds compile srv service.cds --to openapi --openapi:config-file configFile.json --odata-version 4.0 --openapi:diagram false
```

In the above command, the `--openapi:diagram` and `--odata-version` inline options override the `--openapi:diagram` and `--odata-version` options in the _configFile.json_ if they are also present there.

## Swagger UI { #swagger-ui}

#### Embedded in Node.js

In Node.js apps, the standard Swagger UI can be served with the help of the [`cds-swagger-ui-express`](https://www.npmjs.com/package/cds-swagger-ui-express) package:

```sh
npm add --save-dev cds-swagger-ui-express
```

Swagger UI is then served at `$api-docs/...`.  Just follow the _Open API preview_ links on the index page:
![A screenshot showing the link to the Swagger UI.](assets/swagger-link.png){style="margin:5px auto;width:50%" .adapt}


#### Embedded in Java

Swagger UI is not available out of the box for CAP Java. However, check out this [commit in our CAP Java sample application](https://github.com/SAP-samples/cloud-cap-samples-java/commit/67f0ba618fc7da131d1a104f7a23e8b836e14d93) that demonstrates how to integrate a Swagger UI into your Spring Boot application.

#### Online Swagger Editor

Alternatively, you can use the [online Swagger editor](https://editor.swagger.io/) with the OpenAPI files produced with the [CLI](#cli).
In this case, you likely need to enable [CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing) because the `swagger.io` site needs to call `localhost`. You can use the [`cors` middleware](https://www.npmjs.com/package/cors), for example.

## Annotations

The OData to OpenAPI Mapping can be fine-tuned via annotations in the CSDL (`$metadata`) documents.

See [Frequently Asked Questions](#faq) for examples on how to use these annotations.


## [Core Annotations](https://github.com/oasis-tcs/odata-vocabularies/blob/master/vocabularies/Org.OData.Core.V1.md)

| Term               | Annotation Target                                                             | OpenAPI field                                                     |
|--------------------|-------------------------------------------------------------------------------|-------------------------------------------------------------------|
| `Computed`         | Property                                                                      | omit from Create and Update structures                            |
| `DefaultNamespace` | Schema                                                                        | path templates for actions and functions without namespace prefix |
| `Description`      | Action, ActionImport, Function, FunctionImport                                | `summary` of Operation Object                                     |
| `Description`      | EntitySet, Singleton                                                          | `description` of Tag Object                                       |
| `Description`      | EntityType                                                                    | `title` of Request Body Object                                    |
| `Description`      | ComplexType, EntityType, EnumerationType, Parameter, Property, TypeDefinition | `title` of Schema Object                                          |
| `Description`      | Schema, EntityContainer                                                       | `info.title`                                                      |
| `Example`          | Property                                                                      | `example` of Schema Object                                        |
| `Immutable`        | Property                                                                      | omit from Update structure                                        |
| `LongDescription`  | Action, ActionImport, Function, FunctionImport                                | `description` of Operation Object                                 |
| `LongDescription`  | Schema, EntityContainer                                                       | `info.description`                                                |
| `Permissions:Read` | Property                                                                      | omit read-only properties from Create and Update structures       |
| `SchemaVersion`    | Schema                                                                        | `info.version`                                                    |


## [Capabilities](https://github.com/oasis-tcs/odata-vocabularies/blob/master/vocabularies/Org.OData.Capabilities.V1.md)

| Term                                                        | Annotation Target    | OpenAPI field                                                                                         |
|-------------------------------------------------------------|----------------------|-------------------------------------------------------------------------------------------------------|
| `CountRestrictions`<br />&emsp;`/Countable`                 | EntitySet            | `$count` system query option for `GET` operation                                                      |
| `DeleteRestrictions`<br />&emsp;`/Deletable`                | EntitySet, Singleton | `DELETE` operation for deleting an existing entity                                                    |
| &emsp;`/Description`                                        | EntitySet, Singleton | `summary` of Operation Object                                                                         |
| &emsp;`/LongDescription`                                    | EntitySet, Singleton | `description` of Operation Object                                                                     |
| `ExpandRestrictions`<br />&emsp;`/Expandable`               | EntitySet, Singleton | `$expand` system query option for `GET` operations                                                    |
| `FilterRestrictions`<br />&emsp;`/Filterable`               | EntitySet            | `$filter` system query option for `GET` operation                                                     |
| &emsp;`/RequiredProperties`                                 | EntitySet            | required properties in `$filter` system query option for `GET` operation (parameter description only) |
| &emsp;`/RequiresFilter`                                     | EntitySet            | `$filter` system query option for `GET` operation is `required`                                       |
| `IndexableByKey`                                            | EntitySet            | `GET`, `PATCH`, and `DELETE` operations for a single entity within an entity set                      |
| `InsertRestrictions`<br />&emsp;`/Insertable`               | EntitySet            | `POST` operation for inserting a new entity                                                           |
| &emsp;`/Description`                                        | EntitySet            | `summary` of Operation Object                                                                         |
| &emsp;`/LongDescription`                                    | EntitySet            | `description` of Operation Object                                                                     |
| `KeyAsSegmentSupported`                                     | EntityContainer      | `paths` URL templates use key-as-segment style instead of parenthesis style                           |
| `NavigationRestrictions`<br />&emsp;`/RestrictedProperties` | EntitySet, Singleton | operations via a navigation path                                                                      |
| &emsp;&emsp;`/DeleteRestrictions/...`                       | EntitySet, Singleton | `DELETE` operation for deleting a contained entity via a navigation path                              |
| &emsp;&emsp;`/FilterRestrictions/...`                       | EntitySet, Singleton | `$filter` system query option for reading related entities via a navigation path                      |
| &emsp;&emsp;`/InsertRestrictions/...`                       | EntitySet, Singleton | `POST` operation for inserting a new related entity via a navigation path                             |
| &emsp;&emsp;`/ReadByKeyRestrictions/...`                    | EntitySet, Singleton | `GET` operation for reading a contained entity by key via a navigation path                           |
| &emsp;&emsp;`/ReadRestrictions/...`                         | EntitySet, Singleton | `GET` operation for reading related entities via a navigation path                                    |
| &emsp;&emsp;`/SearchRestrictions/...`                       | EntitySet, Singleton | `$search` system query option for reading related entities via a navigation path                      |
| &emsp;&emsp;`/SelectSupport/...`                            | EntitySet, Singleton | `$select` system query option for reading related entities via a navigation path                      |
| &emsp;&emsp;`/SkipSupported`                                | EntitySet, Singleton | `$skip` system query option for reading contained entities via a navigation path                      |
| &emsp;&emsp;`/SortRestrictions/...`                         | EntitySet, Singleton | `$orderby` system query option for reading related entities via a navigation path                     |
| &emsp;&emsp;`/TopSupported`                                 | EntitySet, Singleton | `$top` system query option for reading contained entities via a navigation path                       |
| &emsp;&emsp;`/UpdateRestrictions/...`                       | EntitySet, Singleton | `PATCH` operation for modifying a contained entity via a navigation path                              |
| &emsp;`/Description`                                        | EntitySet            | `summary` of Operation Object                                                                         |
| &emsp;`/LongDescription`                                    | EntitySet            | `description` of Operation Object                                                                     |
| `ReadRestrictions`<br />&emsp;`/Readable`                   | EntitySet, Singleton | `GET` operation for reading an entity set or singleton                                                |
| &emsp;`/Description`                                        | EntitySet, Singleton | `summary` of Operation Object                                                                         |
| &emsp;`/LongDescription`                                    | EntitySet, Singleton | `description` of Operation Object                                                                     |
| &emsp;`ReadByKeyRestrictions`<br />&emsp;&emsp;`/Readable`  | EntitySet            | `GET` operation for reading a single entity by key                                                    |
| `SearchRestrictions`<br />&emsp;`/Searchable`               | EntitySet            | `$search` system query option for `GET` operation                                                     |
| `SelectSupport`<br />&emsp;`/Supported`                     | EntitySet, Singleton | `$select` system query option for `GET` operation                                                     |
| `SkipSupported`                                             | EntitySet            | `$skip` system query option for `GET` operation                                                       |
| `SortRestrictions`<br />&emsp;`/NonSortableProperties`      | EntitySet            | properties not listed in `$orderby` system query option for `GET` operation                           |
| &emsp;`/Sortable`                                           | EntitySet            | `$orderby` system query option for `GET` operation                                                    |
| `TopSupported`                                              | EntitySet            | `$top` system query option for `GET` operation                                                        |
| `UpdateRestrictions`<br />&emsp;`/Updatable`                | EntitySet, Singleton | `PATCH` operation for modifying an existing entity                                                    |
| &emsp;`/Description`                                        | EntitySet, Singleton | `summary` of Operation Object                                                                         |
| &emsp;`/LongDescription`                                    | EntitySet, Singleton | `description` of Operation Object                                                                     |
| `BatchSupport`<br />&emsp;`/Supported`                      | EntityContainer      | `Batch` Support for the service                                                                       |


## [Validation](https://github.com/oasis-tcs/odata-vocabularies/blob/master/vocabularies/Org.OData.Validation.V1.md)

| Term            | Annotation Target | OpenAPI field                                             |
|-----------------|-------------------|-----------------------------------------------------------|
| `AllowedValues` | Property          | `enum` of Schema Object - list of allowed (string) values |
| `Exclusive`     | Property          | `exclusiveMinimum`/`exclusiveMaximum` of Schema Object    |
| `Maximum`       | Property          | `maximum` of Schema Object                                |
| `Minimum`       | Property          | `minimum` of Schema Object                                |
| `Pattern`       | Property          | `pattern` of Schema Object                                |


## [Authorization](https://github.com/oasis-tcs/odata-vocabularies/blob/master/vocabularies/Org.OData.Authorization.V1.md)

| Term              | Annotation Target | OpenAPI field                                                                  |
|-------------------|-------------------|--------------------------------------------------------------------------------|
| `Authorizations`  | EntityContainer   | `securitySchemes` of Components Object/`securityDefinitions` of Swagger Object |
| `SecuritySchemes` | EntityContainer   | `security` of OpenAPI/Swagger Object                                           |

This is an example of a CDS service annotated with the annotations above:

```cds
annotate MyService with @(
  Authorization: {
    Authorizations: [
      { $Type : 'Authorization.Http', Name : 'Basic', Scheme : 'basic' },
      { $Type : 'Authorization.Http', Name : 'JWT',   Scheme : 'bearer', BearerFormat : 'JWT' },
      { $Type : 'Authorization.OAuth2ClientCredentials', Name : 'OAuth2',
        Scopes     : [{
          Scope      : 'some_scope',
          Description: 'Scope description'
        }],
        RefreshUrl : 'https://some.host/oauth/token/refresh',
        TokenUrl   : 'https://some.host/oauth/token'
      },
    ],
    SecuritySchemes: [
      { Authorization : 'Basic' },
      { Authorization : 'JWT', RequiredScopes : [] },
      { Authorization : 'OAuth2' },
    ]
  }
);
```
[See it in context.](https://github.com/chgeo/cds-swagger-ui-express/blob/651013b529168b30c024f8653c249f170ba9d114/tests/app/services.cds#L35-L55){.learn-more}


## [Common](https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/Common.md)

| Term               | Annotation Target            | OpenAPI field                                                      |
|--------------------|------------------------------|--------------------------------------------------------------------|
| `Label`            | EntitySet, Singleton         | `name` of Tag Object and entry in `tags` array of Operation Object |


## OpenAPI

| Term              | Annotation Target | OpenAPI field                                                                  |
|-------------------|-------------------|--------------------------------------------------------------------------------|
| `externalDocs`  | EntityContainer   | Links to external documentation that explain more about APIs are helpful to developers. |
| `Extensions` | EntityContainer   | To add the sap defined (`x-sap`) specification extensions. This annotation can an be used in root, entity and in function/action level.                                        |


This is an example of a CDS service annotated with the annotations above:

```cds
annotate SampleService with @(
    OpenAPI:{
        externalDocs: {
            description: 'API Guide',
            url        : 'https://help.sap.com/docs/product/sample.html'
        },
        Extensions: {
        ![compliance-level]: 'sap:base:v1'
      }
    }
);
```


## Frequently Asked Questions { #faq label='FAQs'}

Examples for typical questions on how to fine-tune the generated OpenAPI descriptions.

### Suppress GET (list and by-key) on an entity set?

To suppress both types of GET requests to an entity set, annotate it with

```json
"@Capabilities.ReadRestrictions": {
    "Readable": false
}
```

### Suppress GET (list) on an entity set?

To suppress only GET list requests to an entity set and still allow GET by-key, annotate it with

```json
"@Capabilities.ReadRestrictions": {
    "Readable": false,
    "ReadByKeyRestrictions": {
        "Readable": true
    }
}
```


### Suppress GET (by-key) on an entity set?

To suppress only GET by-key requests to an entity set and still allow GET list, annotate it with

```json
"@Capabilities.ReadRestrictions": {
    "ReadByKeyRestrictions": {
        "Readable": false
    }
}
```
