---
label: Analytics
synopsis: >
  Aggregations and their limitations in OData V2.
permalink: advanced/analytics
---


# Analytics in OData V2

{{ $frontmatter.synopsis }}

[[toc]]


## Aggregation

::: tip
_Data Aggregation in OData V4_ is covered in the [OData guide](./odata#data-aggregation).
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




## CDI Exposure <Concept />

{{ $frontmatter.synopsis }}

### Introduction

An application can implement the Cloud Data Integration (CDI) protocol for exposing its data,
for example, to act as a data provider for Data Plane Services (DPS).
Basically, this means that the app has to provide a set of OData V4 services as described
in the [CDI specification](https://github.tools.sap/DataPlane/cloud-data-integration-specification).
This is easy to achieve for a CAP application, as CAP provides generic OData exposure based on CDS models.
No custom implementation is necessary.

In this document, we don't explain the CDI protocol, but explain what needs to be done
in a CAP application to manually implement the required services. The examples are
based on the master data entities of the [CAP SFlight Sample App](https://github.com/capire/xtravels).

Note: delta handling isn't supported.

::: warning
The content of this guide is based on a Proof of Concept, which was done with the
CAP SFlight sample application. It hasn't yet been verified with a real application.
:::

### Administration Service

The definition of the Administration Service has to follow the CDI specification and has to be done only once.
As the content for the corresponding entities `Namespace`, `Providers`, and `Subscriptions`
is static, you can model them as tables and provide the content as CSV files.

Entity definitions in the database layer:
```cds
namespace com.sap.dps;

entity Namespaces {
  key NamespaceID : String;
  Description : String;
  Providers : Association to many Providers on Providers.Namespace = $self;
}

entity Providers {
  key ProviderID : String;
  key NamespaceID : String;
  Description : String;
  ServiceURL : String;
  Namespace : Association to one Namespaces on Namespace.NamespaceID = NamespaceID;
  Subscriptions : Association to many Subscriptions on Subscriptions.NamespaceID = NamespaceID
                                                    and Subscriptions.ProviderID = ProviderID;
}

entity Subscriptions {
  key SubscriptionID : String;
  key NamespaceID : String;
  key ProviderID : String;
  Filter : String;
  Selection : String;
  Description : String;
  CurrentDeltaLink : String;
  PreviousDeltaLink : String;
  ExternalID : String;
  EntitySetName : String;
}
```

Then define a service that exposes the entities via simple projections
and add the required annotations. The name of the service can be chosen at will.

```cds
using { com.sap.dps } from '...';

service com.sap.cloudDataIntegration {
  @Capabilities.UpdateRestrictions.Updatable: false
  @Capabilities.InsertRestrictions.Insertable: false
  @Capabilities.DeleteRestrictions.Deletable: false
  entity Namespaces as projection on dps.Namespaces;

  @Capabilities.UpdateRestrictions.Updatable: false
  @Capabilities.InsertRestrictions.Insertable: false
  @Capabilities.DeleteRestrictions.Deletable: false
  entity Providers as projection on dps.Providers;

  @Capabilities.UpdateRestrictions.Updatable: false
  @Capabilities.FilterRestrictions: {
    Filterable: true,
    FilterExpressionRestrictions: [
      { Property: NamespaceID,    AllowedExpressions: #MultiValueOrSearchExpression },
      { Property: ProviderID,     AllowedExpressions: #MultiValueOrSearchExpression },
      { Property: SubscriptionID, AllowedExpressions: #MultiValueOrSearchExpression },
      { Property: ExternalID,     AllowedExpressions: #MultiValueOrSearchExpression }
    ]
  }
  entity Subscriptions as projection on dps.Subscriptions;
}
```

Finally provide the content for `Namespaces`and `Providers` as CSV files.
The `ServiceURL` in `Providers` is the relative path by which the respective data service (see below) is reached.
Delta handling isn't supported, so entity `Subscriptions` is empty.

Below we show the sample content for these entities in SFlight.

::: code-group
```csv [Namespaces.csv]
NamespaceID;Description
cap.sflight;CAP SFlight
```
:::

::: code-group
```csv [Providers.csv]
ProviderID;NamespaceID;Description;ServiceURL
Airport;cap.sflight;List of Airports;/cdi-airport
Airline;cap.sflight;List of Airlines;/cdi-airline
Flight;cap.sflight;List of Flights;/cdi-flight
FlightConnection;cap.sflight;List of FlightConnections;/cdi-flight-connection
Countries;cap.sflight;List of Countries;/cdi-countries
Currencies;cap.sflight;List of Currencies;/cdi-currencies
```
:::

### Payload Entities

We recommend defining a dedicated service for each entity that should be exposed via CDI.
This service should also contain:
* the corresponding `.texts` entity, if the entity has localized elements
* the corresponding child entities, if the entity has a composition

In the service, define a projection on each model entity that should be exposed.

You can freely choose the name and namespace of these services. The relation between the
Administration Service and the payload services is established by the path registered
in element `ServiceURL` of the `Providers` entity.

Note: CAP doesn't support "nested" services. So, the prefix `com.sap.cloudDataIntegrationData` chosen
for the payload services is different from the name of the admin service `com.sap.cloudDataIntegration`.

Currently DPS has problems with associations. You have to exclude all unmanaged associations from
the projections, and replace the managed associations with the respective foreign key elements.

```cds
@path:'/cdi-airport'  // provide this path as ServiceURL in Providers
service com.sap.cloudDataIntegrationData.Airport {
  @DataIntegration.Extractable
  entity Airport as projection on my.Airport {
    *,
    CountryCode.code as CountryCode_code  // foreign key for managed association CountryCode
  } excluding { CountryCode };            // remove managed association itself
}

@path:'/cdi-airline'
service com.sap.cloudDataIntegrationData.Airline {
  @DataIntegration.Extractable
  entity Airline as projection on my.Airline {
    *,
    CurrencyCode.code as CurrencyCode_code
  } excluding { CurrencyCode };
}

@path:'/cdi-flight'
service com.sap.cloudDataIntegrationData.Flight {
  @DataIntegration.Extractable
  entity Flight as projection on my.Flight {
    *,
    CurrencyCode.code as CurrencyCode_code  // foreign key
  } excluding { CurrencyCode,
                to_Airline, to_Connection };  // remove unmanaged associations
}

@path:'/cdi-flight-connection'
service com.sap.cloudDataIntegrationData.FlightConnection {
  @DataIntegration.Extractable
  entity FlightConnection as projection on my.FlightConnection {
    *,
    DepartureAirport.AirportID as DepartureAirport_AirportID,
    DestinationAirport.AirportID as DestinationAirport_AirportID
  } excluding { DepartureAirport, DestinationAirport,
                to_Airline};
}
```

::: warning
As a consequence, the information about the relation between the exposed entities is lost.
It has to be reestablished manually on consumer side (DPS).
:::

For entities with localized elements, the corresponding `.texts` entity has to be exposed explicitly.
Besides the associations `texts` and `localized`, remove also the localized elements of the base
entity. They are redundant because the same entries should also be found in the `.texts` entity.


```cds
@path:'/cdi-countries'
service com.sap.cloudDataIntegrationData.Countries {
  @DataIntegration.Extractable
  entity Countries as projection on common.Countries {
    *
  } excluding {name, description,  // exclude localized elements
               texts, localized    // exclude unmanaged associations to the text entity
  };

  entity Countries_texts as projection on common.Countries.texts;  // explicitly expose texts entity
}

@path:'/cdi-currencies'
service com.sap.cloudDataIntegrationData.Currencies {
  @DataIntegration.Extractable
  entity Currencies as projection on common.Currencies {
    *
  } excluding {name, description, texts, localized};

  entity Currencies_texts as projection on common.Currencies.texts;
}
```

In this example, we've directly exposed the entities that correspond to the database tables.
It's also possible to expose views instead of the base entities.
One thing to keep in mind, however, is that the relation between a localized entity and the
corresponding `.texts` entity is established by having the same key fields. If a view on top
of the localized entity is exposed, this correspondence may be broken.
