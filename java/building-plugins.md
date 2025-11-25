---
synopsis: >
  A collection of different mechanisms that can be used to build plugins for CAP Java.
status: released
---

# Building Plugins

<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}

Especially, when working with larger projects that may consist of many individual CAP Java applications or when building platform services that need to be integrated with CAP applications there's the requirement to extend CAP Java with custom, yet reusable code.

In the following sections, the different extension points and mechanisms are explained.

## General Considerations

### Java Version

When building CAP Java plugin modules, you need to keep in mind that the generated Java byte code of the plugin has to be compatible with the Java byte code version of the potential consumers of the plugin. To be on the safe side, we recommend using *Java 17* as this is anyways the minimum Java version for CAP Java applications. In case you deviate from this you need to check and align with the potential consumers of the plugin.

### Maven GroupId and Java Packages

Of course, it's up to your project / plugin how you call the corresponding Maven GroupId and Java packages. To avoid confusion and also to make responsibilities clear `com.sap.cds` for GroupId and Java package names are reserved for components maintained by the CAP Java team and must not be used for external plugins. This rule also includes substructures to `com.sap.cds` like `com.sap.cds.foo.plugin`.


## Share CDS Models via Maven Artifacts

CDS models, CSV import data and i18n files can be shared through Maven dependencies. In addition they can also be shared through npm packages.
This means you can provide CDS models, CSV files, i18n files, and Java code (for example, event handlers) in a single Maven dependency.

### Create the CDS Model in a New Maven Artifact

Simply create a plain Maven Java project and place your CDS models in the `src/main/resources/cds` folder of the reuse package under a unique module directory (for example, leveraging group ID and artifact ID): `src/main/resources/cds/com.sap.capire/bookshop/`. With `com.sap.capire` being the group ID and `bookshop` being the artifact ID.

You can simplify the creation of such a **plain Maven Java** project by calling the following Maven archetype command:

```shell
mvn archetype:generate -DgroupId=com.sap.capire -DartifactId=bookshop -DarchetypeArtifactId=maven-archetype-quickstart -DinteractiveMode=false
```

After the creation you'll need to maintain the plugin versions as well as the desired Java language version (we recommend version 17).

::: warning Only plain Maven Java projects
Please make sure that your plugin / reuse model project is neither created as a CAP Java project nor as a plain Spring Boot project.
:::

### Reference the New CDS Model in an Existing CAP Java Project

Projects wanting to import the content simply add a Maven dependency to the reuse package to their _srv/pom.xml_ in the `<dependencies>` section.

::: code-group
```xml [srv/pom.xml]
<dependency>
  <groupId>com.sap.capire</groupId>
  <artifactId>bookshop</artifactId>
  <version>1.0.0</version>
</dependency>
```
:::

Additionally, the `resolve` goal from the CDS Maven Plugin needs to be added, to extract the models into the `target/cds/` folder of the Maven project, in order to make them available to the CDS Compiler.

::: code-group
```xml [srv/pom.xml]
<plugin>
  <groupId>com.sap.cds</groupId>
  <artifactId>cds-maven-plugin</artifactId>
  <version>${cds.services.version}</version>
  <executions>
    ...
    <execution>
      <id>cds.resolve</id>
      <goals>
        <goal>resolve</goal> <!-- [!code focus] -->
      </goals>
    </execution>
    ...
  </executions>
</plugin>
```
:::

::: details Scope of the Reuse Package
Usually you would declare the dependency to the reuse package in the `srv` module of your CAP Java project. Since CAP Java 4.4.0 this makes the reuse models available to all CDS files in the CAP project. The models are extracted to the root `target/cds` folder. In case you want to make the reuse models only available within the Maven module that declared the dependency (e.g. `srv`) set the configuration `to` of the `resolve` goal to `${project.build.directory}`. In earlier versions of CAP Java reuse models where only available within CDS files placed in the Maven module that declared the dependency by default.
:::

When your Maven build is set up correctly, you can use the reuse models in your CDS files using the standard `using` directive:

```cds
using { CatalogService } from 'com.sap.capire/bookshop';
```
::: details Different resolution rules
The location in the `using` directive differs from the default [CDS model resolution rules](../cds/cdl#model-resolution). The *name* does not refer to a local file/package, nor to an NPM package. Instead, it follows to the groupId/artifactId scheme. The name doesn't directly refer to an actual file system location but is looked up in a _cds_ folder in Maven's _target_ folder.
:::

[Learn more about providing and using reuse packages.](../guides/extensibility/composition){.learn-more}

This technique can be used independently or together with one or more of the techniques described on this page.

## Event Handlers for Custom Types and Annotations

In CAP Java, event handlers aren't tightly coupled to the request handling or any other runtime components. Thus, it's easily possible to package event handlers in external libraries (like plugins) in order to provide common but custom functionality to CAP Java applications. You can achieve this by defining custom handlers that react on model characteristics (common types or annotations) or also on entity values, for example, validations.

In most of the cases an event handler plugin for a CAP Java application can be a plain Maven project without further dependencies or special project layout. Since you need to use or implement CAP Java extension points, it's required to define the following dependencies:

```xml
<properties>
    <cds.services.version>...</cds.services.version>
</properties>

<dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>com.sap.cds</groupId>
        <artifactId>cds-services-bom</artifactId>
        <version>${cds.services.version}</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>com.sap.cds</groupId>
        <artifactId>cds-services-api</artifactId>
    </dependency>
</dependencies>
```

Inside your plugin module, you can define a custom event handler and a registration hook as plain Java code. Once this module is deployed to a Maven repository it can be added to any CAP Java application as a dependency. The contained event handler code is active automatically once your CAP Java application is started along with the new reuse module.

The heart of the plugin module, the event handler, basically looks like any other CAP Java event handler. Take this one as an example:

```java
@ServiceName(value = "*", type = ApplicationService.class)
public class SampleHandler implements EventHandler {

    @After
    public void handleSample(CdsReadEventContext context) {
      // any custom Java code using the event context and CQL APIs
    }
}
```

The shown handler code is registered for any entity type on any [ApplicationService](../guides/providing-services). Depending on the use case the target scope could be narrowed to specific entities and/or services. The handler registration applies to the same rules as custom handlers that are directly packaged with a CAP Java application.

[Learn more about event handling in our EventHandler documentation](event-handlers/){.learn-more}

Of course, this handler code looks just the same as any other custom or builtin CAP Java handler. The only difference here is that you need to think a bit more about the provisioning of the handler. When you write a custom handler as part of (in the package of) a CAP Java application, you can annotate the handler's class with `@Component`. Then Spring Boot's component scan picks up the class during startup of the Application Context.

When you provide your custom handler as part of a reuse library, external to your application, things change a bit. At first, you need to decide whether you want to use Spring Boot's component model and rely on dependency injection or if you want to use one of the CAP Java ServiceLoader based extension points.

The decision between the two is straightforward: In case your handler depends on other Spring components, for example relies on dependency injection, you should use the [Spring approach](#spring-autoconfiguration). This applies as soon as you need to access another CAP Service like [`CqnService`](./cqn-services/application-services), [`PersistenceService`](./cqn-services/persistence-services) or to a service using it's [typed service interface](../releases/archive/2023/nov23#typed-service-interfaces).

If your custom handler is isolated and, for example, only performs a validation based on provided data or a calculation, you can stick with the [CAP Java ServiceLoader approach](#service-loader), which is described in the following section.

### Load Plugin Code via ServiceLoaders {#service-loader}
At runtime, CAP Java uses the [`ServiceLoader`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/ServiceLoader.html) mechanism to load all implementations of the `CdsRuntimeConfiguration` interface from the application's ClassPath. In order to qualify as a contributor for a given ServiceLoader-enabled interface, we need to place a plain text file, named like the fully qualified name of the interface, in the directory `src/main/resources/META-INF/services` of our reuse model. This file contains the name of one or more implementing classes. For the earlier implemented `CdsRuntimeConfiguration` we need to create a file `src/main/resources/META-INF/services/com.sap.cds.services.runtime.CdsRuntimeConfiguration` with the following content:

```txt
com.sap.example.cds.SampleHandlerRuntimeConfiguration
```

With this code you instrument the CAP Java's ServiceLoader for `CdsRuntimeConfiguration` to load our new, generic EventHandler for all read events on all entities of all services. For realistic use cases, the handler configuration can be more concise, of course.

So, in order to have a framework independent handler registration the `CdsRuntimeConfiguration` interface needs to be implemented like this:

```java
package com.sap.example.cds;

import com.sap.cds.services.runtime.CdsRuntimeConfiguration;
import com.sap.cds.services.runtime.CdsRuntimeConfigurer;

public class SampleHandlerRuntimeConfiguration implements CdsRuntimeConfiguration {

  @Override
  public void eventHandlers(CdsRuntimeConfigurer configurer) {
    configurer.eventHandler(new SampleHandler());
  }

}
```

### Load Plugin Code with the Spring Component Model {#spring-autoconfiguration}

In case your reuse module depends on other components managed as part of the Spring ApplicationContext (having an `@Autowired` annotation in your class is a good hint for that) you need to register your plugin as a Spring component itself. The most straight forward (but not recommended) way is to annotate the plugin class itself with `@Component`.

This is, however, error-prone: [Spring Boot's component scan](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/context/annotation/ComponentScan.html) is by default scanning downward from the package in which the main `Application` class is declared. Meaning that you need to place the plugin either in a subpackage or the same package as the `Application` class. This would hamper the reuse aspect of the plugin as it would only work applications in a specific package. You could customize the component scan of the application using your plugin but this is also error-prone as you explicitly have to remember to change the `@ComponentScan` annotation each time you include a plugin.

Because of those complications it's best practice to use the `AutoConfiguration` mechanism provided by Spring Boot in reuse modules that ship Spring components. For further details, please refer to the [Spring Boot reference documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/using.html#using.auto-configuration).


A complete end-to-end example for reusable event handlers can be found in this [blog post](https://blogs.sap.com/2023/05/16/how-to-build-reusable-plugin-components-for-cap-java-applications/).

## Custom Protocol Adapters {#protocol-adapter}

In CAP, the protocol adapter is the mechanism to implement inbound communication (from another service or the UI) to the CAP service in development. You can read more about protocol adapters in our [architecture documentation](developing-applications/building#protocol-adapters).

Usually, a protocol adapter comes in two parts:

- the adapter
- a factory class that creates an instance of the adapter

The adapter itself is in most cases an extension of the HttpServlet abstract class. The factory class also provides information about the paths to which the protocol adapter (the servlet) needs to be registered. The factory interface is called `ServletAdapterFactory` and implementations of that factory will be loaded with the same [`ServiceLoader` approach as described above](#service-loader) in the event handler section.

This is an example implementation of the `ServletAdapterFactory`:

```java
public class SampleAdapterFactory implements ServletAdapterFactory, CdsRuntimeAware {
  /*
   * a short key identifying the protocol that's being served
   * by the new protocol adapter, for example, odata-v4, hcql, ..
   */
  static final String PROTOCOL_KEY = "protocol-key";

  private CdsRuntime runtime;

  @Override
  public void setCdsRuntime(CdsRuntime runtime) {
    /*
     * In case the protocol adapter needs the CdsRuntime
     * the factory can implement CdsRuntimeAware and will
     * be provided with a CdsRuntime via this method.
     * The create() method below can then use the provided
     * runtime for the protocol adapter.
     */
    this.runtime = runtime;
  }

  @Override
  public Object create() {
    // Create and return the protocol adapter
    return new SampleAdapter(runtime);
  }

  @Override
  public boolean isEnabled() {
    // Determines if the protocol adapter is enabled
  }

  @Override
  public String getBasePath() {
    // Return the base path
  }

  @Override
  public String[] getMappings() {
    /*
     * Return all paths to which the protocol adapter is
     * going to be mapped. Usually, this will be each CDS
     * service with either it's canonical or annotated
     * path prefixed with the base path of the protocol
     * adapter (see above).
     */
  }

  @Override
  public UrlResourcePath getServletPath() {
    /*
     * Use the UrlResourcePathBuilder to build and return
     * a UrlResourcePath containing the basePath (see above)
     * and all paths being registered for the protocol key
     * of the new protocol adapter.
     */
  }
}
```

With the factory in place, you can start to build the actual protocol adapter. As mentioned before, most adapters implement HTTP connectivity and are an extension of the Jakarta `HttpServlet` class. Based on the incoming request path the protocol adapter needs to determine the corresponding CDS `ApplicationService`. Parts of the request path together with potential request parameters (this depends on the protocol to be implemented) then need to be mapped to a CQL statement, which is then executed on the previously selected CDS `ApplicationService`.

```java
public class SampleAdapter extends HttpServlet {
  private final CdsRuntime runtime;

  public SampleAdapter(CdsRuntime runtime) {
    this.runtime = runtime;
    // see below for further details
  }

  @Override
  public void service(HttpServletRequest request,
      HttpServletResponse response) throws IOException {
    // see below for further details
  }
}
```

As mentioned previously, a protocol adapter maps incoming requests to CQL statements and executes them on the right [`ApplicationService`](./cqn-services/application-services) according to the `HttpServletRequest`'s request-path. In order to have all relevant `ApplicationServices` ready at runtime, you can call `runtime.getServiceCatalog().getServices(ApplicationService.class)` in the adapter's constructor to load all `ApplicationServices`. Then select the ones relevant for this protocol adapter to have them ready, for example in a Map, for serving requests in `service()`.

When handling incoming requests at runtime, you need to extract the request path and parameters from the incoming HttpServletRequest. Then, you can use CQL API from the `cds4j-api` module to [create CQL](./working-with-cql/query-api) corresponding to the extracted information. This statement then needs to be executed with [`ApplicationService.run()`](./working-with-cql/query-execution). The returned result then needs to be mapped to the result format that is suitable for the protocol handled by the adapter. For REST, it would be some canonical JSON serialization of the returned objects.

REST request:

```http
GET /CatalogService/Books?id=100
```

Resulting CQL statement:

```java
CqnSelect select = Select.from("Books").byId(100);
```

The `CqnSelect` statement can then be executed with the right (previously selected) `ApplicationService` and then written to `HttpServletResponse` as a serialized string.

```java
String resposePayload = applicationService.run(select).toJson();
response.getWriter().write(responsePayload);
```

With that, a first iteration of a working CAP Java protocol adapter would be complete. As a wrap-up, this would be the tasks that need to be implemented in the adapter:

1. Extract the request path and select the corresponding CDS `ApplicationService`.
2. Build a CQL statement based on the request path and parameters.
3. Execute the CQL statement on the selected service and write the result to the response.

One final comment on protocol adapters: even a simple protocol adapter like sketched in this section enables full support of other CAP features like declarative security, i18n and of course custom as well as generic event handlers.

## Putting It All Together

As you've learned in this guide, there are various ways to extend the CAP Java framework. You can use one or more of the mentioned techniques and combine them in one or more Maven modules. This totally depends on your needs and requirements.

Most probably you combine the *Event Handler with custom types and annotations* mechanism together with *Sharing reusable CDS models via Maven artifacts* because the event handler mechanism might rely on shared CDS artifacts. The protocol adapters on the other hand are generic and model-independent modules that should be packaged and distributed independently.
