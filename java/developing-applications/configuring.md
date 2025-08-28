---
synopsis: >
  This section describes how to configure CAP Java applications.

status: released
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html
---

# Configuring Applications
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>


## Profiles and Properties

This section describes how to configure applications.
CAP Java applications can fully leverage [Spring Boot's](../spring-boot-integration) capabilities for [Externalized Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config).
This enables you to define multiple **configuration profiles** for different scenarios, like local development and cloud deployment.

For a first introduction, have a look at our [sample application](https://github.com/sap-samples/cloud-cap-samples-java) and the [configuration profiles](https://github.com/SAP-samples/cloud-cap-samples-java/blob/master/srv/src/main/resources/application.yaml) we added there.

Now, that you're familiar with how to configure your application, start to create your own application configuration. See the full list of [CDS properties](properties) as a reference.

### Production Profile { #production-profile }

When running your application in production, it makes sense to strictly disable some development-oriented features.
The production profile configures a set of selected property defaults, recommended for production deployments, at once.
By default the production profile is set to `cloud`. To specify a custom production profile, set `cds.environment.production.profile` to a Spring profile used in your production deployments.

::: tip Production profile = `cloud`
The Java Buildpacks set the `cloud` profile for applications by default.
Other active profiles for production deployments are typically set using the environment variable `SPRING_PROFILES_ACTIVE` on your application in your deployment descriptors (`mta.yaml`, Helm charts, etc.).
:::

Property defaults adjusted with the production profile are the following:

- Index Page is disabled: `cds.index-page.enabled` is set to `false`
- Mock Users are strictly disabled: `cds.security.mock.enabled` is set to `false`

Note, that explicit configuration in the application takes precedence over property defaults from the production profile.

## Using SAP Java Buildpack { #buildpack }

In SAP BTP Cloud Foundry environment, the Java runtime that is used to run your application is defined by the so-called [buildpack](https://docs.cloudfoundry.org/buildpacks/).
For CAP applications, we advise you to use the [SAP Java Buildpack 2](https://help.sap.com/docs/btp/sap-business-technology-platform/sap-jakarta-buildpack).
CAP applications built with Spring Boot don't require any specific configuration for the buildpack and run using [Java Main](https://help.sap.com/docs/btp/sap-business-technology-platform/java-main) runtime by default.

To configure the buildpack for Java 21 with SapMachine JRE, add the following lines to your `mta.yaml` right under your Java service definition:

::: code-group
```yaml [mta.yaml]
parameters:
  buildpack: sap_java_buildpack_jakarta
properties:
  JBP_CONFIG_COMPONENTS: "jres: ['com.sap.xs.java.buildpack.jre.SAPMachineJRE']"
  JBP_CONFIG_SAP_MACHINE_JRE: '{ version: 21.+ }'
```
:::

:::warning SAP Business Application Studio
If you develop your application in SAP Business Application Studio and Java 21 is not available there, use the Java 17, instead.
:::