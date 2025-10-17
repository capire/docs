---
# layout: cookbook
label: Remote Authentication
synopsis: >
  This guide explains how to authenticate remote services.
status: released
---

<script setup>
  import { h } from 'vue'
  const Y  =  () => h('span', { class: 'y',   title: 'Available' },      ['✓']   )
  const X  =  () => h('span', { class: 'x',   title: 'Available' },      ['✗']   )
  const Na =  () => h('span', { class: 'na',  title: 'Not available' },  ['n/a']   )
</script>
<style scoped>
  .y   { color: var(--green); font-weight:900; }
  .x   { color: var(--red);   font-weight:900; }
  /* .na  { font-weight:500; } */
</style>


# Remote Authentication { #remote-authentication }

### User Propagation

  - threads
  https://pages.github.tools.sap/cap/docs/java/event-handlers/request-contexts#threading-requestcontext

	- original authentication claim

  - Remote Services

  Custom:
  - Cloud SDK: 
     tenant provider, 
     user per SecurityContext


## Connecting to IAS Services { #outbound-auth }

CAP Java supports the consumption of IAS-based services of various kinds:

* [Internal Services](#internal-app) bound to the same IAS instance of the provider application.
* [External IAS](#app-to-app) applications consumed by providing a destination.
* [BTP reuse services](#ias-reuse) consumed via service binding.

![The TAM graphic is explained in the accompanying text.](./assets/java-ias.png){width="800px" }

Regardless of the kind of service, CAP provides a [unified integration as Remote Service](/java/cqn-services/remote-services#remote-odata-services).
Basic communication setup and user propagation is addressed under the hood, for example, an mTLS handshake is performed in case of service-2-service communication.

### Internal Services {#internal-app}

For communication between adjacent CAP applications, these are CAP applications which are bound to the same identity instance, simplified configuration is explained in [Binding to a Service with Shared Identity](/java/cqn-services/remote-services#binding-to-a-service-with-shared-identity).

### External Services (IAS App-to-App)  {#app-to-app}

CAP Java supports technical communication with any IAS-based service deployed to an SAP Cloud landscape. User propagation is supported.
For connection setup, it uses [IAS App-2-App flows](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/consume-apis-from-other-applications).

#### Provider Application

The CAP Java application as a _provider app_ needs to:

1. Configure [IAS authentication](/java/security#xsuaa-ias).
2. Expose an API in the IAS service instance.

    ::: details Sample IAS instance of provider (mta.yaml)

    Add this to your `mta.yaml` resources section:

    ```yaml
    - name: server-identity
        type: org.cloudfoundry.managed-service
        parameters:
          service: identity
          service-plan: application
          config:
            multi-tenant: true
            provided-apis:
              - name: "review-api"
    ```

    :::

3. Prepare a CDS service endpoint for the exposed API.

    ::: details Sample CDS Service for the API

    ```cds
    service ReviewService @(requires: 'review-api') {
      [...]
    }
    ```

    :::


::: tip API as CAP role
The API identifiers exposed by the IAS instance in list `provided-apis` are granted as CAP roles after successful authentication.
:::

::: warning Use different roles for technical and business users
Use different CAP roles for technical clients without user propagation and for named business users.

Instead of using the same role, expose dedicated CDS services to technical clients which aren't accessible to business users and vice verse.
:::

#### Consumer Application

To set up a connection to such an IAS service, the _consumer app_ requires to do:

1. Create an IAS instance that consumes the required API.

    ::: details Sample IAS instance for client (mta.yaml)

    Add this to your `mta.yaml` resources section:

    ```yaml
    - name: client-identity
        type: org.cloudfoundry.managed-service
        parameters:
          service: identity
          service-plan: application
          config:
            multi-tenant: true
            oauth2-configuration:
              token-policy:
                grant_types:
                  - "urn:ietf:params:oauth:grant-type:jwt-bearer"
    ```

    :::

2. Create a Remote Service based on the destination (optional).
    ::: details Sample Remote Service configuration

    ```yaml
    cds:
      remote.services:
        Reviews:
          destination:
            name: review-service-destination
    ```

    :::

To activate the App-2-App connection as a *consumer*, you need to:

1. Create an IAS application dependency in the IAS tenant:
    - Open the Cloud Identity Services admin console
    - Navigate to [Application APIs / Dependencies](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/communicate-between-applications)
    - Create a new dependency pointing to your provider application's API

2. Create a dedicated [destination](https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/access-destinations-editor) with the following configuration:
    * The URL pointing to the IAS-endpoint of the application.
    * Authentication type `NoAuthentication`.
    * Attribute `cloudsdk.ias-dependency-name` with the name of the created IAS application dependency in Step 1.

<div id="orchint" />



[Learn more about how to consume external application APIs with IAS](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/consume-apis-from-other-applications) {.learn-more}

[Learn more about simplified Remote Service configuration with destinations](/java/cqn-services/remote-services#destination-based-scenarios) {.learn-more}


### BTP Reuse Services {#ias-reuse}

IAS-based BTP reuse services can be created/consumed with CAP Java even more easily.

The CAP reuse service (provider) needs to:

1. Configure [IAS authentication](/java/security#xsuaa-ias).
2. Bind an IAS instance that exposes services and service plans.

    ::: details Sample IAS instance for provider

    ```yaml
    - name: server-identity
        type: org.cloudfoundry.managed-service
        parameters:
          service: identity
          service-plan: application
          config:
            multi-tenant: true
            catalog:
              services:
                - id: "1d5c23ee-1ce6-6130-4af4-26461bc6ef79"
                  name: "review-service"
                  plans:
                    - id: "2d5c23ee-1ce6-6130-4af4-26461bc6ef78"
                      name: "review-api"
    ```

    :::

3. Prepare a CDS service endpoint for the exposed API.

    ::: details Sample CDS Service for the API

    ```cds
    service ReviewService @(requires: 'review-api') {
      [...]
    }
    ```

    :::

The CAP consumer application (client) needs to:

1. Create and bind the provided service from the marketplace.

    ::: details Create and bind service instance.
    ```sh
    cf create-service review-service review-api review-service-instance
    cf bind-service <your-app-name> review-service-instance --binding-name review-service-binding
    ```
    :::

2. Create an IAS instance that consumes the required service.

    ::: details Sample IAS instance for client

    ```yaml
      - name: client-identity
        type: org.cloudfoundry.managed-service
        parameters:
          service: identity
          service-plan: application
          config:
            multi-tenant: true
            "consumed-services": [ {
              "service-instance-name": "review-service-instance"
            } ]
    ```

    :::

3. Create a Remote Service based on the binding (optional).

    ::: details Sample Remote Service configuration

    ```yaml
    cds:
      remote.services:
        Reviews:
          binding:
            name: review-service-binding
            onBehalfOf: currentUser
    ```

    :::

4. Use CQN queries to consume the reuse service (optional)

[Learn more about simplified Remote Service configuration with bindings](/java/cqn-services/remote-services#service-binding-based-scenarios) {.learn-more}

::: tip Service plan name as CAP role
The service plan names as specified in `consumed-services` in the IAS instance are granted as CAP roles after successful authentication.
:::

::: warning  Use different roles for technical and business users
Use different CAP roles for technical clients without user propagation and for named business users.

Instead of using the same role, expose dedicated CDS services to technical clients which aren't accessible to business users and vice versa.
:::


#### How to Authorize Callbacks

For bidirectional communication, callbacks from the reuse service to the CAP service need to be authorized as well.
Currently, there is no standadized way to achieve this in CAP so that custom codeing is required.
As a prerequisite*, the CAP service needs to know the clientId of the reuse service's IAS application which should be part of the binding exposed to the CAP service.

::: details Sample Code for Authorization of Callbacks

```java
private void authorizeCallback() {
		UserInfo userInfo = runtime.getProvidedUserInfo();
		String azp = (String) userInfo.getAdditionalAttributes().get("azp");
		if(!userInfo.isSystemUser() || azp == null || !azp.equals(clientId)) {
			throw new ErrorStatusException(ErrorStatuses.FORBIDDEN);
		}
	}
```
:::



## Local Services

Local CDS services which are meant for *internal* usage only can be easily consumed by in-process function calls.
They shouldn't be exposed via protocol adapters at all. 
In order to prevent access from external clients, annotate those services with `@protocol: 'none'`:

```cds
@protocol: 'none'
service InternalService {
  ...
}
```
`InternalService` is not handled by protocol adapters and can only receive events sent by in-process handlers.

## Application-Internal Services
- internal-user (IAS + XSUAA)

## BTP Reuse Services
- IAS 
- XSUAA

## External Services
- IAS App-2-App
- Via Destination (S/4)