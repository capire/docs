---
shorty: OData
synopsis: >
  Find details about CAP's support for the OData protocol.
permalink: advanced/odata
status: released
---

<script setup>
  import { h } from 'vue'
  const X =  () => h('span', { class: 'ga',      title: 'Available' },      ['✓']   )
  const Na = () => h('i',    { class: 'na',      title: 'not applicable' }, ['n/a'] )
  const D =  () => h('i',    { class: 'prog',    title: 'in progress'  },   ['in prog.'] )
  const O =  () => h('i',    { class: 'plan',    title: 'planned'  },       ['planned'] )
</script>
<style scoped>
  .ga   { color: var(--vp-c-green-2); font-weight:900;}
  .na   { color: #aaa; font-size:90%; }
  .prog { color: var(--vp-c-green-3); font-size:90%; font-weight:500; }
  .plan { color: #089; font-size:90% }
</style>

# Serving OData APIs

[[toc]]

## Feature Overview { #overview}

OData is an OASIS standard that enhances plain REST with standardized system query options like `$select`, `$expand`, `$filter`, and others. The following table provides an overview of the feature coverage:

| Query Options  | Remarks                                   | Node.js    | Java    |
|----------------|-------------------------------------------|:------------:|:---------:|
| `$search`      | Search in multiple/all text elements<sup>(1)</sup>| <X/> | <X/>   |
| `$value`       | Retrieves single rows/values              | <X/>      | <X/>  |
| `$top`,`$skip` | Requests paginated results                | <X/>      | <X/>   |
| `$filter`      | Like SQL where clause                     | <X/>      | <X/>   |
| `$select`      | Like SQL select clause                    | <X/>      | <X/>   |
| `$orderby`     | Like SQL order by clause                  | <X/>      | <X/>   |
| `$count`       | Gets number of rows for paged results     | <X/>      | <X/>   |
| `$apply`       | For [data aggregation](#data-aggregation) | <X/>      | <X/>   |
| `$expand`      | Deep-read associated entities             | <X/>      | <X/>   |
| [Lambda Operators](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html#_Toc31361024)   | Boolean expressions on a collection       | <X/>      | <X/> <sup>(2)</sup> |
| [Parameters Aliases](https://docs.oasis-open.org/odata/odata/v4.01/os/part1-protocol/odata-v4.01-os-part1-protocol.html#sec_ParameterAliases) | Replace literal value in URL with parameter alias | <X/> | <X/> <sup>(3)</sup>   |

- <sup>(1)</sup> The elements to be searched are specified with the [`@cds.search` annotation](../guides/providing-services#searching-data).
- <sup>(2)</sup> The navigation path identifying the collection can only contain one segment.
- <sup>(3)</sup> Supported for key values and for parameters of functions only.

System query options can also be applied to an [expanded navigation property](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html#_Toc31361039) (nested within `$expand`):

| Query Options  | Remarks                                  | Node.js | Java  |
|----------------|------------------------------------------|:-------:|:-----:|
| `$select`      | Select properties of associated entities |  <X/>   | <X/>  |
| `$filter`      | Filter associated entities               |  <X/>   | <X/>  |
| `$expand`      | Nested expand                            |  <X/>   | <X/>  |
| `$orderby`     | Sort associated entities                 |  <X/>   | <X/>  |
| `$top`,`$skip` | Paginate associated entities             |  <X/>   | <X/>  |
| `$count`       | Count associated entities                |  <Na/>  | <X/>  |
| `$search`      | Search associated entities               |  <Na/>  | <Na/> |


[Learn more in the **Getting Started guide on odata.org**.](https://www.odata.org/getting-started/){.learn-more}
[Learn more in the tutorials **Take a Deep Dive into OData**.](https://developers.sap.com/mission.scp-3-odata.html){.learn-more}

| Data Modification | Remarks                                   | Node.js      |   Java    |
|-------------------|-------------------------------------------|:------------:|:---------:|
| [Create an Entity](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_CreateanEntity) | `POST` request on Entity collection | <X/> | <X/> |
| [Update an Entity](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_UpdateanEntity) | `PATCH` or `PUT` request on Entity | <X/> | <X/> |
[ETags](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_UseofETagsforAvoidingUpdateConflicts) | For avoiding update conflicts | <X/> | <X/> |
| [Delete an Entity](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_DeleteanEntity) | `DELETE` request on Entity |  <X/> | <X/> |
| [Delta Payloads](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_DeltaPayloads) | For nested entity collections in [deep updates](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_UpdateRelatedEntitiesWhenUpdatinganE) | <D/> | <X/> |
| [Patch Collection](#odata-patch-collection) | Update Entity collection with [delta](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_DeltaPayloads) | <Na/> | <X/><sup><Beta /></sup> |


## PATCH Entity Collection with Mass Data (Java) { #odata-patch-collection }

With OData v4, you can [update a collection of entities](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_UpdateaCollectionofEntities) with a _single_ PATCH request.
The request targets the entity collection in the resource path and provides the request body as a [delta payload](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_DeltaPayloads):

```js
PATCH /CatalogService/Books
Content-Type: application/json

{
  "@context": "#$delta",
  "value": [
    {
      "ID": 17,
      "title": "CAP - what's new in 2023",
      "price": 29.99,
      "author_ID": 999
    },
    {
      "ID": 85,
      "price": 9.99
    },
    {
      "ID": 42,
      "@removed": { "reason": "deleted" }
    }
  ]
}
```

The system executes PATCH requests with a delta payload using batch delete and [upsert](../java/working-with-cql/query-api#bulk-upsert) statements. These requests are more efficient than OData [batch requests](https://docs.oasis-open.org/odata/odata/v4.01/csprd02/part1-protocol/odata-v4.01-csprd02-part1-protocol.html#sec_BatchRequests).

Use PATCH on entity collections to upload mass data using a dedicated service secured with [role-based authorization](../guides/security/authorization#requires). Enable delta updates explicitly by annotating the entity with

```cds
@Capabilities.UpdateRestrictions.DeltaUpdateSupported
```

Limitations:
 * Conflict detection via [ETags](../guides/providing-services#etag) is not supported.
 * The system bypasses [draft flow](../java/fiori-drafts#bypassing-draft-flow). `IsActiveEntity` must be `true`.
 * The system ignores [draft locks](../java/fiori-drafts#draft-lock). Active entities are updated or deleted without canceling drafts.
 * [Added and deleted links](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_IteminaDeltaPayloadResponse) are not supported.
 * The header `Prefer=representation` is not yet supported.
 * The `continue-on-error` preference is not yet supported.
 * The generic CAP handler support for [upsert](../java/working-with-cql/query-api#upsert) is limited, for example, audit logging is not supported.


## Mapping of CDS Types { #type-mapping}

The following table lists [CDS's built-in types](../cds/types) and their mapping to the OData EDM type system.

| CDS Type       | OData V4                                  |
| -------------- | ---------------------------------------   |
| `UUID`         | _Edm.Guid_ <sup>(1)</sup>                 |
| `Boolean`      | _Edm.Boolean_                             |
| `UInt8  `      | _Edm.Byte_                                |
| `Int16`        | _Edm.Int16_                               |
| `Int32`        | _Edm.Int32_                               |
| `Integer`      | _Edm.Int32_                               |
| `Int64`        | _Edm.Int64_                               |
| `Integer64`    | _Edm.Int64_                               |
| `Decimal`      | _Edm.Decimal_                             |
| `Double`       | _Edm.Double_                              |
| `Date`         | _Edm.Date_                                |
| `Time`         | _Edm.TimeOfDay_                           |
| `DateTime`     | _Edm.DateTimeOffset_                      |
| `Timestamp`    | _Edm.DateTimeOffset_ with Precision="7"   |
| `String`       | _Edm.String_                              |
| `Binary`       | _Edm.Binary_                              |
| `LargeBinary`  | _Edm.Binary_                              |
| `LargeString`  | _Edm.String_                              |
| `Map`          | represented as an empty, open complex type   |
| `Vector`       | not supported <sup>(2)</sup>              |

> <sup>(1)</sup> Mapping can be changed with, for example, `@odata.Type='Edm.String'`

> <sup>(2)</sup> Type `cds.Vector` must not appear in an OData service

OData V2 has the following differences:

| CDS Type     | OData V2                                        |
| ------------ | ----------------------------------------------- |
| `Date`       | _Edm.DateTime_ with `sap:display-format="Date"` |
| `Time`       | _Edm.Time_                                      |
| `Map`        | not supported                                   |


### Overriding Type Mapping { #override-type-mapping}

Use the annotation `@odata.Type` first to override standard type mappings, then additionally define `@odata {MaxLength, Precision, Scale, SRID}`.

`@odata.Type` is effective on scalar CDS types only and the value must be a valid OData (EDM) primitive type for the specified protocol version. Unknown types and non-matching facets are silently ignored. No further value constraint checks are applied.

These annotations allow you to produce additional OData EDM types that are not available in the standard type mapping. Use this approach during the import of external service APIs. See [Using Services](../guides/using-services#external-service-api).

```cds
entity Foo {
  // ...
  @odata: { Type: 'Edm.GeometryPolygon', SRID: 0 }
  geoCollection : LargeBinary;
};
```

Another prominent use case is the CDS type `UUID`, which maps to `Edm.Guid` by default. However, the OData standard imposes restrictive rules for _Edm.Guid_ values. For example, only hyphenated strings are allowed, which can conflict with existing data.
You can override the default mapping as follows:

```cds
entity Books {
  key ID : UUID @odata.Type:'Edm.String';
  // ...
}
```

::: warning
This annotation affects the client-side facing API only. No automatic data modification occurs behind the scenes, such as rounding, truncation, or conversion. You must perform all the required modifications on the data stream so that the values match their type in the API.
If you don't do the required conversions, you can "cast" any scalar CDS type into any incompatible EDM type:

```cds
entity Foo {
  // ...
  @odata: {Type: 'Edm.Decimal', Scale: 'floating' }
  str: String(17) default '17.4';
}
```

This translates into the following OData API contract:

```xml
<Property Name="str" Type="Edm.Decimal" Scale="floating" DefaultValue="17.4"/>
```

The client can now rightfully expect float numbers to be transmitted, but in reality the values are still strings.
:::


## OData Annotations { #annotations}

The following sections explain how to add OData annotations to CDS models and how to map them to EDMX outputs.
The translation considers only annotations defined in the vocabularies mentioned in [Annotation Vocabularies](#vocabularies).

### Terms and Properties

OData defines a strict two-fold key structure composed of `@<Vocabulary>.<Term>`. All annotations are always specified as a _Term_ with either a primitive value, a record value, or collection values. The properties themselves may, in turn, be primitives, records, or collections.

#### Example

```cds
@Common.Label: 'Customer'
@UI.HeaderInfo: {
  TypeName       : 'Customer',
  TypeNamePlural : 'Customers',
  Title          : { Value : name }
}
entity Customers { /* ... */ }
```

This is represented in CSN as follows:

```jsonc
{"definitions":{
  "Customers":{
    "kind": "entity",
    "@Common.Label": "Customer",
    "@UI.HeaderInfo.TypeName": "Customer",
    "@UI.HeaderInfo.TypeNamePlural": "Customers",
    "@UI.HeaderInfo.Title.Value": {"=": "name"},
    /* ... */
  }
}}
```

And would render to EDMX as follows:

```xml
<Annotations Target="MyService.Customers">
  <Annotation Term="Common.Label" String="Customer"/>
  <Annotation Term="UI.HeaderInfo">
    <Record Type="UI.HeaderInfoType">
      <PropertyValue Property="TypeName" String="Customer"/>
      <PropertyValue Property="TypeNamePlural" String="Customers"/>
      <PropertyValue Property="Title">
        <Record Type="UI.DataField">
          <PropertyValue Property="Value" Path="name"/>
        </Record>
      </PropertyValue>
    </Record>
  </Annotation>
</Annotations>
```

::: tip
The value for `@UI.HeaderInfo` is flattened to individual key-value pairs in CSN and 'restructured'
to a record for OData exposure in EDMX.
:::

For each annotated target definition in CSN, the rules for restructuring from CSN sources are:

1. Annotations with a single-identifier key are skipped (as OData annotations always have a `@Vocabulary.Term...` key signature).
2. All individual annotations with the same `@<Vocabulary.Term>` prefix are collected.
3. If there's only one annotation without a suffix, &rarr; that one is a scalar or array value of an OData term.
4. If there are more annotations with suffix key parts →, it's a record value for the OData term.


### Qualified Annotations

OData provides [qualified annotations](https://docs.oasis-open.org/odata/odata/v4.0/errata03/os/complete/part3-csdl/odata-v4.0-errata03-os-part3-csdl-complete.html#_Toc453752511), which allow you to specify different values for a given property. CDS syntax for annotations was extended to allow appending OData-style qualifiers after a `#` sign to an annotation key, but always only as the last component of a key in the syntax.

For example, this is supported:

```cds
@Common.Label: 'Customer'
@Common.Label#Legal: 'Client'
@Common.Label#Healthcare: 'Patient'
@Common.ValueList: {
  Label: 'Customers',
  CollectionPath:'Customers'
}
@Common.ValueList#Legal: {
  Label: 'Clients',
  CollectionPath:'Clients'
}
```

and would render as follows in CSN:

```json
{
  "@Common.Label": "Customer",
  "@Common.Label#Legal": "Clients",
  "@Common.Label#Healthcare": "Patients",
  "@Common.ValueList.Label": "Customers",
  "@Common.ValueList.CollectionPath": "Customers",
  "@Common.ValueList#Legal.Label": "Clients",
  "@Common.ValueList#Legal.CollectionPath": "Clients",
}
```

CDS provides no interpretation and no special handling for these qualifiers. You must write and apply them exactly as your chosen OData vocabularies specify them.


### Primitives

> Note: The `@Some` annotation isn't a valid term definition. The following example illustrates the rendering of primitive values.

The system maps primitive annotation values (Strings, Numbers, `true`, and `false`) to corresponding OData annotations as follows:

```cds
@Some.Boolean: true
@Some.Integer: 1
@Some.Number: 3.14
@Some.String: 'foo'
```

```xml
<Annotation Term="Some.Boolean" Bool="true"/>
<Annotation Term="Some.Integer" Int="1"/>
<Annotation Term="Some.Number" Decimal="3.14"/>
<Annotation Term="Some.String" String="foo"/>
```

#### Null Value { #null-value }

A `null` value can be set either as an [annotation expression](#expression-annotations) or as a [dynamic expression](#dynamic-expressions):

```cds
@Some.NullXpr:  (null)                  // annotation expression, short form
@Some.NullFunc: ($Null())               // annotation expression, functional form
@Some.NullDyn:  { $edmJson: { $Null } } // dynamic expression
```
All three expressions result in the following rendering:
```xml
<Annotation Term="Some.Null">
  <Null/>
</Annotation>
```

[Have a look at our *CAP SFLIGHT* sample, showcasing the usage of OData annotations.](https://github.com/SAP-samples/cap-sflight/blob/main/app/travel_processor/capabilities.cds){.learn-more}

### Records

> Note: The `@Some` annotation isn't a valid term definition. The following example illustrates the rendering of record values.

The system maps record-like source structures to `<Record>` nodes in EDMX, with primitive types translated analogously to what was mentioned earlier:

```cds
@Some.Record: {
  Null: (null),
  Boolean: true,
  Integer: 1,
  Number: 3.14,
  String: 'foo'
}
```
```xml
<Annotation Term="Some.Record">
  <Record>
    <PropertyValue Property="Null"><Null/></PropertyValue>
    <PropertyValue Property="Boolean" Bool="true"/>
    <PropertyValue Property="Integer" Int="1"/>
    <PropertyValue Property="Number" Decimal="3.14"/>
    <PropertyValue Property="String" String="foo"/>
  </Record>
</Annotation>
```

If possible, the type of the record in OData is deduced from the information in the [OData Annotation Vocabularies](#vocabularies):
```cds
@Common.ValueList: {
  CollectionPath: 'Customers'
}
```
```xml
<Annotation Term="Common.ValueList">
  <Record Type="Common.ValueListType">
    <PropertyValue Property="CollectionPath" String="Customers"/>
  </Record>
</Annotation>
```

Frequently, the OData record type cannot be determined unambiguously, for example if the type found in the vocabulary is abstract.
Then you need to explicitly specify the type by adding a property named `$Type` in the record. For example:
```cds
@UI.Facets : [{
  $Type  : 'UI.CollectionFacet',
  ID     : 'Customers'
}]
```
```xml
<Annotation Term="UI.Facets">
  <Collection>
    <Record Type="UI.CollectionFacet">
      <PropertyValue Property="ID" String="Travel"/>
    </Record>
  </Collection>
</Annotation>
```

There is one exception for a very prominent case: if the deduced [record type is `UI.DataFieldAbstract`](https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/UI.md), the compiler
by default automatically chooses `UI.DataField`:
```cds
@UI.Identification: [{
  Value: deliveryId
}]
```
```xml
<Annotation Term="UI.Identification">
  <Collection>
    <Record Type="UI.DataField">
      <PropertyValue Property="Value" Path="deliveryId"/>
    </Record>
  </Collection>
</Annotation>
```
To overwrite the default, use an explicit `$Type` like shown previously.

[Have a look at our *CAP SFLIGHT* sample, showcasing the usage of OData annotations.](https://github.com/SAP-samples/cap-sflight/blob/a7b166b7b9b3d2adb1640b4b68c3f8a26c6961c1/app/travel_processor/value-helps.cds){.learn-more}


### Collections

> Note: The `@Some` annotation isn't a valid term definition. The following example illustrates the rendering of collection values.

The system maps arrays to `<Collection>` nodes in EDMX. If primitives appear as direct elements of the array, these elements are wrapped into individual primitive child nodes of the resulting collection as is. The system applies the rules for records and collections recursively:

```cds
@Some.Collection: [
  null, true, 1, 3.14, 'foo',
  { $Type:'UI.DataField', Label:'Whatever', Hidden }
]
```

```xml
<Annotation Term="Some.Collection">
  <Collection>
    <Null/>
    <Bool>true</Bool>
    <Int>1</Int>
    <Decimal>3.14</Decimal>
    <String>foo</String>
    <Record Type="UI.DataField">
      <PropertyValue Property="Label" String="Whatever"/>
      <PropertyValue Property="Hidden" Bool="True"/>
    </Record>
  </Collection>
</Annotation>
```

### References { #references }

> Note: The `@Some` annotation isn't a valid term definition. The following example illustrates the rendering of reference values.

The system maps references in CDS annotations to `Path` properties or nested `<Path>` elements, respectively:

```cds
@Some.Term: My.Reference
@Some.Record: {
  Value: My.Reference
}
@Some.Collection: [
  My.Reference
]
```

```xml
<Annotation Term="Some.Term" Path="My/Reference"/>
<Annotation Term="Some.Record">
  <Record>
    <PropertyValue Property="Value" Path="My/Reference"/>
  </Record>
</Annotation>
<Annotation Term="Some.Collection">
  <Collection>
    <Path>My/Reference</Path>
  </Collection>
</Annotation>
```

As the compiler isn't aware of the semantics of such references, the mapping is very simplistic:
each `.` in a path is replaced by a `/`.
Use [expression-valued annotations](#expression-annotations) for more convenience.

Use a [dynamic expression](#dynamic-expressions) if the generic mapping can't produce the desired `<Path>`:

```cds
@Some.Term: {$edmJson: {$Path: '/com.sap.foo.EntityContainer/EntityName/FieldName'}}
```

```xml
<Annotation Term="Some.Term">
  <Path>/com.sap.foo.EntityContainer/EntityName/FieldName</Path>
</Annotation>
```


### Enumeration Values

The system maps enumeration symbols to corresponding `EnumMember` properties in OData.

Here are a couple of examples of enumeration values and the annotations that are generated. The first example is for a term in the
[Common vocabulary](https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/Common.md):

```cds
@Common.TextFormat: #html
```

```xml
<Annotation Term="Common.TextFormat" EnumMember="Common.TextFormatType/html"/>
```

The second example is for a (record type) term in the [Communication vocabulary](https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/Communication.md):

```cds
@Communication.Contact: {
  gender: #F
}
```

```xml
<Annotation Term="Communication.Contact">
  <Record Type="Communication.ContactType">
    <PropertyValue Property="gender" EnumMember="Communication.GenderType/F"/>
  </Record>
</Annotation>
```


### Expressions { #expression-annotations }

If the value of an OData annotation is an [expression](../cds/cdl#expressions-as-annotation-values),
the OData backend provides improved handling of references and automatic mapping from
CDS expression syntax to OData expression syntax.

One of the main use cases for such dynamic expressions is SAP Fiori. Examples:
```cds
@UI.Hidden: (status <> 'visible')
@UI.CreateHidden : (to_Travel.TravelStatus.code != #Open)
```

Note that SAP Fiori supports dynamic expressions only for
[specific annotations](https://ui5.sap.com/#/topic/0e7b890677c240b8ba65f8e8d417c048).

#### Flattening

In contrast to [simple references](#references), the references in expression-like
annotation values are correctly handled during model transformations, like other references in the model.
When the CDS model is flattened for OData, the flattening is consequentially also applied
to these references, and they are translated to the flat model.

::: tip

Although CAP supports structured types and elements, we recommend using them only
if they bring a real benefit. In general, you should keep your models as flat as possible.

:::

Example:
```cds
type Price {
  @Measures.ISOCurrency: (currency) // [!code highlight]
  amount : Decimal;
  currency : String(3); // [!code highlight]
}

service S {
  entity Product {
    key id : Integer;
    name : String;
    price : Price;
  }
}
```
Structured element `price` of `S.Product` is unfolded to flat elements
`price_amount` and `price_currency`. Accordingly, the reference in the annotation
is rewritten from `currency` to `price_currency`:
```xml
<Schema Namespace="S">
  <!-- ... -->
  <EntityType Name="Product">
    <!-- ... -->
    <Property Name="price_amount" Type="Edm.Decimal" Scale="variable"/>
    <Property Name="price_currency" Type="Edm.String" MaxLength="3"/>
  </EntityType>
  <Annotations Target="S.Product/price_amount">
    <Annotation Term="Measures.ISOCurrency" Path="price_currency"/>
  </Annotations>
</Schema>
```


Example:
```cds
service S {
  entity E {
    key id : Integer;
    f : Association to F;
    @Some.Term: (f.struc.y) // [!code highlight]
    val : Integer;
  }
  entity F {
    key id : Integer;
    struc {
      y : Integer;
    }
  }
}
```
The OData backend is aware of the semantics of a path and distinguishes association path steps from structure access.
The CDS path `f.struc.y` is translated to the OData path `f/struc_y`:
```xml
<Schema Namespace="S">
  <!-- ... -->
  <EntityType Name="E">
    <!-- ... -->
    <NavigationProperty Name="f" Type="S.F"/>
    <Property Name="val" Type="Edm.Int32"/>
  </EntityType>
  <EntityType Name="F">
    <!-- ... -->
    <Property Name="struc_y" Type="Edm.Int32"/>
  </EntityType>
  <Annotations Target="S.E/val">
    <Annotation Term="Some.Term" Path="f/struc_y"/> <!-- [!code highlight] -->
  </Annotations>
</Schema>
```

#### Managed Associations

The OData backend translates managed associations into unmanaged associations plus explicit foreign key elements.
During this translation, the system copies annotations assigned to the managed association to the respective foreign key elements.

Example:
```cds
service S {
  entity Authors { key ID : Integer; name : String; }
  entity Books   { key ID : Integer; author : Association to Authors; }

  annotate Books:author with @Common.Text: (author.name); // [!code highlight]
}
```

Resulting OData API:
```xml
<Schema Namespace="S">
  <!-- ... -->
  <EntityType Name="Authors">
    <!-- ... -->
    <Property Name="name" Type="Edm.String"/>
  </EntityType>
  <EntityType Name="Books">
    <!-- ... -->
    <NavigationProperty Name="author" Type="S.Authors"/>
    <Property Name="author_ID" Type="Edm.Int32"/> <!-- [!code highlight] -->
  </EntityType>
  <Annotations Target="S.Books/author_ID"> <!-- [!code highlight] -->
    <Annotation Term="Common.Text" Path="author/name"/> <!-- [!code highlight] -->
  </Annotations> <!-- [!code highlight] -->
</Schema>
```

Instead of relying on this copy mechanism, you can also explicitly annotate a foreign key element:
```cds
annotate Books:author.ID with @Common.Text: ($self.author.name);  // here $self is necessary
```

The system always rewrites a path that addresses a key element in the target of a managed association to address the local foreign key element.

Example:
```cds
service S {
  entity Travels {
    key id : Integer;
    status : Association to TravelStatus;
  };
  entity TravelStatus {
    key code : String(1) enum {Open = 'O'; Accepted = 'A'; Canceled = 'X'; };
  }
  @UI.CreateHidden : (travel.status.code != #Open) // [!code highlight]
  entity Bookings {
    key id : Integer;
    travel : Association to Travels;
  }
}
```

Resulting OData API:
```xml
<Schema Namespace="S">
  <!-- ... -->
  <EntityType Name="Travels">
    <!-- ... -->
    <NavigationProperty Name="status" Type="S.TravelStatus"/>
    <Property Name="status_code" Type="Edm.String" MaxLength="1"/> <!-- [!code highlight] -->
  </EntityType>
  <EntityType Name="TravelStatus">
    <!-- ... -->
  </EntityType>
  <EntityType Name="Bookings">
    <!-- ... -->
    <NavigationProperty Name="travel" Type="S.Travels"/>
  </EntityType>
  <Annotations Target="S.Bookings">
    <Annotation Term="UI.CreateHidden">
      <Ne>
        <Path>travel/status_code</Path> <!-- [!code highlight] -->
        <String>O</String>
      </Ne>
    </Annotation>
  </Annotations>
</Schema>
```


#### Expression Translation

If the expression you provide as an annotation value is more complex than just a reference, the OData backend translates CDS expressions to the corresponding OData expression syntax. The backend rejects expressions that are not applicable in an OData API.

::: info

While the flattening of references described in the preceding section is applied to all
annotations, the syntactic translation of expressions is only done for annotations
defined in one of the [OData vocabularies](#vocabularies).

:::

The following operators and clauses of CDL are supported:

* `case when ... then ... else ...` and the logical ternary operator ` ? : `
* Logical: `and`,  `or`,  `not`
* Relational: `=`, `<>`,  `!=`,  `<`,  `<=`,  `>`,  `>=`, `in`, `between ... and ...`
* Unary `+` and `-`
* Arithmetic: `+`,  `-`,  `*`,  `/`
* Concat: `||`
* `cast(...)`

Example:
```cds
@Some.Xpr: ( -(a + b) )
```

```xml
<Annotation Term="Some.Xpr">
  <Neg>
    <Add>
      <Path>a</Path>
      <Path>b</Path>
    </Add>
  </Neg>
</Annotation>
```

You can use such expressions, for example, for [some Fiori UI annotations](https://ui5.sap.com/#/topic/0e7b890677c240b8ba65f8e8d417c048):

```cds
service S {
  @UI.LineItem: [ // ...
  {
    Value: (status), // [!code highlight]
    Criticality: ( status = 'O' ? 2 : ( status = 'A' ? 3 : 0 ) ) // [!code highlight]
  }]
  entity Order {
    key id : Integer;
    // ...
    status : String;
  }
}
```

If you need to access an element of an entity in an annotation for a bound action or function,
use a path that navigates via an explicitly defined [binding parameter](../cds/cdl#bound-actions).

Example:
```cds
service S {
  entity Order {
    key id : Integer;
    // ...
    status : String;
  } actions {
    @Core.OperationAvailable: ( :in.status <> 'A' ) // [!code highlight]
    action accept (in: $self)
  }
}
```

In addition, the following functions are supported:

* `$Null()` representing the `null` value [`Null`]([annotation expression](#null-value)).
* `Div(...)` (or `$Div(...)`) and `Mod(...)` (or `$Mod(...)`) for integer division and modulo
* [`Has(...)`](https://docs.oasis-open.org/odata/odata/v4.02/csd01/part2-url-conventions/odata-v4.02-csd01-part2-url-conventions.html#Has) (or `$Has(...)`)
* the functions listed in sections
  [5.1.1.5](https://docs.oasis-open.org/odata/odata/v4.02/csd01/part2-url-conventions/odata-v4.02-csd01-part2-url-conventions.html#StringandCollectionFunctions)
  through [5.1.1.11](https://docs.oasis-open.org/odata/odata/v4.02/csd01/part2-url-conventions/odata-v4.02-csd01-part2-url-conventions.html#GeoFunctions)
  of [OData URL conventions](https://docs.oasis-open.org/odata/odata/v4.02/odata-v4.02-part2-url-conventions.html)
  + See examples below for the syntax for `cast` and `isof` (section [5.1.1.10](https://docs.oasis-open.org/odata/odata/v4.02/csd01/part2-url-conventions/odata-v4.02-csd01-part2-url-conventions.html#TypeFunctions))
  + The names of the geo functions (section [5.1.1.11](https://docs.oasis-open.org/odata/odata/v4.02/csd01/part2-url-conventions/odata-v4.02-csd01-part2-url-conventions.html#GeoFunctions))
    need to be escaped like <br> `![geo.distance]`
* [`fillUriTemplate(...)`](https://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_FunctionodatafillUriTemplate)
  and [`uriEncode(...)`](https://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_FunctionodatauriEncode)
* `Type(...)` (or `$Type(...)`) is to be used to specify a type name with their corresponding type facets such as `MaxLength(...)`, `Precision(...)`, `Scale(...)` and `SRID(...)`
   (or `$MaxLength(...)`, `$Precision(...)`, `$Scale(...)`, `$SRID(...)`)

Example:
```cds
@Some.Func1: ( concat(a, b, c) )
@Some.Func2: ( round(aNumber) )
@Some.Func3: ( $Cast(aValue, $Type('Edm.Decimal', $Precision(38), $Scale(19)) ) )
@Some.Func4: ( $IsOf(aValue, $Type('Edm.Decimal', $Precision(38), $Scale(19)) ) )
@Some.Func5: ( ![geo.distance](a, b) )
@Some.Func6: ( fillUriTemplate(a, b) )
```

If a functional expression starts with a `$`, all inner function must also be `$` functions and vice versa.
Instead of `[$]Type(...)` an EDM primitive type name can be directly used as function name like in CDL.

It is worth to mention that there are two alternatives for the cast function, one in the EDM and one in the CDS domain:

<!-- cds-mode: ignore -->
```cds
@Some.ODataStyleCast:  ( Cast(aValue, Decimal(38, 'variable') ) )  // => Edm.Decimal
@Some.ODataStyleCast2: ( Cast(aValue, PrimitiveType()) )           // => Edm.PrimitiveType
@Some.SQLStyleCast:    ( cast(aValue as Decimal(38, variable)) )   // => cds.Decimal
@Some.SQLStyleCast2:   ( cast(aValue as String) )                  // => cds.String without type facets
```

Both `cast` functions look similar, but there are some differences:

The OData style `Cast` _function_ starts with a capital letter and the SQL `cast` _operator_ uses the keyword `as`
to delimit the element reference from the type specifier. The OData `Cast` requires an EDM primitive type to be used
either as `[$]Type()` or as direct type function whereas the SQL `cast` requires a scalar CDS type as argument which is then
converted into the corresponding EDM primitive type.

::: info

CAP only provides a syntactic translation. It is up to each client
whether an expression value is supported for a particular annotation.
See, for example,  [SAP Fiori Elements' list of supported annotations](https://ui5.sap.com/#/topic/0e7b890677c240b8ba65f8e8d417c048).

:::

Use a [dynamic expression](#dynamic-expressions) if the desired EDMX expression cannot be
obtained via the automatic translation of a CDS expression.


### Annotating Annotations { #annotating-annotations}

OData can annotate annotations. This often occurs in combination with enums like `UI.Importance` and `UI.TextArrangement`.
CDS has no corresponding language feature. For OData annotations, you can achieve nesting in the following way:
* To annotate a Record, add an additional element to the CDS source structure. The name of this element is the full name of the annotation, including the `@`. See `@UI.Importance` in the following example.
* To annotate a single value or a Collection, add a parallel annotation that has the nested annotation name appended to the outer annotation name. See `@UI.Criticality` and `@UI.TextArrangement` in the following example.

```cds
@UI.LineItem: [
  {Value: ApplicationName, @UI.Importance: #High}, // [!code highlight]
  {Value: Description},
  {Value: SourceName},
  {Value: ChangedBy},
  {Value: ChangedAt}
]
@UI.LineItem.@UI.Criticality: #Positive // [!code highlight]


@Common.Text: Text
@Common.Text.@UI.TextArrangement: #TextOnly // [!code highlight]
```

Alternatively, annotating a single value or a Collection by turning them into a structure with an artificial property `$value` is still possible, but deprecated:

```cds
@UI.LineItem: {
  $value:[ /* ... */ ], @UI.Criticality: #Positive
}

@Common.Text: {
  $value: Text, @UI.TextArrangement: #TextOnly
}
```

As `TextArrangement` is common, there's a shortcut for this specific situation:

```cds
...
@Common: {
  Text: Text, TextArrangement: #TextOnly
}
```

In any case, the resulting EDMX is:

```xml
<Annotation Term="UI.LineItem">
  <Collection>
    <Record Type="UI.DataField">
      <PropertyValue Property="Value" Path="ApplicationName"/>
      <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/High"/> <!-- [!code highlight] -->
    </Record>
    ...
  </Collection>
  <Annotation Term="UI.Criticality" EnumMember="UI.CriticalityType/Positive"/> <!-- [!code highlight] -->
</Annotation>
<Annotation Term="Common.Text" Path="Text">
  <Annotation Term="UI.TextArrangement" EnumMember="UI.TextArrangementType/TextOnly"/> <!-- [!code highlight] -->
</Annotation>
```

### EDM JSON Expression Syntax { #dynamic-expressions}

::: tip Use CDS expression syntax

Use the EDM JSON expression syntax only as a fallback mechanism.
Whenever possible, use [expression-like annotation values](#expression-annotations) instead.
For the following example, simply write `@UI.Hidden: (status <> 'visible')`.

:::

In case you want to have an expression as value for an OData annotation that cannot be
written as a [CDS expression ](#expression-annotations), 
you can use the "edm-json inline mechanism" by providing an [EDM JSON expression](https://docs.oasis-open.org/odata/odata-csdl-json/v4.01/odata-csdl-json-v4.01.html#_Toc38466479) as defined
in the [JSON representation of the OData Common Schema Language](https://docs.oasis-open.org/odata/odata-csdl-json/v4.01/odata-csdl-json-v4.01.html) enclosed in `{ $edmJson: { ... }}`.

Note that here the CDS syntax for string literals with single quotes (`'foo'`) applies,
and that paths are not automatically recognized but need to be written as `{$Path: 'fieldName'}`.
The CDS compiler translates the expression into the corresponding
[XML representation](https://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#_Toc38530421).

For example, the CDS annotation:

```cds
@UI.Hidden: {$edmJson: {$Ne: [{$Path: 'status'}, 'visible']}}
```

is translated to:

```xml
<Annotation Term="UI.Hidden">
  <Ne>
    <Path>status</Path>
    <String>visible</String>
  </Ne>
</Annotation>
```


### `sap:` Annotations

In general, back ends and SAP Fiori UIs understand or expect OData V4 annotations. You should use those rather than the OData V2 SAP extensions.

<div id="translate-odata" />

If necessary, CDS automatically translates OData V4 annotations to OData V2 SAP extensions when you invoke it with `v2` as the OData version. This means you shouldn't need to deal with this at all.

Nevertheless, in case you need to do so, you can add `sap:...` attribute-style annotations as follows:

```cds
  @sap.applicable.path: 'to_eventStatus/EditEnabled'
  action EditEvent(...) returns SomeType;
```

Which would render to OData EDMX as follows:

```xml
  <FunctionImport Name="EditEvent" ...
    sap:applicable-path="to_eventStatus/EditEnabled">
    ...
  </FunctionImport>
```

The rules are:

* Only strings are supported as values.
* The first dot in `@sap.` is replaced by a colon `:`.
* Subsequent dots are replaced by dashes.


### Differences to ABAP

In contrast to ABAP CDS, we apply a **generic, isomorphic approach** where names and positions of annotations are exactly as specified in the [OData Vocabularies](#vocabularies). This has the following advantages:

* Single source of truth — users only need to consult the official OData specs
* Speed — we don't need complex case-by-case mapping logic
* No bottlenecks — we always support the full set of OData annotations
* Bidirectional mapping — we can translate CDS to EDMX and vice versa

Last but not least, it also saves us lots of effort as we don't have to write derivatives of all the OData vocabulary specs.


## Annotation Vocabularies { #vocabularies}

When translating a CDS model to an OData API, by default only those annotations
are considered that are part of the standard OASIS or SAP vocabularies listed below.
You can add further vocabularies to the translation process [using configuration.](#additional-vocabularies)

### [OASIS Vocabularies](https://github.com/oasis-tcs/odata-vocabularies#further-description-of-this-repository) { target="_blank"}

| Vocabulary                                                                                                                              | Description                                  |
|-----------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------|
| [@Aggregation](https://github.com/oasis-tcs/odata-vocabularies/tree/main/vocabularies/Org.OData.Aggregation.V1.md){target="_blank"}     | for describing aggregatable data             |
| [@Authorization](https://github.com/oasis-tcs/odata-vocabularies/tree/main/vocabularies/Org.OData.Authorization.V1.md){target="_blank"} | for authorization requirements               |
| [@Capabilities](https://github.com/oasis-tcs/odata-vocabularies/tree/main/vocabularies/Org.OData.Capabilities.V1.md){target="_blank"}   | for restricting capabilities of a service    |
| [@Core](https://github.com/oasis-tcs/odata-vocabularies/tree/main/vocabularies/Org.OData.Core.V1.md){target="_blank"}                   | for general purpose annotations              |
| [@JSON](https://github.com/oasis-tcs/odata-vocabularies/tree/main/vocabularies/Org.OData.JSON.V1.md){target="_blank"}                   | for JSON properties                          |
| [@Measures](https://github.com/oasis-tcs/odata-vocabularies/tree/main/vocabularies/Org.OData.Measures.V1.md){target="_blank"}           | for monetary amounts and measured quantities |
| [@Repeatability](https://github.com/oasis-tcs/odata-vocabularies/tree/main/vocabularies/Org.OData.Repeatability.V1.md){target="_blank"} | for repeatable requests                      |
| [@Temporal](https://github.com/oasis-tcs/odata-vocabularies/tree/main/vocabularies/Org.OData.Temporal.V1.md){target="_blank"}           | for temporal annotations                     |
| [@Validation](https://github.com/oasis-tcs/odata-vocabularies/tree/main/vocabularies/Org.OData.Validation.V1.md){target="_blank"}       | for adding validation rules                  |

### [SAP Vocabularies](https://github.com/SAP/odata-vocabularies#readme){target="_blank"}

| Vocabulary                                                                                                               | Description                                       |
|--------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------|
| [@Analytics](https://github.com/SAP/odata-vocabularies/tree/main/vocabularies/Analytics.md){target="_blank"}             | for annotating analytical resources               |
| [@CodeList](https://github.com/SAP/odata-vocabularies/tree/main/vocabularies/CodeList.md){target="_blank"}               | for code lists                                    |
| [@Common](https://github.com/SAP/odata-vocabularies/tree/main/vocabularies/Common.md){target="_blank"}                   | for all SAP vocabularies                          |
| [@Communication](https://github.com/SAP/odata-vocabularies/tree/main/vocabularies/Communication.md){target="_blank"}     | for annotating communication-relevant information |
| [@DataIntegration](https://github.com/SAP/odata-vocabularies/tree/main/vocabularies/DataIntegration.md){target="_blank"} | for data integration                              |
| [@PDF](https://github.com/SAP/odata-vocabularies/tree/main/vocabularies/PDF.md){target="_blank"}                         | for PDF                                           |
| [@PersonalData](https://github.com/SAP/odata-vocabularies/tree/main/vocabularies/PersonalData.md){target="_blank"}       | for annotating personal data                      |
| [@Session](https://github.com/SAP/odata-vocabularies/tree/main/vocabularies/Session.md){target="_blank"}                 | for sticky sessions for data modification         |
| [@UI](https://github.com/SAP/odata-vocabularies/tree/main/vocabularies/UI.md){target="_blank"}                           | for presenting data in user interfaces            |

[Learn more about annotations in CDS and OData and how they work together](https://github.com/SAP-samples/odata-basics-handsonsapdev/blob/annotations/bookshop/README.md){.learn-more}


### Additional Vocabularies

Assuming you have a vocabulary `com.MyCompany.vocabularies.MyVocabulary.v1`, you can set the configuration option <Config keyOnly filesOnly>cds.cdsc.odataVocabularies.MyVocabulary: {"Alias": "MyVocabulary", "Namespace": "com.sap.vocabularies.MyVocabulary.v1", "Uri": "\<link to vocabulary document\>"}</Config>.

With this configuration, all annotations prefixed with `MyVocabulary` are considered in the translation.

```cds
service S {
  @MyVocabulary.MyAnno: 'My new Annotation'
  entity E { /*...*/ };
};
```

The annotation is added to the OData API, as well as the mandatory reference to the vocabulary definition:

```xml
<edmx:Reference Uri="link to vocabulary document">
  <edmx:Include Alias="MyVocabulary" Namespace="com.MyCompany.vocabularies.MyVocabulary.v1"/>
</edmx:Reference>
...
<Annotations Target="S.E">
  <Annotation Term="MyVocabulary.MyAnno" String="My new Annotation"/>
</Annotations>
```

The compiler evaluates neither annotation values nor the URI.
It is your responsibility to make the URI accessible if necessary.
Unlike for the standard vocabularies listed above, the compiler has no access to the content of
the vocabulary, so the values are translated generically.


## Data Aggregation

Data aggregation in OData V4 is leveraged by the `$apply` system query option, which defines a pipeline of transformations that is applied to the _input set_ specified by the URI. On the _result set_ of the pipeline, the standard system query options come into effect.

<div id="data-aggregation-v2" />

### Example

```http
GET /Orders(10)/books?
    $apply=filter(year eq 2000)/
           groupby((author/name),aggregate(price with average as avg))/
    orderby(title)/
    top(3)
```

This request operates on the books of the order with ID 10. First, it filters out the books from the year 2000 to create an intermediate result set. The system then groups the intermediate result set by author name and averages the price. Finally, the system sorts the result set by title and retains only the top three entries.

::: warning
If the `groupby` transformation only includes a subset of the entity keys, the result order might be unstable.
:::

### Transformations

| Transformation               | Description                                 |      Node.js       | Java  |
|------------------------------|---------------------------------------------|:------------------:|:-----:|
| `filter`                     | filter by filter expression                 |        <X/>        | <X/>  |
| `search`                     | filter by search term or expression         |       <Na/>        | <X/>  |
| `groupby`                    | group by dimensions and aggregates values   |        <X/>        | <X/>  |
| `aggregate`                  | aggregate values                            |        <X/>        | <X/>  |
| `compute`                    | add computed properties to the result set   |       <Na/>        | <X/>  |
| `expand`                     | expand navigation properties                |       <Na/>        | <Na/> |
| `concat`                     | append additional aggregation to the result |        <X/>        | <X/>  |
| `skip` / `top`               | paginate                                    |        <X/>        | <X/>  |
| `orderby`                    | sort the input set                          |        <X/>        | <X/>  |
| `topcount`/`bottomcount`     | retain highest/lowest _n_ values            |       <Na/>        | <Na/> |
| `toppercent`/`bottompercent` | retain highest/lowest _p_% values           |       <Na/>        | <Na/> |
| `topsum`/`bottomsum`         | retain _n_ values limited by sum            |       <Na/>        | <Na/> |


#### `concat`

The [`concat` transformation](https://docs.oasis-open.org/odata/odata-data-aggregation-ext/v4.0/cs02/odata-data-aggregation-ext-v4.0-cs02.html#_Toc435016581) applies additional transformation sequences to the input set and concatenates the result:

```http
GET /Books?$apply=
    filter(author/name eq 'Bram Stroker')/
    concat(
        aggregate($count as totalCount),
        groupby((year), aggregate($count as countPerYear)))
```

This request filters all books, keeping only books by Bram Stroker. From these books, `concat` calculates (1) the total count of books _and_ (2) the count of books per year. The result is heterogeneous.

The `concat` transformation must be the last of the apply pipeline. If `concat` is used, then `$apply` can't be used in combination with other system query options.


#### `skip`, `top`, and `orderby`

Beyond the standard transformations specified by OData, CDS Java supports the transformations `skip`, `top`, and `orderby` that allow you to sort and paginate an input set:

```http
GET /Order(10)/books?
    $apply=orderby(price desc)/
           top(500)/
           groupby((author/name),aggregate(price with max as maxPrice))
```

This query groups the 500 most expensive books by author name and determines the price of the most expensive book per author.


### Aggregation Methods

| Aggregation Method | Description                      | Node.js | Java  |
|--------------------|----------------------------------|:-------:|:-----:|
| `min`              | smallest value                   |  <X/>   | <X/>  |
| `max`              | largest                          |  <X/>   | <X/>  |
| `sum`              | sum of values                    |  <X/>   | <X/>  |
| `average`          | average of values                |  <X/>   | <X/>  |
| `countdistinct`    | count of distinct values         |  <X/>   | <X/>  |
| custom method      | custom aggregation method        |  <Na/>  | <Na/> |
| `$count`           | number of instances in input set |  <X/>   | <X/>  |

### Custom Aggregates

Instead of explicitly using an expression with an aggregation method in the `aggregate` transformation, the client can use a _custom aggregate_. A custom aggregate can be considered as a virtual property that aggregates the input set. It's calculated on the server side. The client doesn't know _How_ the custom aggregate is calculated.

They can only be used for the special case when a default aggregation method can be specified declaratively on the server side for a measure.

A custom aggregate is declared in the CDS model as follows:

* The measure must be annotated with an `@Aggregation.default` annotation that specifies the aggregation method.
* The CDS entity should be annotated with an `@Aggregation.CustomAggregate` annotation to expose the custom aggregate to the client.

```cds
@Aggregation.CustomAggregate#stock : 'Edm.Decimal'
entity Books as projection on bookshop.Books {
  ID,
  title,

  @Aggregation.default: #SUM
  stock
};
```

With this definition, it's now possible to use the custom aggregate `stock` in an `aggregate` transformation:

```http
GET /Books?$apply=aggregate(stock) HTTP/1.1
```

which is equivalent to:

```http
GET /Books?$apply=aggregate(stock with sum as stock) HTTP/1.1
```

#### Currencies and Units of Measure

If a property represents a monetary amount, it may have a related property that indicates the amount's *currency code*. Analogously, a property representing a measured quantity can be related to a *unit of measure*. To indicate that a property is a currency code or a unit of measure, it can be annotated with the [Semantics Annotations](https://help.sap.com/docs/SAP_NETWEAVER_750/cc0c305d2fab47bd808adcad3ca7ee9d/fbcd3a59a94148f6adad80b9c97304ff.html) `@Semantics.currencyCode` or `@Semantics.unitOfMeasure`.
The aggregation method (typically, sum) is specified with the `@Aggregation.default` annotation.

```cds
@Aggregation.CustomAggregate#amount   : 'Edm.Decimal'
@Aggregation.CustomAggregate#currency : 'Edm.String'
entity Sales {
  key id        : GUID;
      productId : GUID;
      @Semantics.amount.currencyCode: 'currency'
      @Aggregation.default: #SUM
      amount    : Decimal(10,2);
      @Semantics.currencyCode
      currency  : String(3);
}
```

All properties annotated with `@Semantics.currencyCode` or `@Semantics.unitOfMeasure` as a [custom aggregate](../advanced/odata#custom-aggregates) are exposed with the property's name that returns:

* The property's value if it's unique within a group of dimensions
* `null` otherwise

A custom aggregate for a currency code or unit of measure should also be exposed by the `@Aggregation.CustomAggregate` annotation. Moreover, a property for a monetary amount or a measured quantity should be annotated with `@Semantics.amount.currencyCode` or `@Semantics.quantity.unitOfMeasure` to reference the corresponding property that holds the amount's currency code or the quantity's unit of measure, respectively.

### Other Features

| Feature                                 | Node.js | Java  |
|-----------------------------------------|:-------:|:-----:|
| use path expressions in transformations |  <X/>   | <X/>  |
| chain transformations                   |  <X/>   | <X/>  |
| chain transformations within group by   |  <Na/>  | <Na/> |
| `groupby` with `rollup`/`$all`          |  <Na/>  | <Na/> |
| `$expand` result set of `$apply`        |  <Na/>  | <Na/> |
| `$filter`/`$search` result set          |  <X/>   | <X/>  |
| sort result set with `$orderby`         |  <X/>   | <X/>  |
| paginate result set with `$top`/`$skip` |  <X/>   | <X/>  |


## Open Types

An entity type or a complex type may be declared as _open_, which allows clients to add properties dynamically to instances of the type. Clients do this by specifying uniquely named property values in the payload used to insert or update an instance of the type. To indicate that the entity or complex type is open, annotate the corresponding type with `@open`:


```cds
service CatalogService {
  @open // [!code focus]
  entity Book { // [!code focus]
    key id : Integer; // [!code focus]
  } // [!code focus]
}
```

The _cds build_ for OData v4 renders the entity type `Book` in `edmx` with the [`OpenType` attribute](https://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_OpenEntityType) set to `true`:

```xml
<EntityType Name="Book" OpenType="true"> // [!code focus]
  <Key>
    <PropertyRef Name="id"/>
  </Key>
  <Property Name="id" Type="Edm.Integer" Nullable="false"/>
</EntityType>
```

The entity `Book` is open, which allows the client to enrich the entity with additional properties.

Example 1:

```json
{"id": 1, "title": "Tow Sawyer"}
```
Example 2:

```json
{"title": "Tow Sawyer",
 "author": { "name": "Mark Twain", "age": 74 } }
```

Open types can also be referenced in non-open types and entities. This, however, doesn't make the referencing entity or type open.

```cds
service CatalogService {
  type Order {
    guid: Integer;
    book: Book;
  }

  @open // [!code focus]
  type Book {} // [!code focus]
}
```
The following payload for `Order` is allowed:

`{"guid": 1, "book": {"id": 2, "title": "Tow Sawyer"}}`

Note that type `Order` itself is not open, so it doesn't allow dynamic properties, in contrast to type `Book`.

::: warning
Dynamic properties are not persisted in the underlying data source automatically and must be handled completely by custom code.
:::

### Java Type Mapping

#### Simple Types

The simple values of a deserialized JSON payload can be of type: `String`, `Boolean`, `Number` or simply an `Object` for `null` values.

|JSON                     | Java Type of the `value`       |
|-------------------------|--------------------------------|
|`{"value": "Tom Sawyer"}`| `java.lang.String`             |
|`{"value": true}`        | `java.lang.Boolean`            |
|`{"value": 42}`          | `java.lang.Number` (Integer)   |
|`{"value": 36.6}`        | `java.lang.Number` (BigDecimal)|
|`{"value": null}`        | `java.lang.Object`             |

#### Structured Types

The complex and structured types are deserialized to `java.util.Map`, whereas collections are deserialized to `java.util.List`.

|JSON                                                               | Java Type of the `value`             |
|-------------------------------------------------------------------|--------------------------------------|
|`{"value": {"name": "Mark Twain"}}`                                | `java.util.Map<String, Object>`      |
|`{"value":[{"name": "Mark Twain"}, {"name": "Charlotte Bronte"}}]}`| `java.util.List<Map<String, Object>>`|



## Singletons

A singleton is a special one-element entity introduced in OData V4. You can address it directly by its name from the service root without specifying the entity's keys.

Annotate an entity with `@odata.singleton` or `@odata.singleton.nullable` to use it as a singleton within a service, for example:

```cds
service Sue {
  @odata.singleton entity MySingleton {
    key id : String; // can be omitted in OData v4.01
    prop : String;
    assoc : Association to myEntity;
  }
}
```

You can also define it as an ordered `SELECT` from another entity:

```cds
service Sue {
  @odata.singleton entity OldestEmployee as
    select from Employees order by birthyear;
}
```

### Requesting Singletons

As mentioned earlier, you can access singletons without specifying keys in the request URL. They can contain navigation properties, and other entities can include singletons as their navigation properties as well. The `$expand` query option is also supported.

```http
GET …/MySingleton
GET …/MySingleton/prop
GET …/MySingleton/assoc
GET …/MySingleton?$expand=assoc
```

### Updating Singletons

The following request updates a _prop_ property of a singleton _MySingleton_:

```http
PATCH/PUT …/MySingleton
{prop: “New value”}
```

### Deleting Singletons

A `DELETE` request to a singleton is possible only if you annotate a singleton with `@odata.singleton.nullable`. An attempt to delete a singleton annotated with `@odata.singleton` results in an error.

### Creating Singletons

Since singletons represent a one-element entity, the system doesn't support a `POST` request.

<div id ="api-flavors" />

## V2 Support

While CAP defaults to OData V4, the latest protocol version, older projects may need to fall back to OData V2, for example, to keep using existing V2-based UIs.


::: warning

OData V2 is deprecated. Use OData V2 only if you need to support existing UIs or if you need to use specific controls that don't work with V4 _yet_, such as tree tables (sap.ui.table.TreeTable).

:::

### Enabling OData V2 via CDS OData V2 Adapter in Node.js Apps { #odata-v2-adapter-node}

CAP Node.js supports serving the OData V2 protocol through the [_OData V2 adapter for CDS_](https://www.npmjs.com/package/@cap-js-community/odata-v2-adapter), which translates between the OData V2 and V4 protocols.

For Node.js projects, add the CDS OData V2 adapter as express.js middleware as follows:

1. Add the adapter package to your project:

    ```sh
    npm add @cap-js-community/odata-v2-adapter
    ```

2. Access OData V2 services at [http://localhost:4004/odata/v2/${path}](http://localhost:4004/odata/v2).
3. Access OData V4 services at [http://localhost:4004/odata/v4/${path}](http://localhost:4004/odata/v4) (as before).

Example: Read service metadata for `CatalogService`:

- CDS:

    ```cds
    @path:'/browse'
    service CatalogService { ... }
    ```

- OData V2: `GET http://localhost:4004/odata/v2/browse/$metadata`
- OData V4: `GET http://localhost:4004/odata/v4/browse/$metadata`

[Find detailed instructions at **@cap-js-community/odata-v2-adapter**.](https://www.npmjs.com/package/@cap-js-community/odata-v2-adapter){.learn-more}

### Using OData V2 in Java Apps

In CAP Java, serving the OData V2 protocol is supported natively by the [CDS OData V2 Adapter](../java/migration#v2adapter).

## Miscellaneous

### Omitting Elements from APIs

Add annotation `@cds.api.ignore` to suppress unwanted entity fields (for example, foreign key fields) in APIs exposed from the CDS model, that is, OData or OpenAPI. For example:

```cds
entity Books { ...
  @cds.api.ignore
  author : Association to Authors;
}
```

Note that `@cds.api.ignore` is effective on regular elements that are rendered as `Edm.Property` only. The annotation doesn't suppress an `Edm.NavigationProperty`, which is rendered for associations or compositions. If you annotate a managed association, the system propagates the annotations to the (generated) foreign keys. In the previous example, the system mutes the foreign keys of the managed association `author` in the API.

### Absolute Context URL { #absolute-context-url}

In some scenarios, you need an absolute [context URL](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_ContextURL). In the Node.js runtime, you can achieve this through configuration `cds.odata.contextAbsoluteUrl`.

You can use your own URL (including a protocol and a service path), for example:

```js
cds.odata.contextAbsoluteUrl = "https://your.domain.com/yourService"
```

to customize the annotation as follows:

```json
{
  "@odata.context":"https://your.domain.com/yourService/$metadata#Books(title,author,ID)",
  "value":[
    {"ID": 201,"title": "Wuthering Heights","author": "Emily Brontë"},
    {"ID": 207,"title": "Jane Eyre","author": "Charlotte Brontë"},
    {"ID": 251,"title": "The Raven","author": "Edgar Allen Poe"}
  ]
}
```

If you set `contextAbsoluteUrl` to something truthy that doesn't match `http(s)://*`, the system constructs an absolute path based on the environment of the application on a best effort basis.

We encourage you to stay with the default relative format, if possible, as it's proxy safe.
