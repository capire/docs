---
---


# Analytics in OData V2

{{ $frontmatter.synopsis }}

[[toc]]


## Aggregation

::: tip
_Data Aggregation in OData V4_ is covered in the [OData guide](../protocols/odata#data-aggregation).
:::

OData V2 has been deprecated, it is not recommended to use a deprecated protocol in new projects. This guide is for supporting existing projects. To enable the aggregation capability for your OData V2 service, specify which entities in your service model are aggregate entities (entities for which you can execute aggregation queries). Next, specify which properties within these entities constitute the measures and the corresponding aggregation functions.

Let's look at the following sample code:

::: code-group
```cds [analytics.cds]
service bookshop { entity Books {}; } /*just for name resolution*/ /*>skip<*/
service CatalogService {
  @Aggregation.ApplySupported.PropertyRestrictions: true
  entity Books @readonly as projection on bookshop.Books{
  	ID,
  	title,
  	author,

  	@Analytics.Measure: true
  	@Aggregation.default: #SUM
  	stock
  };
}
```
:::

The annotation `@Aggregation.ApplySupported.PropertyRestrictions: true` applied on the `Books` entity indicates that it's an aggregated entity. The `@Analytics.Measure: true` annotation indicates that `stock` is the property to be aggregated. Whereas the `@Aggregation.default: #SUM` annotation indicates that the `stock` property is aggregated as a sum.

You can use the following aggregations: `#SUM`, `#MAX`, `#MIN`, `#AVG`, `#COUNT_DISTINCT`

## Limitations

- The `@Aggregation.ApplySupported.PropertyRestrictions: true` annotation applies only when provisioning an OData V2 service.
- Only query operations are supported on aggregated entities.
- Association to and from an aggregated entity isn't supported.
- Filters can't be applied on measures.
- Grouping can't be supported on measures, or in other words, a measure can't act as a dimension.
