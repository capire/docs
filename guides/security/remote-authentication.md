---
# layout: cookbook
label: Outbound Authentication
synopsis: >
  This guide explains how to authenticate when calling remote services.
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


# Outbound Authentication { #remote-authentication }

[[toc]]

## Remote Service Abstraction { #remote-services }

According to the key concept of [pluggable building blocks](./overview#key-concept-pluggable), CAP's [Remote Services](../services/consuming-services#consuming-services) architecture decouples the protocol level (exchanged content) from the connection level (established connection channel).
While the business context of the application impacts the protocol, the connectivity of the service endpoints is independent of it and mainly depends on platform-level capabilities.
The latter is frequently subject to change and therefore should not introduce application dependencies.

![Remote Service stack architecture](./assets/remote-service-stack.drawio.svg){width="400px" }

At the connectivity layer, the following basic tasks can be addressed generically:
- Authentication (_how to set up a trusted channel_)
- Destination (_how to find the target service_)
- User propagation (_how to transport user information_)

CAP's connectivity component handles authentication (IAS, XSUAA, X.509, ZTID, ...), destination (local destination, BTP Destination, BTP Service Binding), and user propagation (technical provider, technical subscriber, named user) transparently through configuration (although the configuration approach may differ between Java and Node.js).
All three service scenarios can be addressed through configuration variants of the same remote service concept, as shown in the following sections.

CAP supports out-of-the-box consumption of various types of [remote services](#remote-services):

* [Co-located services](#co-located-services) as part of the same deployment and bound to the same identity instance (that is, belong to the same trusted [application zone](./overview#application-zone)).
* [External services](#app-to-app) that can be running on non-BTP platforms.
* [BTP reuse services](#ias-reuse) consumed via service binding. <!-- INTERNAL -->


## Co-located Services {#co-located-services}

Co-located services do not run in the same microservice, but are typically part of the same deployment unit and hence reside within the same trust boundary of the [application zone](./overview#application-zone).
Logically, such co-located services contribute to the application equally and could run as integrated services in the same microservice, but for technical reasons (for example, different runtime or scaling requirements) they are separated physically, often as a result of a [late-cut microservice approach](../deploy/microservices#late-cut-microservices).

Technically, **they share the same identity instance, which allows direct token forwarding**:

![Co-located services](./assets/co-located-services.drawio.svg){width="450px" }

[Learn more about how to configure co-located services in CAP Java](/java/cqn-services/remote-services#binding-to-a-service-with-shared-identity){.learn-more}
[Learn more about how to configure remote services in CAP Node.js](/node.js/remote-services){.learn-more}

You can test CAP's built-in support for co-located services in practice by modifying the sample applications:
- **Java**: [`xflights-java`](https://github.com/capire/xflights-java/tree/main) and [`xtravels-java`](https://github.com/capire/xtravels-java/tree/main)
- **Node.js**: [`xflights`](https://github.com/capire/xflights/tree/main) and [`xtravels`](https://github.com/capire/xtravels/tree/main)

`xflights` acts as a master data provider exposing basic flight data in service `sap.capire.flights.data` via different protocols.
On the client side, `xtravels` imports this service as a CAP remote service and fetches data for federation.

::: tip
CAP offers a simplified co-located service setup by leveraging remote services that require:
- Shared identity instance
- URL for the destination
- Principal propagation mode (optional)
:::


To combine both applications in a co-located setup, follow these steps:

#### 1. Prepare the CF environment { #prepare }

Make sure that you've prepared a [local environment for CF deployments](../deploy/to-cf#prerequisites) and in addition:
- A Cloud Foundry (CF) space in a subaccount.
- [HANA Cloud instance](https://help.sap.com/docs/hana-cloud/sap-hana-cloud-administration-guide/create-sap-hana-database-instance-using-sap-hana-cloud-central) mapped to the CF space.
- [IAS tenant](./authentication#ias-ready) mapped to the subaccount.


#### 2. Prepare and deploy the consumer application { #co-located-consumer }

As client, `xtravels` first needs a valid configuration for the remote service `sap.capire.flights.data`:

::: code-group
```yaml [Java: application.yaml]
---
spring:
  config.activate.on-profile: cloud
cds:
  remote.services:
    xflights:
      type: hcql
      model: sap.capire.flights.data
      http:
        suffix: /hcql
      binding:
        name: xtravels-ias
        onBehalfOf: systemUser
        options:
          url: https://<xflights-srv-cert url>
```
```json [Node.js: package.json]
{
  "cds": {
    "requires": {
      "sap.capire.flights.data": {
        "kind": "hcql",
        "[production]": {
          "credentials": {
            "url": "https://<xflights-srv-cert url>/hcql/data",
            "forwardAuthToken": true
          }
        }
      }
    }
  }
}
```
:::

::: details Java configuration explained

The `type` property activates the protocol for exchanging business data and must be offered by the provider [CDS service](https://github.com/capire/xflights-java/blob/6fc7c665c63bb6d73e28c11b391b1ba965b8772c/srv/data-service.cds#L24).
The `model` property needs to match the fully qualified name of the CDS service from the imported model.
You can find CDS service definition of `sap.capire.flights.data` in file `target/cds/capire/xflight-data/service.cds` resolved during CDS build step.
The `binding.name` needs to point to the shared identity instance and `options.url` together with `http.suffix` provides the required location of the remote service endpoint.
Finally, `onBehalfOf: systemUser` specifies that the remote call is invoked on behalf of a technical user in context of the tenant.

::: tip
On behalf of `systemUser` (Java) works both in pure single tenant and in pure multitenant scenarios.
If you are consuming a single tenant service from within a multitenant application choose on behalf of `systemUserProvider`.

:::

::: details Node.js configuration explained

The configuration follows the standard pattern for [required services](../integration/reuse-and-compose#configuring-required-services) with [service bindings](../integration/reuse-and-compose#binding-required-services).

For co-located services sharing the same identity instance, `forwardAuthToken: true` forwards the incoming JWT directly to the provider - no token exchange needed since the token is already valid. Unlike Java's `onBehalfOf` option, no additional configuration is required as the original user context is preserved in the forwarded token.

:::



Now you are ready to deploy the application with

::: code-group
```sh [Java]
cd ./xtravels-java
cds up
```

```sh [Node.js]
cd ./xtravels
cds up
```
:::

❗Note that CF application `xtravels-srv` will not start successfully as long as `xflights` is not deployed yet (step 3).

::: tip
For production deployment, we recommend combining both services with the shared identity instance in a [single MTA descriptor](../deploy/microservices#all-in-one-deployment).
:::


#### 3. Prepare and deploy the provider application { #co-located-provider }

As server, `xflights` needs to restrict service `sap.capire.flights.data` to the technical client calling from the same application.
This can be done by adding pseudo-role [`internal-user`](./cap-users#pseudo-roles) to the service:

::: code-group
```cds [xflights/srv/authorization.cds]
using { sap.capire.flights.data as data } from './data-service';

annotate data with @(requires: 'internal-user');
```
:::

::: tip
For different [user propagation](./cap-users#remote-services) modes the remote service can be configured appropriately.
The provider service authorization needs to align with the configured user propagation.
:::

Additionally, to establish the co-located setup, the microservice needs to share the same identity instance.
This is configured in the MTA deployment descriptor:

> The `mta.yaml`has been generated by `cds up`.

::: code-group

```yaml [mta.yaml]
resources:
  - name: xflights-ias
    type: org.cloudfoundry.managed-service # [!code --]
    type: org.cloudfoundry.existing-service # [!code ++]
    parameters:
      service: identity # [!code --]
      service-name: xflights-ias # [!code --]
      service-name: xtravels-ias # [!code ++]
      service-plan: application # [!code --]
      config: # [!code --]
        display-name: xflights # [!code --]
```

:::

Finally, deploy and start the application with

::: code-group
```sh [Java]
cd ./xflights-java
cds up
```

```sh [Node.js]
cd ./xflights
cds up
```
:::

#### 4. Verify the deployment { #verify }

First, you can check the overall deployment status at the CF CLI level. Specifically, the application services must be started successfully and the shared identity instance must be verified.

::: details Verify: `cf apps` should show the following lines:

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

::: details Verify: `cf services` should show the following lines:

::: code-group
```sh
xflights-ias   identity   application
xtravels-ias   identity   application   xtravels, xtravels-srv, xflights-srv, ...
```
:::

You can test the valid setup of the `xtravels` application by accessing the UI and logging in with an authorized test user of the IAS tenant.
To do so, assign a proper AMS policy (for example, `admin`) to the test user as described in [CAP-level Users and Roles](./cap-users#ams-deployment).


::: tip
The very same setup could be deployed for XSUAA-based services.
:::


## External Services

In contrast to [co-located services](#co-located-services), external services do not have strong dependencies as they have a fully decoupled lifecycle and are provided by different owners.
As a consequence, external services can run cross-regionally; even non-BTP systems might be involved.
A prerequisite for external service calls is a trust federation between the consumer and the provider system.

A seamless integration experience for external service communication is provided by [IAS App-2-App](#app-to-app) flows, which are offered by CAP via remote services.
[BTP Destinations](../services/consuming-services#using-destinations) offer [various authentication strategies](https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/http-destinations) such as SAML 2.0 as required by many S/4 system endpoints. Both CAP Java and CAP Node.js support IAS App-2-App via configuration to handle token exchange automatically - Java uses service bindings with `ias-dependency-name`, while Node.js uses BTP Destinations with `tokenService.body.resource`.


### IAS App-2-App { #app-to-app }

As a first-class citizen, [IAS](./authentication#ias-auth) is positioned to simplify cross-regional requests with user propagation.
Prerequisites are identity instances on both consumer and provider sides, plus a registered IAS dependency in the consumer instance.

![External services](./assets/external-services.drawio.svg){width="500px" }

CAP supports communication between arbitrary IAS endpoints and remains transparent for applications as it builds on the same architectural pattern of [remote services](#remote-services).
Technically, the connectivity component uses [IAS App-2-App flows](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/consume-apis-from-other-applications) in this scenario that requires a token exchange from a consumer token into a token for the provider.
The latter is issued by IAS only if the consumer is configured with a valid IAS dependency pointing to the provider accordingly.

:::tip
CAP offers App-2-App setup by leveraging remote services that require:
- Identity instances for provider and consumer
- Configured IAS dependency from consumer to provider
- URL pointing to the provider
- Principal propagation mode (optional)
:::

[Learn more about how to consume external application APIs with IAS](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/consume-apis-from-other-applications) {.learn-more}



#### 1. Prepare and deploy the provider application

Assuming the same local CF environment setup as [here](#prepare), clone the sample application ([`xflights-java`](https://github.com/capire/xflights-java/tree/main) or [`xflights`](https://github.com/capire/xflights/tree/main) for Node.js), or if already cloned and modified locally, reset to the remote branch.

Similar to the [co-located](#co-located-provider) variant, `xflights` needs to expose service `sap.capire.flights.data` to technical clients.
The difference is that the consumers are not known a priori and are not part of the same application deployment.

To expose service APIs for consumption, you can enhance the identity instance of the provider by defining API identifiers that are listed in property `provided-apis`:

::: code-group
```yaml [mta.yaml]
resources:
  - name: xflights-ias
    type: org.cloudfoundry.managed-service
    parameters:
      service: identity
      service-plan: application
      config:
        display-name: xflights
        oauth2-configuration:
          token-policy:
            access-token-format: jwt
        provided-apis:
          - name: data-consumer
            description: Grants technical access to data service API
```
:::

The entry with name `data-consumer` represents the consumption of service `sap.capire.flights.data` and is exposed as IAS API.
The description helps administrators to configure the consumer application with the proper provider API if done on UI level.

[Detailed description about identity instance parameters for `provided-apis`](https://github.wdf.sap.corp/pages/CPSecurity/sci-dev-guide/docs/BTP/identity-broker#service-instance-parameters){.learn-more} <!-- INTERNAL -->

> [!NOTE] How can proper authorization be configured for <i>technical clients without user propagation</i>?
>OAuth tokens presented by valid consumer requests from an App-2-App flow will have API claim `data-consumer`, which is automatically mapped to a CAP role by the runtime.

Therefore, you can protect the corresponding CDS service by CAP role `data-consumer` to authorize requests thoroughly:

::: code-group
```cds [/srv/authorization.cds]
using { sap.capire.flights.data as data } from './data-service';

annotate data with @(requires: 'data-consumer');
```
:::


For Node.js, additionally configure the authentication strategy in `package.json`:

::: code-group
```json [Node.js: package.json]
{
  "cds": {
    "requires": {
      "auth": {
        "[production]": {
          "kind": "ias"
        }
      }
    }
  }
}
```
:::
Finally, deploy and start the application with

::: code-group
```sh [Java]
cd ./xflights-java
cds up
```

```sh [Node.js]
cd ./xflights
cds up
```
:::


::: tip API as CAP role
The API identifiers exposed by the IAS instance in list `provided-apis` are granted as CAP roles after successful authentication and can be used in `@requires` annotations.
:::

::: warning Use different roles for technical and business users
Use different CAP roles for technical clients without user propagation and for named business users.

Instead of using the same role, expose dedicated CDS services to technical clients that are not accessible to business users and vice versa.
:::

#### 2. Prepare and deploy the consumer application { #consumer }

Like the provider application (xflights), clone the sample application ([`xtravels-java`](https://github.com/capire/xtravels-java/tree/main) or [`xtravels`](https://github.com/capire/xtravels/tree/main) for Node.js), or if already cloned and modified locally, reset to the remote branch.

The remote service can be configured in a very similar way as with [co-located services](#co-located-consumer).
You only need to add the information about the IAS dependency to be called.
The name for the IAS dependency is flexible but **needs to match the chosen name in the next step** when [connecting consumer and provider in IAS](#connect).

::: code-group
```yaml [Java: application.yaml]
spring:
  config.activate.on-profile: cloud
cds:
  remote.services:
    xflights:
      type: hcql
      model: sap.capire.flights.data
      http:
        suffix: /hcql
      binding:
        name: xtravels-ias
        onBehalfOf: systemUser
        options:
          url: https://<xflights-srv-cert url>
          ias-dependency-name: data-consumer
```

```json [Node.js: package.json]
{
  "cds": {
    "requires": {
      "auth": {
        "[production]": {
          "kind": "ias"
        }
      },
      "sap.capire.flights.data": {
        "kind": "hcql",
        "[production]": {
          "credentials": {
            "path": "/hcql/data",
            "destination": "xflights-ias-app2app"
          }
        }
      }
    }
  }
}
```

:::

::: details Java configuration explained

The `ias-dependency-name` property configures the IAS App-2-App flow directly in `application.yaml`. This is all that's needed for Java - the CAP Java runtime handles the token exchange automatically.

:::

**Node.js:** Configure a BTP Destination that handles the IAS token exchange. The destination references the IAS dependency name, which **must match** the name used when [connecting consumer and provider in IAS](#connect).

::: warning MTA cannot resolve cross-service credential references
The destination must be created manually in BTP Cockpit or via Destination Service API, as MTA cannot reference IAS credentials like `${generated>xtravels-ias/clientid}`.
:::
::: details Node.js configuration explained

CAP Node.js supports IAS App-2-App via BTP Destinations using standard remote service configuration.

**1. Configuration** - Use a named destination in `credentials`:
- `path`: The HCQL endpoint path on the provider
- `destination`: Name of the BTP Destination configured for IAS App-2-App

**2. BTP Destination** - Create a destination in BTP Cockpit with these properties:

| Property | Value |
|----------|-------|
| Name | `xflights-ias-app2app` |
| Type | `HTTP` |
| URL | `https://<xflights-srv url>` |
| Proxy Type | `Internet` |
| Authentication | `OAuth2ClientCredentials` or `OAuth2JWTBearer` (see below) |
| Client ID | Consumer IAS client ID |
| Client Secret | Consumer IAS client secret |
| Token Service URL | `https://<IAS tenant>/oauth2/token` |
| Token Service URL Type | `Dedicated` |

Client ID and Client Secret are obtained from the consumer's IAS service key:

```sh
cf create-service-key xtravels-ias xtravels-ias-key
```

**Additional Property (required for IAS App-2-App):**

| Property | Value |
|----------|-------|
| `tokenService.body.resource` | `urn:sap:identity:application:provider:name:data-consumer` |

The key is `tokenService.body.resource` which passes the `resource` parameter to IAS, triggering App-2-App token scoping and adding the `ias_apis` claim.

**3. IAS App-2-App supports two authentication types:**
- **OAuth2ClientCredentials**: For technical user scenarios (no user context)
- **OAuth2JWTBearer**: For user propagation (requires user token from authorization_code flow)

Both support `tokenService.body.resource` for IAS App-2-App scoping.

**4. MTA descriptor** - bind the IAS and Destination services:

```yaml
modules:
  - name: xtravels-srv
    requires:
      - name: xtravels-ias
      - name: xtravels-destination

resources:
  - name: xtravels-ias
    type: org.cloudfoundry.managed-service
    parameters:
      service: identity
      service-plan: application
      config:
        display-name: xtravels
        oauth2-configuration:
          token-policy:
            access-token-format: jwt

  - name: xtravels-destination
    type: org.cloudfoundry.managed-service
    parameters:
      service: destination
      service-plan: lite
```

:::


Finally, deploy and start the application with

::: code-group
```sh [Java]
cd ./xtravels-java
cds up
```

```sh [Node.js]
cd ./xtravels
cds up
```
:::

`xtravels-srv` is not expected to start successfully; instead, you should see error log messages like this:
```sh
Remote HCQL service responded with HTTP status code '401', ...
```

You solve this in the next step, by connecting the consumer and the provider application.

::: details Technically, the App-2-App flow takes the token from the request and triggers...
... an IAS token exchange for the target [IAS dependency](#connect). In Java, CAP's remote service handles this automatically. In Node.js, the BTP Destination with `tokenService.body.resource` triggers the token exchange via the Destination Service.
As the IAS dependency is not created yet, IAS rejects the token exchange request and the call to the provider fails with `401` (not authenticated).

Note that property `oauth2-configuration.token-policy.access-token-format: jwt` is set in the identity instance to ensure the exchanged token has JWT format.

:::

#### 3. Connect consumer with provider { #connect }

Now create the missing IAS dependency to establish trust for the API service call targeting the provided API with ID `data-consumer`.

Open the Administrative Console for the IAS tenant, check prerequisites [in Authentication](./authentication#ias-admin):

1. Select **Applications & Resources** > **Applications**. Choose the IAS application of the `xtravels` consumer from the list.
2. In **Application APIs** select **Dependencies** and click on **Add**.
3. Type `data-consumer` as dependency name and pick provided API `data-consumer` from the provider IAS application `xflights`.

    >The dependency name needs to match property value `ias-dependency-name` in Java, or the name suffix in the `tokenService.body.resource` URN for Node.js, for example, `urn:sap:identity:application:provider:name:<dependency-name>` where `data-consumer` is the dependency name.
4. Confirm with **Save**

::: details Create IAS dependency in Administrative Console

![Manage IAS dependencies in Administrative Console](assets/ias-dependencies.png) {width="500px" }

![Create a new IAS dependency in Administrative Console](assets/add-api.png) {width="500px" }

:::

<div id="tipucl" />


Now restart the consumer application:

```sh
cf restart xtravels-srv
```

This triggers a successful startup with valid flight data retrieved from the provider.

You can now test the valid setup of the xtravels application by accessing the UI and logging in with an authorized test user of the IAS tenant.
To do so, assign a proper AMS policy (for example, `admin`) to the test user as described [earlier](./cap-users#ams-deployment).


<div id="btp-reuse-service" />


## Pitfalls

- **Don't write custom integration logic** for consumed services.
Leverage CAP's remote service architecture instead to ensure a seamless integration experience.

- **Don't implement connectivity layer code** (for example, to fetch or exchange tokens).
Instead, rely on the shared connectivity component, which ensures centralized and generic processing of outbound requests.

- **Don't treat co-located services as external services**.
This introduces unnecessary communication overhead and increases total cost of ownership.


