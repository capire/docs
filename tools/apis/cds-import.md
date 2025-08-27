---
status: released
synopsis: >
  Programmatically use <code>cds.import</code>.
---

# CDS Import API

[[toc]]



## cds.import() {.method}

As an application developer, you have the option to convert OData specification (EDMX / XML), OpenAPI specification (JSON) or AsyncAPI specification (JSON) files to CSN from JavaScript API as an alternative to the `cds import` command.

> `cds.import` is available in the CDS development tool kit *version 4.3.1* onwards .

The API signature looks like this:

```js
const csn = await cds.import(file, options)
```

##### Arguments:

* `file` &mdash; Specify the path to a single input file to be converted for CSN.
* `options` &mdash; `cds.import()` support the following `options`:

#### <span style="font-weight:400">options</span>.keepNamespace

_This option is only applicable for OData conversion._ <br>

| Value   | Description                                        |
|---------|----------------------------------------------------|
| `true`  | Keep the original namespace from the EDMX content. |
| `false` | Take the filename as namespace.                    |

> If the option is not defined, then the CSN is generated with the namespace defined as EDMX filename.
<br>

#### <span style="font-weight:400">options</span>.includeNamespaces

_This option is only applicable for OData conversion._ <br>
It accepts a list of namespaces whose attributes are to be retained in the CSN / CDS file. To include all the namespaces present in the EDMX pass "*".

> For OData V2  EDMX attributes with the namespace "sap" & "m" are captured by default.

<br>

## cds.import.from.edmx() {.method}

This API can be used to convert the OData specification file (EDMX / XML) into CSN.
The API signature looks like this:
```js
const csn = await cds.import.from.edmx(ODATA_EDMX_file, options)
```


<br>

## cds.import.from.openapi() {.method}

This API can be used to convert the OpenAPI specification file (JSON) into CSN.
The API signature looks like this:
```js
const csn = await cds.import.from.openapi(OpenAPI_JSON_file)
```
<br>

[Learn more about OpenAPI to OData Mapping.](#openapi-to-cds-odata-csn-conversion-mapping){.learn-more}

## cds.import.from.asyncapi() {.method}

This API can be used to convert the AsyncAPI specification file (JSON) into CSN.
The API signature looks like this:
```js
const csn = await cds.import.from.asyncapi(AsyncAPI_JSON_file)
```
<br>

Example:

```js
const cds = require('@sap/cds-dk')
module.exports = async (srv) => {
  const csns = await Promise.all([
    // for odata
    cds.import('./odata_sample.edmx', { includeNamespaces: 'sap,c4c', keepNamespace: true }),
    // for openapi
    cds.import('./openapi_sample.json'),
    // for asyncapi
    cds.import('./asyncapi_sample.json'),
    // for odata
    cds.import.from.edmx('./odata_sample.xml', { includeNamespaces: '*', keepNamespace: false }),
    // for openapi
    cds.import.from.openapi('./openapi_sample.json')
    // for asyncapi
    cds.import.from.asyncapi('./asyncapi_sample.json')
  ]);

  for (let i = 0; i < csns.length; i++) {
    let json = cds.compile.to.json (csns[i])
    console.log (json)
  }
}
```



## OData Type Mappings

The following mapping is used during the import of an external service API, see [Using Services](../../guides/using-services#external-service-api). In addition, the [Mapping of CDS Types](../../advanced/odata#type-mapping) shows import-related mappings.

| OData                                                  | CDS Type                                                                     |
|--------------------------------------------------------|------------------------------------------------------------------------------|
| _Edm.Single_                                           | `cds.Double` + `@odata.Type: 'Edm.Single'`                                   |
| _Edm.Byte_                                             | `cds.Integer` + `@odata.Type: 'Edm.Byte'`                                    |
| _Edm.SByte_                                            | `cds.Integer` + `@odata.Type: 'Edm.SByte'`                                   |
| _Edm.Stream_                                           | `cds.LargeBinary` + `@odata.Type: 'Edm.Stream'`                              |
| _Edm.DateTimeOffset<br>Precision : Microsecond_        | `cds.Timestamp` + `@odata.Type:'Edm.DateTimeOffset'` + `@odata.Precision:<>` |
| _Edm.DateTimeOffset<br>Precision : Second_             | `cds.DateTime` + `@odata.Type:'Edm.DateTimeOffset'` + `@odata.Precision:0`   |
| _Edm.DateTime<br>Precision : Microsecond_ <sup>1</sup> | `cds.Timestamp` + `@odata.Type:'Edm.DateTime'` + `@odata.Precision:<>`       |
| _Edm.DateTime<br>Precision : Second_ <sup>1</sup>      | `cds.DateTime` + `@odata.Type:'Edm.DateTime'` + `@odata.Precision:0`         |

<sup>1</sup> only OData V2

## OpenAPI to CDS (OData CSN) Conversion Mapping

| **OpenAPI**                        | **OData Equivalent**                                   |
|---------------------------------------------|--------------------------------------------------------------|
| `info.title`                                 | `serviceName`, `@Core.Description`                           |
| `info.version`                               | `@Core.SchemaVersion`                                       |
| `info.description`                           | `@Core.LongDescription`                                     |
| `paths.{path}.{method}`                      | `function` (GET) or `action` (others)                        |
| `tags[0]`                                    | `@Common.Label`                                              |
| `summary` / `description`                    | `@Core.Description`, `@Core.LongDescription`                |
| `parameters[].in`                            | `@openapi.in`                                                |
| `parameters[].name`                          | Transformed param name + `@openapi.name` if needed           |
| `parameters[].required`                      | `@openapi.required`                                          |
| `parameters[].style`, `explode`, `allowReserved` | `@openapi.style`, `@openapi.explode`, `@openapi.allowReserved` |
| `parameters[].default`                       | `default: { val: ... }`                                      |
| `parameters[].description`                   | `@description`                                               |
| `requestBody.content.application/json.schema` | `params.body`                                               |
| `requestBody.$ref`                           | Dereferenced and used                                       |
| `responses["2XX"].content.application/json`  | `returns`                                                    |
| `$ref`                                       | `type` or `includes`                                         |
| `components.schemas` / `definitions`         | Named `types`                                                |
| `enum`                                       | `enum`, `@assert.range`                                      |
| `format: date/time/uuid/binary`              | `cds.Date`, `cds.Time`, `cds.Timestamp`, `cds.UUID`, etc.    |
| `pattern`                                    | `@assert.format`                                             |
| `allOf`, `anyOf`, `oneOf`                    | `@openapi.allOf`, `@openapi.anyOf`, `@openapi.oneOf`         |
| `example` / `examples[0]`                    | `@Core.Example.Value`                                        |
| `type: object` with `properties`             | `elements`                                                   |
| `required` (on properties)                   | `@mandatory`                                                 |
