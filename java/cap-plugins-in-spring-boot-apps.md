---
synopsis: >
  This guide shows how Spring Boot applications that run without a CDS model can integrate with service offerings on SAP BTP by using CAP plugins without a full migration to CAP Java.
status: released
---

# Use CAP Plugins in Spring Boot Applications without a CDS Model

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

CAP Java offers a [variety of plugins that integrate with SAP BTP services](../plugins/) and keep your application free of hard-coded service dependencies. In the CAP ecosystem, this approach is called [Calesi (CAP level service integration)](../get-started/concepts#the-calesi-pattern). Most Calesi plugins expose a CAP service that you can inject as a Spring Boot component. As the CAP runtime can run alongside a Spring Boot application without a CDS model, this lets you use proven service integration through CAP plugins with a growing set of SAP BTP services.

In most cases, you add a CAP Java plugin by adding one or more dependencies to your application `pom.xml` and by adding configuration to `application.yaml` or another mechanism for [Spring Boot configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html). The following sections show examples of how to use the core CAP Java runtime and CAP plugins to integrate a Spring Boot application with different SAP BTP services.

To use any CAP Java plugin in a Spring Boot application, include two Maven dependencies. The first dependency is the core CAP Java runtime with its Spring Boot integration:

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-framework-spring-boot</artifactId>
    <version>${cds.services.version}</version>
    <scope>runtime</scope>
</dependency>
```
This boots the CAP Java runtime when your Spring Boot application starts. To interact with CAP and its plugins, add an additional dependency for the CAP Java application programming interface artifact:

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-services-api</artifactId>
    <version>${cds.services.version}</version>
</dependency>

```

Also add a version property in your `<properties>` section:

```xml-vue
<cds.services.version>{{ versions.java_services }}</cds.services.version>
```

## SAP Audit Log Service

CAP audit log support lets your application write audit log messages for relevant operations. The audit log application programming interfaces and the local default implementation are already part of the basic dependencies.

The SAP Audit Log service implementation for SAP BTP integrates with the CAP Java audit log application programming interfaces and is available as an additional plugin. Learn more in the [plugin documentation](https://github.com/cap-java/cds-feature-auditlog-ng).

For details on how to use the audit log application programming interfaces in your application code, refer to the [Auditlog documentation](./auditlog).

## CAP Messaging

The CAP framework offers an abstraction layer for messaging services. CAP applications can emit events and messages to a `MessagingService` regardless of the target messaging infrastructure. The local default implementation for messaging is part of the basic dependencies mentioned in the previous sections and uses the file system as the communication layer. This means you do not need a dedicated message broker for local development.

With the two basic dependencies included, activate file-based messaging in the application configuration:

```yaml
cds.messaging.services.messaging.kind: file-based-messaging
```

After that, you can use the CAP messaging feature in your application. For details, refer to the [Messaging documentation](./messaging).

<div id="alesi-cds-feature-ucl" />