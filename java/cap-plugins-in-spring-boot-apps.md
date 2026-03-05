---
synopsis: >
  This guide shows how Spring Boot applications running without a CDS model can integrate themselves with service offerings of SAP BTP using different CAP plugins without the need to completely migrate to CAP Java.
status: released
---

# Use CAP Plugins in Spring Boot Apps without a CDS Model

<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}

One of the strengths of CAP Java is that it offers a [variety of plugins integrating with SAP BTP services](../plugins/) while keeping applications free of hard-coded dependencies to such services. In the CAP ecosystem, we call this approach [Calesi (CAP level service integration)](../get-started/concepts#the-calesi-pattern). Most of those Calesi plugins expose themselves as a CAP service which also can be injected as a Spring Boot component. Take this together with the fact that the CAP runtime can run alongside a Spring Boot application without any CDS model and you have robust and proven service integration (via CAP plugins) with a growing set of BTP platform services.

In general, adding a CAP Java plugin to your existing Spring Boot application is just adding one or more dependencies to the application's `pom.xml` as well as adding configuration to the application.yaml (or other mechanisms for [Spring Boot configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html)). In the following sections we will discuss several examples on how to use the core CAP Java runtime and CAP plugin to integrate a Spring Boot application with different SAP BTP services.

The basic prerequisite for all CAP Java plugins to be used within a Spring Boot application is to include 2 Maven dependencies. The first one is the core CAP Java runtime together with it's integration into the Spring Boot framework:

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-framework-spring-boot</artifactId>
    <version>${cds.services.version}</version>
    <scope>runtime</scope>
</dependency>
```
With that, the CAP Java runtime is bootstrapped during the start of the Spring Boot application. In order to interact with CAP and it's plugins you need an additional dependency to the API artifact of CAP Java:

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-services-api</artifactId>
    <version>${cds.services.version}</version>
</dependency>

```

Please also maintain a version property in your `<properties>` section:

```xml
<cds.services.version>4.6.2</cds.services.version>
```

## SAP Audit Log Service
The CAP audit log support enables applications to write audit log messages for relevant operations. The audit log APIs and the local default implementation are already part of the basic dependencies you already included.

The implementation for the SAP Audit Log service on BTP integrates with the CAP Java audit log APIs and can be added as an additional plugin. Read more about that in the [plugin's documentation](https://github.com/cap-java/cds-feature-auditlog-ng).

For more information on how to use the audit log APIs in your application's code lease read our [Auditlog documentation](./auditlog).

## CAP Messaging

The CAP framework offers an abstraction layer for messaging services. CAP applications can emit events and messages to a `MessagingService` regardless of the target messaging infrastructure. The local default implementation for messaging is already part of the above mentioned basic dependencies and uses the filesystem as the communication layer. Thus, no dedicated message broker is needed for local development.

With the 2 dependencies included you just need to activate the file-based messaging in the application's configuration:

```yaml
cds.messaging.services.messaging.kind: file-based-messaging
```

Once this is done, you can the CAP messaging feature in your application. Please read our documentation on [Messaging](./messaging) for more details.

<div id="alesi-cds-feature-ucl" />

##
