---
synopsis: >
  Find here common solutions to frequently occurring issues.
status: released
outline: 2
uacp: This page is linked from the Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/d2ee648522044ea19d3b5126c29692b5.html
---

# Troubleshooting

{{ $frontmatter.synopsis }}

[[toc]]

## Setup {#setup}


### Can't start VS Code from Command Line on macOS {#vscode-macos}

In order to start VS Code via the `code` CLI, users on macOS must first run a command (*Shell Command: Install 'code' command in PATH*) to add the VS Code executable to the `PATH` environment variable. Read VS Code's [macOS setup guide](https://code.visualstudio.com/docs/setup/mac) for help.



### Check the Node.js version { #node-version}

Make sure you run the latest long-term support (LTS) version of Node.js with an even number like `20`. Refrain from using odd versions, for which some modules with native parts will have no support and thus might even fail to install. Check version with:

```sh
node -v
```

Should you see an error like "_Node.js v1... or higher is required for `@sap/cds ...`._" on server startup, upgrade to the indicated version at the minimum, or even better, the most recent LTS version.
For [Cloud Foundry](https://docs.cloudfoundry.org/buildpacks/node/index.html#runtime), use the `engines` field in _package.json_.

[Learn more about the release schedule of **Node.js**.](https://github.com/nodejs/release#release-schedule/){.learn-more}
[Learn about ways to install **Node.js**.](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm){.learn-more}

### Check access permissions on macOS or Linux

In case you get error messages like `Error: EACCES: permission denied, mkdir '/usr/local/...'` when installing a global module like `@sap/cds-dk`, configure `npm` to use a different directory for global modules:

```sh
mkdir ~/.npm-global ; npm set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

Also add the last line to your user profile, for example, `~/.profile`, so that future shell sessions have changed `PATH` as well.

[Learn more about other ways to handle this **error**.](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally){.learn-more}

### Check if your environment variables are properly set on Windows

Global npm installations are stored in a user-specific directory on your machine. On Windows, this directory usually is:

```sh
C:\Users\<your-username>\AppData\Roaming\npm
```

Make sure that your `PATH`-environment variable contains this path.

In addition, set the variable `NODE_PATH` to: <br /> ``C:\Users\<your-username>\AppData\Roaming\npm\node_modules``.


### How Do I Consume a New Version of CDS? { #cds-versions}

* Design time tools like `cds init`:

    Install and update `@sap/cds-dk` globally using `npm i -g @sap/cds-dk`.

* Node.js runtime:

    Maintain the version of `@sap/cds` in the top-level _package.json_ of your application in the `dependencies` section.

    [Learn more about recommendations on how to manage **Node.js dependencies**.](../node.js/best-practices#dependencies){.learn-more}


* CAP Java SDK:

    Maintain the version in the _pom.xml_ of your Java module, which is located in the root folder. In this file, modify the property `cds.services.version`.

<span id="announcements" />

## Node.js

### How can I start Node.js apps on different ports?

By default, Node.js apps started with `cds run` or `cds watch` use port 4004, which might be occupied if other app instances are still running. In this case, `cds watch` now asks you if it should pick a different port.

```log
$ cds watch
...
[cds] - serving CatalogService ...

EADDRINUSE - port 4004 is already in use. Restart with new port? (Y/n) // [!code highlight]
> y
restart
...
[cds] - server listening on { url: 'http://localhost:4005' }
```

Ports can be explicitly set with the `PORT` environment variable or the `--port` argument.  See `cds help run` for more.


### Why do I lose registered event handlers?

Node.js allows extending existing services, for example in mashup scenarios. This is commonly done on bootstrap time in `cds.on('served', ...)` handlers like so:

#### DO:{.good}

```js
cds.on('served', ()=>{
  const { db } = cds.services
  db.on('before',(req)=> console.log(req.event, req.path))
})
```

It is important to note that by Node.js `emit` are synchronous operations, so, **avoid _any_ `await` operations** in there, as that might lead to race conditions. In particular, when registering additional event handlers with a service, as shown in the snippet above, this could lead to very hard to detect and resolve issues with handler registrations. So, for example, don't do this:

#### DON'T:{.bad}

```js
cds.on('served', async ()=>{
  const db = await cds.connect.to('db') // DANGER: will cause race condition !!!
  db.on('before',(req)=> console.log(req.event, req.path))
})
```

### My app isn't showing up in Dynatrace

Make sure that:
- Your app's start script is `cds-serve` instead of `npx cds run`.
- You have the dependency `@dynatrace/oneagent-sdk` in your _package.json_.

### Why are requests occasionally rejected with "Acquiring client from pool timed out" or "ResourceRequest timed out"?

**First of all**, make sure the SAP HANA database is accessible in your application's environment.
This includes making sure the SAP HANA is either part of or mapped to your Cloud Foundry space or Kyma cluster and the IP addresses are [in an allowed range](https://help.sap.com/docs/HANA_SERVICE_CF/cc53ad464a57404b8d453bbadbc81ceb/71eb651f84274a0cb2f2b4380df91724.html). Connectivity issues are likely the root cause if you experience this error during application startup.

[Learn how to set up SAP HANA instance mappings](https://help.sap.com/docs/hana-cloud/sap-hana-cloud-administration-guide/map-sap-hana-database-to-another-environment-context){.learn-more style="margin-top:10px"}

If you frequently get this error during normal runtime operation your database client pool settings likely don't match the application's requirements. There are two possible root causes:

|  | Explanation |
| --- | ---- |
| _Root Cause 1_ | The maximum number of database clients in the pool is reached and additional requests wait too long for the next client.
| _Root Cause 2_ | The creation of a new connection to the database takes too long.
| _Solution_ | Adapt `max` or `acquireTimeoutMillis` with more appropriate values, according to the [documentation](../node.js/databases#databaseservice-configuration).

Always make sure that database transactions are either committed or rolled back. This can work in two ways:
1. Couple it to your request (this happens automatically): Once the request is succeeded, the database service commits the transaction. If there was an error in one of the handlers, the database service performs a rollback.
2. For manual transactions (for example, by writing `const tx = cds.tx()`), you need to perform the commit/rollback yourself: `await tx.commit()`/`await tx.rollback()`.

If you're using [@sap/hana-client](https://www.npmjs.com/package/@sap/hana-client), make sure to adjust the environment variable [`HDB_NODEJS_THREADPOOL_SIZE`](https://help.sap.com/docs/SAP_HANA_CLIENT/f1b440ded6144a54ada97ff95dac7adf/31a8c93a574b4f8fb6a8366d2c758f21.html?version=2.11) which specifies the amount of workers that concurrently execute asynchronous method calls for different connections.


### Why are requests rejected with status `502` and do not seem to reach the application?

If you have long running requests, you may experience intermittent `502` errors that are characterized by being logged by the platform's router, but not by your CAP application.
In most cases, this behavior is caused by the server having just closed the TCP connection without waiting for acknowledgement, so that the platform's load balancer still considers it open and uses it to forward the request.
The issue is discussed in detail in this [blog post](https://adamcrowder.net/posts/node-express-api-and-aws-alb-502/#the-502-problem) by Adam Crowder.
One solution is to increase the server's `keepAliveTimeout` to above that of the respective load balancer.

The following example shows how to set `keepAliveTimeout` on the [http.Server](https://nodejs.org/api/http.html#class-httpserver) created by CAP.

```js
const cds = require('@sap/cds')
cds.once('listening', ({ server }) => {
  server.keepAliveTimeout = 3 * 60 * 1000 // > 3 mins
})
module.exports = cds.server
```

[Watch the video to learn more about **Best Practices for CAP Node.js Apps**.](https://www.youtube.com/watch?v=WTOOse-Flj8&t=87s){.learn-more}

### Why are long running requests rejected with status `504` after 30 seconds even though the application continues processing the request?

|  | Explanation |
| --- | ---- |
| _Root Cause_ | Most probably, this error is caused by the destination timeout of the App Router.
| _Solution_ | Set your own `timeout` configuration of [@sap/approuter](https://www.npmjs.com/package/@sap/approuter#destinations).

### Why does the server crash with `No service definition found for <srv-name>`?

|  | Explanation |
| --- | ---- |
| _Root Cause_ | Most probably, the service name in the `requires` section does not match the served service definition.
| _Solution_ | Set the `.service` property in the respective `requires` entry. See [cds.connect()](../node.js/cds-connect#cds-requires-srv-service) for more details.

### Why is the destination of a remote service not correctly retrieved by SAP Cloud SDK and returns a status code 404?

|  | Explanation |
| --- | ---- |
| _Root Cause_ | In case the application has a service binding with the same name as the requested destination, the SAP Cloud SDK prioritized the service binding. This service of course does have different endpoints than the originally targeted remote service. For more information, please refer to the [SAP Cloud SDK documentation](https://sap.github.io/cloud-sdk/docs/js/features/connectivity/destinations#referencing-destinations-by-name).
| _Solution_ | Use different names for the service binding and the destination.

### Why does my remote service call not work?

|  | Explanation |
| --- | ---- |
| _Root Cause_ | The destination, the remote system or the request details are not configured correctly.
| _Solution_ | To further troubleshoot the root cause, you can enable logging with environment variables `SAP_CLOUD_SDK_LOG_LEVEL=silly` and `DEBUG=remote`.

## TypeScript

### Type definitions for `@sap/cds` not found or incomplete

|                | Explanation                                                           |
|----------------|-----------------------------------------------------------------------|
| _Root Cause 1_ | The package `@cap-js/cds-typer` is not installed.                     |
| _Solution 1_   | Install the package as a dev dependency.                              |
| _Root Cause 2_ | Symlink is missing.                                                   |
| _Solution 2_   | Try `npm rebuild` or add `@cap-js/cds-types` in your _tsconfig.json_. |


#### Install package as dev dependency
The type definitions for `@sap/cds` are maintained in a separate package `@cap-js/cds-types` and have to be explicitly installed as a dev dependency. This can be done by adding the `typescript` facet:

::: code-group
```sh [facet]
cds add typescript
```
```sh [manually]
npm i -D @cap-js/cds-types
```
:::

#### Fix missing symlink

Installing `@cap-js/cds-types` leverages VS Code's automatic type resolution mechanism by symlinking the package in `node_modules/@types/sap__cds` in a postinstall script. If you find that this symlink is missing, try `npm rebuild` to trigger the postinstall script again.

If the symlink still does not persist, you can explicitly point the type resolution mechanism to `@cap-js/cds-types` in your _tsconfig.json_:

::: code-group
```json [tsconfig.json]
{
  "compilerOptions": {
    "types": ["@cap-js/cds-types"],
  }
}
```
:::

If you find that the types are still incomplete, open a bug report in [the `@cap-js/cds-types` repository](https://github.com/cap-js/cds-types/issues/new/choose).

## Java

### How can I make sure that a user passes all authorization checks?

A new option `privilegedUser()` can be leveraged when [defining](../java/event-handlers/request-contexts#defining-requestcontext) your own `RequestContext`. Adding this introduces a user, which passes all authorization restrictions. This is useful for scenarios, where a restricted service should be called through the [local service consumption API](../java/services) either in a request thread regardless of the original user's authorizations or in a background thread.

### Why do I get a "User should not exist" error during build time?

|  | Explanation |
| --- | ---- |
| _Root Cause_ | You've [explicitly configured a mock](../java/security#explicitly-defined-mock-users) user with a name that is already used by a [preconfigured mock user](../java/security#preconfigured-mock-users).
| _Solution_ | Rename the mock user and build your project again.

### Why do I get an "Error on server start"?

There could be a mismatch between your locally installed Node.js version and the version that is used by the `cds-maven-plugin`. The result is an error similar to the following:

```sh
❗️ ERROR on server start: ❗️
Error: The module '/home/user/....node'
was compiled against a different Node.js version using
```

To fix this, either switch the Node.js version using a Node version manager, or add the Node version to your _pom.xml_ as follows:

```xml
<properties>
		<!-- ... -->
		<cds.install-node.nodeVersion>v20.11.0</cds.install-node.nodeVersion>
		<!-- ... -->
	</properties>

```

[Learn more about the install-node goal.](../java/assets/cds-maven-plugin-site/install-node-mojo.html){.learn-more target="_blank"}

### How can I expose custom REST APIs with CAP?

From time to time you might want to expose additional REST APIs in your CAP application, that aren't covered through CAPs existing protocol adapters (for example, OData V4). A common example for this might be a CSV file upload or another type of custom REST endpoint.
In that case, you can leverage the powerful capabilities of Spring Web MVC, by implementing your own RestController. From within your RestController implementation, you can fully leverage all CAP Java APIs. Most commonly you'll be interacting with your services and the database through the [local service consumption API](../java/services). To learn more about Spring Web MVC, see the [Spring docs](https://docs.spring.io/spring-framework/docs/current/reference/html/web.html#mvc), [Spring Boot docs](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#boot-features-spring-mvc), and this [tutorial](https://spring.io/guides/gs/serving-web-content/).

### How can I build a CAP Java application without SQL database?

The project skeleton generated by the CAP Java archetype adds the relevant Spring Boot and CAP Java dependencies, so that SQL database is supported by default.
However, using an SQL database in CAP Java is fully optional. You can also develop CAP applications that don't use persistence at all.
To remove the SQL database support, you need to exclude the JDBC-related dependencies of Spring Boot and CAP Java. This means that CAP Java won't create a Persistence Service instance.

::: tip Default Application Service event handlers delegate to Persistence Service
You need to implement your own custom handlers in case you remove the SQL database support.
:::

You can exclude those dependencies from the `cds-starter-spring-boot` dependency in the `srv/pom.xml`:

```xml
<dependency>
  <groupId>com.sap.cds</groupId>
  <artifactId>cds-starter-spring-boot</artifactId>
  <exclusions>
    <exclusion>
      <groupId>com.sap.cds</groupId>
      <artifactId>cds-feature-jdbc</artifactId>
    </exclusion>
    <exclusion>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-jdbc</artifactId>
    </exclusion>
  </exclusions>
</dependency>
```

In addition you might want to remove the H2 dependency, which is included in the `srv/pom.xml` by default as well.

If you don't want to exclude dependencies completely, but make sure that an in-memory H2 database **isn't** used, you can disable Spring Boot's `DataSource` auto-configuration, by annotating the `Application.java` class with `@SpringBootApplication(exclude = org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration.class)`. In that mode CAP Java however can still react on explicit data source configurations or database bindings.

### What to Do About Maven-Related Errors in Eclipse's Problems View?

- In _Problems_ view, execute _Quick fix_ from the context menu if available. If Eclipse asks you to install additional Maven Eclipse plug-ins to overcome the error, do so.
- Errors like _'Plugin execution not covered by lifecycle configuration: org.codehaus.mojo:exec-maven-plugin)_ can be ignored. Do so in _Problems_ view > _Quick fix_ context menu > _Mark goal as ignored in Eclipse preferences_.
- In case, there are still errors in the project, use _Maven > Update Project..._ from the project's context menu.

## OData

### How Do I Generate an OData Response in Node.js for Error 404?

If your application(s) endpoints are served with OData and you want to change the standard HTML response to an OData response, adapt the following snippet to your needs and add it in your [custom _server.js_ file](../node.js/cds-serve#custom-server-js).

```js
let app
cds.on('bootstrap', a => {
  app = a
})
cds.on('served', () => {
  app.use((req, res, next) => {
    // > unhandled request
    res.status(404).json({ message: 'Not Found' })
  })
})
```

### Why do some requests fail if I set `@odata.draft.enabled` on my entity?

The annotation `@odata.draft.enabled` is very specific to SAP Fiori elements, only some requests are allowed.
For example it's forbidden to freely add `IsActiveEntity` to `$filter`, `$orderby` and other query options.
The technical reason for that is that active instances and drafts are stored in two different database tables.
Mixing them together is not trivial, therefore only some special cases are supported.


## SQLite { #sqlite}

### How Do I Install SQLite on Windows?

* From the [SQLite page](https://sqlite.org/download.html), download the precompiled binaries for Windows `sqlite-tools-win*.zip`.

* Create a folder _C:\sqlite_ and unzip the downloaded file in this folder to get the file `sqlite3.exe`.

* Start using SQLite directly by opening `sqlite3.exe` from the folder _sqlite_ or from the command line window opened in _C:\sqlite_.

* _Optional_: Add _C:\sqlite_ in your PATH environment variable. As soon as the configuration is active, you can start using SQLite from every location on your Windows installation.

* Use the command _sqlite3_ to connect to the in-memory database:

```sh
C:\sqlite>sqlite3
SQLite version ...
Enter ".help" for instructions
Connected to a transient in-memory database.
Use ".open FILENAME" to reopen on a persistent database.
sqlite>
```

If you want to test further, use _.help_ command to see all available commands in _sqlite3_.

In case you want a visual interface tool to work with SQLite, you can use [SQLite Viewer](https://marketplace.visualstudio.com/items?itemName=qwtel.sqlite-viewer). It's available as an extension for VS Code and integrated in SAP Business Application Studio.


## SAP HANA { #hana}

### How to Get an SAP HANA Cloud Instance for SAP BTP, Cloud Foundry environment? { #get-hana}

To configure this service in the SAP BPT cockpit on trial, refer to the [SAP HANA Cloud Onboarding Guide](https://www.sap.com/documents/2021/09/7476f8c4-f77d-0010-bca6-c68f7e60039b.html). See [SAP HANA Cloud](https://help.sap.com/docs/HANA_CLOUD) documentation or visit the [SAP HANA Cloud community](https://pages.community.sap.com/topics/hana/cloud) for more details.

::: warning HANA needs to be restarted on trial accounts
On trial, your SAP HANA Cloud instance will be automatically stopped overnight, according to the server region time zone. That means you need to restart your instance every day before you start working with your trial.
:::

[Learn more about SAP HANA Cloud trying out tutorials in the Tutorial Navigator.](https://developers.sap.com/mission.hana-cloud-database-get-started.html){.learn-more}


### I removed sample data (_.csv_ file) from my project. Still, the data is deployed and overwrites existing data. { #hana-csv}

|  | Explanation |
| --- | ---- |
| _Root Cause_ | SAP HANA still claims exclusive ownership of the data that was once deployed through `hdbtabledata` artifacts, even though the CSV files are now deleted in your project.
| _Solution_ | Add an _undeploy.json_ file to the root of your database module (the _db_ folder by default). This file defines the files **and data** to be deleted. See section [HDI Delta Deployment and Undeploy Allow List](https://help.sap.com/docs/HANA_CLOUD_DATABASE/c2b99f19e9264c4d9ae9221b22f6f589/ebb0a1d1d41e4ab0a06ea951717e7d3d.html) for more details.


#### How do I keep existing data?
If you want to keep the data from _.csv_ files and data you've already added, apply [SAP Note 2922271](https://me.sap.com/notes/2922271).
Depending on whether you have a single-tenant or multi-tenant application, see the following details for how to set the `path_parameter` and `undeploy` parameters:

:::details Single-tenant applications {open}

Use the _db/undeploy.json_ file as given in the SAP note.
The _package.json_ file that is mentioned in the SAP note is located in the _db/_ folder.
- If you don't find a _db/package.json_ file, use _gen/db/package.json_ (created by `cds build`) as a template and copy it to _db/package.json_.
- After the modification, run `cds build --production` and verify your changes have been copied to _gen/db/package.json_.
- Don't modify _gen/db/package.json_ as it is overwritten on every build.

:::

:::details Multi-tenant applications

Instead of configuring the static deployer application in _db/package.json_, use environment variable [`HDI_DEPLOY_OPTIONS`](https://help.sap.com/docs/SAP_HANA_PLATFORM/4505d0bdaf4948449b7f7379d24d0f0d/a4bbc2dd8a20442387dc7b706e8d3070.html), the `cds` configuration in _package.json_, or add the options to the model update request as `hdi` parameter:

CDS configuration for [Deployment Service](../guides/multitenancy/mtxs#deployment-config)
```json
"cds.xt.DeploymentService": {
  "hdi": {
    "deploy": {
      "undeploy": [
        "src/gen/data/my.bookshop-Books.hdbtabledata"
      ],
      "path_parameter": {
        "src/gen/data/my.bookshop-Books.hdbtabledata:skip_data_deletion": "true"
      }
    },
    ...
  }
}
```

Options in [Saas Provisioning Service upgrade API](../guides/multitenancy/mtxs#example-usage-1) call payload
```json
{
  "tenants": ["*"],
  "_": {
      "hdi": {
        "deploy": {
          "undeploy": [
            "src/gen/data/my.bookshop-Books.hdbtabledata"
          ],
          "path_parameter": {
            "src/gen/data/my.bookshop-Books.hdbtabledata:skip_data_deletion": "true"
          }
        }
      }
  }
}
```

:::

After you have successfully deployed these changes to all affected HDI (tenant) containers (in all spaces, accounts etc.), you can remove the configuration again.


### How Do I Resolve Deployment Errors?

#### Deployment fails — _Cyclic dependencies found_ or _Cycle between files_

|  | Explanation |
| --- | ---- |
| _Root Cause_ | This is a known issue with older HDI/HANA versions, which are offered on trial landscapes.
| _Solution_ | Apply the workaround of adding `--treat-unmodified-as-modified` as argument to the `hdi-deploy` command in _db/package.json_. This option redeploys files, even if they haven't changed. If you're the owner of the SAP HANA installation, ask for an upgrade of the SAP HANA instance.

#### Deployment fails — _Version incompatibility_

|  | Explanation |
| --- | ---- |
| _Root Cause_ | An error like `Version incompatibility for the ... build plugin: "2.0.x" (installed) is incompatible with "2.0.y" (requested)` indicates that your project demands a higher version of SAP HANA than what is available in your org/space on SAP BTP, Cloud Foundry environment. The error might not occur on other landscapes for the same project.
| _Solution_ | Lower the version in file `db/src/.hdiconfig` to the one given in the error message. If you're the owner of the SAP HANA installation, ask for an upgrade of the SAP HANA instance.

#### Deployment fails — _Cannot create certificate store_ {#cannot-create-certificate-store}

|  | Explanation |
| --- | ---- |
| _Root Cause_ | If you deploy to SAP HANA from a local Windows machine, this error might occur if the SAP CommonCryptoLib isn't installed on this machine. |
| _Solution_ | To install it, follow these [instructions](https://help.sap.com/docs/SAP_DATA_SERVICES/e54136ab6a4a43e6a370265bf0a2d744/c049e28431ee4e8280cd6f5d1a8937d8.html). If this doesn't solve the problem, also set the environment variables as [described here](https://help.sap.com/docs/SAP_HANA_PLATFORM/e7e79e15f5284474b965872bf0fa3d63/463d3ceeb7404eca8762dfe74e9cff62.html).


#### Deployment fails —
+ _Failed to get connection for database_
+ _Connection failed (RTE:[300015] SSL certificate validation failed_
+ _Cannot create SSL engine: Received invalid SSL Record Header_

|  | Explanation |
| --- | ---- |
| _Root Cause_ | Your SAP HANA Cloud instance is stopped. |
| _Solution_ | [Start your SAP HANA Cloud instance.](https://help.sap.com/docs/HANA_CLOUD/9ae9104a46f74a6583ce5182e7fb20cb/fe8cbc3a13b4425990880bac3a5d50d9.html)

#### Deployment fails — SSL certificate validation failed: error code: 337047686

|  | Explanation |
| --- | ---- |
| _Root Cause_ | The `@sap/hana-client` can't verify the certificate because of missing system toolchain dependencies. |
| _Solution_ | Make sure [`ca-certificates`](https://packages.ubuntu.com/focal/ca-certificates) is installed on your Docker container.

#### Deployment fails — _Cannot create SSL engine: Received invalid SSL Record Header_

|  | Explanation |
| --- | ---- |
| _Root Cause_ | Your SAP HANA Cloud instance is stopped. |
| _Solution_ | [Start your SAP HANA Cloud instance.](https://help.sap.com/docs/HANA_CLOUD/9ae9104a46f74a6583ce5182e7fb20cb/fe8cbc3a13b4425990880bac3a5d50d9.html)

#### Deployment fails — _Error: HDI make failed_

|  | Explanation |
| --- | ---- |
| _Root Cause_ | Your configuration isn't properly set. |
| _Solution_ | Configure your project as described in [Using Databases](../guides/databases).


#### Deployment fails — _Connection failed (RTE:[89008] Socket closed by peer_ {#connection-failed-89008}

#### Hybrid testing connectivity issue — _ResourceRequest timed out_ {style="margin-top: 0;"}

|  | Explanation |
| --- | ---- |
| _Root Cause_ | Your IP isn't part of the filtering you configured when you created an SAP HANA Cloud instance. This error can also happen if you exceed the [maximum number of simultaneous connections to SAP HANA Cloud (1000)](https://help.sap.com/docs/HANA_CLOUD_DATABASE/c1d3f60099654ecfb3fe36ac93c121bb/20a760537519101497e3cfe07b348f3c.html). |
| _Solution_ | Configure your SAP HANA Cloud instance [to accept your IP](https://help.sap.com/docs/HANA_SERVICE_CF/cc53ad464a57404b8d453bbadbc81ceb/71eb651f84274a0cb2f2b4380df91724.html). If configured correctly, check if the number of database connections are exceeded. Make sure your [pool configuration](../node.js/databases#pool) does not allow more than 1000 connections.

<div id="hana-ips" />

#### Deployment fails — _... build plugin for file suffix "hdbmigrationtable" [8210015]_ {#missingPlugin}

|  | Explanation |
| --- | ---- |
| _Root Cause_ | Your project configuration is missing some configuration in your _.hdiconfig_ file. |
| _Solution_ | Use `cds add hana` to add the needed configuration to your project. Or maintain the _hdbmigrationtable_ plugin in your _.hdiconfig_ file manually: `"hdbmigrationtable": { "plugin_name": "com.sap.hana.di.table.migration" }`


#### Deployment fails — _In USING declarations only main artifacts can be accessed, not sub artifacts of \<name\>_
This error occurs if all of the following applies:
+ You [added native SAP HANA objects](../advanced/hana#add-native-objects) to your CAP model.
+ You used deploy format `hdbcds`.
+ You didn't use the default naming mode `plain`.

|  | Explanation |
| --- | ---- |
| _Root Cause_ | The name/prefix of the native SAP HANA object collides with a name/prefix in the CAP CDS model.
| _Solution_ | Change the name of the native SAP HANA object so that it doesn't start with the name given in the error message and doesn't start with any other prefix that occurs in the CAP CDS model. If you can't change the name of the SAP HANA object, because it already exists, define a synonym for the object. The name of the synonym must follow the naming rule to avoid collisions (root cause).

### How do I pass additional HDI deployment options to the multitenancy tenant deployment of the `cds-mtx` library

You can add a subset of the [HDI deploy options](https://help.sap.com/docs/SAP_HANA_PLATFORM/4505d0bdaf4948449b7f7379d24d0f0d/a4bbc2dd8a20442387dc7b706e8d3070.html) using the environment variable `HDI_DEPLOY_OPTIONS`.\

When making use of these parameters, for example `exclude_filter`, please always check if the parameters are consistent with your CDS build configuration to
avoid deployment problems. For example, make sure to not exclude generated SAP HANA tables that are needed by generated views.

### How can a table function access the logged in user?

The _cds runtime_ sets the session variable `APPLICATIONUSER`. This should always reflect the logged in user.

Do not use a `XS_` prefix.

## MTXS

### I get a 401 error when logging in to MTXS through App Router { #mtxs-sidecar-approuter-401}

See [How to configure your App Router](../guides/extensibility/customization#app-router) to verify your setup.
Also check the [documentation about `cds login`](../guides/extensibility/customization#cds-login).

### When running a tenant upgrade, I get the message 'Extensions exist, but extensibility is disabled.'

This message indicates that extensions exist, but the application is not configured for extensibility. To avoid accidental data loss by removing existing extensions from the database, the upgrade is blocked in that case.
Please check the [configuration for extensibility](../guides/extensibility/customization#_1-enable-extensibility).

::: danger
If data loss is intended, you can disable the check by adding <Config>cds.requires.cds.xt.DeploymentService.upgrade.skipExtensionCheck = true</Config> to the configuration.
:::

## MTA { #mta}

### Why Does My MTA Build Fail?

- Make sure to use the latest version of the [Cloud MTA Build Tool (MBT)](https://sap.github.io/cloud-mta-build-tool/).
- Consult the [Cloud MTA Build Tool documentation](https://sap.github.io/cloud-mta-build-tool/usage/) for further information, for example, on the available tool options.

### How Can I Define the Build Order Between MTA Modules?

By default the Cloud MTA Build Tool executes module builds in parallel. If you want to enforce a specific build order, for example, because one module build relies on the outcome of another one, check the [Configuring build order](https://sap.github.io/cloud-mta-build-tool/configuration/) section in the tool documentation.

### How Do I Undeploy an MTA?

`cf undeploy <mta-id>` deletes an MTA (use `cf mtas` to find the MTA ID).

Use the optional `--delete-services` parameter to also wipe service instances. <br />
**Caution:** This deletes the HDI containers with the application data.

### MTA Build Complains About _package-lock.json_

If the MTA build fails with `The 'npm ci' command can only install with an existing package-lock.json`, this means that such a file is missing in your project.
- Check with `cds --version` to have `@sap/cds` >= 5.7.0.
- Create the _package-lock.json_ file with a regular [`npm update`](https://docs.npmjs.com/cli/v8/commands/npm-update) command.
- If the file was not created, make sure to enable it with `npm config set package-lock true` and repeat the previous command.
- _package-lock.json_ should also be added to version control, so make sure that _.gitignore_ does __not__ contain it.

The purpose of _package-lock.json_ is to pin your project's dependencies to allow for reproducible builds.

[Learn more about dependency management in Node.js.](../node.js/best-practices#dependencies){.learn-more}

### How Can I Reduce the MTA Archive Size During Development? { #reduce-mta-size}

You can reduce MTA archive sizes, and thereby speedup deployments, by omitting `node_module` folders.

First, add a file `less.mtaext` with the following content:

::: code-group
```yaml [less.mtaext]
_schema-version: '3.1'
ID: bookshop-small
extends: capire.bookshop
modules:
 - name: bookshop-srv
   build-parameters:
     ignore: ["node_modules/"]
```
:::

Now you can build the archive with:

```sh
mbt build -t gen --mtar mta.tar -e less.mtaext
```

::: warning Not recommended for production deployments
- For test deployments during _development_.  For _production_ deployments,  self-contained archives are preferrable.
- If all your dependencies are available in _public_ registries like npmjs.org or Maven Central.  Dependencies from _corporate_ registries are not resolvable in this mode.
:::

<div id="sap-make" />



## CAP on Cloud Foundry


### How Do I Get Started with SAP Business Technology Platform, Cloud Foundry environment?

For a start, create your [Trial Account](https://account.hanatrial.ondemand.com/).

<div id="sap-in-house" />

### How Do I Resolve Errors with `cf` Executable? { #cf-cli}

#### Installation fails — _mkdir ... The system cannot find the path specified_

This is a known [issue](https://github.com/cloudfoundry/docs-cf-cli/issues/57) on Windows. The fix is to set the `HOMEDRIVE` environment variable to `C:`. In any `cmd` shell session, you can do so with `SET HOMEDRIVE=C:`<br />
Also, make sure to persist the variable for future sessions in the system preferences. See [How do I set my system variables in Windows](https://superuser.com/questions/949560/how-do-i-set-system-environment-variables-in-windows-10) for more details.

#### `cf` commands fail — _Error writing config_

This is the same issue as with the installation error above.

### Why Can't My _xs-security.json_ File Be Used to Create an XSUAA Service Instance? { #pws-encoding}

|  | Explanation |
| --- | ---- |
| _Root Cause_ | Your file isn't UTF-8 encoded. If you executed `cds compile` with Windows PowerShell, the encoding of your _xs-security.json_ file is wrong.
| _Solution_ | Make sure, you execute `cds compile` in a command prompt that encodes in UTF-8 when piping output into a file.

[You can find related information on **Stack Overflow**.](https://stackoverflow.com/questions/40098771/changing-powershells-default-output-encoding-to-utf-8){.learn-more}


### How Can I Connect to a Backing Service Container like SAP HANA from My Local Machine? { #cf-connect}

Depending on, whether the container host is reachable and whether there's a proxy between your machine and the cloud, one of the following options applies:

<span id="direct-access" />

* CF SSH

    The second most convenient way is the `cf ssh` capability of Cloud Foundry CLI. You can open an SSH tunnel to the target Cloud Foundry container, if these prerequisites are met:
    - There's **no HTTP proxy** in the way.  Those only let HTTP traffic through.
    - SSH access is enabled for the CF landscape and your space (in _Canary_ this is true, otherwise check with `cf ssh-enabled`).

    Use it like this:

    ```sh
    cf ssh <app> -L localhost:<LocalPort>:<RemoteIP>:<RemotePort>
    ```
    where `<app>` has to be a running application that is bound to the service.

    Example:

    Connect to a SAP HANA service running on remote host 10.10.10.10, port 30010.

    ```sh
    cf ssh <app> -L localhost:30010:10.10.10.10:30010
    ```

    From then on, use `localhost:30010` instead of the remote address.

    [Learn more about **cf ssh**.](https://docs.cloudfoundry.org/devguide/deploy-apps/ssh-apps.html){ .learn-more}

* Chisel

    In all other cases, for example, if there's an HTTP proxy between you and the cloud, you can resort to a TCP proxy tool, called _Chisel_. This also applies if the target host isn't reachable on a network level. You need to install _Chisel_ in your target space and that will tunnel TCP traffic over HTTP from your local host to the target (and vice versa).

    Find [step-by-step instructions here](https://github.com/jpillora/chisel). For example, to connect to an SAP HANA service running on remote host 10.10.10.10, port 30010:

    ```sh
    bin/chisel_... client --auth secrets https://<url_to_chisel_server_app> localhost:30010:10.10.10.10:30010
    ```
    From then on, use `localhost:30010` instead of the remote address.

    [Learn more about **Chisel**.](https://github.com/jpillora/chisel){ .learn-more}

### Aborted Deployment With the _Create-Service-Push_ Plugin

If you're using _manifest.yml_ features that are part of the new Cloud Foundry API, for example, the `buildpacks` property, the `cf create-service-push` command will abort after service creation without pushing the applications to Cloud Foundry.

Use `cf create-service-push --push-as-subprocess` to execute `cf push` in a sub-process.

[See `cf create-service-push --help` for further CLI details or visit the Create-Service-Push GitHub repository.](https://github.com/dawu415/CF-CLI-Create-Service-Push-Plugin){.learn-more}

### Deployment Crashes With "No space left on device" Error

If on deployment to Cloud Foundry, a module crashes with the error message `Cannot mkdir: No space left on device` then the solution is to adjust the space available to that module in the `mta.yaml` file. Adjust the `disk-quota` parameter.

```sh
    parameters:
      disk-quota: 512M
      memory: 256M
```
[Learn more about this error in KBA 3310683](https://userapps.support.sap.com/sap/support/knowledge/en/3310683){.learn-more}

### How Can I Get Logs From My Application in Cloud Foundry? { #cflogs-recent}

The SAP BTP cockpit is not meant to analyze a huge amount of logs. You should use the Cloud Foundry CLI.

```sh
cf logs <appname> --recent
```

::: tip
If you omit the option `--recent`, you can run this command in parallel to your deployment and see the logs as they come in.
:::

### Why do I get "404 Not Found: Requested route does not exist"?

In order to send a request to an app, it must be associated with a route.
Please see [Cloud Foundry Documentation -> Routes](https://docs.cloudfoundry.org/devguide/deploy-apps/routes-domains.html#routes) for details.
As this is done automatically by default, the process is mostly transparent for developers.

If you receive an error response `404 Not Found: Requested route ('<route>') does not exist`, this can have two reasons:
1. The route really does not exist or is not bound to an app.
  You can check this in SAP BTP cockpit either in the app details view or in the list of routes in the Cloud Foundry space.
2. The app (or all app instances, in case of horizontal scale-out) failed the readiness check.
  Please see [Health Checks](../guides/deployment/health-checks.md) and [Using Cloud Foundry health checks](https://docs.cloudfoundry.org/devguide/deploy-apps/healthchecks.html) for details on how to set up the check.

    ::: details Troubleshoot using the Cloud Foundry CLI

    ```sh
    cf apps # -> list all apps
    cf app <your app name> # -> get details on your app, incl. state and routes
    cf app <your app name> --guid # -> get your app's guid
    cf curl "/v3/processes/<your app guid>/stats"
      # -> list of processes (one per app instance) with property "routable"
      #    indicating whether the most recent readiness check was successful
    ```

    See [cf curl](https://cli.cloudfoundry.org/en-US/v7/curl.html) and [The process stats object](https://v3-apidocs.cloudfoundry.org/version/3.184.0/index.html#the-process-stats-object) for details on how to use the CLI.

    :::

### Why do I get a _404 Cannot GET /_ error?

For security reasons, the **index page is not served in production** by default in both [Node.js](../node.js/cds-server#toggle-generic-index-page) and [Java](../java/developing-applications/configuring#production-profile).

If you try to access your backend URL, you will therefore see a _404 Cannot GET /_ error.
This also means you **cannot use the `/` path as a health status indicator**.  See the [Health Checks guide](../guides/deployment/health-checks) for the correct paths.

Only if absolutely required and you understand the security implications to your application, you can enable this page in your deployment.

Learn more about the generic index page in [Java](../java/developing-applications/properties#cds-indexPage) and in [Node.js](../node.js/cds-server#toggle-generic-index-page).{.learn-more}

## CAP on Kyma

### Pack Command Fails with Error `package.json and package-lock.json aren't in sync`

To fix this error, run `npm i --package-lock-only` to update your `package-lock.json` file and run the pack command again.

> Note: After updating the package-lock.json the specific dependency versions would change, go through the changes and verify them.

::: tip
For SAP HANA deployment errors see [The HANA section](#how-do-i-resolve-deployment-errors).
:::


## CAP on Windows

Please note that Git Bash on Windows, despite offering a Unix-like environment, may encounter interoperability issues with specific scripts or tools due to its hybrid nature between Windows and Unix systems.
When using Windows, we recommend testing and verifying all functionalities in the native Windows Command Prompt (cmd.exe) or PowerShell for optimal interoperability. Otherwise, problems can occur when building the mtxs extension on Windows, locally, or in the cloud.

### tar: Error is not recoverable: exiting now

If you get the error `tar: Error is not recoverable: exiting now` (for example, when building MTX resources) you can try installing the `tar` library for better compatibility with Windows systems.

Add it to your `devDependencies` like so:

```sh
npm add -D tar
```

> On macOS and Linux, the built-in implementation will continue to be used.

<div id="end" />
