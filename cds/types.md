---
# layout: cds-ref
shorty: Built-in Types
synopsis: >
  Find here a brief overview of the predefined types shipped with CDS.
status: released
---


# Core / Built-in Types


The following table lists the built-in types in CDS, and their most common mapping to
ANSI SQL types, when deployed to a relational database (concrete mappings to specific databases may differ):

| CDS Type            | Remarks                                                                | ANSI SQL       |
|---------------------|------------------------------------------------------------------------|----------------|
| `UUID`              | [RFC 4122](https://tools.ietf.org/html/rfc4122)-compliant UUIDs        | _NVARCHAR(36)_ |
| `Boolean`           | Values: `true`, `false`, `null`, `0`, `1`                              | _BOOLEAN_      |
| `Integer`           | Same as `Int32` by default                                             | _INTEGER_      |
| `Int16`             | Signed 16-bit integer, range *[ -2<sup>15</sup> ... +2<sup>15</sup> )* | _SMALLINT_     |
| `Int32`             | Signed 32-bit integer, range *[ -2<sup>31</sup> ... +2<sup>31</sup> )* | _INTEGER_      |
| `Int64`             | Signed 64-bit integer, range *[ -2<sup>63</sup> ... +2<sup>63</sup> )* | _BIGINT_       |
| `UInt8`             | Unsigned 8-bit integer, range *[ 0 ... 255 ]*                          | _TINYINT_      |
| `Decimal`(`p`,`s`)  | Decimal with precision `p` and scale `s`                               | _DECIMAL_      |
| `Double`            | Floating point with binary mantissa                                    | _DOUBLE_       |
| `Date`              | e.g. `2022-12-31`                                                      | _DATE_         |
| `Time`              | e.g. `23:59:59`                                                        | _TIME_         |
| `DateTime`          | _sec_ precision                                                        | _TIMESTAMP_    |
| `Timestamp`         | _µs_ precision, with up to 7 fractional digits                         | _TIMESTAMP_    |
| `String` (`length`) | Default *length*: 255; on HANA: 5000                                   | _NVARCHAR_     |
| `Binary` (`length`) | Default *length*: 255; on HANA: 5000                                   | _VARBINARY_    |
| `Vector` (`length`) | SAP HANA Cloud QRC 1/2024, or later only                               | _REAL_VECTOR_  |
| `LargeBinary`       | Unlimited binary data, usually streamed at runtime                     | _BLOB_         |
| `LargeString`       | Unlimited textual data, usually streamed at runtime                    | _NCLOB_        |
| `Map`               | Mapped to *NCLOB* for HANA.                                            | *JSON* type    |

> [!info] Default String Lengths
> Lengths can be omitted, in which case default lengths are used. While this is usual in initial phases of a project, productive apps should always use explicitly defined length. The respective default lengths are configurable through the config options
> <Config> cds.cdsc.defaultStringLength = 255 </Config> and <br/>
> <Config> cds.cdsc.defaultBinaryLength = 255 </Config>.

> [!tip] Use Attachments instead of LargeBinary
> Consider using _Attachments_, as provided through [the CAP Attachments plugins](../plugins/index#attachments), instead of `LargeBinary` types for user-generated content like documents, images, etc.

See also:

[Additional Reuse Types and Aspects by `@sap/cds/common`](common) {.learn-more}

[Mapping to OData EDM types](../guides/protocols/odata#type-mapping) {.learn-more}

[HANA-native Data Types](../guides/databases/hana-native#hana-types){.learn-more}
