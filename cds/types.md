---
# layout: cds-ref
shorty: Built-in Types
synopsis: >
  Find here a brief overview of the predefined types shipped with CDS.
status: released
---


# Core / Built-in Types


The following table lists the built-in types available to all CDS models, and can be used to define entity elements or custom types as follows:

```cds
entity Books {
  key ID : UUID;
  title  : String(111);
  stock  : Integer;
  price  : Price;
}
type Price : Decimal;
```

These types are used to define the structure of entities and services, and are mapped to respective database types when the model is deployed.

| CDS Type | Remarks | ANSI SQL <sup>(1)</sup> |
| --- | --- | --- |
| `UUID` | CAP generates [RFC 4122](https://tools.ietf.org/html/rfc4122)-compliant UUIDs <sup>(2)</sup> | _NVARCHAR(36)_  |
| `Boolean` | Values: `true`, `false`, `null`, `0`, `1` | _BOOLEAN_  |
| `Integer` | Same as `Int32` by default | _INTEGER_  |
| `Int16` | Signed 16-bit integer, range *[ -2<sup>15</sup> ... +2<sup>15</sup> )* | _SMALLINT_  |
| `Int32` | Signed 32-bit integer, range *[ -2<sup>31</sup> ... +2<sup>31</sup> )* | _INTEGER_  |
| `Int64` | Signed 64-bit integer, range *[ -2<sup>63</sup> ... +2<sup>63</sup> )* | _BIGINT_  |
| `UInt8` | Unsigned 8-bit integer, range *[ 0 ... 255 ]* | _TINYINT_ <sup>(3)</sup> |
| `Decimal` (`prec`, `scale`) | A *decfloat* type is used if arguments are omitted | _DECIMAL_  |
| `Double` | Floating point with binary mantissa | _DOUBLE_  |
| `Date` | e.g. `2022-12-31` | _DATE_  |
| `Time` | e.g. `24:59:59` | _TIME_  |
| `DateTime` | _sec_ precision | _TIMESTAMP_  |
| `Timestamp` | _µs_ precision, with up to 7 fractional digits |  _TIMESTAMP_  |
| `String` (`length`) | Default *length*: 255; on HANA: 5000 <sup>(4)</sup> | _NVARCHAR_  |
| `Binary` (`length`) | Default *length*: 255; on HANA: 5000 <sup>(5)</sup> |  _VARBINARY_  |
| `LargeBinary` | Unlimited data, usually streamed at runtime | _BLOB_ |
| `LargeString` | Unlimited data, usually streamed at runtime | _NCLOB_  |
| `Map` | Mapped to *NCLOB* for HANA. | *JSON* type |
| `Vector` (`dimension `) | Requires SAP HANA Cloud QRC 1/2024, or later |  _REAL_VECTOR_  |

These types are used to define the structure of entities and services, and are mapped to respective database types when the model is deployed.

> <sup>(1)</sup> Concrete mappings to specific databases may differ.
>
> <sup>(2)</sup> See also [Best Practices](../guides/domain-modeling#don-t-interpret-uuids).
>
> <sup>(3)</sup> Not available on PostgreSQL and H2.
>
> <sup>(4)</sup> Configurable through `cds.cdsc.defaultStringLength`.
>
> <sup>(5)</sup> Configurable through `cds.cdsc.defaultBinaryLength`.

#### See also...

[Additional Reuse Types and Aspects by `@sap/cds/common`](common) {.learn-more}

[Mapping to OData EDM types](../advanced/odata#type-mapping) {.learn-more}

[HANA-native Data Types](../advanced/hana#hana-types){.learn-more}
