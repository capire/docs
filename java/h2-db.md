---
synopsis: >
  This section shows the DB of choice for CAP Java.
status: released
---

# H2 configuration and usage in CAP Java
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}


This section describes the H2 configuration and usage in CAP Java projects. It also provides links and further information on Development and Inspection Tools. 

## Why use H2 Database for CAP Java

H2 is the preferred database for CAP Java applications, as it offers a combination of features making it the best candidate for local development and testing.

* **Easy Configuration and Spring Boot Integration**
H2 is easy to configure, with minimal setup required to get started. Its seamless integration with Spring Boot applications means you can focus on building features rather than dealing with complex database configurations.

* **Enterprise-Grade Security**
Security is built into H2's core, featuring authentication mechanisms, encryption functions, and other security features that protect your data and ensure compliance with security standards.

* **Transaction Management**
H2 implements robust transaction support including two-phase commit capabilities, enabling reliable data consistency and coordination across multiple resources in distributed systems.

* **Concurrent Access and Locking**
The database supports multiple concurrent connections and implements row-level locking, allowing safe parallel data access without data corruption or race conditions.

* **Open Source and Java Native**
As an open-source database written entirely in Java, H2 offers transparency, flexibility, and the benefit of being maintained by an active community. Its Java implementation ensures optimal integration with Java-based applications and platforms.

* **Administrative Tools**
H2 includes a built-in web console application, providing a user-friendly interface for database administration, query execution, and data inspection without requiring external tools.

## Configure H2

The section [Using H2 for Development in CAP Java](../guides/databases-h2.md) describes how to set-up and configure the H2 via Maven Archetype and manually.

The simplest `application.yaml` configuration would look as follows:

```yml
spring:
  datasource:
    url: "jdbc:h2:mem:test"
    driver-class-name: org.h2.Driver
```

## H2 limitations

When developing a CAP Java application, it’s important to understand the limits and constraints of the underlying database. Every database has its own performance characteristics, data type restrictions, indexing behavior, and transaction handling rules.

To learn more about known limitations, read the section [H2 limitations](../java/cqn-services/persistence-services#h2-database).

### Hybrid Testing - a way to overcome limitations

Although CAP Java enables running and testing applications with a local H2 database, still there could be cases when this is not possible due to some limitations mentioned above. In that case hybrid testing capabilities help to stay in a local development environment and avoid long turnaround times of cloud deployments, by selectively connecting to services in the cloud.

The section [Hybrid Testing](../advanced/hybrid-testing#run-cap-java-apps-with-service-bindings) describes the steps on how to configure and consume the remote services, including SAP HANA, in local environment.

## H2 and Spring Dev Tools integration

Most CAP Java projects use Spring Boot. To speed up the edit–compile–verify loop, the Spring Boot DevTools dependency is commonly added to the development classpath. DevTools provide automatic restart and LiveReload integration. For more details check the [Spring Dev Tools](https://docs.spring.io/spring-boot/reference/using/devtools.html) reference.

The automatic restart and LiveReload provided by DevTools can cause an application restart that results in loss of state held by an in-memory H2 database. To avoid losing data between restarts during development, prefer the H2 file-based mode so the database is persisted on disk and survives DevTools restarts. For details on how to configure file-based H2, see the [Connecting to an Embedded (Local) Database](https://www.h2database.com/html/features.html#embedded_databases)

The simplest `application.yaml` configuration would look as follows: 

```yml
spring:
  datasource:
    url: "jdbc:h2:file:/data/test"
    driver-class-name: org.h2.Driver
```

## Logging SQL to console

To view the generated SQL, which will be executed against the database in your local environment, it is also possible to switch to `DEBUG` log output by adding the certain log levels in `application.yaml`

```yml
logging:
  level:
    com.sap.cds.persistence.sql: DEBUG
```

This comes especially handy in situations, when the CAP Java developers need to track runtime or a Java Application behavior.

To learn more about loggers, refer to [Predefined Loggers](../java/operating-applications/observability#predefined-loggers)

## Inspecting H2 database on the fly

CAP Java applications configured with the H2 database expose the administration console under `http://localhost:8080/h2-console` (if the port differs from the default `8080`, it should be changed accordingly).

## Inspecting with CDS Tools

[TODO] what exactly we can inspect with Tools?

To learn more about CDS Tools for Java, refer to [CDS Tools](../tools/cds-cli#java-applications)
