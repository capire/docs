
# Using SQLite for Development

CAP provides extensive support for [SQLite](https://www.sqlite.org/index.html), which allows projects to speed up development by magnitudes at minimized costs. We strongly recommend using this option as much as possible during development and testing.


[[toc]]


## Setup for SQLite


### Using `cds add sqlite`

Run this to set up SQLite in your CAP project:

```sh
cds add sqlite
```

Essentially this is doing the following:

- For CAP Node.js projects, it adds the `@cap-js/sqlite` package.
- For CAP Java projects, it adds a Maven dependency for the SQLite JDBC driver.
- If MTA deployment is used, it adds an SQLite service to the `mta.yaml` file.

> [!tip] 
> Using `cds add sqlite` is the recommended way to set up SQLite in your CAP projects, as it covers both CAP Node.js and CAP Java projects in one step, as well as requisite additions for MTA deployment, if applicable.


### Manual Setup for Node.js 

Run this if you want to manually set up SQLite for CAP Node.js projects, instead of using `cds add sqlite`:

```sh
npm add @cap-js/sqlite -D
```

> [!tip] Plug & Play Configuration
> The `@cap-js/sqlite` package uses the `cds-plugin` technique to auto-configure your application for using an in-memory SQLite database by default for the development profile. No further configuration is necessary.


### Manual Setup for Java

To use SQLite, add a Maven dependency to the SQLite JDBC driver:

::: code-group
```xml [srv/pom.xml]
<dependency>
  <groupId>org.xerial</groupId>
  <artifactId>sqlite-jdbc</artifactId>
  <scope>runtime</scope>
</dependency>
```
:::

### Using Maven Archetype

Alternatively, when a new CAP Java project is created with the [Maven Archetype](../../java/developing-applications/building#the-maven-archetype), you can specify the in-memory database to be used. Use the option `-DinMemoryDatabase=sqlite` to create a project that uses SQLite as in-memory database.





> [!note] Learn More...
> - about [supported databases in CAP Java and their configuration.](../../java/cqn-services/persistence-services#database-support)
> - about [features and limitations of using CAP Java with SQlite.](../../java/cqn-services/persistence-services#sqlite)



## Using In-Memory Databases

::: tip
Using in-memory databases is the most recommended option for local inner-loop development as well as for test pipelines. They are fast, require no setup, are automatically reset on each application start, and minimize resource usage and costs.
:::


### In CAP Node.js Projects

Node.js projects don't require any build steps to prepare SQLite usage. Instead all necessary artifacts are created on-the-fly when running `cds watch`, indicated by the log output like this:

```log
[cds] - connect to db > sqlite { url: ':memory:' } 
  > init from db/data/sap.capire.bookshop-Authors.csv
  > init from db/data/sap.capire.bookshop-Books.csv
  > init from db/data/sap.capire.bookshop-Books.texts.csv
  > init from db/data/sap.capire.bookshop-Genres.csv
/> successfully deployed to in-memory database. 
```

### In CAP Java Projects

To use SQLite in Java projects, you need to ensure that the database schema is created before the application starts. You can do this by generating the initial _schema.sql_ file during the build process as follows.

Configure the build to create an initial _schema.sql_ file for SQLite using `cds deploy --to sqlite --dry --out srv/src/main/resources/schema.sql`.

::: code-group
```xml [srv/pom.xml]
<execution>
	<id>schema.sql</id>
	<goals>
		<goal>cds</goal>
	</goals>
	<configuration>
		<commands>
			<command>deploy --to sqlite --dry --out srv/src/main/resources/schema.sql</command>
		</commands>
	</configuration>
</execution>
```
:::


[Learn more about creating an initial database schema](../../java/cqn-services/persistence-services#initial-database-schema-1){.learn-more}



With that in place, you need to configure the application to use an in-memory SQLite database. Configure the DB connection in the non-productive `default` profile:

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

[Learn more about configuring an in-memory SQLite database for CAP Java.](../../java/cqn-services/persistence-services#in-memory-storage){.learn-more}


## Using Persistent Databases

You can also use persistent SQLite databases. In this case, the database is deployed and initialized by `cds deploy` and not by the CAP runtimes. 

Follow these steps to use a file-based SQLite database:

1. Specify a database filename in your `db` configuration as follows:

   ::: code-group
   ```json [package.json]
   { "cds": { "requires": {
      "db": {
         "kind": "sqlite",
         "credentials": { "url": "db.sqlite" } // [!code focus]
      }
   }}}
   ```
   :::

2. Run `cds deploy`:

   ```sh
   cds deploy
   ```

3. Finally – for CAP Java projects only – configure the DB connection - ideally in a dedicated `sqlite` profile:

   ::: code-group
   ```yaml [srv/src/main/resources/application.yaml]
   ---
   spring:
   config.activate.on-profile: sqlite
   datasource:
      url: "jdbc:sqlite:db.sqlite"
      driver-class-name: org.sqlite.JDBC
      hikari:
         maximum-pool-size: 1
   ```
   :::

   [Learn more about configuring a file-based SQLite database for CAP Java](../../java/cqn-services/persistence-services#file-based-storage){.learn-more}


::: tip Redeploy on changes
Remember to always redeploy your database whenever you change your models or your data. Just run `cds deploy` again to do so.
:::



## Using SQLite in Production?

As stated in the beginning, SQLite is mostly intended to speed up development, but is not fit for production. This is not because of limited warranties or lack of support, but rather because of suitability.

A major criterion is this: cloud applications are usually served by server clusters, in which each server is connected to a shared database. SQLite could only be used in such setups with the persistent database file accessed through a network file system. This is rarely available and results in slow performance. Hence, an enterprise client-server database is a more fitting choice for these scenarios.

::: warning
SQLite only has limited support for concurrent database access due to its very coarse lock granularity. This makes it badly suited for applications with high concurrency.
:::

Having said this, there can indeed be scenarios where SQLite might also be used in production, not as the primary database of a business application, but for edge cases, such as using SQLite as in-memory caches. → [Learn more on the _sqlite.org_ website](https://www.sqlite.org/whentouse.html).
