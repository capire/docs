---
synopsis: >
  This section describes various options how to run CAP Java applications locally

status: released
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html
---

# Running Applications { #local-development-support }
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>


During development, you often have to perform the same steps to test the changes in the CDS model:

1. Modify your CDS model.
1. Build and run your application.
1. Test your changes.

CAP offers you several options to run your applications locally and enable quick turnarounds. This article covers only the applications based on Spring Boot.

:::tip
The fastest way of development in CAP is an automated testing. See [Service Layer Testing](../developing-applications/testing#service-layer-testing)
:::

## Use `cds` Prefix Everywhere

To be able to use `mvn cds:watch`  instead of `mvn com.sap.cds:cds-maven-plugin:watch` add the plugin group `com.sap.cds` to your local `~/.m2/settings.xml`:

```xml
<pluginGroups>
    <pluginGroup>com.sap.cds</pluginGroup>
</pluginGroups>
```

This uses the [Maven plugin prefix resolution](https://maven.apache.org/guides/introduction/introduction-to-plugin-prefix-mapping.html) feature. This Maven feature allows you to use the `cds` prefix of the `cds-maven-plugin` to execute goals of this plugin, like `watch`, from everywhere.

## Run Java application in your IDE

The fastest way to run the CAP Java application is with the IDE that can run and debug Java applications. CAP applications, however, require own build tools to compile CDS models.

The `auto-build` goal of the CDS Maven Plugin reacts on any CDS file change and performs a rebuild of your application CDS model. When you restart the application in the IDE or re-run tests, the updated model is picked up your application.

Run this in your terminal and leave it open: 

```sh
mvn cds:auto-build
```

:::details Other options if you've not configured the plugin group
```sh
# from your root directory
mvn com.sap.cds:cds-maven-plugin:auto-build
# or your srv/ folder
cd srv
mvn cds:auto-build
```
:::

Use your IDE to run or debug your application.

::: tip
If the Spring Boot Devtools configuration of your CAP Java application defines a [trigger file](https://docs.spring.io/spring-boot/docs/current/reference/html/using.html#using.devtools.restart.triggerfile), the `auto-build` can detect this and touch the trigger file in case of any file change. The same applies to the `watch` goal.
:::

## Run Java application with CDS Watch { #cds-watch }

CDS Maven plugin also provide the goal `watch` that does CDS build and can start your application.

Run this in your terminal:

```sh
mvn cds:watch
```

The `watch` goal uses the `spring-boot-maven-plugin` internally to start the application with the goal `run` (this also includes a CDS build). 
When you add the [Spring Boot Devtools](../developing-applications/running#spring-boot-devtools) to your project, the `watch` goal can take advantage of the reload mechanism. 
In case your application doesn't use the Spring Boot Devtools, the `watch` goal performs a complete restart of the application after CDS model changes, which is slower.

::: warning
On Windows, the `watch` goal only works if the Spring Boot Devtools are enabled.
:::

You can customize the goals that are executed when the application is restarted after the change to get even faster feedback: 

- Use the following command to execute the CDS build and code generator to regenerate [accessor interfaces](../cds-data#generated-accessor-interfaces):

    ```sh
    mvn cds:watch -Dgoals=cds,generate
    ```

- If you want even faster feedback loop when you change CDS models and do not need code generator, use this:

    ```sh
    mvn cds:watch -Dgoals=cds
    ```

::: warning Restart for changed Java classes
Spring Boot Devtools only detects changes to .class files. You need to enable the *automatic build* feature in your IDE which detects source file changes and rebuilds the _.class_ file. If not, you have to manually rebuild your project to restart your CAP Java application.
:::

## Multitenant Applications

With the streamlined MTX, you can run your multitenant application locally along with the MTX sidecar and use SQLite as the database.
See [the _Multitenancy_ guide](../../guides/multitenancy/#test-locally) for more information.

## Debugging

You can debug Java applications locally and remotely.

- For local applications, it's best to start the application using the integrated debugger of your [preferred IDE](../../tools/cds-editors). 
- You can also enable debugger using JVM arguments and attach to it from your IDE.
- Especially for remote applications, we recommend [`cds debug`](../../tools/cds-cli#java-applications) to turn on debugging.

## Spring Boot Devtools

Use [Spring Boot Devtools](https://docs.spring.io/spring-boot/docs/current/reference/html/using.html#using.devtools) in your CAP Java application to speed up local development.

Once this is added, you can use the restart capabilities of the Spring Boot Devtools while developing your application in your favorite Java IDE. Any change triggers an automatic application context reload without the need to manually restart the complete application. Besides being a lot faster than a complete restart this also eliminates manual steps. The application context reload is triggered by any file change on the application's classpath:

* Java classes (for example, custom handlers)
* Anything inside src/main/resources
    * Configuration files (for example, _application.yaml_)
    * Artifacts generated from CDS (schema.sql, CSN, EDMX)
    * Any other static resource

