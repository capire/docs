---
synopsis: >
  This guide shows how CAP Java applications can integrate with SAP BTP services
  using CAP plugins that are not yet part of the capire documentation.
status: released
---

# Integrate CAP Applications

<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

<script setup>
  import { useData } from 'vitepress'
  const { theme } = useData()
  const { versions } = theme.value.capire
</script>

{{ $frontmatter.synopsis }}

CAP Java offers a [variety of plugins that integrate with SAP BTP services](../plugins/) and keep your application free of hard-coded service dependencies. In the CAP ecosystem, this approach is called [Calesi (CAP level service integration)](../get-started/concepts#the-calesi-pattern). The following sections describe plugins that complement the integrations already covered by the core capire documentation.

In most cases, you add a CAP Java plugin by adding one or more dependencies to your application `pom.xml` and by adding configuration to `application.yaml` or another mechanism for [Spring Boot configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html).

## SAP Document Management Service

The `sdm` plugin integrates CAP Java applications with the [SAP Document Management Service](https://help.sap.com/docs/document-management-service), Integration Option. It uses a CMIS-based repository to store and manage attachments, and is an alternative to the default database or object store backed [Attachments](../guides/attachments) feature.

### Setup

Add the plugin dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>sdm</artifactId>
    <version>${sdm.version}</version>
</dependency>
```

The `cds-maven-plugin` must also be configured to resolve the CDS model contributions from the plugin:

```xml
<plugin>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-maven-plugin</artifactId>
    <version>${cds.services.version}</version>
    <executions>
        <execution>
            <id>cds.resolve</id>
            <goals><goal>resolve</goal></goals>
        </execution>
    </executions>
</plugin>
```

### CDS Model

Extend your entities with the `Attachments` aspect provided by the plugin:

```cds
using { sap.attachments.Attachments } from 'com.sap.cds/sdm';

extend entity Books with {
    attachments : Composition of many Attachments;
}
```

### BTP Service Binding

Bind an SAP Document Management Service instance (plan `standard`) to your application. In `mta.yaml`:

```yaml
modules:
  - name: bookshop-srv
    type: java
    path: srv
    properties:
      REPOSITORY_ID: <your-repository-id>
    requires:
      - name: sdm-di-instance

resources:
  - name: sdm-di-instance
    type: org.cloudfoundry.managed-service
    parameters:
      service: sdm
      service-plan: standard
```

The `REPOSITORY_ID` environment variable identifies the pre-onboarded Document Management repository that the plugin writes to.

### Multitenancy

For SaaS applications, the plugin integrates with the CAP Java multitenancy lifecycle. On tenant subscription, it onboards a dedicated repository; on unsubscription, it offboards it. No additional code is required beyond the standard CAP multitenancy setup. Learn more in the [plugin documentation](https://github.com/cap-java/sdm).

## SAP Integration Suite, Advanced Event Mesh

The `cds-feature-advanced-event-mesh` plugin adds support for [SAP Integration Suite, Advanced Event Mesh](https://help.sap.com/docs/sap-integration-suite-advanced-event-mesh) as a CAP messaging backend. It extends the standard CAP messaging abstraction with the `aem` kind, backed by a Solace-based broker.

### Setup

Add the plugin dependency:

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-feature-advanced-event-mesh</artifactId>
    <version>${aem.version}</version>
</dependency>
```

### Configuration

Configure the messaging service in `application.yaml`:

```yaml
cds:
  messaging:
    services:
      - name: "my-messaging"
        kind: "aem"
```

### Service Binding

The plugin expects a Cloud Foundry user-provided service named `advanced-event-mesh` with the following credentials structure:

```json
{
  "authentication-service": {
    "tokenendpoint": "https://<ias-host>/oauth2/token",
    "clientid": "<client-id>",
    "clientsecret": "<client-secret>"
  },
  "endpoints": {
    "advanced-event-mesh": {
      "uri": "https://<broker-host>:<port>",
      "amqp_uri": "amqps://<broker-host>:<port>"
    }
  },
  "vpn": "<vpn>"
}
```

An additional `aem-validation-service` binding is required for broker provisioning validation.

### Queue and Subscription Management

By default, the plugin automatically creates and manages queues and topic subscriptions on the broker. You can disable this behavior per messaging service:

```yaml
cds:
  messaging:
    services:
      - name: "my-messaging"
        kind: "aem"
        connection:
          properties:
            skipManagement: true
```

For details on how to emit and receive events using the CAP messaging APIs, refer to the [Messaging documentation](./java/messaging). Learn more in the [plugin documentation](https://github.com/cap-java/cds-feature-advanced-event-mesh).

## SAP Cloud Application Event Hub

The `cds-feature-event-hub` plugin integrates CAP Java applications with [SAP Cloud Application Event Hub](https://help.sap.com/docs/sap-cloud-application-event-hub), enabling out-of-the-box consumption and emission of business events across applications.

### Setup

Add the plugin dependency:

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-feature-event-hub</artifactId>
    <version>${event-hub.version}</version>
</dependency>
```

Bind an SAP Cloud Application Event Hub service instance to your application and follow the [SAP Cloud Application Event Hub Service Guide](https://help.sap.com/docs/sap-cloud-application-event-hub) for the required service configuration. Learn more in the [plugin documentation](https://github.com/cap-java/cds-feature-event-hub).

## SAP Audit Log Service NG

The `cds-feature-auditlog-ng` plugin integrates with the next-generation [SAP Audit Log Service](https://help.sap.com/docs/btp/sap-business-technology-platform/audit-log-service). It emits standardized audit log events conforming to the Audit Log Event Catalog, and is distinct from the `cds-feature-auditlog-v2` plugin already covered in the [Audit Logging documentation](./java/auditlog).

The plugin supports four event categories: Personal Data Access, Personal Data Modification, Configuration Change, and Security.

### Setup

Add the plugin dependency:

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-feature-auditlog-ng</artifactId>
    <version>${auditlog-ng.version}</version>
</dependency>
```

### Service Binding

The plugin looks for a Cloud Foundry user-provided service named `auditlog-ng` with the tag `auditlog-ng`. For local testing, add the credentials to your `default-env.json`:

```json
{
  "VCAP_SERVICES": {
    "user-provided": [{
      "instance_name": "auditlog-ng",
      "name": "auditlog-ng",
      "tags": ["auditlog-ng"],
      "credentials": {
        "url": "<als-endpoint>",
        "region": "<als-region>",
        "namespace": "<registered-namespace>",
        "cert": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
        "key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
        "passphrase": "<private-key-passphrase>"
      }
    }]
  }
}
```

### Usage

Inject the `AuditLogService` and use the typed event builders to emit audit events. You can override the registered namespace per event using the `auditlog.namespace` key on the event payload:

```java
@Autowired
AuditLogService auditLogService;

SecurityLog securityLog = SecurityLog.create();
securityLog.put("auditlog.namespace", "my-custom-namespace");
auditLogService.logSecurity(securityLog);
```

The namespace override is preserved through the [Transactional Outbox](./java/outbox), so audit events remain consistent even when emitted inside a transaction. Learn more in the [plugin documentation](https://github.com/cap-java/cds-feature-auditlog-ng).
