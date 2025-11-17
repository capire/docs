---
synopsis: >
  This section shows the DB of choice for CAP Java.
status: released
---

# H2 - the DB of choice for CAP Java
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}


This section describes the H2 integration of the CAP Java SDK. 

## Why use H2

H2 is the database of choice for CAP Java applications, offering a combination of features making it ideal candidate for development and testing.

**Easy Configuration and Spring Boot Integration**
H2 is easy to configure, with minimal setup required to get started. Its seamless integration with Spring Boot applications means you can focus on building features rather than wrestling with complex database configurations.

**Enterprise-Grade Security**
Security is built into H2's core, featuring authentication mechanisms, encryption functions, and other security features that protect your data and ensure compliance with security standards.

**Transaction Management**
H2 implements robust transaction support including two-phase commit capabilities, enabling reliable data consistency and coordination across multiple resources in distributed systems.

**Concurrent Access and Locking**
The database supports multiple concurrent connections and implements row-level locking, allowing safe parallel data access without data corruption or race conditions.

**Open Source and Java Native**
As an open-source database written entirely in Java, H2 offers transparency, flexibility, and the benefit of being maintained by an active community. Its Java implementation ensures optimal integration with Java-based applications and platforms.

**Administrative Tools**
H2 includes a built-in web console application, providing a user-friendly interface for database administration, query execution, and data inspection without requiring external tools.

## How to configure H2

The [Using H2 for Development in CAP Java](../guides/databases-h2.md) describes how to configure the H2.


## H2 limitations

The [Limitations](../java/cqn-services/persistence-services#h2-database) section describes the known limits of H2.

