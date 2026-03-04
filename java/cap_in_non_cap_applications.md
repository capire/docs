---
synopsis: >
  This guide shows how legacy Spring Boot applications can integrate themselves with service offerings of SAP BTP using different CAP plugins without the need to completely migrate to CAP Java.
status: released
---

# Legacy Applications using SAP BTP services with CAP Java

<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}

One of the strengths of CAP Java is that it offers a [variety of plugins integrating with SAP BTP services](../plugins/) while keeping applications free of technical dependencies to such services. In the CAP ecosystem, we call this approach [Calesi (CAP level service integration)](../get-started/concepts#the-calesi-pattern). Most of those Calesi plugins expose themselves as a CAP service which also can be injected as a Spring Boot component. Take this together with the fact that the CAP runtime can run alongside a non-CAP Spring Boot application and you have robust and proven service integration (via CAP plugins) with a growing set of BTP platform services.

In general, adding a CAP Java plugin to your existing Spring Boot application is just adding one or more dependencies to the application's `pom.xml` as well as adding configuration to the application.yaml (or other mechanisms for [Spring Boot configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html)). In the following sections we will discuss several examples on how to use the core CAP Java runtime and CAP plugin to integrate a Spring Boot application with different SAP BTP services.

## SAP Audit Log Service

In order to add audit log support you need to add the following dependencies to your `pom.xml`:

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-services-api</artifactId>
    <version>${cds.services.version}</version>
</dependency>

<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-framework-spring-boot</artifactId>
    <version>${cds.services.version}</version>
    <scope>runtime</scope>
</dependency>
```

Please also maintain a version property in your `<properties>` section:

```xml
<cds.services.version>4.6.2</cds.services.version>
```

Now, you can write client code that is actually producing and publishing audit log messages. Please read our [Auditlog documentation](./auditlog/) for more details.

## CAP Messaging

The CAP framework offers an abstraction layer for messaging services. CAP applications can emit events and messages to a `MessagingService` regardless of the target messaging infrastructure. The local default implementation for messaging is using the filesystem as the communication layer. Similar to the logical audit log support the messaging layer is already part of the core APIs of CAP Java. A plain Spring Boot application can use these APIs, too and only needs to perform these two steps to activate CAP messaging:

At first you need to make sure that the following dependencies are part of your `pom.xml`:

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-services-api</artifactId>
    <version>${cds.services.version}</version>
</dependency>

<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-framework-spring-boot</artifactId>
    <version>${cds.services.version}</version>
    <scope>runtime</scope>
</dependency>
```

Again, you need to set a property for the `cds.services.version`:

```xml
<cds.services.version>4.7.0</cds.services.version>
```

After setting up the dependencies you just need to activate the file-based messaging in the application's configuration:

```yaml
cds.messaging.services.messaging.kind: file-based-messaging
```

Once this is done, you can the CAP messaging feature in your application. Please read our documentation on [Messaging](./messaging/) for more details.

<div id="alesi-cds-feature-ucl" />

##
