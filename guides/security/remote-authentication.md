---
# layout: cookbook
label: Outbound Authentication
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


# Outbound Authentication { #remote-authentication }


This guide explains how to authenticate remote services.

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

CAP supports out-of-the-box consumption of various types of [remote services]( #remote-services):

* [Co-located services](#co-located-services) as part of the same deployment and bound to the same identity instance (that is, belong to the same trusted [application zone](./overview#application-zone)).
* [External services](#app-to-app) that can be running on non-BTP platforms.
* [BTP reuse services](#ias-reuse) consumed via service binding. <!-- INTERNAL -->


## Co-located Services {#co-located-services}

Co-located services do not run in the same microservice, but are typically part of the same deployment unit and hence reside within the same trust boundary of the [application zone](./overview#application-zone).
Logically, such co-located services contribute to the application equally and could run as integrated services in the same microservice, but for technical reasons (for example, different runtime or scaling requirements) they are separated physically, often as a result of a [late-cut microservice approach](../deploy/microservices#late-cut-microservices).

Technically, **they share the same identity instance, which allows direct token forwarding**:

![Co-located services](./assets/co-located-services.drawio.svg){width="450px" }

[Learn more about how to configure co-located services in CAP Java](/java/cqn-services/remote-services#binding-to-a-service-with-shared-identity) {.learn-more}
[Learn more about how to configure remote services in CAP Node.js](/node.js/remote-services) {.learn-more}

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

As client, `xtravels-srv` first needs a valid configuration for the remote service `sap.capire.flights.data`:

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

:::

::: details Node.js configuration explained

The `kind` property activates the protocol for exchanging business data (same as `type` in Java).
The key in `cds.requires` must match the fully qualified CDS service name (e.g., `sap.capire.flights.data`), which is the same name used in `cds.connect.to()`.
The `credentials.url` provides the full endpoint URL including the service path `/hcql/data`.
The `forwardAuthToken: true` enables direct forwarding of the incoming JWT token to the provider service - this is suitable for co-located services that share the same identity instance, as the token is already valid for the provider.

:::

::: tip
On behalf of `systemUser` (Java) works both in pure single tenant and in pure multitenant scenarios.
If you are consuming a single tenant service from within a multitenant application choose on behalf of `systemUserProvider`.
:::

Now you are ready to deploy the application with

::: code-group
```sh [Java]
cd ./xtravels_java
cds up
```

```sh [Node.js]
cd ./xtravels
cds up
```
:::

❗Note that CF application `xtravels-srv` will not start successfully as long as `xflights` is not deployed yet (step 3).

::: tip
For production deployment, it is recommended to combine both services with the shared identity instance in a [single MTA descriptor](../deploy/microservices#all-in-one-deployment).
:::


#### 3. Prepare and deploy the provider application { #co-located-provider }

As server, `xflights-srv` needs to restrict service `sap.capire.flights.data` to the technical client calling from of the same application.
This can be done by adding pseudo-role [`internal-user`](./cap-users#pseudo-roles) to the service:

::: code-group
```cds [/srv/authorization.cds]
using { sap.capire.flights.data as data } from './data-service';

annotate data with @(requires: 'internal-user');
```
:::

::: tip
For different [user propagation](./cap-users#remote-services) modes the remote service can be configured appropriately.
The provider service authorization needs to align with the configured user propagation.
:::

Additionally, to establish the co-located setup, the microservice needs to share the same identity instance.
This is configured in the MTA deployment descriptor (applies to both Java and Node.js):

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
cd ./xflights_java
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

You can test the valid setup of the xtravels application by accessing the UI and logging in with an authorized test user of the IAS tenant.
To do so, assign a proper AMS policy (for example, `admin`) to the test user as described [earlier](./cap-users#ams-deployment).


::: tip
The very same setup could be deployed for XSUAA-based services.
:::


## External Services

In contrast to [co-located services](#co-located-services), external services do not have strong dependencies as they have a fully decoupled lifecycle and are provided by different owners.
As a consequence, external services can run cross-regionally; even non-BTP systems might be involved.
A prerequisite for external service calls is a trust federation between the consumer and the provider system.

A seamless integration experience for external service communication is provided by [IAS App-2-App](#app-to-app) flows, which are offered by CAP via remote services.
[BTP HTTP Destinations](../services/consuming-services#using-destinations) offer [various authentication strategies](https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/http-destinations) such as SAML 2.0 as required by many S/4 system endpoints. CAP Java handles IAS token exchange natively, while CAP Node.js requires a custom handler using SAP Cloud SDK v4's `createDestinationFromIasService` API.


### IAS App-2-App { #app-to-app }

As a first-class citizen, [IAS](./authentication#ias-auth) is positioned to simplify cross-regional requests with user propagation.
Prerequisites are identity instances on both consumer and provider sides, plus a registered IAS dependency in the consumer instance.

![External services](./assets/external-services.drawio.svg){width="500px" }

CAP supports communication between arbitrary IAS endpoints and remains transparent for applications as it builds on the same architectural pattern of [remote services](#remote-services).
Technically, the connectivity component uses [IAS App-2-App flows](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/consume-apis-from-other-applications) in this scenario that requires a token exchange from a consumer token into a token for the provider.
The latter is issued by IAS only if the consumer is configured with a valid IAS dependency pointing to the provider accordingly.

:::tip
CAP offers a simplified App-2-App setup by leveraging remote services that require:
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

The entry with name `data-consumer` represents the consumption of service `sap.capire.flights.data` and is exposed as IAS API.
The description helps administrators to configure the consumer application with the proper provider API if done on UI level.

[Detailed description about identity instance parameters for `provided-apis`](https://github.wdf.sap.corp/pages/CPSecurity/sci-dev-guide/docs/BTP/identity-broker#service-instance-parameters){.learn-more}

How can proper authorization be configured for _technical clients without user propagation_?
OAuth tokens presented by valid consumer requests from an App-2-App flow will have API claim `data-consumer`, which is automatically mapped to a CAP role by the runtime.
Therefore, you can protect the corresponding CDS service by CAP role `data-consumer` to authorize requests thoroughly:

::: code-group
```cds [/srv/authorization.cds]
using { sap.capire.flights.data as data } from './data-service';

annotate data with @(requires: 'data-consumer');
```
:::

Finally, deploy and start the application with

::: code-group
```sh [Java]
cd ./xflights_java
cds up
```

```sh [Node.js]
cd ./xflights
cds up
```
:::


::: tip API as CAP role
The API identifiers exposed by the IAS instance in list `provided-apis` are granted as CAP roles after successful authentication and can be used in @requires annotations.
:::

::: warning Use different roles for technical and business users
Use different CAP roles for technical clients without user propagation and for named business users.

Instead of using the same role, expose dedicated CDS services to technical clients that are not accessible to business users and vice versa.
:::

#### 2. Prepare and deploy the consumer application { #consumer }

Like with xflights, clone the sample application ([`xtravels-java`](https://github.com/capire/xtravels-java/tree/main) or [`xtravels`](https://github.com/capire/xtravels/tree/main) for Node.js), or if already cloned and modified locally, reset to remote branch.

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
            "iasOptions": {
              "targetUrl": "https://<xflights-srv url>",
              "resource": "data-consumer"
            }
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

::: details Node.js configuration explained

CAP Node.js does not yet have native support for IAS App-2-App token exchange. A custom handler is required that uses SAP Cloud SDK v4's `createDestinationFromIasService` API.

**1. Configuration** - The `iasOptions` in `credentials` is a custom configuration (not natively supported by CAP) that the custom handler reads:
- `path`: The HCQL endpoint path on the provider
- `iasOptions.targetUrl`: Full URL of the provider application
- `iasOptions.resource`: The IAS dependency name (must match the `@requires` annotation on the provider and the IAS dependency configured in step 3)

**2. MTA descriptor** - bind the IAS service:

```yaml
modules:
  - name: xtravels-srv
    requires:
      - name: xtravels-ias

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
```

**3. SAP Cloud SDK dependencies** - required for IAS token exchange:

```sh
npm add @sap-cloud-sdk/http-client @sap-cloud-sdk/connectivity
```

**4. Custom handler** - implement IAS App-2-App in your service (e.g., `srv/travel-service.js`):

```javascript
const cds = require('@sap/cds')

class TravelService extends cds.ApplicationService {
  async init() {
    const xflights = await cds.connect.to('sap.capire.flights.data')
    const { Flights, Supplements } = this.entities

    // Check if IAS App2App is configured
    if (cds.env.requires?.['sap.capire.flights.data']?.credentials?.iasOptions) {
      this.on('READ', Flights, req => this._iasApp2AppRequest(req))
      this.on('READ', Supplements, req => this._iasApp2AppRequest(req))
    } else {
      // Local/mock mode - delegate to remote service directly
      this.on('READ', Flights, req => xflights.run(req.query))
      this.on('READ', Supplements, req => xflights.run(req.query))
    }
    return super.init()
  }

  /**
   * Execute request using Cloud SDK v4 IAS App2App authentication.
   * Supports both technical user (OAuth2ClientCredentials) and
   * user propagation (OAuth2JWTBearer) flows.
   */
  async _iasApp2AppRequest(req) {
    const { executeHttpRequest } = require('@sap-cloud-sdk/http-client')
    const { createDestinationFromIasService, decodeJwt } = require('@sap-cloud-sdk/connectivity')

    const iasConfig = cds.env.requires['sap.capire.flights.data'].credentials.iasOptions
    const path = cds.env.requires['sap.capire.flights.data'].credentials.path || ''

    // Get JWT token from request
    const jwt = req.user?.token?.jwt ||
                req.headers?.authorization?.split(/^bearer /i)[1] ||
                req._.req?.headers?.authorization?.split(/^bearer /i)[1]

    try {
      // Detect if token is user token or technical token
      const decoded = jwt ? decodeJwt(jwt) : null
      const isUserToken = decoded && (decoded.email || decoded.user_uuid || decoded.sub !== decoded.azp)

      let iasOptions
      if (isUserToken) {
        // User propagation - exchange user token for IAS App2App token
        iasOptions = {
          targetUrl: iasConfig.targetUrl,
          resource: { name: iasConfig.resource },
          authenticationType: 'OAuth2JWTBearer',
          assertion: jwt
        }
      } else {
        // Technical user - use client credentials
        iasOptions = {
          targetUrl: iasConfig.targetUrl,
          resource: { name: iasConfig.resource },
          authenticationType: 'OAuth2ClientCredentials'
        }
      }

      // Create destination with IAS token
      // 'identity' resolves IAS binding from VCAP_SERVICES
      const destination = await createDestinationFromIasService('identity', iasOptions)

      // Transform query to use remote entity names
      const query = JSON.parse(JSON.stringify(req.query))
      if (query.SELECT?.from?.ref) {
        const localName = query.SELECT.from.ref[0]
        // Map local entity names to remote service entity names
        if (localName === 'TravelService.Flights')
          query.SELECT.from.ref[0] = 'sap.capire.flights.data.Flights'
        if (localName === 'TravelService.Supplements')
          query.SELECT.from.ref[0] = 'sap.capire.flights.data.Supplements'
      }

      // Execute HCQL request (no CSRF token needed)
      const response = await executeHttpRequest(destination, {
        method: 'POST',
        url: path,
        headers: { 'content-type': 'application/json', 'accept': 'application/json' },
        data: query
      }, { fetchCsrfToken: false })

      return response.data
    } catch (error) {
      console.error('IAS App2App request failed:', error.message)
      throw error
    }
  }
}

module.exports = { TravelService }
```

See [Node.js: Custom Handler for IAS App-2-App](#nodejs-ias-handler) for a detailed explanation.

:::

Finally, deploy and start the application with

::: code-group
```sh [Java]
cd ./xtravels_java
cds up
```

```sh [Node.js]
cd ./xtravels
cds up
```
:::

`xtravels-srv` is not expected to start successfully; instead, you should see error log messages like this:
```yaml
Remote HCQL service responded with HTTP status code '401', ...
```

Technically, the remote service implementation initiates an App-2-App flow, taking the token from the request and triggering an IAS token exchange for the target [IAS dependency](#connect).
As the IAS dependency is not created yet, IAS rejects the token exchange request and the call to the provider fails with `401` (not authenticated).

Note that property `oauth2-configuration.token-policy.access-token-format: jwt` is set in the identity instance to ensure the exchanged token has JWT format.

#### 3. Connect consumer with provider { #connect }

Now create the missing IAS dependency to establish trust for the API service call targeting the provided API with id `data-consumer`.

Open the Administrative Console for the IAS tenant (see prerequisites [here](./authentication#ias-admin)):

1. Select **Applications & Resources** > **Applications**. Choose the IAS application of the `xtravels` consumer from the list.
2. In **Application APIs** select **Dependencies** and click on **Add**.
3. Type `data-consumer` as dependency name (needs to match property value `ias-dependency-name` in Java, or `iasOptions.resource` in Node.js) and pick provided API `data-consumer` from the provider IAS application `xflights`.
4. Confirm with **Save**

::: details Create IAS dependency in Administrative Console

![Manage IAS dependencies in Administrative Console](assets/ias-dependencies.png) {width="500px" }

![Create a new IAS dependency in Administrative Console](assets/add-api.png) {width="500px" }

:::

<div id="tipucl" />


Now restart the consumer application with

```sh
cf restart xtravels-srv
```

to trigger a successful startup with valid flight data retrieved from the provider.

You can now test the valid setup of the xtravels application by accessing the UI and logging in with an authorized test user of the IAS tenant.
To do so, assign a proper AMS policy (e.g., `admin`) to the test user as described [earlier](./cap-users#ams-deployment).


<div id="btp-reuse-service" />


## Node.js: Custom Handler for IAS App-2-App { #nodejs-ias-handler }

CAP Node.js does not yet natively support IAS App-2-App token exchange in its remote service configuration. While CAP Java can handle IAS App-2-App with a simple `ias-dependency-name` property, Node.js requires a custom handler that directly uses SAP Cloud SDK v4.

### Why a Custom Handler?

CAP's remote service `credentials` configuration supports:

```json
"credentials": {
  "destination": "name",        // BTP Destination - requires XSUAA
  "url": "https://...",         // Direct URL - no auth or forwardAuthToken
  "destinationOptions": {...}   // Cloud SDK options - but no iasOptions
}
```

**What's missing:** There's no `iasOptions` support to configure IAS-specific parameters like `targetUrl`, `resource`, and `authenticationType`. CAP's internal HTTP client doesn't call Cloud SDK's `createDestinationFromIasService` API.

### Cloud SDK v4 API

The custom handler uses these Cloud SDK v4 APIs:

```typescript
import { createDestinationFromIasService } from '@sap-cloud-sdk/connectivity'
import { executeHttpRequest } from '@sap-cloud-sdk/http-client'

// Create destination with IAS token exchange
const destination = await createDestinationFromIasService(
  'identity',  // Resolves IAS binding from VCAP_SERVICES
  {
    targetUrl: 'https://provider-app.cfapps.eu10.hana.ondemand.com',
    resource: { name: 'data-consumer' },  // IAS dependency name
    authenticationType: 'OAuth2ClientCredentials' | 'OAuth2JWTBearer',
    assertion: jwt  // Required only for OAuth2JWTBearer
  }
)

// Execute request with the IAS-authenticated destination
const response = await executeHttpRequest(destination, requestConfig, { fetchCsrfToken: false })
```

### Authentication Types

| Type | Use Case | Token Claim |
|------|----------|-------------|
| `OAuth2ClientCredentials` | Technical user (no user context) | `ias_apis: ["data-consumer"]` |
| `OAuth2JWTBearer` | User propagation (exchange user token) | `ias_apis: ["data-consumer"]` + user identity |

The custom handler detects the token type automatically:
- **User token**: Has `email`, `user_uuid`, or `sub !== azp` → uses `OAuth2JWTBearer`
- **Technical token**: Client credentials token → uses `OAuth2ClientCredentials`

### Key Implementation Details

1. **Entity name mapping**: Local entity names (e.g., `TravelService.Flights`) must be mapped to remote service entity names (e.g., `sap.capire.flights.data.Flights`)

2. **CSRF tokens**: HCQL protocol doesn't require CSRF tokens. Pass `{ fetchCsrfToken: false }` to avoid Cloud SDK sending a HEAD request that crashes CAP's HCQL adapter.

3. **CQN query format**: Send the CQN query directly as the request body (not stringified or wrapped).

[Learn more about SAP Cloud SDK IAS connectivity](https://sap.github.io/cloud-sdk/docs/js/features/connectivity/identity-authentication-service){.learn-more}


## Pitfalls

- **Don't write custom integration logic** for consumed services.
Leverage CAP's remote service architecture instead to ensure a seamless integration experience.

- **Don't implement connectivity layer code** (for example, to fetch or exchange tokens).
Instead, rely on the shared connectivity component, which ensures centralized and generic processing of outbound requests.

- **Don't treat co-located services as external services**.
This introduces unnecessary communication overhead and increases total cost of ownership.


