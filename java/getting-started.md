---
synopsis: >
  How to start a new CAP Java project and how to run it locally.
#notebook: true
status: released
---

# Getting Started

<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}

## Introduction
<!--Used as link target from Help Portal: https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html -->

The CAP Java SDK enables developing CAP applications in Java. While the [SAP Business Application Studio](https://help.sap.com/products/SAP%20Business%20Application%20Studio/9d1db9835307451daa8c930fbd9ab264/84be8d91b3804ab5b0581551d99ed24c.html) provides excellent support to develop CAP Java applications, you can also develop locally with Visual Studio Code.

The CAP Java SDK supports lean application design by its modular architecture, that means you pick the required features and add them to your application dependencies on demand.

It enables local development by supporting in-memory or file-based SQLite databases. At the same time, the CAP Java SDK enables switching to a productive environment, using, for example, SAP HANA as a database, easily by simply switching the application deployment configuration.

If you use Spring Boot, you find yourself directly at home when using the CAP Java SDK, as the framework integrates with Spring Boot features like transaction handling, auto-wiring and test support. While the CAP Java SDK is framework agnostic, it's also possible to develop plain Java applications or even integrate with other frameworks.

The CAP Java SDK comes with an OData V4 protocol adapter, but it's openly designed. You can add more protocol adapters in the future or provide even custom protocol adapters by the application.

It supports SAP BTP features like authentication and authorization based on XSUAA tokens. But you aren't locked in to SAP BTP using a CAP Java application.

<span id="inintro" />

Excited? The following sections describe how to set up a development environment to get you started.

## Setting Up Local Development { #local}
<!--Used as link target from Help Portal: https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html -->


This section describes the prerequisites and tools to build a CAP application locally.

1. Install the CDS tools (`cds-dk`) by following the steps in the central *[Getting Started](../get-started/#setup)* guide.

2. Install a Java VM. Java 17 is the minimum requirement, but we recommend using Java 21. For example, [download](https://github.com/SAP/SapMachine/releases) and [install](https://github.com/SAP/SapMachine/wiki/Installation) SapMachine 21.

3. [Install Apache Maven](https://maven.apache.org/download.cgi) (at least version 3.6.3 is required).

<span id="maven-sap" />

4. Execute the following commands on the command line to check whether the installed tools are set up correctly:

    ```sh
    cds --version
    java --version
    mvn --version
    ```
::: tip
For a preconfigured environment, use [SAP Business Application Studio](../tools/cds-editors#bas), which comes with all the required tools preinstalled.
In older workspaces it might be necessary to explicitly set the JDK to version 17 with the command `Java: Set Default JDK`.
:::

## Starting a New Project { #new-project}
<!--Used as link target from Help Portal: https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html -->

Take the following steps to set up a new CAP Java application based on Spring Boot from scratch. As a prerequisite, you've set up your [development environment](#local).

### Run the Maven Archetype { #run-the-cap-java-maven-archetype }

Use the [CAP Java Maven archetype](./developing-applications/building#the-maven-archetype) to bootstrap a new CAP Java project:

```sh
mvn archetype:generate -DarchetypeArtifactId="cds-services-archetype" -DarchetypeGroupId="com.sap.cds" -DarchetypeVersion="RELEASE" -DinteractiveMode=true
```

<div id="release-sap" />

When prompted, specify the group ID and artifact ID of your application. The artifact ID also specifies the name of your projects root folder that is generated in your current working directory. For other values prompted, it's enough to simply confirm the default values.

Alternatively, you can use the CDS tools to bootstrap a Java project:

```sh
cds init <PROJECT-ROOT> --java
```
Afterwards, switch to the new project by calling `cd <PROJECT-ROOT>`. All following steps need to executed from this directory!

::: tip
You can call `cds help init` for more information on the available options.
:::

### Add a Sample CDS Model

You can use the [CDS Maven plugin](developing-applications/building#cds-maven-plugin) to add a sample CDS model after creating your project. Navigate to the root folder of your CAP Java project and execute the following Maven command:

```sh
mvn com.sap.cds:cds-maven-plugin:add -Dfeature=TINY_SAMPLE
```

### Add CloudFoundry target platform

Following the "[Grow As You Go](../about/#grow-as-you-go)" principle, the generated CAP Java project doesn't contain support for Cloud Foundry as the target platform. To enhance your project with dependencies required for Cloud Foundry, execute the goal `add` of the [CDS Maven plugin](./assets/cds-maven-plugin-site/add-mojo.html){target="_blank"} using the following command:

```sh
mvn com.sap.cds:cds-maven-plugin:add -Dfeature=CF
```

This command adds the following dependency to the pom.xml:

```xml
<dependency>
	<groupId>com.sap.cds</groupId>
	<artifactId>cds-starter-cloudfoundry</artifactId>
</dependency>
```
::: tip
CAP Java also provides a starter bundle for SAP BTP Kyma environment. See [CAP Starter Bundles](./developing-applications/building#starter-bundles#starter-bundles) for more details.
:::

### Project Layout

The generated project has the following folder structure:

```txt
<PROJECT-ROOT>/
├─ db/
└─ srv/
   ├─ src/main/java/
   ├─ src/gen/java/
   └─ node_modules/
```

The generated folders have the following content:

| Folder | Description |
| --- | --- |
| *db* | Contains content related to your database. A simple CDS domain model is included. |
 | *srv* | Contains the CDS service definitions and Java back-end code and the sample service model. |
| *srv/src/main/java* | Contains the Java source code of the `srv/` Maven project. |
| *srv/src/gen/java* | Contains the compiled CDS model and generated [accessor interfaces for typed access](./cds-data#typed-access) after building the project with `mvn compile` once. |
| *node_modules* | Generated when starting the build, containing the dependencies for the CDS tools (unless you specify `-Dcdsdk-global` [when starting the build](#build-and-run)). |


<!-- TODO: Where to put this to not distract the Java Developer??

### Using the CDS Tools

For a quick start, you can use `cds init` to bootstrap a CAP Java application based on Spring Boot. Run the following command:

```sh
cds init <PROJECT-ROOT> --java
```

You can also specify the package name through parameter `--java:package`. Default for the package name is: `org.<PROJECT-ROOT>`.

```sh
cds init <PROJECT-ROOT> --add java --java:package <java package name>
```

The `artifactId` is set to `<PROJECT-ROOT>` and the `groupId` to `customer`.
-->

### Add an Integration Test Module (Optional)

Optionally, you can use the [CDS Maven plugin](./developing-applications/building#cds-maven-plugin) to enhance your CAP Java application with an additional Maven module to perform integration tests. To add such a module, go into the root folder of your CAP Java project and execute the following Maven command:

```sh
mvn com.sap.cds:cds-maven-plugin:add -Dfeature=INTEGRATION_TEST
```

This command also creates a new folder *integration-tests/src/test/java*, which contains integration test classes.

| Folder | Description  |
| -- | -- |
| *integration-tests/src/test/java* | Contains integration test classes. |

<span id="beforebuildnrun" />

### Build and Run

To build and run the generated project from the command line, execute:

```sh
mvn spring-boot:run
```
::: tip
To test whether the started application is up and running, open [http://localhost:8080](http://localhost:8080) in your browser.
Use user [`authenticated`](./security#mock-users) if a username is requested. You don't need to enter a password.
:::

### Supported IDEs

CAP Java projects can be edited best in a Java IDE. Leaving CDS support aside you could use any Java IDE supporting the import of Maven projects. But as CDS modeling and editing is a core part of CAP application development we strongly recommend to use an IDE with existing Java support:

* [SAP Business Application Studio](/tools/cds-editors#bas) is a cloud-based IDE with minimal local requirements and footprint. It comes pre packaged with all tools, libraries and extensions that are needed to develop CAP applications.
* [Visual Studio Code](/tools/cds-editors#vscode) is a free and very wide-spread code editor and IDE which can be extended with Java and CDS support. It offers first class CDS language support and solid Java support for many development scenarios.
* [IntelliJ Idea Ultimate](/tools/cds-editors#intellij) is one of the leading Java IDEs with very powerful debugging, refactoring and profiling support. Together with the CDS Plugin it offers the most powerful support for CAP Java application development.


#### Source Path Configuration and CDS build

Your IDE might show inline errors indicating missing classes. This happens because the generated Java files are missing.

To resolve this, open your terminal and execute `mvn compile` in your project root directory. This action performs a full build of your project. It's necessary because, although the IDE can construct the correct class path based on the project's dependencies, it doesn't initiate the CDS build or subsequent code generation. This is covered as part of the `mvn compile` call.

If you're using JetBrains' Intellij, you need to tell it to use the generated folder `srv/src/gen/java`. Do so by marking the directory as `Generated Sources Root`.  You can find this option in IntelliJ's project settings or by right-clicking on the folder and choosing `Mark Directory as`. By doing this, you ensure that the IntelliJ build includes the generated sources in the Java ClassPath.

#### Run and Test the Application

Once you've configured your application as described in the previous section, you can run your application in your IDE by starting the `main` method of your project's `Application.java`.

Then open the application in your browser at [http://localhost:8080/](http://localhost:8080).

## Sample Application { #sample}

Find [here](https://github.com/SAP-samples/cloud-cap-samples-java) the bookshop sample application based on CAP Java.
