
# [Getting Started](get-started/)

  ## [Introduction — What is CAP?](about/)
  ## [Bookshop by capire](get-started/in-a-nutshell)
  ## [Best Practices](about/best-practices)
  ## [Anti Patterns](about/bad-practices)
  ## [Next Steps](get-started/#next-steps)
  ## [Learn More](get-started/learning-sources)
  ## [Features Matrix](about/features)
  ## [Troubleshooting](get-started/troubleshooting)

# [Cookbook](guides/)

## [Domain Modeling](guides/domain-modeling)

  ### [Domain Entities](guides/domain-modeling#domain-entities)
  ### [Associations](guides/domain-modeling#associations)
  ### [Aspects](guides/domain-modeling#aspects)
  ### [Managed Data](guides/domain-modeling#managed-data)
  ### [Best Practices](guides/domain-modeling#best-practices)

## [Providing Services](guides/providing-services)

  ### [Intro: Core Concepts](guides/providing-services#introduction)
  ### [Service Definitions](guides/providing-services#service-definitions)
  ### [Generic Providers](guides/providing-services#generic-providers)
  ### [Input Validation](guides/providing-services#input-validation)
  ### [Custom Logic](guides/providing-services#custom-logic)
  ### [Actions & Functions](guides/providing-services#actions-functions)
  ### [Serving Media Data](guides/providing-services#serving-media-data)
  ### [Best Practices](guides/providing-services#best-practices)

## [Consuming Services](guides/using-services)

  ### [Introduction](guides/using-services#introduction)
  ### [Import APIs](guides/using-services#external-service-api)
  ### [Mocking](guides/using-services#local-mocking)
  ### [Querying](guides/using-services#execute-queries)
  ### [Mashups](guides/using-services#integrate-and-extend)
  ### [Deployment](guides/using-services#connect-and-deploy)

## [Events & Messaging](guides/messaging/)

  ### [SAP Cloud Appl. Event Hub](guides/messaging/event-broker)
  ### [SAP Event Mesh](guides/messaging/event-mesh)
  ### [Apache Kafka](../guides/messaging/apache-kafka)
  ### [Events from S/4](guides/messaging/s4)
  ### [Task Queues](guides/messaging/task-queues)

## [Protocols/APIs](advanced/publishing-apis/)

  ### [OData APIs](advanced/odata)
  ### [OpenAPI](advanced/publishing-apis/openapi)
  ### [AsyncAPI](advanced/publishing-apis/asyncapi)

## [Serving UIs](advanced/fiori)
  ### [Fiori UIs](advanced/fiori)

## [Databases](guides/databases)

  ### [Common](guides/databases)
  ### [SQLite](guides/databases-sqlite)
  ### [H2 (Java)](guides/databases-h2)
  ### [PostgreSQL](guides/databases-postgres)
  ### [SAP HANA Cloud](guides/databases-hana)
  ### [SAP HANA Native](advanced/hana)

## [Analytics](advanced/analytics)
  ### [Embedded Analytics](../advanced/embedded-analytics)

## [Localization, i18n](guides/i18n)
## [Localized Data](guides/localized-data)
## [Temporal Data](guides/temporal-data)

## [Security](guides/security/)

  ### [CDS-based Authorization](guides/security/authorization)
  ### [Platform Security](guides/security/overview)
  ### [Security Aspects](guides/security/aspects)
  ### [Data Protection & Privacy](guides/security/data-protection-privacy)
  ### [Product Standard Compliance](../guides/security/product-standards)

## [Data Privacy](guides/data-privacy/)

  ### [Annotating Personal Data](guides/data-privacy/annotations)
  ### [Automatic Audit Logging](guides/data-privacy/audit-logging)
  ### [Personal Data Management](guides/data-privacy/pdm)
  ### [Data Retention Management](guides/data-privacy/drm)

## [Deployment](guides/deployment/)

  ### [Deploy to Cloud Foundry](guides/deployment/to-cf)
  ### [Deploy to Kyma/K8s](guides/deployment/to-kyma)
  ### [Microservices with CAP](guides/deployment/microservices)
  ### [Deploy with Confidence](guides/deployment/dwc)
  ### [Deploy with CI/CD](guides/deployment/cicd)
  ### [Custom Builds](guides/deployment/custom-builds)
  ### [Health Checks](guides/deployment/health-checks)

## [Multitenancy](../guides/multitenancy/)

  ### [MTX Reference](../guides/multitenancy/mtxs)
  ### [MTX Migration](../guides/multitenancy/old-mtx-migration)

## [Extensibility](../guides/extensibility/)

  ### [Extend SaaS Apps](../guides/extensibility/customization)
  ### [Feature Toggles](../guides/extensibility/feature-toggles)
  ### [Reuse & Compose](../guides/extensibility/composition)

## [Performance](advanced/performance-modeling)

# [CDS](cds/)

## [Definition Language (CDL)](cds/cdl)
  ### [Keywords & Identifiers](cds/cdl#keywords-identifiers)
  ### [Built-in Types & Literals](cds/cdl#built-in-types)
  ### [Entities & Type Definitions](cds/cdl#entities-type-definitions)
  ### [Views & Projections](cds/cdl#views-projections)
  ### [Associations](cds/cdl#associations)
  ### [Annotations](cds/cdl#annotations)
  ### [Aspects](cds/cdl#aspects)
  ### [Services](cds/cdl#services)
## [Schema Notation (CSN)](cds/csn)
## [Query Language (CQL)](cds/cql)
## [Query Notation (CQN)](cds/cqn)
## [Expressions (CXN)](cds/cxn)
## [Core / Built-in Types](cds/types)
## [Common Reuse Types](cds/common)
## [Common Annotations](cds/annotations)
## [Compiler Messages](../cds/compiler/messages)
## [Aspect-oriented Modelling](cds/aspects)
## [The Nature of CDS Models](cds/models)

# [Node](node.js/_menu.md)

# [Java](java/_menu.md)

# [Tools](tools/)

## [CDS Command Line Interface](tools/cds-cli)
## [CDS Editors & IDEs](tools/cds-editors)
## [CDS Lint](tools/cds-lint/)
  ### [Rules Reference](tools/cds-lint/rules/_menu.md)
## [CDS Typer](tools/cds-typer)
## [CAP Notebooks](tools/cds-editors#cap-vscode-notebook)
## [Hybrid Testing w/ cds bind](advanced/hybrid-testing)
## [CDS Design Time APIs](tools/apis/)
  ### [cds. add()](tools/apis/cds-add)
  ### [cds. import()](tools/apis/cds-import)
  ### [cds. build()](../guides/deployment/custom-builds#custom-build-plugins)

# [Plugins](plugins/)

## [OData v2 Adapter](plugins/#odata-v2-proxy)
## [WebSocket](plugins/#websocket)
## [UI5 Dev Server](plugins/#ui5-dev-server)
## [GraphQL Adapter](plugins/#graphql-adapter)
## [Attachments](plugins/#attachments)
## [SAP Document Management](plugins/#@cap-js/sdm)
## [Audit Logging](plugins/#audit-logging)
## [Change Tracking](plugins/#change-tracking)
## [Notifications](plugins/#notifications)
## [Telemetry](plugins/#telemetry)
## [Open Resource Discovery](plugins/#ord-open-resource-discovery)
## [CAP Operator for K8s](plugins/#cap-operator-plugin)
## [SAP Cloud Appl. Event Hub](plugins/#event-hub)
## [Advanced Event Mesh](plugins/#advanced-event-mesh)
