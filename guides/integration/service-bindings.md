

# Service Bindings

Service bindings configure connectivity to remote services. They are injected respective connection points configure in CAP through `cds.requires.<service-name>` configurations, which are defined like this:

```tsx
cds.requires.<service-name> = { 
  kind?: 'odata' | 'odata-v2' | 'rest' | 'hcql' | 'graphql' ,
  model?: '<path-to-csn-or-cds>',
  credentials: {
    url?: '<service-endpoint-url>',
    username?: '<user-name>',
    password?: '<password>',
    token?: '<auth-token>',
  }
}
```


They are added to consuming applications' _package.json_ files, either manually, or automatically when using `cds import` as we saw earlier.

## CAP Node.js

Service bindings configure connectivity to remote services. They are added to consuming applications' _package.json_ files, either manually, or automatically when using `cds import` as we saw earlier.
Service bindings have this general form:

```sh
cds.requires.<service-name> = { kind: '<protocol>' , ... }
```

::: code-group
```json [package.json]
{ ...
  "cds": {
    "requires": {
      "API_BUSINESS_PARTNER": {
        "kind": "odata-v2",
        "model": "srv/external/API_BUSINESS_PARTNER"
      }
    }
  }
}
```
:::

## CAP Java

You need to configure remote services in Spring Boot's _application.yaml_:
::: code-group

```yaml [srv/src/main/resources/application.yaml]
spring:
  config.activate.on-profile: cloud
cds:
  remote.services:
    API_BUSINESS_PARTNER:
      type: "odata-v2"
```

:::
To work with remote services, add the following dependency to your Maven project:

```xml
<dependency>
  <groupId>com.sap.cds</groupId>
  <artifactId>cds-feature-remote-odata</artifactId>
  <scope>runtime</scope>
</dependency>
```

[Learn about all `cds.remote.services` configuration possibilities.](../../java/developing-applications/properties){.learn-more}


## Local Binding Environment


## Cloud Foundry

## Kyma / K8s

## Destinations

## Service Keys
## Using API Keys
