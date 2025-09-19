---
status: released
---

# CAP Plugins & Enhancements

Showcase of SAP Cloud Application Programming Model (CAP) plugins that provide seamless integration with SAP BTP services, SAP products, and third-party technologies which extend CAP's capabilities with minimal setup requirements.

::: tip Maintained by CAP and SAP
The `@cap-js`-scoped plugins are developed and maintained through close collaboration between CAP development teams and other SAP development teams, ensuring high quality and reliability.
:::

[[toc]]

<style scoped>
   main .vp-doc h2 + .subtitle {
      font-style: italic;
      margin: -44px 0 40px;
   }
   main .vp-doc a:has(> img) {
      display: inline-flex;
      align-items: center;
      transition: opacity 0.2s;
   }
   main .vp-doc a:has(> img):hover {
      opacity: 0.7;
   }
   main .vp-doc a:has(> img):not(:last-child) {
      margin-right: 1em;
   }
</style>



## Node.js Plugins via _cds-plugins_

For Node.js, all plugins are implemented using the [`cds-plugin`](../node.js/cds-plugins) technique, which offers minimalistic setup and a **plug & play** experience. Installation and usage are typically straightforward, as demonstrated with the [Audit Logging](../guides/data-privacy/audit-logging) plugin:

1. Add the plugin:

   ```sh
   npm add @cap-js/audit-logging
   ```

2. Add annotations to your models:

   ```cds
   annotate Customer with @PersonalData ...;
   ```

3. Test-drive locally:

   ```sh
   cds watch
   ```
   > → audit logs are written to console in dev mode.

4. Bind the platform service.

   > → audit logs are written to Audit Log service in production.

## CAP Java Plugins

The [CAP Java plugin technique](../java/building-plugins) uses JAR files distributed as Maven packages. Adding a Maven dependency automatically extends your CDS model with additional functionality. Here's how to set up [Audit Logging V2](../java/auditlog#handler-v2):

1. Add the Maven dependency (in _srv/pom.xml_):
   ```xml
   <dependency>
     <groupId>com.sap.cds</groupId>
     <artifactId>cds-feature-auditlog-v2</artifactId>
     <scope>runtime</scope>
   </dependency>
   ```
2. Add annotations to your model:

   ```cds
   annotate Customer with @PersonalData ...;
   ```
   > → audit logs are written to console in dev mode.

3. Bind the platform service.

   > → audit logs are written to SAP Audit Log service.

## Plugin Support

For plugin-related issues, use the following support channels in order of preference:

1. **GitHub Issues** - Open an issue in the plugin's repository
   
   Look for the GitHub link in the plugin descriptions above (where available).

2. **SAP Community** - Ask questions in the [SAP Community](/resources/ask-question-vscode)
   
   Recommended for plugins without public repositories or when you're uncertain about the issue source.

3. **SAP Support Portal** - File incidents through the [SAP Support Portal](/resources/#support-channels)
   
   Note: Community-maintained plugins (like those from [CAP JS Community](https://github.com/cap-js-community/)) are not covered by SAP support incidents.

::: tip Public channels benefit everyone
Choose public repositories and community forums over private channels when possible. This helps the entire CAP community find solutions more quickly.
:::

<div id="internal-support" />

<br>

::: info Complete Plugin Ecosystem
The CAP community maintains many additional plugins beyond this curated list. Explore the [CAP JS Community](https://github.com/cap-js-community) and [bestofcapjs.org](https://bestofcapjs.org/) for the complete ecosystem of available plugins.
:::

## OData V2 Adapter {#odata-v2-proxy}

The OData V2 Adapter enables legacy support for applications that require OData V2 protocol. While OData V2 has been deprecated, this plugin is essential for maintaining compatibility with existing UIs or specific controls like tree tables (sap.ui.table.TreeTable) that don't yet support V4.

The adapter functions as a protocol converter:
- **Node.js**: The [@cap-js-community/odata-v2-adapter](https://www.npmjs.com/package/@cap-js-community/odata-v2-adapter) plugin transforms incoming OData V2 requests to CDS OData V4 service calls and converts responses back
- **Java**: Built-in OData V2 support is provided natively

Available for:

[![Node.js](../assets/logos/nodejs.svg 'Link to the plugins repository.'){style="height:2.5em; display:inline; margin:0 0.2em;"}](https://github.com/cap-js-community/odata-v2-adapter#readme)
[![Java](../assets/logos/java.svg 'Link to the documentation of the OData feature.'){style="height:3em; display:inline; margin:0 0.2em;"}](../java/migration#v2adapter)

[Learn more about OData V2 Support](../advanced/odata#v2-support){.learn-more}

## WebSocket

The WebSocket plugin enables real-time, bidirectional communication between clients and CAP services. It supports both native WebSocket standards and Socket.IO protocols, making it ideal for building interactive applications like chat systems, live dashboards, or collaborative tools.

```cds
@protocol: 'websocket'
service ChatService {
  function message(text: String) returns String;
  event received {
    text: String;
  }
}
```

Available for:

[![Node.js](../assets/logos/nodejs.svg 'Link to the plugins repository.'){style="height:2.5em; display:inline; margin:0 0.2em;"}](https://github.com/cap-js-community/websocket#readme)

## UI5 Dev Server

The UI5 Dev Server plugin seamlessly integrates UI5 tooling-based projects (including UI5 freestyle and Fiori elements) into the CDS server development workflow. It provides dynamic resource serving and automatic TypeScript-to-JavaScript transpilation for UI5 controls.

**Key capabilities:**
- Integration of UI5 tooling express middlewares
- Dynamic UI5 resource serving
- Automatic TypeScript transpilation
- Streamlined development experience

Available for:

[![Node.js](../assets/logos/nodejs.svg 'Link to the plugins repository.'){style="height:2.5em; display:inline; margin:0 0.2em;"}](https://github.com/ui5-community/ui5-ecosystem-showcase/tree/main/packages/cds-plugin-ui5#cds-plugin-ui5)

## GraphQL Adapter

The GraphQL Adapter transforms your CAP services into GraphQL APIs, automatically generating GraphQL schemas from your CDS models. This enables clients to query your data using the powerful and flexible [GraphQL](https://graphql.org) query language.

Simply annotate your service definitions to enable GraphQL support:

```cds
@graphql service MyService { ... }
```

The adapter handles schema generation, query resolution, and data transformation seamlessly.

Available for:

[![Node.js](../assets/logos/nodejs.svg 'Link to the plugins repository.'){style="height:2.5em; display:inline; margin:0 0.2em;"}](https://github.com/cap-js/graphql#readme)



## Attachments

The Attachments plugin provides comprehensive support for file management in CAP applications. It handles the complete attachment lifecycle from upload to storage, with different backends for Node.js (AWS S3 via [SAP BTP Object Store](https://discovery-center.cloud.sap/serviceCatalog/object-store)) and Java (SAP HANA database).

**Quick setup:** Simply add a composition to the predefined `Attachments` aspect:

```cds
using { Attachments } from '@cap-js/attachments';
entity Incidents { ...
  attachments: Composition of many Attachments // [!code focus]
}
```

This automatically provides an interactive attachment list in your Fiori UIs:

![Screenshot showing the attachments table in an SAP Fiori UI with upload and download functionality](assets/index/attachments-table.png)

**Features:**

- **Pre-defined type `Attachment`** for seamless entity integration
- **Automatic file operations** - upload, download, delete handling
- **Malware scanning** for uploaded files
- **Fiori annotations** for upload controls
- **Streaming support** to prevent memory overloads
- **Multiple storage backends** support
- **Multitenancy** ready

Available for:

[![Node.js logo](../assets/logos/nodejs.svg 'Link to the repository for cap-js attachments.'){style="height:2.5em; display:inline; margin:0 0.2em;"}](https://github.com/cap-js/attachments#readme)
[![Java](../assets/logos/java.svg 'Link to the repository for cap-java-attachments.'){style="height:3em; display:inline; margin:0 0.2em;"}](https://github.com/cap-java/cds-feature-attachments#readme)



## SAP Document Management Service {#@cap-js/sdm}

The SAP Document Management Service plugin enables seamless document storage and management through [SAP Document Management service repositories](https://help.sap.com/docs/document-management-service). It extends the standard attachment capabilities with enterprise-grade document management features.

**Setup:** Extend your domain model with the predefined `Attachments` aspect:

```cds
extend my.Incidents with {
  attachments: Composition of many Attachments
}
```

![Screenshot showing the SAP Document Management service attachments table in an SAP Fiori UI with file management capabilities](assets/index/sdm-table.png)

**Key Features:**

- **Pre-defined `Attachment` type** for entity definitions
- **Automated file operations** - upload, view, download, delete, rename
- **Malware scanning** for security
- **Fiori annotations** for enhanced UI controls
- **Cloud repository support** via SAP Document Management service
- **CMIS-compliant repositories** for third-party integrations
- **Multitenancy** built-in support

**Planned Enhancements:**

- **Version control** for document revisions
- **Advanced document management** with metadata, search, and audit trails

[Learn more about SAP Document Management Service](https://help.sap.com/docs/document-management-service/sap-document-management-service/what-is-document-management-service){.learn-more}

Available for:

[![Node.js logo](../assets/logos/nodejs.svg){style="height:2.5em; display:inline; margin:0 0.2em;"}](https://github.com/cap-js/sdm/#readme)
[![Java](../assets/logos/java.svg){style="height:3em; display:inline; margin:0 0.2em;"}](https://github.com/cap-java/sdm/#readme)



## Audit Logging

The Audit Logging plugin provides comprehensive support for logging personal data operations, ensuring compliance with data protection regulations through the [SAP Audit Log Service](https://discovery-center.cloud.sap/serviceCatalog/audit-log-service).

**Simple setup:** Annotate your entities and fields to enable automatic audit logging:

```cds
annotate my.Customers with @PersonalData : {
  DataSubjectRole : 'Customer',
  EntitySemantics : 'DataSubject'
} {
  ID           @PersonalData.FieldSemantics: 'DataSubjectID';
  name         @PersonalData.IsPotentiallyPersonal;
  email        @PersonalData.IsPotentiallyPersonal;
  creditCardNo @PersonalData.IsPotentiallySensitive;
}
```

**Key Features:**

- **Annotation-driven** automatic logging of personal data events
- **CAP Services API** for programmatic access, backend-agnostic
- **Development mode** console logging for fast development
- **Production integration** with SAP Audit Log Service
- **Transactional Outbox** for scalability and resilience

Available for:

[![Node.js logo](../assets/logos/nodejs.svg 'Link to the plugins repository.'){style="height:2.5em; display:inline; margin:0 0.2em;"}](https://github.com/cap-js/audit-logging#readme)
![Java](../assets/logos/java.svg){style="height:3em; display:inline; margin:0 0.2em;"}

[Learn more about audit logging in Node.js](../guides/data-privacy/audit-logging){.learn-more}
[Learn more about audit logging in Java](../java/auditlog){.learn-more}


## Change Tracking

The Change Tracking plugin automatically captures, stores, and displays change records for your modeled entities. It provides a complete audit trail of data modifications with minimal setup requirements.

**Usage:** Add `@changelog` annotations to specify which entities and elements to track:

```cds
annotate my.Incidents {
  customer @changelog: [customer.name];
  title    @changelog;
  status   @changelog;
}
```

This generates an interactive change history table in your Fiori applications:

![Screenshot showing change history table in an SAP Fiori UI displaying tracked modifications to entities](assets/index/changes.png)

Available for:

[![Node.js](../assets/logos/nodejs.svg 'Link to the plugins repository.'){style="height:2.5em; display:inline; margin:0 0.2em;"}](https://github.com/cap-js/change-tracking#readme)
[![Java](../assets/logos/java.svg 'Link to the documentation of the change-tracking feature.'){style="height:3em; display:inline; margin:0 0.2em;"}](../java/change-tracking)


## Notifications

The Notifications plugin enables business notifications in SAP Build WorkZone through a CAP service-based API. It provides a simple, programmatic interface for sending notifications to users.

**Example usage:**

```js
let alert = await cds.connect.to('notifications')
await alert.notify({
   recipients: [...supporters],
   title: `New incident created by ${customer.info}`,
   description: incident.title
})
```

**Key Features:**

- **CAP Services API** for simple, backend-agnostic integration
- **Development logging** to console for fast development cycles
- **Transactional Outbox** for enhanced scalability and resilience
- **Notification templates** with internationalization (i18n) support
- **Automatic lifecycle management** of notification templates

Available for:

[![Node.js](../assets/logos/nodejs.svg 'Link to the plugins repository.'){style="height:2.5em; display:inline; margin:0 0.2em;"}](https://github.com/cap-js/notifications#readme)


## Telemetry

The Telemetry plugin provides comprehensive observability features including distributed tracing and metrics collection. It offers [automatic OpenTelemetry instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/automatic) with minimal configuration.

**Development output example:**

```txt
[odata] - GET /odata/v4/processor/Incidents
[telemetry] - elapsed times:
  0.00 → 2.85 = 2.85 ms  GET /odata/v4/processor/Incidents
  0.47 → 1.24 = 0.76 ms    ProcessorService - READ ProcessorService.Incidents
  0.78 → 1.17 = 0.38 ms      db - READ ProcessorService.Incidents
  0.97 → 1.06 = 0.09 ms        @cap-js/sqlite - prepare SELECT json_object('ID',ID,'createdAt',createdAt,'creat…
  1.10 → 1.13 = 0.03 ms        @cap-js/sqlite - stmt.all SELECT json_object('ID',ID,'createdAt',createdAt,'crea…
  1.27 → 1.88 = 0.61 ms    ProcessorService - READ ProcessorService.Incidents.drafts
  1.54 → 1.86 = 0.32 ms      db - READ ProcessorService.Incidents.drafts
  1.74 → 1.78 = 0.04 ms        @cap-js/sqlite - prepare SELECT json_object('ID',ID,'DraftAdministrativeData_Dra…
  1.81 → 1.85 = 0.04 ms        @cap-js/sqlite - stmt.all SELECT json_object('ID',ID,'DraftAdministrativeData_Dr…
```

**Export destinations:**
- [SAP Cloud Logging](https://help.sap.com/docs/cloud-logging)
- Dynatrace
- Jaeger (Node.js only)

Available for:

[![Node.js](../assets/logos/nodejs.svg 'Link to the plugins repository.'){style="height:2.5em; display:inline; margin:0 0.2em;"}](https://github.com/cap-js/telemetry#readme)
[![Java](../assets/logos/java.svg 'Link to the documentation of the telemetry feature.'){style="height:3em; display:inline; margin:0 0.2em;"}](../java/operating-applications/observability#open-telemetry)

## ORD (Open Resource Discovery)

The ORD plugin generates [Open Resource Discovery (ORD)](https://open-resource-discovery.github.io/specification/) documents for CAP applications, providing a standardized way to discover and catalog your application's resources and APIs.

**Benefits:**
- **Single entry point** via Service Provider Interface
- **Metadata discovery** for static catalog construction
- **Runtime inspection** capabilities for system landscapes
- **Standardized documentation** of APIs and resources

![Screenshot showing generated ORD (Open Resource Discovery) document interface in command line](./assets/index/ordCLI.png){style="width:450px; box-shadow: 1px 1px 5px #888888" .mute-dark}

Multiple access methods are available - see the plugin documentation for details.

Available for:

[![Link to the repository for cap-js ORD](../assets/logos/nodejs.svg){style="height:2.5em; display:inline; margin:0 0.2em;"}](https://github.com/cap-js/ord)
[![Java](../assets/logos/java.svg 'Link to the documentation of the telemetry feature.'){style="height:3em; display:inline; margin:0 0.2em;"}](https://javadoc.io/doc/com.sap.cds/cds-feature-ord/latest/index.html)


## CAP Operator for Kubernetes {#cap-operator-plugin}

The CAP Operator plugin simplifies deployment of multitenant CAP applications on Kubernetes by generating Helm charts automatically. While the [CAP Operator](https://sap.github.io/cap-operator/) manages application lifecycles on K8s clusters, this plugin eliminates the need for manual custom resource definitions.

**Benefits:**
- **Automated Helm chart generation** from CAP application models
- **Simplified K8s deployment** without deep Helm knowledge
- **Customizable output** for specific deployment requirements
- **Multitenant application support**

Available for:

[![Node.js logo](../assets/logos/nodejs.svg){style="height:2.5em; display:inline; margin:0 0.2em;"}](https://github.com/cap-js/cap-operator-plugin#readme)
![Java logo](../assets/logos/java.svg){style="height:3em; display:inline; margin:0 0.2em;"}

## SAP Cloud Application Event Hub {#event-hub}

This plugin enables consumption of business events from [SAP Cloud Application Event Hub](https://discovery-center.cloud.sap/serviceCatalog/sap-cloud-application-event-hub), allowing standalone CAP applications to receive events from SAP S/4HANA Cloud and other SAP systems.

**Example usage:**

```js
const S4Bupa = await cds.connect.to('API_BUSINESS_PARTNER')
S4bupa.on('BusinessPartner.Changed', msg => {...})
```

[Learn more about Event Hub integration](../guides/messaging/#sap-event-broker){.learn-more}

Available for:

[![Node.js logo](../assets/logos/nodejs.svg){style="height:2.5em; display:inline; margin:0 0.2em;"}](https://github.com/cap-js/event-broker#readme)
[![Java logo](../assets/logos/java.svg){style="height:3em; display:inline; margin:0 0.2em;"}](https://github.com/cap-java/cds-feature-event-hub#readme)

## SAP Integration Suite, Advanced Event Mesh <Beta /> {#advanced-event-mesh}

[SAP Integration Suite, advanced event mesh](https://www.sap.com/products/technology-platform/integration-suite/advanced-event-mesh.html) extends your event-driven architecture beyond the SAP ecosystem, enabling integration with non-SAP systems through a fully managed, cloud-native event broker.

Available for:

[![Node.js logo](../assets/logos/nodejs.svg){style="height:2.5em; display:inline; margin:0 0.2em;"}](https://github.com/cap-js/advanced-event-mesh#readme)
[![Java logo](../assets/logos/java.svg){style="height:3em; display:inline; margin:0 0.2em;"}](https://github.com/cap-java/cds-feature-advanced-event-mesh#readme)

## ABAP RFC

The `@sap/cds-rfc` plugin bridges CAP applications with ABAP systems by importing RFC-enabled function module APIs and providing seamless function call capabilities in your custom code.

Available for:

[![Node.js](../assets/logos/nodejs.svg 'Link to the plugin page.'){style="height:2.5em; display:inline; margin:0 0.2em;"}](https://www.npmjs.com/package/@sap/cds-rfc)

<div id="rfc-plugin" />

<div id="internal-plugins" />

<div id="upcoming-plugins" />

<div id="planned-plugins" />

