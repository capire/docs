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

CAP supports out-of-the-box consumption of various kinds of remote services:

* [Co-located services](#co-located-services) as part of the same deployment and bound to the same identity instance (i.e. same trusted [application zone](./overview#application-zone)).
* [BTP reuse services](#ias-reuse) consumed via service binding.
* [External services](#app-to-app) which can be running on none-BTP-platforms.

According to key concept of [pluggable building blocks](./overview#key-concept-pluggable), the architecture of CAP's [Remote Services](../using-services#consuming-services) decouples protocol level (i.e. exchanged content) from connection level (i.e. established connection channel). 
While the business context of the application has an impact on the protocol, the connectivity of the service endpoints is agnostic to it and mainly depends on platform-level capabilities.
The latter one is frequently subject to changes and hence should not introduce a dependency to the application. 

![Remote Service stack architecture](./assets/remote-service-stack.drawio.svg){width="350px" }

On the layer of connectivity, following basic tasks ca be addressed generically:
- Authentication (_how to setup a trusted channel_)
- Destination (_how to find the target service_)
- User propagation (_how to transport user information_)

CAP's connectivity component can handle authentication (IAS, XSUAA, X.509, ZTID, ...) and destination (local destination, BTP Destination, BTP Service Binding) as well as user propagation (technical provider, technical subscriber, named user) transparently and fully configuration driven.
All three different service scenarios listed before can be conveniently addressed by configuration variants of the same remote service concept as shown in the following sections.


## Co-located Services {#co-located-services}

Co-located services do not run in the same microservice, but are typically part of the same deployment unit and hence reside within the same trust boundary of the overall [application zone](./overview#application-zone).
Logically, such co-located services contribute to the application equally and hence could run as local services just as well, but for some technical reason (e.g., different runtime or scaling requirements) they are separated physically, often as a result of [late-cut microservice approach](../providing-services#late-cut-microservices).

Technically, they share the same identity instance which allows direct token forwarding:

![Co-located services](./assets/co-located-services.drawio.svg){width="500px" }

[Learn more about how to configure co-located services in CAP Java](/java/cqn-services/remote-services#binding-to-a-service-with-shared-identity) {.learn-more}

You can test CAP built-in support for co-located services in practise by modifying [`xflights-java`](https://github.com/capire/xflights-java/tree/main) and [`xtravels-java`](https://github.com/capire/xtravels-java/tree/main) sample applications.
`xflights_java` acts as master data provider exposing basic flight data in service [`sap.capire.flights.data`](https://github.com/capire/xflights-java/blob/6fc7c665c63bb6d73e28c11b391b1ba965b8772c/srv/data-service.cds#L24) via different protocols.
On the client side, `xtravels_java` imports this service as CAP remote service and fetches data in a [custom handler for data fedaration](https://github.com/capire/xtravels-java/blob/53a5fa33caf4c9068f2e66fab25bda26f3f450ca/srv/src/main/java/sap/capire/xtravels/handler/FederationHandler.java#L63).

::: tip
CAP offers a simplified co-located service setup by leveraging remote services that require
- Shared identity instance 
- URL for the destination
- Principal propagation mode (optional)
:::


To combine both applications in a co-located setup, you can do the following steps:

#### 1. Prepare the CF environment with a dedicated space of your choice. 

Make sure that you've prepared the following [local environment for CF deployments](../deployment/to-cf#prerequisites):
- CF space to deploy the applications and a `cf`-CLI session targeting this space.
. MBT CLI build tool.
- HANA Cloud instance mapped to the space.
- [IAS tenant](./authentication#ias-ready) mapped to the subaccount.


#### 2. Prepare and deploy the client application

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

Property `model` needs to match the full-qualified name of the CDS service from the imported model.
`binding.name` just needs to point to the shared identity instance and the `url` option provides the required location of the remote service endpoint.
Finally, `onBehalfOf: systemUserProvider` specifies that the remote call is invoked on behalf of the technical provider tenant.


Deploy the application with

```sh
cd ./xtravels_java
cds up
```

❗Note that CF application `xtravels-srv` will not start successfully as long as `xflights` is not deployed yet (step 3).

:::tip
In deployment for production it is recommended to combine both services with the shared identity instance in a single MTA descriptor.
:::


#### 3. Prepare and deploy the server application

As server, `xflights` should restrict service `sap.capire.flights.data` to technical clients of the same application by adding pseudo-role [`internal-user`](./cap-users#pseudo-roles) to the service:

::: code-group

```cds [/srv/authorization.cds]
using { sap.capire.flights.data as data } from './data-service';

annotate data with @(requires: 'internal-user');
```

:::

In addition, the microservice needs to share the same identity instance for co-located-setup:

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

First, you can check the overall deployment status on cf CLI level, in particular the application services need to be started successfully as well as the shared identiy instance need to be verified.

::: details To verify successfully started applications, `cf apps` should show following lines:

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

::: details To verify the service bindings, `cf services` should show following lines:

::: code-group
```sh
xflights-ias   identity   application
xtravels-ias   identity   application   xtravels, xtravels-srv, xflights-srv, ...
```
:::

You can test the valid setup of xtravels application by accessing the UI by login with an authorized test user of the IAS tenant.
To do so, assign a proper AMS policy (e.g. `admin`) to the test user as described [before](./cap-users#ams-deployment).



## External Services { #app-to-app }

External services 
To connect with externally located services, same aspects such as 

CAP Java supports technical communication with any IAS-based service deployed to an SAP Cloud landscape. User propagation is supported.
For connection setup, it uses [IAS App-2-App flows](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/consume-apis-from-other-applications).


::: tip
BTP HTTP Destinations offer [various authentication strategies](https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/http-destinations) such as SAML 2.0 as required by many S/4 system endpoints.
:::


### Provider Application

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

### Consumer Application

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


