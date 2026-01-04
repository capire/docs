---
synopsis: >
  Persistence Services are CQN-based database clients. This section describes which database types are supported, how datasources to these databases are created and how they are turned into Persistence Services.
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html
---

# Persistence Services
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}

## Database Support { #database-support}

CAP Java has built-in support for various databases. This section describes the different databases and any differences between them with respect to CAP features. There's out of the box support for SAP HANA with CAP currently as well as H2 and SQLite. However, it's important to note that H2 and SQLite aren't enterprise grade databases and are recommended for non-productive use like local development or CI tests only. PostgreSQL is supported in addition, but has various limitations in comparison to SAP HANA, most notably in the area of schema evolution.

### SAP HANA Cloud

SAP HANA Cloud is the CAP standard database recommended for productive use with needs for schema evolution and multitenancy. Noteworthy:

1. Write operations through views that can't be resolved by the CAP runtime are passed through to SAP HANA Cloud. Limitations are described in the [SAP HANA Cloud documentation](https://help.sap.com/docs/HANA_CLOUD_DATABASE/c1d3f60099654ecfb3fe36ac93c121bb/20d5fa9b75191014a33eee92692f1702.html#loio20d5fa9b75191014a33eee92692f1702__section_trx_ckh_qdb).

2. [Shared locks](../working-with-cql/query-execution#pessimistic-locking) are supported on SAP HANA Cloud only.

3. When using `String` elements in locale-specific ordering relations (`>`, `<`, ... , `between`), a statement-wide collation is added, which can have negative impact on the performance. If locale-specific ordering isn't required for specific `String` elements, annotate the element with `@cds.collate: false`.

```cds
entity Books : cuid {
    title        : localized String(111);
    descr        : localized String(1111);
    @cds.collate : false // [!code focus]
    isbn         : String(40);  // does not require locale-specific handling // [!code focus]
}
```
> When disabling locale-specific handling for a String element, binary comparison is used, which is generally faster but results in *case-sensitive* order (A, B, a, b).

::: info Disable Collating
To disable collating for all queries, set [`cds.sql.hana.ignoreLocale`](../developing-applications/properties#cds-sql-hana-ignoreLocale) to `true`.
:::

4. SAP HANA supports _Perl Compatible Regular Expressions_ (PCRE) for regular expression matching. If you need to match a string against a regular expression and are not interested in the exact number of the occurrences, consider using lazy (_ungreedy_) quantifiers in the pattern or the option `U`.

### PostgreSQL

CAP Java SDK is tested on [PostgreSQL](https://www.postgresql.org/) 15 and supports most of the CAP features. Known limitations are:

1. No locale specific sorting. The sort order of queries behaves as configured on the database.
2. Write operations through CDS views are only supported for views that can be [resolved](../working-with-cql/query-execution#updatable-views) or are [updatable](https://www.postgresql.org/docs/14/sql-createview.html#SQL-CREATEVIEW-UPDATABLE-VIEWS) in PostgreSQL.
3. [Multitenancy](../../guides/multitenancy/) and [extensibility](../../guides/extensibility/) aren't yet supported on PostgreSQL.

### H2 Database

[H2](https://www.h2database.com/html/main.html) is the recommended in-memory database for local development and testing with CAP Java. There's no production support for H2 from CAP and there are the following limitations:

1. H2 only supports database-level collation and the default sort order is by ASCII-code. You can set a [collation](https://www.h2database.com/html/commands.html#set_collation) to sort using dictionary order instead.
2. Case-insensitive comparison isn't yet supported.
3. By default, views aren't updatable on H2. However, the CAP Java SDK supports some views to be updatable as described [here](../working-with-cql/query-execution#updatable-views).
4. Although referential and foreign key constraints are supported, H2 [doesn't support deferred checking](https://www.h2database.com/html/grammar.html#referential_action). As a consequence, schema SQL is never generated with referential constraints.
5. In [pessimistic locking](../working-with-cql/query-execution#pessimistic-locking), _shared_ locks are not supported but an _exclusive_ lock is used instead.
6. For regular expressions, H2's implementation is compatible with Java's: the matching behaviour is an equivalent of the `Matcher.find()` call for the given pattern.

::: warning
Support for localized and temporal data via session context variables requires H2 v2.2.x or later.
:::

### SQLite

CAP supports [SQLite](https://www.sqlite.org/index.html) out of the box. When working with Java, it's [recommended](../../guides/databases/sqlite#sqlite-in-production) to use SQLite only for development and testing purposes.

CAP does support most of the major features on SQLite, although there are a few shortcomings that are listed here:

1. SQLite has only limited support for concurrent database access. You're advised to limit the connection pool to *1* as shown above (parameter `maximum-pool-size: 1`), which effectively serializes all database transactions.
2. The predicate function `contains` is supported. However, the search for characters in the word or phrase is case-insensitive in SQLite.
3. SQLite doesn't support [pessimistic locking](../working-with-cql/query-execution#pessimistic-locking).
4. Streaming of large object data isn't supported by SQLite. Hence, when reading or writing data of type `cds.LargeString` and `cds.LargeBinary` as a stream, the framework temporarily materializes the content. Thus, storing large objects on SQLite can impact the performance.
5. Sorting of character-based columns is never locale-specific but if any locale is specified in the context of a query then case insensitive sorting is performed.
6. Views in SQLite are read-only. However, the CAP Java SDK supports some views to be updatable as described in [Updatable Views](../working-with-cql/query-execution#updatable-views).
7. Foreign key constraints are supported, but are disabled by default. To activate the feature using JDBC URL, append the `foreign_keys=on` parameter to the connection URL, for example, `url=jdbc:sqlite:file:testDb?mode=memory&foreign_keys=on`. For more information, visit the [SQLite Foreign Key Support](https://sqlite.org/foreignkeys.html) in the official documentation.
8. CAP enables regular expressions on SQLite via a Java implementation. The matching behaviour is an equivalent of the `Matcher.find()` call for the given pattern.

## Datasources

Java Applications usually connect to SQL databases through datasources (`java.sql.DataSource`).
The CAP Java SDK can auto-configure datasources from service bindings and pick up datasources configured by Spring Boot.
These datasources are used to create Persistence Services, which are CQN-based database clients.

### Datasource Configuration

Datasources are usually backed by a connection pool to ensure efficient access to the database.
If datasources are created from a service binding the connection pool can be configured through the properties `cds.dataSource.<service-instance>.<pool-type>.*`.
An example configuration could look like this:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  dataSource:
    my-service-instance:
      hikari:
        maximum-pool-size: 20
```
:::

Supported pool types for single tenant scenarios are `hikari`, `tomcat`, and `dbcp2`. For a multitenant scenario `hikari`, `tomcat`, and `atomikos` are supported. The corresponding pool dependencies need to be available on the classpath. You can find an overview of the available pool properties in the respective documentation of the pool. For example, properties supported by Hikari can be found [here](https://github.com/brettwooldridge/HikariCP#gear-configuration-knobs-baby).

It is also possible to configure the database connection itself. For Hikari this can be achieved by using the `data-source-properties` section. Properties defined here are passed to the respective JDBC driver, which is responsible to establish the actual database connection. The following example sets such a [SAP HANA-specific configuration](https://help.sap.com/docs/SAP_HANA_PLATFORM/0eec0d68141541d1b07893a39944924e/109397c2206a4ab2a5386d494f4cf75e.html):

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  dataSource:
    my-service-instance:
      hikari:
        data-source-properties:
          packetSize: 300000
```
:::

### SAP HANA

#### Service Bindings

SAP HANA can be configured when running locally as well as when running productively in the cloud. The datasource is auto-configured based on available service bindings in the `VCAP_SERVICES` environment variable or locally the _default-env.json_. This only works if an application profile is used, that doesn't explicitly configure a datasource using `spring.datasource.url`. Such an explicit configuration always takes precedence over service bindings from the environment.

Service bindings of type *service-manager* and, in a Spring-based application, *hana* are used to auto-configure datasources. If multiple datasources are used by the application, you can select one auto-configured datasource to be used by the default Persistence Service through the property `cds.dataSource.binding`.

#### Configure the DDL generation

Advise the CDS Compiler to generate _tables without associations_, as associations on SAP HANA are not used by CAP Java:

::: code-group
```json [.cdsrc.json]
{ "sql": { "native_hana_associations" : false } }
```
:::

#### SQL Optimization Mode

By default, the SAP HANA adapter in CAP Java generates SQL that is optimized for the new [HEX engine](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-performance-guide-for-developers/query-execution-engine-overview) in SAP HANA Cloud. To generate SQL that is compatible with SAP HANA 2.x ([HANA Service](https://help.sap.com/docs/HANA_SERVICE_CF/6a504812672d48ba865f4f4b268a881e/08c6e596b53843ad97ae68c2d2c237bc.html)) and [SAP HANA Cloud](https://www.sap.com/products/technology-platform/hana.html), set the (deprecated) [CDS property](../developing-applications/properties#cds-properties):

```yaml
cds.sql.hana.optimizationMode: legacy
```

Use the [hints](../working-with-cql/query-execution#hana-hints) `hdb.USE_HEX_PLAN` and `hdb.NO_USE_HEX_PLAN` to overrule the configured optimization mode per statement.

::: warning Rare error in `HEX` mode
In some corner cases, particularly when using [native HANA views](../../guides/databases/hana-native#create-native-sap-hana-objects), queries in `HEX` optimization mode may fail with a "hex enforced but cannot be selected" error. This is the case if the statement execution requires the combination of HEX only features with other features that are not yet supported by the HEX engine. If CAP detects this error it will, as a fallback, execute the query in _legacy_ mode.
If you know upfront that a query can't be executed by the HEX engine, you can add a `hdb.NO_USE_HEX_PLAN` hint to the query, so the SQL generator won't use features that require the HEX engine.
:::

### PostgreSQL { #postgresql-1 }

PostgreSQL can be configured when running locally as well as when running productively in the cloud. Similar to HANA, the datasource is auto-configured based on available service bindings, if the feature `cds-feature-postgresql` is added.

#### Initial Database Schema

To generate a `schema.sql` for PostgreSQL, use the dialect `postgres` with the `cds deploy` command: `cds deploy --to postgres --dry`. The following snippet configures the [cds-maven-plugin](../developing-applications/building#cds-maven-plugin) accordingly:

::: code-group
```xml [srv/pom.xml]
<execution>
	<id>schema.sql</id>
	<goals>
		<goal>cds</goal>
	</goals>
	<configuration>
		<commands>
			<command>deploy --to postgres --dry --out "${project.basedir}/src/main/resources/schema.sql"</command>
		</commands>
	</configuration>
</execution>
```
:::

The generated `schema.sql` can be automatically deployed by Spring if you configure the [sql.init.mode](https://docs.spring.io/spring-boot/how-to/data-initialization.html#howto.data-initialization.using-basic-sql-scripts) to `always`.

Using the `@sap/cds-dk` you can add PostgreSQL support to your CAP Java project:
```sh
cds add postgres
```

::: warning
Automatic schema deployment isn't suitable for productive use. Consider using production-ready tools like Flyway or Liquibase. See more on that in the [Database guide for PostgreSQL](../../guides/databases/postgres#deployment-using-liquibase)
:::

#### Configure the Connection Data Explicitly { #postgres-connection }

If you don't have a compatible PostgreSQL service binding in your application environment, you can also explicitly configure the connection data of your PostgreSQL database in the _application.yaml_:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
---
spring:
  config.activate.on-profile: postgres
  datasource:
    url: <url>
    username: <user>
    password: <password>
    driver-class-name: org.postgresql.Driver
```
:::

### H2

For local development, [H2](https://www.h2database.com/) can be configured to run in-memory or in the file-based mode.

To generate a `schema.sql` for H2, use the dialect `h2` with the `cds deploy` command: `cds deploy --to h2 --dry`. The following snippet configures the [cds-maven-plugin](../developing-applications/building#cds-maven-plugin) accordingly:

::: code-group
```xml [srv/pom.xml]
<execution>
	<id>schema.sql</id>
	<goals>
		<goal>cds</goal>
	</goals>
	<configuration>
		<commands>
			<command>deploy --to h2 --dry --out "${project.basedir}/src/main/resources/schema.sql"</command>
		</commands>
	</configuration>
</execution>
```
:::

In Spring, H2 is automatically initialized in-memory when present on the classpath. See the official [documentation](https://www.h2database.com/html/features.html) for H2 for file-based database configuration.

Using the `@sap/cds-dk` you can add H2 support to your CAP Java project:
```sh
cds add h2
```

### SQLite

#### Initial Database Schema

To generate a `schema.sql` for SQLite, use the dialect `sqlite` with the `cds deploy` command: `cds deploy --to sqlite --dry`. The following snippet configures the [cds-maven-plugin](../developing-applications/building#cds-maven-plugin) accordingly:

::: code-group
```xml [srv/pom.xml]
<execution>
	<id>schema.sql</id>
	<goals>
		<goal>cds</goal>
	</goals>
	<configuration>
		<commands>
			<command>deploy --to sqlite --dry --out "${project.basedir}/src/main/resources/schema.sql"</command>
		</commands>
	</configuration>
</execution>
```
:::

Using the `@sap/cds-dk` you can add SQLite support to your CAP Java project:
```sh
cds add sqlite
```

#### File-Based Storage

The database content is stored in a file, `sqlite.db` as in the following example. Since the schema is initialized using `cds deploy` command, the initialization mode is set to `never`:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
---
spring:
  config.activate.on-profile: sqlite
  sql:
    init:
      mode: never
  datasource:
    url: "jdbc:sqlite:sqlite.db"
    driver-class-name: org.sqlite.JDBC
    hikari:
      maximum-pool-size: 1
```
:::

#### In-Memory Storage

The database content is stored in-memory only. The schema initialization done by Spring, executes the `schema.sql` script. Hence, the initialization mode is set to `always`. If Hikari closes the last connection from the pool, the in-memory database is automatically deleted. To prevent this situation, set `max-lifetime` to *0*:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
---
spring:
  config.activate.on-profile: default
  sql:
    init:
      mode: always
  datasource:
    url: "jdbc:sqlite:file::memory:?cache=shared"
    driver-class-name: org.sqlite.JDBC
    hikari:
      maximum-pool-size: 1
      max-lifetime: 0
```
:::

## Persistence Services

Persistence Services are CQN-based database clients. You can think of them as a wrapper around a datasource, which translates CQN to SQL.
In addition, Persistence Services have built-in transaction management. They take care of lazily initializing and maintaining database transactions as part of the active changeset context.

[Learn more about ChangeSet Contexts and Transactions.](../event-handlers/changeset-contexts){.learn-more}

A Persistence Service isn't bound to a specific service definition in the CDS model. It's capable of accepting CQN statements targeting any entity or view that is stored in the corresponding database.
All Persistence Service instances reflect on the same CDS model. It is the responsibility of the developer to decide which artifacts are deployed into which database at deploy time and to access these artifacts with the respective Persistence Service at runtime.

### The Default Persistence Service { #default-persistence-service}

The default Persistence Service is used by the generic handlers of Application Services to offer out-of-the-box CRUD functionality.
The name of the default Persistence Service is stored in the global constant [`PersistenceService.DEFAULT_NAME`](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/persistence/PersistenceService.html#DEFAULT_NAME).

If only a single datasource exists in the application the CAP Java SDK creates the default Persistence Service from it.
This is usually the case when specifying a datasource through Spring Boot's configuration (`spring.datasource.url` or auto-configured H2) or when having a single database service binding.

If multiple datasources exist in the application, the CAP Java SDK needs to know for which the default Persistence Service should be created, otherwise the application startup will fail.
By setting the property `cds.dataSource.binding` the datasource created from the specified database service binding is marked as primary.
If the datasource to be used is directly created as a bean in Spring Boot you need to ensure to mark it as primary using Spring Boot's `@Primary` annotation.

### Additional Persistence Services

For each non-primary database service binding a Persistence Service is automatically created. The name of the Persistence Service is the name of the service binding.
It is possible to configure how Persistence Services are created.

To change the name of a Persistence Service you can specify it in your configuration and connect it explicitly with the corresponding database service binding.
The following configuration creates a Persistence Service named "my-ps" for the service binding "my-hana-hdi":

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  persistence.services:
    my-ps:
      binding: "my-hana-hdi"
```
:::

You can also disable the creation of a Persistence Service for specific database service bindings.
The following configuration disables the creation of a Persistence Service for the service binding "my-hana-hdi":

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  persistence.services:
    my-hana-hdi:
      enabled: false
```
:::

To create a non-default Persistence Service for a datasource explicitly created as Spring bean a configuration is required.
The following examples shows a Java example to register such a datasource bean:

```java
@Configuration
public class DataSourceConfig {

    @Bean
    public DataSource customDataSource() {
        return DataSourceBuilder.create()
            .url("jdbc:sqlite:sqlite.db")
            .build();
    }

}
```

In the configuration you need to refer to the name of the datasource:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  persistence.services:
    my-ps:
      dataSource: "customDataSource"
```
:::

::: tip
Any usage of non-default Persistence Services needs to happen in custom handlers.
:::

### Example: Multitenant Application with Tenant-independent Datasource

A common scenario for multiple Persistence Services is in multitenant applications, which require an additional tenant-independent database.
These applications usually use the Service Manager to maintain a dedicated SAP HANA HDI container for each tenant.
However, additional tenant-independent data needs to be stored in a separate HDI container, shared by all tenants.

When running such a scenario productively it is as easy as binding two database service bindings to your application: The Service Manager binding and the additional HDI container binding.
The only configuration required in that scenario is to mark the Service Manager binding as the primary one, in order to create the default Persistence Service from it:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
spring:
  config.activate.on-profile: cloud
cds:
  dataSource:
    binding: "my-service-manager-binding"
```
:::

At deploy time it is currently recommended to deploy all CDS entities into both the tenant-dependent as well as the tenant-independent databases.
At runtime you need to ensure to access the tenant-dependent entities through the default Persistence Service and the tenant-independent entities through the additional Persistence Service.

#### Local Development and Testing with MTX

In case you are testing your multitenant application locally with the setup described in [Local Development and Testing](../../guides/multitenancy/index#test-drive-locally), you need to perform additional steps to create an in-memory tenant-independent datasource.

To create an in-memory datasource, initialized with the SQL schema, add the following configuration to your Spring Boot application:

```java
@Configuration
public class DataSourceConfig {

    @Bean
    @ConfigurationProperties("app.datasource.tenant-independent")
    public DataSourceProperties tenantIndependentDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    public DataSource tenantIndependentDataSource() {
        return tenantIndependentDataSourceProperties()
            .initializeDataSourceBuilder()
            .build();
    }

    @Bean
    public DataSourceInitializer tenantIndependentInitializer() {
        ResourceDatabasePopulator resourceDatabasePopulator = new ResourceDatabasePopulator();
        resourceDatabasePopulator.addScript(new ClassPathResource("schema.sql"));

        DataSourceInitializer dataSourceInitializer = new DataSourceInitializer();
        dataSourceInitializer.setDataSource(tenantIndependentDataSource());
        dataSourceInitializer.setDatabasePopulator(resourceDatabasePopulator);
        return dataSourceInitializer;
    }

}
```

You can then refer to that datasource in your Persistence Service configuration and mark the auto-configured MTX SQLite datasource as primary:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
spring:
  config.activate.on-profile: local-mtxs
cds:
  persistence.services:
    tenant-independent:
      dataSource: "tenantIndependentDataSource"
  dataSource:
    binding: "mtx-sqlite"
```
:::

#### Local Development and Testing without MTX

In case you're testing your application in single-tenant mode without MTX sidecar you need to configure two in-memory databases.
The primary one is used for your tenant-dependant persistence and the secondary one for your tenant-independent persistence.

Due to the way the Spring Boot DataSource auto-configuration works, you can't use the configuration property `spring.datasource.url` for one of your datasources.
Spring Boot doesn't pick up this configuration anymore, as soon as you explicitly define another datasource, which is required in this scenario.

You therefore need to define the configuration for two datasources. In addition, you need to define the transaction manager for the primary datasource.

```java
@Configuration
public class DataSourceConfig {

    /**
     * Configuration of tenant-dependant persistence
     */

    @Bean
    @Primary
    @ConfigurationProperties("app.datasource.tenant-dependent")
    public DataSourceProperties tenantDependentDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    @Primary
    public DataSource tenantDependentDataSource() {
        return tenantDependentDataSourceProperties()
            .initializeDataSourceBuilder()
            .build();
    }

    @Bean
    @Primary
    public DataSourceTransactionManager tenantDependentTransactionManager() {
        return new DataSourceTransactionManager(tenantDependentDataSource());
    }

    /**
     * Configuration of tenant-independent persistence
     */

    @Bean
    @ConfigurationProperties("app.datasource.tenant-independent")
    public DataSourceProperties tenantIndependentDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    public DataSource tenantIndependentDataSource() {
        return tenantIndependentDataSourceProperties()
            .initializeDataSourceBuilder()
            .build();
    }

    @Bean
    public DataSourceInitializer tenantIndependentInitializer() {
        ResourceDatabasePopulator resourceDatabasePopulator = new ResourceDatabasePopulator();
        resourceDatabasePopulator.addScript(new ClassPathResource("schema.sql"));

        DataSourceInitializer dataSourceInitializer = new DataSourceInitializer();
        dataSourceInitializer.setDataSource(tenantIndependentDataSource());
        dataSourceInitializer.setDatabasePopulator(resourceDatabasePopulator);
        return dataSourceInitializer;
    }

}
```

The primary datasource is automatically picked up by the CAP Java SDK. The secondary datasource needs to be referred in your Persistence Service configuration:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
spring:
  config.activate.on-profile: local
cds:
  persistence.services:
    tenant-independent:
      dataSource: "tenantIndependentDataSource"
```
:::

## Native SQL

### Native SQL with JDBC Templates { #jdbctemplate}

The JDBC template is the Spring API, which in contrast to the CQN APIs allows executing native SQL statements and call stored procedures (alternative to [Native HANA Object](../../guides/databases/hana-native#create-native-sap-hana-objects)). It seamlessly integrates with Spring's transaction and connection management. The following example shows the usage of `JdbcTemplate` in the custom handler of a Spring Boot enabled application. It demonstrates the execution of the stored procedure and native SQL statement.

```java
@Autowired
JdbcTemplate jdbcTemplate;
...

public void setStockForBook(int id, int stock) {
   jdbcTemplate.update("call setStockForBook(?,?)", id, stock);  // Run the stored procedure `setStockForBook(id in number, stock in number)`
}

public int countStock(int id) {
   SqlParameterSource namedParameters = new MapSqlParameterSource().addValue("id", id);
   return jdbcTemplate.queryForObject(
      "SELECT stock FROM Books WHERE id = :id", namedParameters, Integer.class); // Run native SQL
}
```

See [Class JdbcTemplate](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jdbc/core/JdbcTemplate.html) for more details.


### Using CQL with a Static CDS Model { #staticmodel}

The static model and accessor interfaces can be generated using the [CDS Maven Plugin](../developing-applications/building#cds-maven-plugin).

::: warning _❗ Warning_
Currently, the generator doesn't support using reserved [Java keywords](https://docs.oracle.com/javase/specs/jls/se13/html/jls-3.html#jls-3.9) as identifiers in the CDS model. Conflicting element names can be renamed in Java using the [@cds.java.name](../cds-data#renaming-elements-in-java) annotation. For entities it is recommended to use [@cds.java.this.name](../cds-data#renaming-types-in-java).
:::

#### Static Model in the Query Builder

The [Query Builder API](../working-with-cql/../working-with-cql/query-api) allows you to dynamically create [CDS Query Language (CQL)](/cds/cql) queries using entity and element names given as strings:

```java
Select.from("my.bookshop.Books")
  .columns("title")
  .where(book -> book.to("author").get("name").eq("Edgar Allan Poe"));
```

This query is constructed dynamically. It's checked only at runtime that the entity `my.bookshop.Authors` actually exists
and that it has the element `name`.  Moreover, the developer of the query doesn't get any code completion at design time. These disadvantages are avoided by using a static model to construct the query.

#### Model Interfaces

The static model is a set of interfaces that reflects the structure of the CDS model in Java (like element references with their types, associations, etc.) and allow to fluently build queries in a type-safe way. For every entity in the model, the model contains a corresponding `StructuredType` interface, which
represents this type. As an example, for this CDS model the following model interfaces are generated:

CDS model

```cds
namespace my.bookshop;

entity Books {
  key ID : Integer;
  title  : String(111);
  author : Association to Authors;
}

entity Authors {
  key ID : Integer;
  name   : String(111);
  books  : Association to many Books on books.author = $self;
}
```
[Find this source also in **cap/samples**.](https://github.com/sap-samples/cloud-cap-samples-java/blob/5396b0eb043f9145b369371cfdfda7827fedd039/db/schema.cds#L5-L21){.learn-more}

Java

```java
@CdsName("my.bookshop.Books")
public interface Books_ extends StructuredType<Books_> {
  ElementRef<Integer> ID();
  ElementRef<String> title();
  Authors_ author();
  Authors_ author(Function<Authors_, Predicate> filter);
}
```

```java
@CdsName("my.bookshop.Authors")
public interface Authors_ extends StructuredType<Authors_> {
  ElementRef<Integer> ID();
  ElementRef<String> name();
  Books_ books();
  Books_ books(Function<Books_, Predicate> filter);
}
```

####  Accessor Interfaces

The corresponding data is captured in a data model similar to JavaBeans. These beans are interfaces generated by the framework, providing the data access methods - getters and setters - and containing the CDS element names as well. The instances of the data model are created by the [CDS Query Language (CQL)](/cds/cql) Execution Engine (see the following example).

Note the following naming convention: the model interfaces, which represent the structure of the CDS Model, always end with an underscore, for example `Books_`. The accessor interface, which refers to data model, is simply the name of the CDS entity - `Books`.

The following data model interface is generated for `Books`:

```java
@CdsName("my.bookshop.Books")
public interface Books extends CdsData {

  String ID = "ID";
  String TITLE = "title";
  String AUTHOR = "author";

  Integer getID();
  void setID(Integer id);

  String getTitle();
  void setTitle(String title);

  Authors getAuthor();
  void setAuthor(Map<String, ?> author);
}
```

#### Javadoc comments

The static model and accessor interfaces can be extended with [Javadoc comments](../../cds/cdl#doc-comment).

Currently, the generator supports Javadoc comments using the interface and getter/setter methods. The following example shows Javadoc comments defined in the CDS model and how they appear in the generated interfaces.

```cds
namespace my.bookshop;
/**
 * The creator/writer of a book, article, or document.
 */
entity Authors {
  key ID : Integer;
  /**
   * The name of the author.
   */
  name : String(30);
}
```

```java
/**
 * The creator/writer of a book, article, or document.
 */
@CdsName("my.bookshop.Authors")
public interface Authors extends CdsData {

  String ID = "ID";
  String NAME = "name";

  Integer getId();
  void setId(Integer id);
  /**
   * The name of the author.
   */
  String getName();
  /**
   * The name of the author.
   */
  void setName(String name);
}
```

#### Usage

In the query builder, the interfaces reference entities. The interface methods can be used in
lambda expressions to reference elements or to compose path expressions:

```java
// Note the usage of model interface `Books_` here
Select<Books_> query = Select.from(Books_.class)
  .columns(book -> book.title())
  .where  (book -> book.author().name().eq("Edgar Allan Poe"));

// After executing the query the result can be converted to
// a typed representation List of Books.
List<Books> books = dataStore.execute(query).listOf(Books.class);
```
