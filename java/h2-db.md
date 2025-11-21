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

## Why use H2

H2 is the preffered database for CAP Java applications. It offers a combination of features making it the best candidate for local development and testing.

* **Easy Configuration and Spring Boot Integration**
H2 is easy to configure, with minimal setup required to get started. Its seamless integration with Spring Boot applications means you can focus on building features rather than wrestling with complex database configurations.

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

## How to configure H2

The section [Using H2 for Development in CAP Java](../guides/databases-h2.md) describes how to set-up and configure the H2 via Maven Archetype and manually.


## H2 limitations

The [Limitations](../java/cqn-services/persistence-services#h2-database) section describes the known limitation of H2.

### Overcome the limitations with Hybrid Tests

Although CAP Java enables running and testing applications with a local H2 database, still there could be cases when this is not possible due to some limitations, mentioned above. In that case hybrid testing capabilities help you stay in a local development environment and avoid long turnaround times of cloud deployments, by selectively connecting to services in the cloud.

The section [Hybrid Testing](../advanced/hybrid-testing#run-cap-java-apps-with-service-bindings) describes the steps on how to configure and consume the remote services, including SAP HANA, in local environment.

## H2 and Srping Dev Tools

[TODO] describe and link
[Spring Dev Tools](https://docs.spring.io/spring-boot/reference/using/devtools.html)


## Logging SQL to console
To view the generated SQL, which will be executed against the database in your local environment, it is also possible to enable `DEBUG` log output by adding the certain log levels in `application.yaml`

```yml
logging:
  level:
    com.sap.cds.persistence.sql: DEBUG
```

This comes handy especially in situations, when the CAP Java developers needs to track runtime or a Java Application behavior.

To learn more about loggers, refer to [Predefined Loggers](https://cap.cloud.sap/docs/java/operating-applications/observability#predefined-loggers)

## Inspecting with CDS Tools

[TODO] what exactly we can inspect with Tools?