---
status: released
---

<script setup>
  import { h } from 'vue'
  const X =  () => h('span', { class: 'ga',      title: 'Available' },              [ '✓'        ])
  const Na = () => h('i',    { class: 'na',      title: 'not applicable' },         [ 'n/a'      ])
  const D =  () => h('i',    { class: 'prog',    title: 'in progress'  },           [ 'in prog.' ])
  const O =  () => h('i',    { class: 'plan',    title: 'planned'  },               [ 'planned'  ])
  const C =  () => h('i',    { class: 'contrib', title: 'contributions welcome'  }, [ 'contrib?' ])
  const Ac = () => h('i',    { class: 'contrib', title: 'active contributions'  },  [ 'contrib'  ])
</script>

<style scoped>
  .ga   { color: var(--vp-c-green-2);}
  .na   { color: gray; font-size:90%; }
  .prog { color: var(--vp-c-green-3); font-size:90%; font-weight:500; }
  .plan { color: gray; font-size:90% }
  .contrib { color: gray; font-size:90% }
</style>


# Features Overview

Following is an index of the features currently covered by CAP, with status and availability information. In addition, we also list features, which are planned or already in development, but not yet generally available, to give you an idea about our roadmap.


#### Legend

|  Tag  | Explanation                                       |
|:-----:|---------------------------------------------------|
| <X/>  | generally and publicly available today            |
| <Na/> | not applicable for this combination               |
| <D/>  | in progress; likely to become available near-term |
| <O/>  | we might pick that up for development soon        |
| <C/>  | not scheduled for development by us so far        |
| <Ac/> | already active contribution                       |

### CLI & Tools Support

| CLI commands                                                               |                            |
|----------------------------------------------------------------------------|----------------------------|
| [Jump-start cds-based projects](../get-started/)                           | `cds init <project>`       |
| [Add a feature to an existing project](../tools/cds-cli#cds-add)           | `cds add <facets>`         |
| [Add models from external sources](../guides/using-services#local-mocking) | `cds import <api>`         |
| [Compile cds models to different outputs](../node.js/cds-compile)          | `cds compile <models>`     |
| [Run your services in local server](../node.js/cds-serve)                  | `cds serve <services>`     |
| [Run and restart on file changes](../get-started/in-a-nutshell)            | `cds watch`                |
| [Read-eval-event loop](../node.js/cds-env#cli)                             | `cds repl`                 |
| Inspect effective configuration                                            | `cds env`                  |
| Prepare for deployment                                                     | `cds build`                |
| Deploy to databases                                                        | `cds deploy`               |
| Build and deploy your application to the cloud                             | `cds up`                   |
| Bind application to remote services                                        | `cds bind`                 |
| Debug your application                                                     | `cds debug`                |
| Login to multitenant SaaS application                                      | `cds login <app-url>`      |
| Upgrade SaaS tenant(s) to latest versions                                  | `cds upgrade`              |
| Logout from multitenant SaaS application                                   | `cds logout`               |
| Subscribe a tenant to a SaaS application                                   | `cds subscribe <tenant>`   |
| Unsubscribe a tenant from a SaaS application                               | `cds unsubscribe <tenant>` |
| Pull the base model for a SaaS extension                                   | `cds pull`                 |
| Push a SaaS extension                                                      | `cds push`                 |


> Run `cds help <command>` to find details about an individual command. Use `cds version` to check the version that you've installed. To know what is the latest version, see the [Release Notes](../releases/) for CAP.

<br>

| Editors/IDE Support      | Application Studio | VS Code |
|--------------------------|:------------------:|:-------:|
| CDS Syntax Highlighting  |        <X/>        |  <X/>   |
| CDS Code Completion      |        <X/>        |  <X/>   |
| CDS Prettifier           |        <X/>        |  <X/>   |
| Advanced Debug/Run Tools |        <X/>        |         |
| Project Explorer         |        <X/>        |         |
| ...                      |                    |         |


### CDS Language & Compiler

|                                                                                                                   | CDS  |
|-------------------------------------------------------------------------------------------------------------------|:----:|
| [Entity-Relationship Modeling](../cds/cdl#entities)                                                               | <X/> |
| [Custom-defined Types](../cds/cdl#types)                                                                          | <X/> |
| [Views / Projections ](../cds/cdl#views)                                                                          | <X/> |
| [Associations & Compositions](../cds/cdl#associations)                                                            | <X/> |
| [Annotations](../cds/cdl#annotations) &rarr; [Common](../cds/annotations), [OData](../advanced/odata#annotations) | <X/> |
| [Aspects](../guides/domain-modeling#aspects)                                                                      | <X/> |
| [Services...](../cds/cdl#services)                                                                                | <X/> |
| [&mdash; w/ Redirected Associations](../cds/cdl#auto-redirect)                                                    | <X/> |
| [&mdash; w/ Auto-exposed Targets](../cds/cdl#auto-expose)                                                         | <X/> |
| [&mdash; w/ Actions & Functions](../cds/cdl#actions)                                                              | <X/> |
| [&mdash; w/ Events](../cds/cdl#events)                                                                            | <X/> |
| [Managed Compositions of Aspects](../cds/cdl#managed-compositions)                                                | <X/> |
| [Structured Elements](../cds/cdl#structured-types)                                                                | <X/> |
| Nested Projections                                                                                                | <D/> |
| [Calculated Elements](../cds/cdl#calculated-elements)                                                             | <X/> |
| Managed _n:m_ Associations                                                                                        | <O/> |
| Pluggable CDS Linter                                                                                              | <D/> |
| [CDS Linter](../tools/cds-lint/)                                                                                  | <X/> |

### Providing Services

| Core Framework Features                                                                    |  CDS  | Node.js | Java |
|--------------------------------------------------------------------------------------------|:-----:|:-------:|:----:|
| [Automatically Serving CRUD Requests](../guides/providing-services#generic-providers)      | <Na/> |  <X/>   | <X/> |
| [Deep-Read/Write Structured Documents](../guides/providing-services#deep-reads-and-writes) | <X/>  |  <X/>   | <X/> |
| [Automatic Input Validation](../guides/providing-services#input-validation)                | <X/>  |  <X/>   | <X/> |
| [Auto-filled Primary Keys](../guides/domain-modeling#prefer-uuids-for-keys)                | <X/>  |  <X/>   | <X/> |
| [Implicit Paging](../guides/providing-services#implicit-pagination)                        | <X/>  |  <X/>   | <X/> |
| [Implicit Sorting](../guides/providing-services#implicit-sorting)                          | <X/>  |  <X/>   | <X/> |
| [Access Control](../guides/security/authorization)                                         | <X/>  |  <X/>   | <X/> |
| [Arrayed Elements](../cds/cdl#arrayed-types)                                               | <X/>  |  <X/>   | <X/> |
| [Streaming & Media Types](../guides/providing-services#serving-media-data)                 | <X/>  |  <X/>   | <X/> |
| [Conflict Detection through _ETags_](../guides/providing-services#etag)                    | <X/>  |  <X/>   | <X/> |
| [Authentication via JWT](../guides/security/authorization#prerequisite-authentication)     | <Na/> |  <X/>   | <X/> |
| [Basic Authentication](../guides/security/authorization#prerequisite-authentication)       | <Na/> |  <X/>   | <X/> |


<br>

| Enterprise Features                                                                                                |  CDS  | Node.js | Java |
|--------------------------------------------------------------------------------------------------------------------|:-----:|:-------:|:----:|
| [Authorization](../guides/security/authorization)                                                                  | <X/>  |  <X/>   | <X/> |
| [Analytics in Fiori](../advanced/odata#data-aggregation)                                                           | <X/>  |  <D/>   | <X/> |
| [Localization/i18n](../guides/i18n)                                                                                | <X/>  |  <X/>   | <X/> |
| [Localized Data](../guides/localized-data)                                                                         | <X/>  |  <X/>   | <X/> |
| [Temporal Data](../guides/temporal-data)                                                                           | <X/>  |  <X/>   | <X/> |
| [Managed Data](../guides/domain-modeling#managed-data)                                                             | <X/>  |  <X/>   | <X/> |
| [Dynamic Extensibility](../guides/extensibility/)                                                                  | <X/>  |  <X/>   | <X/> |
| Monitoring / Logging [[Node.js](../node.js/cds-log)\|[Java](../java/operating-applications/observability#logging)] | <Na/> |  <X/>   | <X/> |
| Audit Logging [[Node.js](../guides/data-privacy/audit-logging)\|[Java](../java/auditlog)]                          | <Na/> |  <X/>   | <X/> |


<br>

| Inbound Protocol Support                              | CDS <sup>1</sup> |      Node.js      |       Java        |
|-------------------------------------------------------|:----------------:|:-----------------:|:-----------------:|
| [REST/OpenAPI](/advanced/publishing-apis/openapi)     |       <X/>       |       <X/>        |       <X/>        |
| [OData V2](../advanced/odata#v2-support) <sup>2</sup> |       <X/>       | <X/> <sup>3</sup> |       <X/>        |
| OData V4                                              |       <X/>       |       <X/>        |       <X/>        |
| OData V4 for APIs                                     |       <D/>       |       <D/>        |       <D/>        |
| GraphQL<sup>4</sup>                                   |       <C/>       | <X/><sup>5</sup>  | <C/> <sup>6</sup> |


<br>

> <sup>1</sup> Export CDS models to ... <br>
> <sup>2</sup> To support customers with existing OData V2 UIs<br>
> <sup>3</sup> Through [V2 proxy](../advanced/odata#odata-v2-adapter-node)  <br>
> <sup>4</sup> Could be a good case for 3rd-party contribution <br>
> <sup>5</sup> For Node.js try out the [GraphQL Adapter](/plugins/#graphql-adapter) <br>
> <sup>6</sup> For Java try out the provided [sample code](https://github.com/SAP-samples/cloud-cap-samples-java/commit/16dc5d9a1f103eb1336405ee601dc7004f70538f). <br>


### Consuming Services

| [Service Consumption APIs](../guides/using-services) | Node.js | Java |
|------------------------------------------------------|:-------:|:----:|
| Uniform Consumption APIs → Hexagonal Architecture    |  <X/>   | <X/> |
| Dynamic Querying                                     |  <X/>   | <X/> |
| Programmatic Delegation                              |  <X/>   | <X/> |
| Generic Delegation                                   |  <O/>   | <O/> |
| Resilience (retry, circuit breaking, ...)            |  <C/>   | <X/> |


<br>

| Outbound Protocol Support                                        | CDS <sup>1</sup> | Node.js | Java |
|------------------------------------------------------------------|:----------------:|:-------:|:----:|
| [REST/OpenAPI](../tools/apis/cds-import#cds-import-from-openapi) |       <X/>       |  <X/>   | <X/> |
| OData V2                                                         |       <X/>       |  <X/>   | <X/> |
| OData V4                                                         |       <X/>       |  <X/>   | <X/> |
| GraphQL<sup>2</sup>                                              |       <C/>       |  <C/>   | <C/> |

> <sup>1</sup> Import API to CSN <br>
> <sup>2</sup> Could be a good case for 3rd-party contribution <br>

[Learn more about supported features for consuming services.](../guides/using-services){.learn-more}

### Events / Messaging

|                                                                                                                                                             | CDS   | Node.js                   | Java                      |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------|:-----:|:-------------------------:|:-------------------------:|
| [Declared Events in CDS](../cds/cdl#events)                                                                                                                 | <X/>  | <X/>                      | <X/>                      |
| Mock Broker (to speed up local dev) [[Node.js](../node.js/messaging#file-based)\|[Java](../java/messaging#local-testing)]                                   | <Na/> | <X/>                      | <X/>                      |
| [SAP Cloud Application Event Hub](../guides/messaging/event-broker)                                                                                            | <Na/> | <X/><br><sup>plugin</sup> | <X/><br><sup>plugin</sup> |
| [SAP Event Mesh](../guides/messaging/event-mesh)                                                                                                            | <Na/> | <X/>                      | <X/>                      |
| Composite Messaging (routing by configuration) [[Node.js](../node.js/messaging#composite-messaging)\|[Java](../java/messaging#composite-messaging-service)] | <Na/> | <X/>                      | <X/>                      |
| Import AsyncAPI                                                                                                                                             | <O/>  |                           |                           |
| Export AsyncAPI                                                                                                                                             | <X/>  |                           |                           |

<span id="events-messaging-more" />

### Database Support

|                                                                 | CDS/deploy | Node.js | Java |
|-----------------------------------------------------------------|:----------:|:-------:|:----:|
| [SAP HANA](../guides/databases)                                 |    <X/>    |  <X/>   | <X/> |
| [SAP HANA Cloud](../guides/databases-hana)                      |    <X/>    |  <X/>   | <X/> |
| [PostgreSQL](../guides/databases-postgres)                      |    <X/>    |  <X/>   | <X/> |
| [SQLite](../guides/databases-sqlite) <sup>1</sup>               |    <X/>    |  <X/>   | <X/> |
| [H2](../java/cqn-services/persistence-services#h2) <sup>1</sup> |    <X/>    |  <Na/>  | <X/> |
| [MongoDB](../guides/databases) out of the box                   |   <Na/>    |  <Na/>  | <D/> |
| Pluggable drivers architecture                                  |    <D/>    |  <D/>   | <X/> |
| Out-of-the-box support for other databases?                     |    <C/>    |  <C/>   | <C/> |


> <sup>1</sup> To speed up development. Not for productive use! <br>

> Note: You can already integrate your database of choice in a project or a contribution level. The last two are meant to further facilitate this by out-of-the-box features in CAP.

<!--| [Migration to SAP HANA Cloud](../guides/databases)            |   <D/>    | <Na/>  | <Na/> |
| [Streamlined Schema Evolution](../guides/databases)       |   <D/>    | <Na/>  | <Na/> |
| &mdash; using Liquibase                                        |   <C/>    | <Na/>  | <Na/> |
| &mdash; using Flyway                                           |   <C/>    | <Na/>  | <Na/> |-->

<!-- HANA Platform?-->


### UIs/Frontend Support

|                                                                                                         | CDS  | Node.js | Java |
|---------------------------------------------------------------------------------------------------------|:----:|:-------:|:----:|
| [Serving Fiori UIs](../advanced/fiori)                                                                  | <X/> |  <X/>   | <X/> |
| [Fiori Annotations in CDS](../advanced/fiori#fiori-annotations)                                         | <X/> |  <X/>   | <X/> |
| [Advanced Value Help](../advanced/fiori#value-helps)                                                    | <X/> |  <X/>   | <X/> |
| [Draft Support](../advanced/fiori#draft-support)                                                        | <X/> |  <X/>   | <X/> |
| [Draft for Localized Data](../advanced/fiori#draft-for-localized-data)                                  | <X/> |  <X/>   | <X/> |
| [Support for Fiori Analytics](../advanced/analytics)                                                    | <X/> |  <D/>   | <X/> |
| [Support for other UI technologies, for example Vue.js](../get-started/in-a-nutshell#vue)  <sup>1</sup> | <X/> |  <X/>   | <X/> |

>  <sup>1</sup> through standard REST/AJAX


### Platform Support & Integration

|                                                                                | Node.js | Java |
|--------------------------------------------------------------------------------|:-------:|:----:|
| [Deploy to/run on _SAP BTP, Cloud Foundry environment_](../guides/deployment/) |  <X/>   | <X/> |
| Deploy to/run on _Kubernetes_<sup>1</sup>                                      |  <D/>   | <D/> |
| [Deploy to/run on _Kyma_](../guides/deployment/to-kyma)                        |  <X/>   | <X/> |
| [SaaS on-/offboarding](../guides/multitenancy/)                                |  <X/>   | <X/> |
| [Multitenancy](../guides/multitenancy/)                                        |  <X/>   | <X/> |
| [Health checks](/guides/deployment/health-checks)                              |  <X/>   | <X/> |

> <sup>1</sup> Available on plain Kubernetes level &rarr; see [blog post by Thomas Jung](https://blogs.sap.com/2019/07/16/running-sap-cloud-application-programming-model-with-connection-to-hana-on-kubernetes/) <br>


### Extensibility

|                                                                                          |      |
|------------------------------------------------------------------------------------------|:----:|
| [Tenant-Specific Extensions](../guides/extensibility/)                                   | <X/> |
| [Adding Extension Fields](../guides/extensibility/customization#about-extension-models)  | <X/> |
| [Adding new Entities](../guides/extensibility/customization#about-extension-models)      | <X/> |
| [Adding new Relationships](../guides/extensibility/customization#about-extension-models) | <X/> |
| [Adding/Overriding Annotations](../guides/extensibility/customization)                   | <X/> |
| Adding Events                                                                            | <O/> |
| [Extension Namespaces](../guides/extensibility/customization)                            | <X/> |
| [Extension Templates](../guides/extensibility/customization#templates)                   | <X/> |
| Custom Governance Checks                                                                 | <D/> |
| [Generic Input Validations](../guides/providing-services#input-validation)               | <X/> |
| Declarative Constraints                                                                  | <O/> |
| Execute Sandboxed Code                                                                   | <O/> |
| Runtime API for In-App Extensibility                                                     | <D/> |
| Propagating Extensions across (µ) Services                                               | <O/> |
