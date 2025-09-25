---
# layout: cookbook
label: Authentication
synopsis: >
  This guide explains how to authenticate CAP services and how to work with users.
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


# Authentication

In essence, [inbound authentication](#inbound-authentication) verifies the user's identity and validates the presented claims, such as granted roles and tenant membership. 
Briefly, **authentication ensures _who_ is going to use the service**, in contrast to [authorization](../security/authorization#authorization) which determines _how_ the user can interact with the application's resources based on the defined access rules. 
As access control relies on verified claims, authentication is a mandatory prerequisite for authorization.

CAP applications making use of remote services of any type need to have a proper [outbound authentication](#outbound-authentication) in place as well.


[[toc]]


## Inbound Authentication { #inbound-authentication }

According to key concept [Pluggable Building Blocks](key-concept-pluggable), the authentication method can be configured freely. 
CAP [leverages platform services](#key-concept-platform-services) to provide proper authentication strategies to cover all relevant scenarios:

- For _local development_ and _unit testing_, [Mock User Authentication](#mock-user-auth) is an appropriate built-in authentication feature.

- For _cloud deployments_, in particular deployments for production, CAP provides integration of several identity services:  
  - [Identity Authentication Service (IAS)](#ias-auth) provides a full-fleged [OpenId Connect](https://openid.net/connect/) compliant, cross-landscape identity management as first choice for applications. 
  - [XS User and Authentication and Authorization Service (XSUAA)](https://help.sap.com/docs/CP_AUTHORIZ_TRUST_MNG) is an [OAuth 2.0](https://oauth.net/2/)-based authorization server to support existing applications and services in the scope of individual BTP landscapes.

::: tip
CAP applications can run IAS and XSUAA in hybrid mode to support a smooth migration from XSUAA to IAS.
:::


### Mock User Authentication { #mock-user-auth }

In none-production profile, by default, CAP creates a security configuration which accepts _mock users_.
As this authentication strategy is a built-in feature which does not require any platform service, it is perfect for **unit testing and local development scenarios**.

Setup a simple sample application:

<div class="impl java">

```sh
cds init bookshop --java --add sample && cd ./bookshop
mvn spring-boot:run
```

::: warning
CAP Java requires (transitive) dependency to `spring-boot-starter-security` to add middleware for authentication. 
Platform starter bundles `cds-starter-cf` and `cds-starter-k8s` ensure all required dependencies out of the box.
:::

</div>


<div class="impl node">

```sh
cds init bookshop --add sample && cd ./bookshop
cds watch
```

</div>

In the application startup trace you can find a log message indicating mock user configuration is active:

<div class="impl java">

```sh
MockUsersSecurityConfig  : *  Security configuration based on mock users found in active profile.  *
```

</div>

<div class="impl node">
TODO
</div>

Also notice the log output prints all recognized mock users such as

<div class="impl java">

```sh
MockUsersSecurityConfig  :  Added mock user {"name":"admin","password":"admin", ...}
```

</div>

<div class="impl node">
TODO
</div>

The CAP runtime will automatically authenticate all CAP endpoints - **you are not required to manually configure authentication for CAP endpoints!**

Sending OData request `curl http://localhost:8080/odata/v4/CatalogService/Books --verbose`
results in a `401` error response from the server indicating that the anonymous user has been rejected due to missing authentication.
This is true for all endpoints including the web application page at `/index.htlm`.

Mock users require **basic authentication**, hence sending the same request on behalf of mock user `admin` (password: `admin`) with curl `http://admin:admin@localhost:8080/odata/v4/CatalogService/Books` returns successfully (`200`).


::: tip
Mock users are deactivated in production profile by default ❗
:::

[Learn more about authentication options in CAP Java](../java/security#spring-boot){.learn-more}
[Learn more about authentication options in CAP Node.js](../node.js/authentication#strategies){.learn-more}



#### Preconfigured Mock Users { #preconfigured-mock-users }

For convenience, the runtime creates default mock users reflecting typical types of users suitable for test combinations, e.g. privileged users passing all security checks or restricted users which just pass authentication only.
The predefined users are merged with mock users [defined by the application](#custom-mock-users). 
The effective list of mock users is traced to startup log if mock user configuration is active.

You can opt out the preconfiguration of these users by setting <Config java>`cds.security.mock.defaultUsers = false`</Config>.
{ .java }


[Learn more about predefined mock users in CAP Java](../java/security#preconfigured-mock-users){.learn-more}
[Learn more about predefined mock users in CAP Node.js](../node.js/authentication#mock-users){.learn-more}


#### Customization { #custom-mock-users }

You can define custom mock users to perfectly simulate different types of [end users]((../cap-users#user-representation)) that will interact with your application at production time.
Hence, you can use the mock users to test authorization rules and custom handlers transparently from the actual context.

<div class="impl java">

::: details How to add custom mock user named `viewer-user` in local Spring profile
```yaml [srv/src/main/resources/application.yaml]
spring:
  config.activate.on-profile: default
cds:
  security:
    mock:
      users:
        # [... other users ...]
        viewer-user:
          password: pass
          tenant: CrazyCars
          roles:
            - Viewer
          attributes:
            Country: [GER, FR]
          features:
            - cruise
            - park
          additional:
            email: myviewer@crazycars.com
```
:::

</div>

<div class="impl node">

::: details How to add a custom mock user named `viewer-user` in the configuration file for local testing:
```yaml [package.json]
"cds": {
  "requires": {
    "auth": {
      "kind": "mocked",
      "users": {
        "viewer-user": {
          "password": "pass",
          "tenant": "CrazyCars",
          "roles": ["Viewer"],
          "attr": { ... }
        }
      },
      "tenants": {
        "name" : "CrazyCars",
        "features": [ "cruise", "park" ]
      }
    }
  }
}
```
:::

</div>

In the mock user configuration you are free to specify:
- name (mandatory)
- credentials
- tenant
- CAP roles
- CAP attributes
- additional attributes
- pseudo roles
- [feature toggles](../guides/extensibility/feature-toggles#feature-toggles)
which influence processing of the request including authorization step.

To verify the properties in a user request with a dedicated mock user, activate [user tracing](../cap-users#user-tracing) and send the same request on behalf of `viewer-user`.
In the application log you should find information about the resolved user after successful authentication:

<div class="impl java">

```sh
MockedUserInfoProvider: Resolved MockedUserInfo [id='mock/viewer-user', name='viewer-user', roles='[Viewer]', attributes='{Country=[GER, FR], tenant=[CrazyCars]}'
```

</div>

<div class="impl node">

TODO

</div>

[Learn more about custom mock users in CAP Java](../java/security#explicitly-defined-mock-users){.learn-more}
[Learn more about custom mock users in CAP Node.js](../node.js/authentication#mocked){.learn-more}


#### Automated Testing { #mock-user-testing }

Mock users provide an ideal foundation for automated **unit tests, which are essential for ensuring application security**.
The flexibility in defining various kinds of mock users and the seamless integration into testing code significantly lowers the burden to cover all relevant test combinations.

<div class="impl java">

::: details How to useleverage @WithMockUser in Spring-MVC to use CAP mock users
```java [srv/src/test/java/customer/bookshop/handlers/CatalogServiceTest.java]
@RunWith(SpringRunner.class)
@SpringBootTest
@AutoConfigureMockMvc
public class BookServiceOrdersTest {

  String BOOKS_URL = "/odata/v4/CatalogService/Books";

  @Autowired
  private MockMvc mockMvc;

  @Test
  @WithMockUser(username = "viewer-user", password = "pass")
  public void testViewer() throws Exception {
    mockMvc.perform(get(BOOKS_URL)).andExpect(status().isOk());
  }
  @Test
  public void testUnauthorized() throws Exception {
    mockMvc.perform(get(BOOKS_URL)).andExpect(status().isUnauthorized());
  }
}
```
:::


</div>

<div class="impl node">
TODO
await GET('/CatalogService/Books', { auth: { username: 'viewer-user', password: 'pass' } })
</div>


[Learn more about testing in CAP Java](../java/developing-applications/testing#testing-cap-java-applications){.learn-more}
[Learn more about testing in CAP Node.js](../node.js/cds-test#testing-with-cds-test){.learn-more}


### IAS Authentication { #ias-auth }

[SAP Identity Authentication Service (IAS)](https://help.sap.com/docs/cloud-identity-services) is the preferred platform service for identity management which provides
 - best of breed authentication mechanisms (single sign-on, multi-factor enforcement)
 - federation of corporate identity providers (multiple user stores)
 - cross-landscape user propagation (including on-premise)
 - streamlined SAP and non-SAP system [integration](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/integrating-service) (due to [OpenId Connect](https://openid.net/connect/) compliance)

IAS authentication is at best configured and tested in the Cloud, hence we're going to enhance the sample with a deyloyment descriptor for SAP BTP, Cloud Foundry Runtime (CF).


#### Get Ready with IAS

Before working with IAS on CF, you need to

- have an IAS (test) tenant. If not available yet, you need to [create](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/get-your-tenant) it now.

- [establish trust](https://help.sap.com/docs/btp/sap-business-technology-platform/establish-trust-and-federation-between-uaa-and-identity-authentication)
towards your IAS tenant to use it as identity provider for applications in your subaccount.

- ensure your development environment is [prepared for deploying](https://pages.github.tools.sap/cap/docs/guides/deployment/to-cf#prerequisites) on CF, 
in particular you require a `cf` CLI-session targeting to a CF space in the test subaccount (test with `cf target`).

In the project's root folder execute

```sh
cds add mta
```

to make your application ready for deployment to CF, initially.

::: tip
Command `add mta` will enhance the project with `cds-starter-cloudfoundry` and hence adds all dependencies required for security transitively.
:::

#### Adding IAS

Now the application is ready to for adding IAS-support by executing

```sh
cds add ias
```

which automatically adds a service instance named `bookshop-srv` of type `identity` (plan: `application`) and binds the CAP application to it.

::: details Generated deployment descriptor for IAS instance and binding
```yaml [mta.yaml]
modules:
  - name: bookshop-srv
    # [...]
    requires:
      - name: bookshop-auth
        parameters:
          config:
            credential-type: X509_GENERATED
            app-identifier: srv

resources:
  - name: bookshop-auth
    type: org.cloudfoundry.managed-service
    parameters:
      service: identity
      service-name: bookshop-auth
      service-plan: application
      config:
        display-name: bookshop
```
:::

Whereas the service instance represents the IAS application itself, the binding provides access to the identity services on behalf of a unique client (multiple bindings are allowed). 
CAP applications can have at most one binding to an IAS instance.

Following properties apply:

| Property          | Artifact            | Description         |
|-------------------|:-------------------:|:---------------------:|
| `name` |  instance   | Name for the IAS application - unique in the tenant  |
| `display-name` |  instance   | Human-readable name for the IAS application as it appears in the Console UI for IAS admins |
| `multi-tenant` |  instance   | Specifies application mode: `false` for single tenant (default), `true` for multiple subscriber tenants (SAAS)  |
| `credential-type` |  binding   | `X509_GENERATED` generates a private-key and a signed certificate which is added to IAS application       |
| `app-identifier` |  binding   | Ensures stable subject in generated certificate (required for credential rotation)  |


[Lean more about IAS service instance and binding creation options](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/reference-information-for-identity-service-of-sap-btp){.learn-more}
<div id="learn-more-IAS-instances-bindings" />


Now let's pack and deploy the application with
```sh
cds up
```

and wait until the application is up and running which you can test with `cf apps` or in BTP Cockpit, alternatively.

In the [Administrative Console for Cloud Identity Services](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/accessing-administration-console?version=Cloud) 
you should now also see the deployed IAS application in `Applications & Ressources` -> `Applications`, section `Bundled Applications` (display name `bookshop`, subtitle is the guid of the service instance as listed in `cf service bookshop-auth`).
In the Console you can manage the IAS application and, for instance, configure the authentication strategy.

::: tip
In BTP Cockpit, service instance `bookshop-auth` appears as a link that allows direct navigation to the IAS application in the Administrative Console for IAS.
:::


The following trace in the application log confirms the activated IAS authentication:
<div class="java">

```sh
... : Loaded feature 'IdentityUserInfoProvider' (IAS: bookshop-auth, XSUAA: <none>)
```

</div>

At startup, the CAP runtime checks the available bindings and activates IAS authentication accordingly. 
**Hence, the local setup without IAS binding is still working**.


::: tip
IAS enforces mTLS, so you need platform-level TLS termination, which is provided von CF via `cert.*` domains. 
The validated certificate is forwarded via HTTP header `X-Forwarded-Client-Cert` to the CAP endpoint.
:::

::: details Application routes with `cert.*`-domain
```yaml
modules:
  - name: bookshop-srv
    type: java
    path: srv
    parameters:
      routes:
        - route: "${default-url}"
        - route: "${default-host}.cert.${default-domain}"
```      
:::  

::: warning
On SAP BTP Kyma Runtime, you might require to adapt configuration parameter <Config java>`cds.security.authentication.clientCertificateHeader`</Config> according to the component of your choice terminating TLS.
:::


#### Testing IAS on CLI Level

Due to the autoconfiguration in CAP, all CAP endpoints should be authenticated and expect valid ID tokens generated for the IAS application.
Sending the test request 
```sh
curl https://<org>-<space>-bookshop-srv.<landscape-domain>/odata/v4/CatalogService/Books --verbose
```

as anonymous user without a token results in a `401 Unauthorized` as expected.

Now we want to fetch a token to prepare a fully authenticated test request. 
As first step we add a new client for the IAS application by creating an appropriate service key:

```sh
cf create-service-key bookshop-auth bookshop-auth-key \ 
   -c '{"credential-type": "X509_GENERATED"}'
```

The overall setup with local CLI client and the Cloud services is scetched in the diagram:

![CLI-level Testing of IAS Endpoints](./assets/ias-cli-setup.svg){width="400px"}

As IAS requires mTLS-protected channels, **client certificates are mandatory** when we follow a two-step approach:
1. Send a token request to IAS in order to fetch a valid IAS token.
2. Send a business request to the CAP application presenting the token.

The client certificates are presented in the IAS binding and hence can be examined via a service key accordingly.

::: details How to create and retrieve service key credentials

```sh
cf service-key bookshop-auth bookshop-auth-key
```

```sh
{
  "credentials": {
      [...]
    "certificate": "-----BEGIN CERTIFICATE----- [...] -----END CERTIFICATE-----",
    "clientid": "2a92c297-8603-4157-9aa9-ca7585821979",
    "credential-type": "X509_GENERATED",
    "key": "-----BEGIN RSA PRIVATE KEY----- [...] -----END RSA PRIVATE KEY-----",
    "url": "https://avpxtt84j.accounts400.ondemand.com",
    [...]
  }
}
```

:::

::: warning
❗ Never share service key credentials or tokens ❗
:::

From the credentials, you can prepare local files containing the certificate used to initiate the HTTP request. 

::: details How to prepare client X.509 certificate files

Copy the public X.509-certificate in property `certifiacte` into a file `cert-raw.pem` and `key` into a file `key-raw.pem`, accordingly.
Both files need to be post-processed to transform the single-line represnatation into a standard multi-line representation:

```sh
awk '{gsub(/\\n/,"\n")}1' <file-raw>.pem > <file>.pem
```
Finally, ensure correct format of both files with
```sh
openssl x509 -in <file>.pem -text -noout
```
All the steps can be executed in a single script as shown in the [example](./assets/fetch-ias-certs.sh).
:::

The fetch a token - either as technical or as named user - the request needs to provide the **client certificate** being send to `/oauth2/token` endpoint of IAS service with URI given in `url` property of the binding:

::: code-group

```sh [Token for technical user]
curl --cert cert.pem --key key.pem \
  -d "grant_type=client_credentials"\
  -d "client_id"=<clientid>" \
  https://<url>/oauth2/token
```

```sh [Token for named user]
curl --cert cert.pem --key key.pem \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=<clientid>" \
  -d "username=<user>" \
  -d "password=<URL-encoded pwd>" \
  -X POST https://<url>/oauth2/token
```

:::


The request returns with a valid IAS token which is suitable for authentication in the CAP application:
```sh
{"access_token":"[...]","token_type":"Bearer","expires_in":3600}
```

The final test request needs to provide the **client certificate and the token** being send to the application's route with `cert.*`-domain:

```sh
curl --cert cert.pem --key key.pem -H "Authorization: Bearer <access_token>" \
  https://<org>-<space>-bookshop-srv.cert.<landscape-domain>/odata/v4/CatalogService/Books
```

Don't forget to delete the service key after your tests:
```sh
cf delete-service-key bookshop-auth bookshop-auth-key
```


#### Testing IAS on UI Level

In the UI scenario, adding an AppRouter as an ingress proxy for authentication simplifies testing a lot because the technical requests for fetching the IAS token are done under the hood.

By executing

```sh
cds add approuter
```

the deployment is enhanced by the additional AppRouter component which is already configured for IAS usage.
The setup is scetched in the diagram:

![UI-level Testing of IAS Endpoints](./assets/ias-ui-setup.svg){width="500px"}

To be able to fetch the token, the AppRouter needs a binding to the IAS instance as well.
In addition, property `forwardAuthCertificates` needs to be `true` for the mTLS connection with the service backend located at the route with the cert-domain.

::: details AppRouter component with IAS binding
```yaml
  - name: bookshop
    [...]
    requires:
      - name: srv-api
        group: destinations
        properties:
          name: srv-api
          url: ~{srv-cert-url}
          forwardAuthToken: true
          forwardAuthCertificates: true
      - name: bookshop-auth
        parameters:
          config:
            credential-type: X509_GENERATED
            app-identifier: approuter
```
:::

Also note that IAS needs to know valid redirect URIs for the login and logout flow, respectively.
Both are served by the AppRouter out-of-the-box.

::: details Redirect URIs for login and logout
```yaml
  - name: bookshop-auth
    [...]
    parameters:
      [...]
      config:
        [...]
        oauth2-configuration:
          redirect-uris:
            - ~{app-api/app-protocol}://~{app-api/app-uri}/login/callback
          post-logout-redirect-uris:
            - ~{app-api/app-protocol}://~{app-api/app-uri}/*/logout.html            
```
:::


Troubleshooting:

c.s.c.s.t.validation.ValidationResults : Token signature can not be validated because JWKS could not be fetched: Proof token was not found



### XSUAA Authentication { #xsuaa-auth }
  - setup cds add xsuaa
  

### Custom Authentication { #custom-auth }
  - Service mesh 
  - DWC Integration (internal)
  - pointer to hooks and properties



## Outbound Authentication { #outbound-authentication }

### Local Services

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

### Application-Internal Services
- internal-user (IAS + XSUAA)

### BTP Reuse Services
- IAS 
- XSUAA

### External Services
- IAS App-2-App
- Via Destination (S/4)


## Critical Pitfalls
- Endpoints of (CAP) applications deployed on SAP BTP are, by default, accessible from the public network. 
  This means that unless additional security measures are implemented, external clients can potentially reach these endpoints directly. 
  It is important to note that the AppRouter component does not function as a comprehensive envoy proxy that routes and secures all incoming traffic. 
  Instead, AppRouter only handles requests for specific routes or applications it is configured for, leaving other endpoints exposed if not explicitly protected. 
  **Therefore, it is crucial to configure appropriate authentication and authorization mechanisms to safeguard all endpoints and prevent unauthorized access from the public internet**.

- Clients might have tokens (authenticated-user -> pretty open for all kinds of users!!)

- Don't mix business roles vs. technical roles vs. provider roles 

- Don't deviate from security defaults

- Don't miss to add authentication tests

- Don't authenticate manually

- Don't code against concrete user claims (e.g. XSUAAUserInfo)

::: warning
Without security middleware configured, CDS services are exposed to public. 
Basic configuration of an authentication strategy is mandatory to protect your CAP application.
:::