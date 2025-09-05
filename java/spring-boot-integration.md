---
synopsis: >
  This section shows how CAP Java is smoothly integrated with Spring Boot.
status: released
---

# Spring Boot Integration
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}

<!-- ## [CDS Properties](properties/) {.toc-redirect} -->

<!-- [Learn more about CDS properties to configure the CAP Java SDK.](properties){.learn-more} -->

This section describes the [Spring Boot](https://spring.io/projects/spring-boot) integration of the CAP Java SDK. Classic Spring isn't supported.
Running your application with Spring Boot framework offers a number of helpful benefits that simplify the development and maintenance of the application to a high extend.
Spring not only provides a rich set of libraries and tools for most common challenges in development, you also profit from a huge community, which constantly contributes optimizations, bug fixes and new features.

As Spring Boot is not only widely accepted but also the most popular application framework, CAP Java SDK comes with seamless integration of Spring Boot as described in the following sections.

## Integration Configuration

To make your web application ready for Spring Boot, you need to make sure that the following Spring dependencies are referenced in your `pom.xml` (group ID `org.springframework.boot`):
* `spring-boot-starter-web`
* `spring-boot-starter-jdbc`
* `spring-boot-starter-security` (optional)

In addition, for activating the Spring integration of CAP Java, the following runtime dependency is required:

```xml
<dependency>
	<groupId>com.sap.cds</groupId>
	<artifactId>cds-framework-spring-boot</artifactId>
	<version>${cds.services.version}</version>
	<scope>runtime</scope>
</dependency>
```

It might be easier to use the CDS starter bundle `cds-starter-spring-boot-odata`, which not only comprises the necessary Spring dependencies, but also configures the OData V4 protocol adapter:

```xml
<dependency>
	<groupId>com.sap.cds</groupId>
	<artifactId>cds-starter-spring-boot-odata</artifactId>
	<version>${cds.services.version}</version>
</dependency>
```

::: tip
If you refrain from adding explicit Spring or Spring Boot dependencies in your service configuration,
the CDS integration libraries transitively retrieve the recommended Spring Boot version for the current CAP Java version.
:::

## Integration Features

Besides common Spring features such as dependency injection and a sophisticated [test framework](./developing-applications/testing), the following features are available in Spring CAP applications:

* CDS event handlers within custom Spring beans are automatically registered at startup.
* Full integration into Spring transaction management (`@Transactional` is supported).
* A number of CAP Java SDK interfaces are exposed as [Spring beans](#exposed-beans) and are available in the Spring application context such as technical services, the `CdsModel`, or the `UserInfo` in current request scope.
* *Automatic* configuration of XSUAA, IAS, and [mock user authentication](./security#mock-users) by means of Spring security configuration.
* Integration of `cds`-property section into Spring properties. See section [Externalized Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config) in the Spring Boot documentation for more details.
* [The cds actuator](./operating-applications/observability#spring-boot-actuators) exposing monitoring information about CDS runtime and security.
* [The DB health check indicator](./operating-applications/observability#spring-health-checks) which also applies to tenant-aware DB connections.

::: tip
None of the listed features will be available out of the box in case you choose to pack and deploy your web application as plain Java Servlet in a *war* file.
:::


## CDS Spring Beans { #exposed-beans}

| Bean              | Description                      | Example
| :---------------------------------------------------- | :----------------------------------------------------- | :----------------------------------------------------- |
| [Service](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/Service.html)  | All kinds of CDS services, application services, and technical services   | `@Autowired`<br>`CatalogService catService;`<br><br>`@Autowired`<br>`CatalogService.Draft catServiceDraft;`<br><br>`@Autowired`<br>`PersistenceService ps;`
| [ServiceCatalog](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/ServiceCatalog.html)  | The catalog of all available services   | `@Autowired`<br>`ServiceCatalog catalog;`
| [CdsRuntime](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/runtime/CdsRuntime.html)  | Runtime instance (singleton)  | `@Autowired`<br>`CdsRuntime runtime;`
| [CdsRuntimeConfigurer](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/runtime/CdsRuntimeConfigurer.html)  | Runtime configuration instance (singleton)  | `@Autowired`<br>`CdsRuntimeConfigurer configurer;`
| [CdsModel](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/reflect/CdsModel.html)  | The current model   | `@Autowired`<br>`CdsModel model;`
| [UserInfo](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/request/UserInfo.html)  | Information about the authenticated user   | `@Autowired`<br>`UserInfo userInfo;`
| [AuthenticationInfo](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/authentication/AuthenticationInfo.html)  | Authentication claims   | `@Autowired`<br>`AuthenticationInfo authInfo;`
| [ParameterInfo](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/request/ParameterInfo.html)  | Information about request parameters   | `@Autowired`<br>`ParameterInfo paramInfo;`
| [Messages](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/messages/Messages.html)  | Interface to write messages | `@Autowired`<br>`Messages messages;`
| [FeatureTogglesInfo](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/request/FeatureTogglesInfo.html)  | Information about feature toggles | `@Autowired`<br>`FeatureTogglesInfo ftsInfo;`
| [CdsDataStore](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/CdsDataStore.html) | Direct access to the default data store | `@Autowired`<br>`CdsDataStore ds;` |




