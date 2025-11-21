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

CAP supports out-of-the-box consumption of various kinds of [remote services]( #remote-services):

* [Co-located services](#co-located-services) as part of the same deployment and bound to the same identity instance (i.e., belong to the same trusted [application zone](./overview#application-zone)).
* [External services](#app-to-app) which can be running on non-BTP platforms.
* [BTP reuse services](#ias-reuse) consumed via service binding.

## Remote Service Abstraction { #remote-services }

According to the key concept of [pluggable building blocks](./overview#key-concept-pluggable), the architecture of CAP's [Remote Services](../using-services#consuming-services) decouples protocol level (i.e., exchanged content) from connection level (i.e., established connection channel). 
While the business context of the application has an impact on the protocol, the connectivity of the service endpoints is agnostic to it and mainly depends on platform-level capabilities.
The latter is frequently subject to changes and hence should not introduce a dependency on the application. 

![Remote Service stack architecture](./assets/remote-service-stack.drawio.svg){width="400px" }

At the connectivity layer, the following basic tasks can be addressed generically:
- Authentication (_how to set up a trusted channel_)
- Destination (_how to find the target service_)
- User propagation (_how to transport user information_)

CAP's connectivity component can handle authentication (IAS, XSUAA, X.509, ZTID, ...) and destination (local destination, BTP Destination, BTP Service Binding) as well as user propagation (technical provider, technical subscriber, named user) transparently and in a fully configuration-driven manner.
All three different service scenarios listed above can be conveniently addressed by configuration variants of the same remote service concept as shown in the following sections.


## Co-located Services {#co-located-services}

Co-located services do not run in the same microservice, but are typically part of the same deployment unit and hence reside within the same trust boundary of the overall [application zone](./overview#application-zone).
Logically, such co-located services contribute to the application equally and hence could run as local services just as well, but for some technical reason (e.g., different runtime or scaling requirements) they are separated physically, often as a result of a [late-cut microservice approach](../providing-services#late-cut-microservices).

Technically, they share the same identity instance, which allows direct token forwarding:

![Co-located services](./assets/co-located-services.drawio.svg){width="450px" }

[Learn more about how to configure co-located services in CAP Java](/java/cqn-services/remote-services#binding-to-a-service-with-shared-identity) {.learn-more}

You can test CAP's built-in support for co-located services in practice by modifying the [`xflights-java`](https://github.com/capire/xflights-java/tree/main) and [`xtravels-java`](https://github.com/capire/xtravels-java/tree/main) sample applications.
`xflights-java` acts as a master data provider exposing basic flight data in service [`sap.capire.flights.data`](https://github.com/capire/xflights-java/blob/6fc7c665c63bb6d73e28c11b391b1ba965b8772c/srv/data-service.cds#L24) via different protocols.
On the client side, `xtravels-java` imports this service as a CAP remote service and fetches data in a [custom handler for data federation](https://github.com/capire/xtravels-java/blob/53a5fa33caf4c9068f2e66fab25bda26f3f450ca/srv/src/main/java/sap/capire/xtravels/handler/FederationHandler.java#L63).

::: tip
CAP offers a simplified co-located service setup by leveraging remote services that require:
- Shared identity instance 
- URL for the destination
- Principal propagation mode (optional)
:::


To combine both applications in a co-located setup, you can follow these steps:

#### 1. Prepare the CF environment

Make sure that you've prepared the following [local environment for CF deployments](../deployment/to-cf#prerequisites):
- CF space to deploy the applications and a `cf`-CLI session targeting this space.
- MBT CLI build tool.
- HANA Cloud instance mapped to the space.
- [IAS tenant](./authentication#ias-ready) mapped to the subaccount.


#### 2. Prepare and deploy the consumer application { #co-located-consumer }

As client, `xtravels` first needs a valid configuration for the remote service `sap.capire.flights.data`:

::: code-group

```yaml [/srv/srv/main/resources/application.yaml]
---
spring:
  config.activate.on-profile: cloud
cds:
  remote.services:
    xflights:
      type: hcql
      model: sap.capire.flights.data
      binding:
        name: xtravels-ias
        options:
          url: https://<xflights-srv-cert url>/hcql
        onBehalfOf: systemUserProvider
```

The `model` property needs to match the fully qualified name of the CDS service from the imported model.
The `binding.name` just needs to point to the shared identity instance and the `url` option provides the required location of the remote service endpoint.
Finally, `onBehalfOf: systemUserProvider` specifies that the remote call is invoked on behalf of the technical provider tenant.


Deploy the application with

```sh
cd ./xtravels_java
cds up
```

❗Note that CF application `xtravels-srv` will not start successfully as long as `xflights` is not deployed yet (step 3).

::: tip
For production deployment, it is recommended to combine both services with the shared identity instance in a [single MTA descriptor](./deployment/microservices#all-in-one-deployment).
:::


#### 3. Prepare and deploy the provider application { #co-located-provider }

As server, `xflights` should restrict service `sap.capire.flights.data` to technical clients of the same application by adding pseudo-role [`internal-user`](./cap-users#pseudo-roles) to the service:

::: code-group

```cds [/srv/authorization.cds]
using { sap.capire.flights.data as data } from './data-service';

annotate data with @(requires: 'internal-user');
```

:::

In addition, the microservice needs to share the same identity instance for the co-located setup:

::: code-group

```yaml [/srv/srv/main/resources/application.yaml]
resources:
  - name: xflights-ias
    type: org.cloudfoundry.managed-service // [!code --]
    type: org.cloudfoundry.existing-service // [!code ++]
    parameters:
      service: identity // [!code --]
      service-name: xflights-ias // [!code --]
      service-name: xtravels-ias // [!code ++]
      service-plan: application // [!code --]
      config: // [!code --]
        display-name: xflights // [!code --]
```

:::

Finally, deploy and start the application with

```sh
cd ./xflights_java
cds up
```

#### 4. Verify the deployment

First, you can check the overall deployment status at the CF CLI level. In particular, the application services need to be started successfully and the shared identity instance needs to be verified.

::: details To verify successfully started applications, `cf apps` should show the following lines:

::: code-group
```sh
name                             requested state   processes  routes
xflights-db-deployer             stopped           web:0/1
xflights-srv                     started           web:1/1    ...
xtravels                         started           web:1/1    ...
xtravels-ams-policies-deployer   stopped           web:0/1
xtravels-db-deployer             stopped           web:0/1  
xtravels-srv                     started           web:1/1    ... 
```
:::

::: details To verify the service bindings, `cf services` should show the following lines:

::: code-group
```sh
xflights-ias   identity   application
xtravels-ias   identity   application   xtravels, xtravels-srv, xflights-srv, ...
```
:::

You can test the valid setup of the xtravels application by accessing the UI and logging in with an authorized test user of the IAS tenant.
To do so, assign a proper AMS policy (e.g., `admin`) to the test user as described [earlier](./cap-users#ams-deployment).


::: tip
The very same setup could be deployed for XSUAA-based services.
:::


## External Services { #app-to-app }

In contrast to [co-located services](#co-located-services), external services do not have a strong dependency as they have a fully decoupled lifecycle and are provided by different owners in general.
As a consequence, external services can run cross-regionally; even non-BTP systems might be involved.
A prerequisite for external service calls is a trust federation between the consumer and the provider system.
For instance, BTP HTTP Destinations offer [various authentication strategies](https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/http-destinations) such as SAML 2.0 as required by many S/4 system endpoints.

[IAS](./authentication#ias-auth) is positioned to simplify cross-regional requests with user propagation. 
Prerequisites are identity instances on both consumer and provider sides as well as a registered IAS dependency in the consumer instance.

![External services](./assets/external-services.drawio.svg){width="500px" }

CAP supports communication between arbitrary IAS endpoints and remains transparent for applications as it builds on the same architectural pattern of [remote services]( #remote-services).
Technically, the connectivity component uses [IAS App-2-App flows](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/consume-apis-from-other-applications) in this scenario which requires a token exchange from a consumer token into a token for the provider.
The latter is issued by IAS only if the consumer is configured with a valid IAS dependency to the provider (establishing trust).

:::tip
CAP offers a simplified App-2-App setup by leveraging remote services that require:
- Identity instances for provider and consumer
- Configured IAS dependency from consumer to provider
- Destination with URL pointing to the provider
- Principal propagation mode (optional)
:::

#### 1. Prepare the CF environment

Make sure that you've prepared the following [local environment for CF deployments](../deployment/to-cf#prerequisites):
- CF space to deploy the applications and a `cf`-CLI session targeting this space.
- MBT CLI build tool.
- HANA Cloud instance mapped to the space.
- [IAS tenant](./authentication#ias-ready) mapped to the subaccount.


#### 2. Prepare and deploy the provider application

As first step, clone [`xflights-java`](https://github.com/capire/xflights-java/tree/main) or, if already cloned and modified locally, reset to remote branch.

Similar to the [co-located](#co-located-provider) flavour, `xflights` needs to expose service `sap.capire.flights.data` to technical clients.
The difference is that the consumers are not known a priori and also are not part of the same application deployment, in general.

To expose service APIs for consumption, you can enhance the identity instance of the provider by defining API identifies that are listed in property `provided-apis`:

::: code-group

```yaml [mta.yaml]
resources:
  - name: xflights-ias
    type: org.cloudfoundry.managed-service
    parameters:
      [...]
      config:
        display-name: xflights
        provided-apis: [{  # [!code ++:5]
          name: DataConsumer,
          description: Grants technical access to data service API
        }]
```

:::

Only a single entry with name `DataConsumer` representing the consumption of service `sap.capire.flights.data` is added.
The description helps administrators to configure the consumer application with the proper provider API if done on UI level.

[Detailed description about identity instance parameters for `provided-apis`](https://github.wdf.sap.corp/pages/CPSecurity/sci-dev-guide/docs/BTP/identity-broker#service-instance-parameters){.learn-more}

OAuth tokens presented by a valid consumer requests as a result of an App-2-App flow will have API claim `DataConsumer` which is automatically mapped to a CAP role by the runtime.
Hence, the corresponding CDS service can be protected by CAP-role `DataConsumer` in order to authorize the requests thoroughly:

::: code-group

```cds [/srv/authorization.cds]
using { sap.capire.flights.data as data } from './data-service';

annotate data with @(requires: 'DataConsumer');
```

Finally, deploy and start the application with

```sh
cd ./xflights_java
cds up
```

:::

::: tip API as CAP role
The API identifiers exposed by the IAS instance in list `provided-apis` are granted as CAP roles after successful authentication.
:::

::: warning Use different roles for technical and business users
Use different CAP roles for technical clients without user propagation and for named business users.

Instead of using the same role, expose dedicated CDS services to technical clients which aren't accessible to business users and vice versa.
:::

#### 3. Prepare and deploy the consumer application

Like with xflights, clone [`xtravels-java`](https://github.com/capire/xtravels-java/tree/main) or, if already cloned and modified locally, reset to remote branch.

First, a BTP destination needs to be added which points to the provider service endpoint to be called (`URL`) and which bears the the information about the IAS dependency to be called (`cloudsdk.ias-dependency-name`).  
The name for the IAS dependency is flexible but **need to match the chosen name in next step** when [connecting consumer and provider in IAS](#connect).
The destination is required by the connectivity component to prepare the HTTP call accordingly. Also note that the authentication type of the destination is `NoAuthentication` as the destination itself does not contribute to the authentication process.


::: code-group

```yaml [mta.yaml (destination instance)]
  - name: xtravels-destination
    type: org.cloudfoundry.managed-service
    parameters:
      service: destination
      service-plan: lite
      config:
        init_data:
          instance:
            destinations:
              - Name: xtravels-data-consumer
                Type: HTTP
                URL: https://<xflights-srv-cert url>/hcql
                cloudsdk.ias-dependency-name: "DataConsumer"
                Authentication: NoAuthentication
                ProxyType: Internet
                Description: "Data consumer destination for xtravels"
```

```yaml [mta.yaml (destination binding)]
modules:
  - name: xtravels-srv
    type: java
    [...]
    requires:
      - name: xtravels-destination # [!code ++]
```
:::

:::tip
Alternatively, the destination can also be created manually in the [BTP destination editor](https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/access-destinations-editor).
:::


Given the destination, the remote service can be configured in a pretty similar way as with [co-located services](#co-located-consumer):

::: code-group

```yaml [/srv/srv/main/resources/application.yaml]
spring:
  config.activate.on-profile: cloud
cds:
  remote.services:
    xflights:
      type: hcql
      model: sap.capire.flights.data
      destination:
        name: xtravels-data-consumer
        onBehalfOf: systemUserProvider
```

:::

Finally, deploy and start the application with

```sh
cd ./xtravels_java
cds up
```

Technically, the remote service implementation will delegate the HTTP connection setup to the connectivity component which can recognize by the type of the destination that it needs to initiate an App-2-App flow.
It then takes the token from the request and triggers an IAS token exchange for the target [IAS dependency](#connect) according to the user propagation strategy (technical communication here).
The token exchange requires property `oauth2-configuration.token-policy.access-token-format: jwt` to be set in the identity instance in order to create a token in the JWT format.

#### 4. Connect consumer with provider { #connect }

To activate the App-2-App connection as a *consumer*, you need to:

Create an IAS application dependency in the IAS tenant:
    - Open the Cloud Identity Services admin console
    - Navigate to [Application APIs / Dependencies](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/communicate-between-applications)
    - Create a new dependency pointing to your provider application's API


<div id="orchint" />


[Learn more about how to consume external application APIs with IAS](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/consume-apis-from-other-applications) {.learn-more}

[Learn more about simplified Remote Service configuration with destinations](/java/cqn-services/remote-services#destination-based-scenarios) {.learn-more}



## BTP Reuse Services {#ias-reuse}

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


### How to Authorize Callbacks

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


