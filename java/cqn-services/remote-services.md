---
synopsis: >
  Remote Services are CQN-based clients to remote APIs that a CAP application consumes. This section describes how to configure and use these services.
status: released
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html
---

# Remote Services
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}

The CAP Java SDK supports _Remote Services_ for OData V2 and V4 APIs out of the box.
The CQN query APIs enable [late-cut microservices](../../guides/providing-services#late-cut-microservices) with simplified mocking capabilities. Regarding multitenant applications, these APIs keep you extensible, even towards remote APIs. In addition, they free developers from having to map CQN to OData themselves.

Cross-cutting aspects like security are provided by configuration. Applications do not need to provide additional code. The CAP Java SDK leverages the [SAP Cloud SDK](https://sap.github.io/cloud-sdk) and in particular its destination capabilities to cover these aspects.

Destinations in the Cloud SDK are the means to express and define connectivity to a remote endpoint including authentication details. Cloud SDK destinations can be created from various sources such as [SAP BTP Destination Service](#destination-based-scenarios) or [Service Bindings](#service-binding-based-scenarios). They can also be defined and registered [programmatically](#programmatic-destination-registration) in code. The application can choose the best fitting option for their scenario. Every Remote Service internally uses a destination for connectivity.

On top of that CAP integrates nicely with Cloud SDK, for example, ensuring automatic propagation of tenant and user information from the _Request Context_ to the Cloud SDK.

![This graphic depicts the integration of SAP Cloud SDK into SAP CAP Java.](../assets/remote%20services.drawio.svg){width="700px" class="mute-dark"}

CAP's clear recommendation is to use _Remote Services_ over directly using the SAP Cloud SDK. However, if you can't leverage CQN-based _Remote Services_, refer to [native consumption with Cloud SDK](#native-consumption) for details.

::: tip
To learn more about how to use _Remote Services_ end to end read the [Consuming Services cookbook](../../guides/using-services).
:::

## Remote OData Services

To enable _Remote Services_ for OData V2 or V4 APIs in an application, add the following Maven dependency to your project:

```xml
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-feature-remote-odata</artifactId>
    <scope>runtime</scope>
</dependency>
```
_Remote Services_ need to be configured explicitly in your application configuration. The configuration needs to define two main aspects:

1. The CDS service definition of the remote API from the CDS model.
1. The (BTP or programmatic) destination or service binding of the remote API and its protocol type.

The following example, shows how you can configure _Remote Services_ in Spring Boot's _application.yaml_ based on a destination:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  remote.services:
    API_BUSINESS_PARTNER:
      type: "odata-v2"
      destination:
        name: "s4-business-partner-api"
```
:::

Remote Services use a CDS service definition from the CDS model as a specification of the remote API. This API specification is required to properly translate CQN statements into respective OData V2 and V4 requests.

By default the CDS service definition is looked up in the CDS model using the name of the _Remote Service_.
The name can be explicitly configured using the `name` property.
It defaults to the YAML key of the remote service configuration section (here: `API_BUSINESS_PARTNER`).

The `type` property defines the protocol used by the remote API. The CAP Java SDK currently supports `odata-v4` (default) or `odata-v2`.

::: tip
You can use the `cds import` command to generate a CDS service definition from an EDMX API specification.
To learn more about this, have a look at the section [Importing Service Definitions](../../guides/using-services#import-api).
:::

[Learn about all `cds.remote.services` configuration possibilities in our **CDS Properties Reference**.](../developing-applications/properties#cds-remote-services){.learn-more}

### Configuring CDS Service Name

The CDS service definition is, by default, looked up in the CDS model using the name of the _Remote Service_.

However, the name of the _Remote Service_ needs to be unique, as it's also used to look up the service in Java.
Therefore, it's possible to explicitly configure the name of the CDS service definition from the CDS model using the `model` property.
This is especially useful when creating multiple _Remote Services_ for the same API with different destinations:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  remote.services:
    bupa-abc:
      model: "API_BUSINESS_PARTNER"
      destination:
        name: "s4-business-partner-api-abc"
    bupa-def:
      model: "API_BUSINESS_PARTNER"
      destination:
        name: "s4-business-partner-api-def"
```
:::

### Using Service Bindings { #service-binding-based-scenarios }

If the remote API is running on SAP BTP, it's likely that you can leverage Service Binding-based _Remote Services_.
The CAP Java SDK extracts the relevant information from the service binding to connect to the remote API.
Service-binding-based _Remote Services_ are simple to use, as the service binding abstracts from several aspects of remote service communication.
For instance, it provides authentication information and the URL of the service.
In contrast to destinations, it can be created and refreshed as part of the application lifecycle, that is, application deployment.
Hence, the location and security aspects of remote services are transparent to CAP applications in the case of service bindings.

#### Binding to a Reuse Service

If the remote API is exposed by a BTP reuse service, a service broker typically provides means to create service instances of the BTP service.
The CAP application requires a service binding to this service to consume the remote API as a _Remote Service_.

These service instances of BTP services provide the URL of the remote API in their service binding.
Therefore, you only need to specify the binding name in the `application.yaml` configuration, like in the following example:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  remote.services:
    SomeReuseService:
      binding:
        name: some-service-binding
```
:::

:::details If binding structure isn't understood ...
In some cases, SAP Cloud SDK doesn't understand the service binding structure of the specific BTP service.
In that case it's required to contribute a mapping by the means of Cloud SDK's `PropertySupplier`.
This `PropertySupplier` needs to be registered with the Cloud SDK once at application startup.

```java
static {
    OAuth2ServiceBindingDestinationLoader.registerPropertySupplier(
        options -> options.getServiceBinding().getTags().contains("<bindingTag>"),
            SomeReuseServiceOAuth2PropertySupplier::new);
}
```

The `<bindingTag>` needs to be replaced by the concrete name of the tag provided in the binding of the BTP service. Alternatively, a check on the service name can be chosen as well.
The class `SomeReuseServiceOAuth2PropertySupplier` needs to be provided by you extending the Cloud SDK base class `DefaultOAuth2PropertySupplier`.

[Learn more about registering OAuth2PropertySupplier in the **SAP Cloud SDK documentation**.](https://sap.github.io/cloud-sdk/docs/java/features/connectivity/service-bindings#customization){.learn-more}
:::

#### Binding to a Service with Shared Identity

If the remote API is available within the same SaaS application and using the same (shared) service instance of XSUAA or Identity (IAS) for authentication, no service broker-based reuse service is required.
The _Remote Service_ can be configured using the shared service instance as binding (here: `shared-xsuaa`):

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  remote.services:
    OtherCapService:
      binding:
        name: shared-xsuaa
        options:
          url: https://url-of-the-second-cap-application
```
:::

The plain service binding of XSUAA or IAS does not contain the URL of the remote API. Therefore, it needs to be explicitly configured in the `options` section.
Since the URL is typically not known during development, you can define it as an environment variable. For the previous example, use `CDS_REMOTE_SERVICES_OTHERCAPSERVICE_BINDING_OPTIONS_URL`.

[Learn more about Binding From Environment Variables in the Spring Boot documentation.](https://docs.spring.io/spring-boot/reference/features/external-config.html#features.external-config.typesafe-configuration-properties.relaxed-binding.environment-variables){.learn-more}

:::tip
Remote APIs which require IAS-based authentication might expect certificate based client authentication in addition to the IAS-based JWT token, see [ProofOfPossession validation](https://github.com/SAP/cloud-security-services-integration-library/tree/main/java-security#proofofpossession-validation).
CAP _Remote Services_ automatically takes care of this by initiating a mutual TLS handshake with the remote API.
:::

#### Configuring the Authentication Strategy

While service bindings typically provide authentication details, they don't predetermine the user propagation and authentication strategy, for example, technical user or named user flow.
The parameter `onBehalfOf` in the `binding` configuration section allows to define these strategies.

The following options are available:

- `currentUser`: Use the user of the current [Request Context](/java/event-handlers/request-contexts). This propagates the named user if available or falls back to a (tenant-specific) technical user otherwise. (default)
- `systemUser`: Use a (tenant-specific) technical user, based on the tenant set in the current Request Context.
- `systemUserProvider`: Use a technical user of the provider tenant. This is especially helpful on an internal communication channel that is not authorized tenant-specifically.

### Using Destinations { #destination-based-scenarios }

If your _remote API_ is not using Service Bindings, you typically need to separately obtain the URL and additional metadata like credentials from the service provider. You can store these in destinations of SAP BTP Destination Service or [programmatically register a destination](#programmatic-destination-registration) with Cloud SDK to make them available for usage in your CAP application.

Based on the following configuration, a destination with name `s4-business-partner-api` is looked up using the Cloud SDK:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  remote.services:
    API_BUSINESS_PARTNER:
      type: "odata-v2"
      destination:
        name: s4-business-partner-api
```
:::

#### Consuming APIs from Other IAS-Applications
If your CAP application is using IAS and you want to call a _remote API_ that is provided by another IAS-based application (ie. Application2Application scenario), you can utilize a simplified security configuration in the destination.
As a pre-requisite, your CAP application and the called application need to trust the same IAS tenant and you need to define a dependency in IAS to consume the respective API provided by the _remote API_.

Create a destination configuration with the following parameters:

- _URL_: `<url-of-the-remote-api>`
- _Authentication_: `NoAuthentication`
- Additional Properties:
  - _cloudsdk.ias-dependency-name_: `<name-of-the-ias-dependency>`

At runtime, this destination configuration will use the bound `identity` service instance's credentials to request a token for the _remote API_.

[Learn more about consuming APIs from other IAS-Applications in the **SAP Cloud Identity Services documentation**.](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/consume-apis-from-other-applications){.learn-more}

#### Retrieve Destinations

The CAP Java SDK obtains the destination for a _Remote Service_ from the `DestinationAccessor` using the name that is configured in the _Remote Service_'s destination configuration.

If you're using the SAP BTP Destination Service, this is the name you used when you defined the destination there. To properly resolve the destination from SAP BTP Destination Service [additional Cloud SDK dependencies](#cloud-sdk-dependencies) are required.

In multitenant scenarios, the SAP BTP Destination Service tries to look up the destination from the subaccount of the current tenant, set on the `RequestContext`. This is not restricted to subscriber tenants, but also includes the provider tenant. Retrieval strategies are part of a set of configuration options provided by the Cloud SDK, which are exposed by CAP Java as part of the configuration for _Remote Services_. For details refer to the section about [destination strategies](#destination-strategies).

::: tip
As a prerequisite for destination lookup in subscriber accounts, the CAP application needs to define a dependency to the Destination service for their subscriptions, for example, in the SaaS registry. This can be enabled by setting the `cds.multiTenancy.dependencies.destination` to `true` in the configuration.
:::

[Learn more about destinations in the **SAP Cloud SDK documentation**.](https://sap.github.io/cloud-sdk/docs/java/features/connectivity/sdk-connectivity-destination-service){.learn-more}

### Configuring the URL

The destination or service binding configuration provides the base URL to the OData V2 or V4 service, that should be used by the _Remote Service_.
The full service URL however is built from three parts:

1. The URL provided by the destination or the service binding configuration.
1. An optional URL suffix provided in the _Remote Service_ http configuration under the `suffix` property.
1. The name of the service, either obtained from the optional `service` configuration property or the fully qualified name of the CDS service definition.

Consider this example:

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  remote.services:
    API_BUSINESS_PARTNER:
      http:
        suffix: "/sap/opu/odata/sap"
      destination:
        name: s4-business-partner-api
```
:::

In this case, the destination with name `s4-business-partner-api` would be obtained from the `DestinationAccessor`.
Given that this destination holds the URL `https://s4.sap.com`, the resulting service URL for OData requests would be `https://s4.sap.com/sap/opu/odata/sap/API_BUSINESS_PARTNER`.

<div id="remote-rfc-services" />

## Consuming Remote Services

_Remote Services_ can be used in your CAP application just like any other [service that accepts CQN queries](/java/cqn-services/):

```java
@Autowired
@Qualifier(ApiBusinessPartner_.CDS_NAME)
CqnService bupa;

CqnSelect select = Select.from(ABusinessPartnerAddress_.class)
    .where(a -> a.BusinessPartner().eq("4711"));

ABusinessPartnerAddress address = bupa.run(select)
    .single(ABusinessPartnerAddress.class);
```
::: tip
To learn more about how to build and run CQN queries, see sections [Building CQN Queries](../working-with-cql/query-api) and [Executing CQN Queries](../working-with-cql/query-execution).
:::

Keep in mind that _Remote Services_ are simply clients to remote APIs.
CAP doesn't automatically forward CQN queries to these services. Developers need to explicitly call and use these _Remote Services_ in their code.
However, as _Remote Services_ are based on the common CQN query APIs it's easy to use them in event handlers of your [Application Services](application-services).
::: warning
In case data from _Remote Services_ should be combined with data from the database custom coding is required.
Refer to the [Integrate and Extend guide](../../guides/using-services#integrate-and-extend) for more details.
:::

### Consuming Media Elements

#### Reading Media Elements

To read a [media elements](/guides/providing-services#annotating-media-elements) of an entity, you need to create a CQN statement that targets a single instance of this entity via its primary key in its `from()` clause and include _one_ media element in the select list.
Otherwise, the statement will be interpreted as a regular read and will not return values for media elements. Bulk reads are not supported.

Given the following model:

```cds
entity Media {
   key ID: UUID;

   @Core.MediaType: 'image/png'
   image: LargeBinary;
}
```

If you want to read `image` of this entity, you need to create a statement like this:

```java
Select.from(Media_.class, m -> m.filter(f -> f.ID().eq("..."))).columns(Media_::image);
```

If the entity has multiple media elements (in OData V4), you can read them one by one with dedicated statements each targeting a single element.
The OData call generated by CAP is an equivalent of the direct [read of the media property value](/guides/providing-services#reading-media-resources)

The content of the media element is returned as an `InputStream` or `Reader` that is not buffered and must be consumed so that the HTTP connection can be released.
In addition, content type and file name are returned back if corresponding elements of your entity exist.

#### Writing Media Elements

You write [media elements](/guides/providing-services#annotating-media-elements) with `Update` statements. Statements still need to target a single entity instance and
must include a single value for the media element as `InputStream` or `Reader`. Optionally the content type can be provided, if a corresponding element exists.
Batched or bulk updates are not supported and rejected.

If the value of the element is set to `null`, it is interpreted as a deletion of the media element value. An explicit `DELETE` request is sent to the media element URL in that case.

::: warning Mixing media and non-media elements
If the payload contains values for other elements as well, the statement is treated as a regular update and values for media elements are ignored.
:::

For example, the following statement updates the value of the element `image` in the remote service:

```java
Media payload = Media.create();
payload.setId(...);
payload.setImage(...);

Update.entity(Media_.class).entry(payload);
```

Updates are translated to OData requests to [update the media element value](/guides/providing-services#updating-media-resources) or [delete the value](/guides/providing-services#deleting-media-resources).

:::tip Creating an entity with media elements
`Insert` statements do not support media elements. Values for media elements need to be provided in a subsequent update.
:::

## Cloud SDK Integration

### Maven Dependencies {#cloud-sdk-dependencies}

The CAP Java SDK only includes the minimum SAP Cloud SDK dependencies required out of the box.
In case you want to leverage features from SAP Cloud SDK, like the [programmatic destination registration](#programmatic-destination-registration) or integration with SAP BTP Destination Service, you need to add additional dependencies.

It's recommended to add the SAP Cloud SDK BOM to the dependency management section of your application's parent POM.
If you're also using the CDS Services BOM or the Spring Boot dependencies BOM, it's recommended to add the SAP Cloud SDK BOM after these:

```xml
<dependencyManagement>
    <!-- CDS Services BOM -->
    <!-- Spring Boot dependencies BOM -->
    <dependencies>
        <dependency>
            <groupId>com.sap.cloud.sdk</groupId>
            <artifactId>sdk-bom</artifactId>
            <version>use-latest-version-here</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

[Learn more about dependency management of **SAP Cloud SDK**.](https://sap.github.io/cloud-sdk/docs/java/guides/manage-dependencies/){.learn-more}

To enable [programmatic destination registration](#programmatic-destination-registration), add this additional dependency to your project:

```xml
<dependency>
    <groupId>com.sap.cloud.sdk.cloudplatform</groupId>
    <artifactId>cloudplatform-connectivity</artifactId>
</dependency>
```

To integrate with SAP BTP Destination Service on Cloud Foundry, add this additional dependency to your project:

```xml
<dependency>
    <groupId>com.sap.cloud.sdk.cloudplatform</groupId>
    <artifactId>scp-cf</artifactId>
</dependency>
```

### Configuring Destination Strategies { #destination-strategies }

When loading destinations from SAP BTP Destination Service, you can specify a [destination retrieval strategy](https://sap.github.io/cloud-sdk/docs/java/features/connectivity/sdk-connectivity-destination-service#retrieval-strategy-options) and a [token exchange strategy](https://sap.github.io/cloud-sdk/docs/java/features/connectivity/sdk-connectivity-destination-service#token-exchange-options).

These strategies can be set in the destination configuration of the _Remote Service_:

```yml [srv/src/main/resources/application.yaml]
cds:
  remote.services:
    API_BUSINESS_PARTNER:
      destination:
        name: "s4-business-partner-api"
        retrievalStrategy: "AlwaysProvider"
        tokenExchangeStrategy: "ExchangeOnly"
```

::: tip
Values for destination strategies have to be provided in pascal case.
:::

### Programmatic Destination Registration

You can also programmatically build destinations and add them to the `DestinationAccessor` to make them available for _Remote Services_.
You can easily register an event handler that is executed during startup of the application and build custom destinations:

```java
@Component
@ServiceName(ApplicationLifecycleService.DEFAULT_NAME)
public class DestinationConfiguration implements EventHandler {

    @Value("${api-hub.api-key:}")
    private String apiKey;

    @Before(event = ApplicationLifecycleService.EVENT_APPLICATION_PREPARED)
    public void initializeDestinations() {
        if(apiKey != null && !apiKey.isEmpty()) {
            DefaultHttpDestination httpDestination = DefaultHttpDestination
                .builder("https://sandbox.api.sap.com/s4hanacloud")
                .header("APIKey", apiKey)
                .name("s4-business-partner-api").build();

            DestinationAccessor.prependDestinationLoader(
                new DefaultDestinationLoader().registerDestination(httpDestination));
        }
    }

}
```

[Find out how to create destinations for different authentication types](#programmatic-destinations){.learn-more}
[Learn more about using destinations](../../guides/using-services#using-destinations){.learn-more}

Note that you can leverage Spring Boot's configuration possibilities to inject credentials into the destination configuration.
The same mechanism can also be used for the URL of the destination by also reading it from your application configuration (for example environment variables or _application.yaml_).
This is especially useful when integrating micro-services, which may have different URLs in productive environments and test environments.

## Native Service Consumption { #native-consumption }

If you need to call an endpoint that you cannot consume as a _Remote Service_, you can fall back to leverage Cloud SDK APIs. Based on the Cloud SDK's `HttpClientAccessor` API, you can resolve an `HttpClient` that you can use to execute plain HTTP requests against the remote API.

However, this involves low-level operations like payload de-/serialization. Usage of CAP's _Remote Service_ is encouraged whenever possible to free the developer from these.

[Learn more about HttpClientAccessor in the **SAP Cloud SDK documentation**.](https://sap.github.io/cloud-sdk/docs/java/features/connectivity/http-client){.learn-more}

### Using Service Bindings { #native-bindings }

If the URL and credentials of the remote API are available as a service binding, you can create a Cloud SDK destination for the service binding using the `ServiceBindingDestinationLoader` API. Based on this, it's possible to create an instance of `HttpClient` using the `HttpClientAccessor`:

```java
ServiceBinding binding = ...;
HttpDestination destination = ServiceBindingDestinationLoader.defaultLoaderChain().getDestination(
        ServiceBindingDestinationOptions
          .forService(binding)
          .onBehalfOf(OnBehalfOf.TECHNICAL_USER_CURRENT_TENANT)
          .build());

HttpClient httpClient = HttpClientAccessor.getHttpClient(destination);
...
```

[Learn more about HttpClientAccessor in the **SAP Cloud SDK documentation**.](https://sap.github.io/cloud-sdk/docs/java/features/connectivity/http-client){.learn-more}

To be able to resolve a service binding into a Cloud SDK destination, a `OAuth2PropertySupplier` might need to be registered with Cloud SDK.

```java
static {
    OAuth2ServiceBindingDestinationLoader.registerPropertySupplier(
        options -> options.getServiceBinding().getTags().contains("<bindingTag>"),
            BizPartnerOAuth2PropertySupplier::new);
}
```

[Learn more about registering OAuth2PropertySupplier in the **SAP Cloud SDK documentation**.](https://sap.github.io/cloud-sdk/docs/java/features/connectivity/service-bindings#customization){.learn-more}

### Using Destinations { #native-destinations }

If the URL and credentials of the remote API are configured as a destination in SAP BTP Destination Service, you can use Cloud SDK's `DestinationAccessor` API to load the destination based on its name. In a second step, `HttpClientAccessor` is used to create an instance of `HttpClient`:

::: code-group
```java [Cloud SDK v4]
HttpDestination destination = DestinationAccessor.getDestination("<destinationName>").asHttp();
HttpClient httpClient = HttpClientAccessor.getHttpClient(destination);
...
```
```java [Cloud SDK v5]
Destination destination = DestinationAccessor.getDestination("<destinationName>");
HttpClient httpClient = HttpClientAccessor.getHttpClient(destination);
...
```
::::

### Programmatic Destinations { #programmatic-destinations }

The following example code snippets show how to programmatically create a destination for different authentication types.
You can [register](#programmatic-destination-registration) these destinations with the `DestinationAccessor` to use them with _Remote Services_ or use them natively with the `HttpClientAccessor` to obtain `HttpClient` instances.

Use the following example if the remote API supports basic authentication:
```java
DefaultHttpDestination
  .builder("https://example.org")
	.basicCredentials("user", "password")
	.name("my-destination").build();
```

Use the following example if you can directly forward the token from the current security context:
```java
DefaultHttpDestination
  .builder("https://example.org")
	.authenticationType(AuthenticationType.TOKEN_FORWARDING)
	.name("my-destination").build();
```

Use the following example if you want to call the remote API using a technical user:
```java
ClientCredentials clientCredentials =
        new ClientCredentials("clientid", "clientsecret");

OAuth2DestinationBuilder
        .forTargetUrl("https://example.org")
        .withTokenEndpoint("https://xsuaa.url")
        .withClient(clientCredentials, OnBehalfOf.TECHNICAL_USER_CURRENT_TENANT)
        .property("name", "my-destination")
        .build();
```

Use the following example if you need to exchange the token from the security context (that is, user token exchange):
```java
ClientCredentials clientCredentials =
        new ClientCredentials("clientid", "clientsecret");

OAuth2DestinationBuilder
        .forTargetUrl("https://example.org")
        .withTokenEndpoint("https://xsuaa.url")
        .withClient(clientCredentials, OnBehalfOf.NAMED_USER_CURRENT_TENANT)
        .property("name", "my-destination")
        .build();
```
