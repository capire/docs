---
# layout: cookbook
label: Authentication
synopsis: >
  This guide explains how to authenticate CAP services.
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


# Authentication { #authentication }

<ImplVariantsHint />

This guide explains how to authenticate CAP services to resolve CAP users.

[[toc]]

## Pluggable Authentication

In essence, authentication verifies the user's identity and validates the presented claims, such as granted roles and tenant membership. 
Briefly, **authentication ensures _who_ is going to use the service** which is technically reflected in a resulting [user](./cap-users).
In contrast, [authorization](../security/authorization#authorization) determines _how_ the user can interact with the application's resources according to the defined access rules. 
As access control relies on verified claims, authentication is a mandatory prerequisite for authorization.

![Authentication with CAP](./assets/authentication.drawio.svg){width="550px" }

According to key concept [Pluggable Building Blocks](./overview#key-concept-pluggable), the authentication method can be configured freely. 
CAP [leverages platform services](overview#key-concept-platform-services) to provide proper authentication strategies to cover all relevant scenarios:

- For _local development_ and _unit testing_, [Mock User Authentication](#mock-user-auth) is an appropriate built-in authentication feature.

- For _cloud deployments_, in particular deployments for production, CAP provides integration of several identity services out of the box:  
  - [Identity Authentication Service (IAS)](#ias-auth) provides a full-fledged [OpenId Connect](https://openid.net/connect/) compliant, cross-landscape identity management as first choice for applications. 
  - [XS User Authentication and Authorization Service (XSUAA)](https://help.sap.com/docs/CP_AUTHORIZ_TRUST_MNG) is an [OAuth 2.0](https://oauth.net/2/)-based authorization server to support existing applications and services in the scope of individual BTP landscapes.
  - CAP applications can run IAS and XSUAA in [hybrid mode](#hybrid-auth) to support a smooth migration from XSUAA to IAS.


## Mock User Authentication { #mock-user-auth }

In non-production profile, by default, CAP creates a security configuration which accepts _mock users_.
As this authentication strategy is a built-in feature which does not require any platform service, it is perfect for **unit testing and local development scenarios**.

Setup and start a simple sample application:

<div class="impl java">

```sh
cds init bookshop --java --add sample && cd ./bookshop
mvn spring-boot:run
```

::: tip
CAP Java requires certain [Maven dependencies](../../java/security#maven-dependencies) to enable authentication middleware support. 
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

```sh
[cds] - using auth strategy {
  kind: 'mocked',
  …
}
```

</div>

<div class="impl java">

Also notice that the application log contains information about all registered mock users:
```sh
MockUsersSecurityConfig  :  Added mock user {"name":"admin","password":"admin", ...}
```

</div>

**You should not manually configure authentication for endpoints.**
As the mock user authentication is active, all (CAP) andpoints are [authenticated automatically](#model-auth). 

<div class="impl java">

::: tip
To simplify the development scenario, you can set <Config java>cds.security.authentication.mode = "model-relaxed"</Config> to deactivate authentication of endpoints derived from unrestricted CDS services.
:::

Sending OData request `curl http://localhost:8080/odata/v4/CatalogService/Books --verbose`
results in a `401` error response from the server indicating that the anonymous user has been rejected due to missing authentication.
This is the case for all endpoints including the web application page at `/index.html`.

Mock users require **basic authentication**, hence sending the same request on behalf of mock user `admin` (password: `admin`) with `curl http://admin:admin@localhost:8080/odata/v4/CatalogService/Books` returns successfully (HTTP response `200`).

</div>

<div class="impl node">

::: info
In non-production profile, endpoints derived from unrestricted CDS services are not authenticated to simplify the development scenario.
:::

Sending OData request

```sh
curl http://localhost:4004/odata/v4/admin/Books --verbose
```

results in a `401` error response from the server indicating that the anonymous user has been rejected due to missing authentication.
This is true for all endpoints including the web application page at `/index.html`.

Mock users require **basic authentication**, hence sending the same request on behalf of mock user `alice` (password: `basic`) with
```sh
curl http://alice:basic@localhost:4004/odata/v4/admin/Books
```
returns successfully (HTTP response `200`).

</div>


::: info
Mock users are deactivated in production profile by default ❗
:::

[Learn more about advanced authentication options](../../java/security#spring-boot){.learn-more .java}
[Learn more about advanced authentication options](../../node.js/authentication#strategies){.learn-more .node}


### Preconfigured Mock Users { #preconfigured-mock-users }

For convenience, the runtime creates default mock users to cover typical test scenarios, e.g. privileged users passing all security checks or users which pass authentication but do not have additional claims.
The predefined users are added to [custom mock users](#custom-mock-users) defined by the application. 

You can opt out the preconfigured mock users by setting <Config java>`cds.security.mock.defaultUsers = false`</Config>. { .java }

[Learn more about predefined mock users](../../java/security#preconfigured-mock-users){.learn-more .java} 
[Learn more about predefined mock users](../../node.js/authentication#mock-users){.learn-more .node}


### Customization { #custom-mock-users }

You can define custom mock users to simulate any type of end users that will interact with your application at production time.
Internally, mock users are represented as [CAP users](cap-users#claims) as well.
Hence, you can use the mock users, to test your authorization settings or custom handlers, fully decoupled from the actual execution environment.

<div class="impl java">

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

</div>

<div class="impl node">

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

</div>

In the mock user configuration you can specify:
- name (mandatory) and tenant
- [CAP roles](cap-users#roles) (including pseudo-roles) and [attributes](authorization#user-attrs) affecting authorization
- additional attributes
- [feature toggles](../extensibility/feature-toggles#feature-toggles)
which influence request processing.

::: tip
Define the mock users in development profile only.
:::

To verify the user properties, activate [user tracing](./cap-users#user-tracing) and send a request using the mock user (such as `viewer-user`).
In the application log you will find information about the resolved user after successful authentication:

<div class="impl java">

```sh
MockedUserInfoProvider: Resolved MockedUserInfo [id='mock/viewer-user', name='viewer-user', roles='[Viewer]', attributes='{Country=[GER, FR], tenant=[CrazyCars]}'
```

</div>

<div class="impl node">

```
[basic] - authenticated: { user: 'viewer-user', tenant: 'CrazyCars', features: [ 'cruise', 'park' ] }
```

</div>

[Learn more about custom mock users](../../java/security#custom-mock-users){.learn-more .java}
[Learn more about custom mock users](../../node.js/authentication#mocked){.learn-more .node}


### Automated Testing { #mock-user-testing }

Mock users provide an excellent foundation for automated **unit tests, which are essential for ensuring application security**.
The flexibility in defining various types of mock users and the seamless integration into testing code significantly reduces the burden of covering all relevant test combinations.

<div class="impl java">

::: details How to leverage Spring-MVC to use CAP mock users
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

::: tip
Integration tests running with production profile should ensure that access by unauthenticated users is rejected from all endpoints of the application❗
:::

[Learn more about testing with authenticated endpoints](../../node.js/cds-test#authenticated-endpoints){.learn-more .java}
[Learn more about unit testing](../../java/developing-applications/testing#testing-cap-java-applications){.learn-more .node}


<div class="impl node">

[Learn more about unit testing](../../node.js/cds-test#testing-with-cds-test){.learn-more}

</div>


## IAS Authentication { #ias-auth }

[SAP Identity Authentication Service (IAS)](https://help.sap.com/docs/cloud-identity-services) is the preferred platform service for identity management providing following features:
 - best of breed authentication mechanisms (single sign-on, multi-factor enforcement)
 - federation of corporate identity providers (multiple user stores)
 - cross-landscape user propagation (including on-premise)
 - streamlined SAP and non-SAP system [integration](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/integrating-service) (due to [OpenId Connect](https://openid.net/connect/) compliance)

IAS authentication is best configured and tested in the Cloud, so let's enhance the started bookshop sample application with a deployment descriptor for SAP BTP, Cloud Foundry Runtime (CF).


### Get Ready with IAS { #ias-ready }

Before working with IAS on CF, you need to

- Prepare an IAS (test) tenant. If not available yet, you need to [create](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/get-your-tenant) it now.

- [Establish trust](https://help.sap.com/docs/btp/sap-business-technology-platform/establish-trust-and-federation-between-uaa-and-identity-authentication)
towards your IAS tenant to use it as identity provider for applications in your subaccount.

- Ensure your development environment is [prepared for deploying](https://pages.github.tools.sap/cap/docs/guides/deployment/to-cf#prerequisites) on CF, 
in particular you require a `cf` CLI session targeting a CF space in the test subaccount (test with `cf target`).

You can continue with the sample [already created](#mock-user-auth). In the project root folder, execute

```sh
cds add mta
```

to make your application ready for deployment to CF.

<div class="impl java">

::: info
Command `add mta` will enhance the project with `cds-starter-cloudfoundry` and therefore all [dependencies required](../../java/security#maven-dependencies) for security are added transitively.
:::

</div>

You also need to configure DB support:

```sh [SAP HANA]
cds add hana
```



### Adding IAS

Now the application is ready to be enhanced with IAS-support by executing

```sh
cds add ias
```

which automatically adds a service instance named `bookshop-ias` of type `identity` (plan: `application`) and binds the CAP application to it.

::: details Generated deployment descriptor for IAS instance and binding
```yaml [mta.yaml]
modules:
  - name: bookshop-srv
    # [...]
    requires:
      - name: bookshop-ias
        parameters:
          config:
            credential-type: X509_GENERATED
            app-identifier: srv

resources:
  - name: bookshop-ias
    type: org.cloudfoundry.managed-service
    parameters:
      service: identity
      service-name: bookshop-ias
      service-plan: application
      config:
        display-name: bookshop
```
:::

<div class="impl java">

::: info
The [binding](../../java/security#bindings) to service instance of type `identity` is the trigger to automatically enforce IAS authentiaction at runtime ❗
:::

</div>

Whereas the service instance represents the IAS application itself, the binding provides access to the identity services on behalf of a concrete client.
**CAP applications can have at most one binding to an IAS instance.** Conversely, multiple CAP applications can share the same IAS intstance. 

Service instance and binding offer the following crucial configuration properties:

| Property          | Artifact            | Description         |
|-------------------|:-------------------:|:---------------------:|
| `name` |  _instance_   | _Name for the IAS application - unique in the tenant_  |
| `display-name` |  _instance_   | _Human-readable name for the IAS application as it appears in the Console UI for IAS administrators_ |
| `multi-tenant` |  _instance_   | _Specifies application mode: `false` for single tenant (default), `true` for multiple subscriber tenants (SAAS)_  |
| `credential-type` |  _binding_   | _`X509_GENERATED` generates a private-key and a signed certificate which is added to IAS application_       |
| `app-identifier` |  _binding_   | _Ensures stable subject in generated certificate (required for credential rotation)_  |


[Lean more about IAS service instance and binding configuration](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/reference-information-for-identity-service-of-sap-btp){.learn-more}

<div id="learn-more-IAS-instances-bindings" />

Now let's pack and deploy the application with
```sh
cds up
```

and wait until the application is up and running. 
You can test the status with `cf apps` on CLI level or in BTP Cockpit, alternatively.

The startup log should confirm the activated IAS authentication:
<div class="java">

```sh
... : Loaded feature 'IdentityUserInfoProvider' (IAS: bookshop-ias, XSUAA: <none>)
```

</div>

<div class="node">
TODO
</div>

::: tip
The local setup is still runnable on basis of mock users as there is no IAS binding in the environment.
:::

For mTLS support which is mandatory for IAS, the CAP application has a second route configured with the `cert.*` domain:

```yaml
modules:
  - name: bookshop-srv
    # [...]
    parameters:
      routes:
        - route: "${default-url}"
        - route: "${default-host}.cert.${default-domain}"
```

::: info
Platform-level TLS termination is provided on CF out of the box via `cert.*`-domains. 
By default, the validated certificate is forwarded via HTTP header `X-Forwarded-Client-Cert` to the CAP endpoint.
:::

::: warning
On SAP BTP Kyma Runtime, you might need to adapt configuration parameter <Config java>`cds.security.authentication.clientCertificateHeader`</Config> to match the header used by the component terminating TLS you configured.
:::


#### Administrative Console for IAS { #ias-admin }

In the [Administrative Console for Cloud Identity Services](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/accessing-administration-console?version=Cloud) 
you can see and manage the deployed IAS application. You need a user with administrative privileges in the IAS tenant to access the services at `<ias-tenant>.accounts400.ondemand.com/admin`.

In the Console you can manage the IAS tenant and IAS applications, for example: 
- Create (test) users in `Users & Authorizations` -> `User Management`
- Deactivate users
- Configure the authentication strategy (password policies, MFA etc.) in `Applications & Resources` -> `Applications` (IAS instances listed with their display-name)
- Inspect logs in `Monitoring & Reporting` -> `Troubleshooting`

::: tip
In BTP Cockpit, service instance `bookshop-ias` appears as a link that allows direct navigation to the IAS application in the Administrative Console for IAS.
:::


### CLI Level Testing

Due to CAP's autoconfiguration, all CAP endpoints are authenticated and expect valid OAuth tokens created for the IAS application.

Sending the test request 
```sh
curl https://<org>-<space>-bookshop-srv.<landscape-domain> \
            /odata/v4/CatalogService/Books --verbose
```

as anonymous user without a token results in a `401 Unauthorized` as expected.

Now let's fetch a token as basis for a fully authenticated test request. 
For doing so, you need to interact with IAS service which requires an authenticated client itself.

The overall setup with CLI client and the Cloud services is sketched in the diagram:

![CLI-level Testing of IAS Endpoints](./assets/ias-cli-setup.drawio.svg){width="500px"}

As IAS requires mTLS-protected channels, **client certificates are mandatory** for all of the following requests:
- Token request to IAS in order to fetch a valid IAS token (1)
- Business request to the CAP application presenting the token (2)
- Initial proof token request to IAS - not required for all business requests (3)

As first step add a new client for the IAS application by creating an appropriate service key:

```sh
cf create-service-key bookshop-ias bookshop-ias-key \
    -c '{"credential-type": "X509_GENERATED"}'
```

The client certificates are presented in the IAS binding and hence can be examined via a service key accordingly.

::: details How to create and retrieve service key credentials

```sh
cf service-key bookshop-ias bookshop-ias-key

{
  "credentials": {
      [...]
    "certificate": "-----BEGIN CERTIFICATE----- [...] -----END CERTIFICATE-----",
    "clientid": "2a92c297-8603-4157-9aa9-ca758582abcd",
    "credential-type": "X509_GENERATED",
    "key": "-----BEGIN RSA PRIVATE KEY----- [...] -----END RSA PRIVATE KEY-----",
    "url": "https://<tenant-id>.accounts400.ondemand.com",
    [...]
  }
}
```

:::

::: warning
❗ **Never share service keys or tokens** ❗
:::

From the credentials, you can prepare local files containing the certificate used to initiate the HTTP request. 

::: details How to prepare client X.509 certificate files

Copy the public X.509-certificate in property `certificate` into a file `cert-raw.pem` and `key` into a file `key-raw.pem`, accordingly.
Both files need to be post-processed to transform the single-line representation into a standard multi-line representation:

```sh
awk '{gsub(/\\n/,"\n")}1' <file-raw>.pem > <file>.pem
```
Finally, ensure correct format of both files with
```sh
openssl x509 -in <file>.pem -text -noout
```
All the steps can be executed in a single script as shown in the [example](https://cap.cloud.sap/resources/examples/fetch-ias-certs.sh).
:::

To fetch a token - either as technical or as named user - the request needs to provide the **client certificate** being send to `/oauth2/token` endpoint of IAS service with URI given in `url` property of the binding:

::: code-group

```sh [Token for technical user]
curl --cert cert.pem --key key.pem \
  -d "grant_type=client_credentials"\
  -d "client_id=<clientid>" \
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
  https://<org>-<space>-bookshop-srv.cert.<landscape-domain> \
         /odata/v4/CatalogService/Books
```

The response should contain the queried books accordingly (HTTP response code `200`).

Don't forget to delete the service key after your tests:
```sh
cf delete-service-key bookshop-ias bookshop-ias-key
```


### UI Level Testing

In the UI scenario, adding an Application Router as an ingress proxy to the deployment simplifies testing a lot. 
It will take care of fetching the required IAS tokens when forwarding requests to the backend service. 

Enhancing the project with [SAP Cloud Portal](../deployment/to-cf#option-a-sap-cloud-portal) configuration adds an Application Router component as well as HTML5 Application Repository:

```sh
cds add portal
```

The resulting setup is sketched in the diagram:

![UI-level Testing of IAS Endpoints](./assets/ias-ui-setup.svg){width="500px"}

To be able to fetch the token, the AppRouter needs a binding to the IAS instance as well.
In addition, property `forwardAuthCertificates` needs to be `true` to support the mTLS connection with the service backend which is called by the route with the cert-domain.

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
      - name: bookshop-ias
        parameters:
          config:
            credential-type: X509_GENERATED
            app-identifier: approuter
```
:::

As the login flow is based on an HTTP redirect between the CAP application and IAS login page,
IAS needs to know a valid callback URI which is offered by the AppRouter out-of-the-box.
The same is true for the logout flow.

::: details Redirect URIs for login and logout
```yaml
  - name: bookshop-ias
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


Now re-deploy the solution by running 

```sh
cds up
```

and test the application via URL provided in the Cockpit.
The Application Router should redirect to a login flow where you can enter the credentials of a [test user](#ias-admin) created before.


## XSUAA Authentication { #xsuaa-auth }

[SAP Authorization and Trust Management Service (XSUAA)](https://help.sap.com/docs/btp/sap-business-technology-platform/sap-authorization-and-trust-management-service-in-cloud-foundry-environment) is a platform service for identity and access management which provides:
 - authentication mechanisms (single sign-on, multi-factor enforcement)
 - federation of corporate identity providers (multiple user stores)
 - create and assign access roles
 
::: tip
In contrast to [IAS](#ias-auth), XSUAA does not allow cross-landscape user propagation out of the box. 
::: 

XSUAA authentication is best configured and tested in the Cloud, so let's enhance the sample with a deployment descriptor for SAP BTP, Cloud Foundry Runtime (CF).


### Get Ready with XSUAA { #xsuaa-ready }

Before working with XSUAA on CF, you need to ensure your development environment is [prepared for deploying](https://pages.github.tools.sap/cap/docs/guides/deployment/to-cf#prerequisites) to CF.
In particular, you require a `cf` CLI session targeting a CF space in the test subaccount (test with `cf target`).

You can continue with the bookshop sample create for the [mock users](#mock-user-auth) or, alternatively, you can also enhance the [IAS-based](#ias-auth) application. 

If there is no deployment descriptor yet, execute in the project root folder

```sh
cds add mta
```

<div class="impl java">

::: tip
Command `add mta` will enhance the project with `cds-starter-cloudfoundry` and therefore all [dependencies required for security](../../java/security#maven-dependencies) are added transitively.
:::

</div>

to make your application ready for deployment to CF.

You also need to configure DB support:

```sh [SAP HANA]
cds add hana
```


### Adding XSUAA { #adding-xsuaa }

Now the application is ready for enhancing with XSUAA-support:

<div class="impl java">

```sh
cds add xsuaa
```

</div>

<div class="impl node">

```sh
cds add xsuaa --for production
```

</div>


The command automatically adds a service instance named `bookshop-auth` of type `xsuaa` (plan: `application`) and binds the CAP application to it:

```yaml [mta.yaml]
modules:
  - name: bookshop-srv
    # [...]
    requires:
      - name: bookshop-auth

resources:
  - name: bookshop-auth
    type: org.cloudfoundry.managed-service
    parameters:
      service: xsuaa
      service-plan: application
      path: ./xs-security.json
      config:
        xsappname: bookshop-${org}-${space}
        tenant-mode: dedicated
        role-collections:
          - name: 'admin (bookshop ${org}-${space})'
            description: 'generated'
            role-template-references:
              - '$XSAPPNAME.admin'
```

<div class="impl java">

::: info
Command `cds add xsuaa` enhances the project with [required binding](../../java/security#bindings) to service instance identity and therefore activates XSUAA authentication automatically.
:::

</div>

**CAP applications should have at most one binding to an XSUAA instance.** Conversely, multiple CAP applications can share the same XSUAA instance. 

<div class="impl java">

::: tip
In case your application has multiple XSUAA bindings you need to [pin the binding](../../java/security#bindings).
:::

</div>

There are some mandatory configuration parameters:

| Property          |  Description         |
|-------------------|:-------------------:|
|`service-plan`     | _The plan type reflecting various application scenarios. UI applications without API access use plan `application`. All others should use plan `broker`._ |
|`path`             | _File system path to the [application security descriptor](#xsuaa-security-descriptor)._ |
|`xsappname`        | _A unique application name within the subaccount. All XSUAA artifacts are prefixed with it (wildcard `$XSAPPNAME`)._ |
|`tenant-mode`   | _`dedicated` is suitable for a single-tenant application. Mode `shared` is mandatory for a multitenant application._ |

::: warning
Upgrading the `service-plan` from type `application` to `broker` is not supported.
Hence, start with plan `broker` in case you want to provide technical APIs in future.
:::

[Learn more about XSUAA application security descriptor configuration syntax](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-developer-guide-for-cloud-foundry-multitarget-applications-sap-web-ide-full-stack/application-security-descriptor-configuration-syntax){.learn-more}

#### Security Descriptor { #xsuaa-security-descriptor }

The security descriptor in the `xs-security.json` file contains [XSUAA authorization artifacts](https://help.sap.com/docs/btp/sap-business-technology-platform/authorization-entities).
In general, XSUAA artifacts have a hierarchical relationship with role collections as root elements. 
Role collections can be assigned to end users.

For convenience, when adding the XSUAA facet, these artifacts are initially derived from the CDS model:

- **XSUAA Scopes**: For every [CAP role](./cap-users#roles) in the CDS model, a dedicated scope is generated with the exact name of the CDS role.
- **XSUAA attributes**  For every [CAP attribute](./authorization#user-attrs) in the CDS model, one attribute is generated.
- **XSUAA role templates** For every scope, a dedicated role template with the exact name is generated. The role templates are building blocks for concrete role collections that finally can be assigned to users. 

```json
{
  "scopes": [
    {
      "name": "$XSAPPNAME.admin",
      "description": "admin"
    }
  ],
  "attributes": [],
  "role-templates": [
    {
      "name": "admin",
      "description": "generated",
      "scope-references": [
        "$XSAPPNAME.admin"
      ],
      "attribute-references": []
    }
  ]
}
```
[Learn more about XSUAA attributes](https://help.sap.com/docs/btp/sap-business-technology-platform/setting-up-instance-based-authorizations){.learn-more}
[Lean more about XSUAA security descriptor](https://help.sap.com/docs/btp/sap-business-technology-platform/application-security-descriptor-configuration-syntax){.learn-more}
[Learn how to setup mTLS for XSUAA](https://help.sap.com/docs/btp/sap-business-technology-platform/enable-mtls-authentication-to-sap-authorization-and-trust-management-service-for-your-application){.learn-more}

At runtime, after successful authentication, the scope prefix `$XSAPPNAME`is removed by the CAP integration to match the corresponding CAP role.

In the [deplyoment descriptor](#adding-xsuaa), the optional property `role-collections` contains a list of preconfigured role collections. 
In general, role collections are [created manually](./cap-users#xsuaa-assign) at runtime by user administrators.
But in case the underlying role template has no reference to an attribute, a corresponding role collection can be prepared already for sake of convenience.

In the example, role collection `admin (bookshop <org>-<space>)` containing the role template `admin` is defined and can be directly assigned to users.


::: tip 
You can re-generate the file on model changes via
```sh
cds compile srv --to xsuaa > xs-security.json
```
:::

Consult [Application Security Descriptor Configuration Syntax](https://help.sap.com/docs/btp/sap-business-technology-platform/application-security-descriptor-configuration-syntax) in the SAP Help documentation for the syntax of the _xs-security.json_ and advanced configuration options.

::: tip
If you modify the _xs-security.json_ manually, make sure that the scope names in the file exactly match the role names in the CDS model, as these scope names will be checked at runtime.
:::

#### Start and Check the Deployment

Now let's pack and deploy the application with

<div class="impl node">

```sh
npm install
cds up
```

</div>

<div class="impl java">

```sh
cds up
```

</div>

and wait until the application is up and running. 
You can test the status with `cf apps` on CLI level or in BTP Cockpit, alternatively.

Run `cf logs bookshop-srv --recent` to confirm the activated XSUAA authentication:

<div class="java">

```sh
... : Loaded feature 'IdentityUserInfoProvider' (IAS: <none>, XSUAA: bookshop-auth)
```

</div>

<div class="node">

```sh
... : "using auth strategy { kind: 'xsuaa' … }
```

</div>


::: tip
The local setup is still runnable on basis of mock users as there is no IAS binding in the environment.
:::



### CLI Level Testing

Due to CAP's autoconfiguration, all CAP endpoints are [authenticated automatically](#model-auth) and expect valid XSUAA tokens.

Sending the test request

<div class="java">

```sh
curl https://<org>-<space>-bookshop-srv.<landscape-domain> \
             /odata/v4/CatalogService/Books --verbose
```

</div>

<div class="node">

```sh
curl https://<org>-<space>-bookshop-srv.<landscape-domain> \
             /odata/v4/catalog/Books --verbose
```

</div>

as anonymous user without a token the request results in a `401 Unauthorized` as expected.

Now let's fetch an XSUAA token to prepare an authenticated test request.
To do so, you need to interact with XSUAA service which requires a valid authentication as well.

As first step add a new client for XSUAA by creating an appropriate service key with

```sh
cf create-service-key bookshop-auth bookshop-auth-key
```

You can inspect the service key credentials by executing

```sh
cf service-key bookshop-auth bookshop-auth-key
```

which prints the information to the console: 

```json
{
  "credentials": {
    [...]
    "clientid": "sb-bookshop-...",
    "clientsecret": "...",
    "url": "https://<org>.authentication.sap.hana.ondemand.com",
    [...]
  }
}
```

::: warning
❗ **Never share service keys or tokens** ❗
:::

As second step, assign the generated role collection with name `admin (bookshop <org>-<space>)` to your **test user**.
Follow the instructions from step 4 onwards of [Assign Roles in SAP BTP Cockpit Step](./cap-users#xsuaa-assign).

With the credentials, you can send an HTTP request to fetch the token from XSUAA `/oauth/token` endpoint: 

::: code-group

```sh [Token for technical user]
curl -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'grant_type=client_credentials' \
  -d 'client_id=<clientid>' \
  -d 'client_secret=<clientsecret>' \
  <url>/oauth/token
```

```sh [Token for named user]
curl -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'grant_type=password' \
  -d 'client_id=<clientid>' \
  -d 'client_secret=<clientsecret>' \
  -d 'username=<username>' \
  -d 'password=<userpassword>' \
  <url>/oauth/token
```

:::

The request returns with a valid XSUAA token which is suitable to pass authentication in the CAP application:
```sh
{"access_token":"<the token>", "token_type":"bearer","expires_in":43199, [...]}
```

With the token for the technical user, you should be able to access any endpoint, which has no specific role requirements:

<div class="java">

```sh
curl -H "Authorization: Bearer <access_token>" \
  https://<org>-<space>-bookshop-srv.<landscape-domain> \
         /odata/v4/CatalogService/Books
```

</div>

<div class="node">

```sh
curl -H "Authorization: Bearer <access_token>" \
  https://<org>-<space>-bookshop-srv.<landscape-domain> \
        /odata/v4/catalog/Books
```

</div>

If you also want to access the `AdminService` which requires the role `admin`,
you need to fetch the token for the named user instead. That is the user which you have assigned the `admin (bookshop <org>-<space>)` role collection to.

With the token for the named user, the following request should succeed:

<div class="java">

```sh
curl -H "Authorization: Bearer <access_token>" \
  https://<org>-<space>-bookshop-srv.<landscape-domain> \
         /odata/v4/AdminService/Books
```

</div>

<div class="node">

```sh
curl -H "Authorization: Bearer <access_token>" \
  https://<org>-<space>-bookshop-srv.<landscape-domain> \
         /odata/v4/admin/Books
```

</div>

::: tip
Try out sending a request to the `admin` endpoint with the technical user token to see the expected `403 Forbidden` response:

```sh
{ "error": { "message":"Forbidden","code":"403", … } }
```

:::

Don't forget to delete the service key after your tests:
```sh
cf delete-service-key bookshop-auth bookshop-auth-key
```


### UI Level Testing

In the UI scenario, adding an Application Router as an ingress proxy to the deployment simplifies testing a lot. 
It will take care of fetching the required XSUAA tokens when forwarding requests to the backend service. 

Enhancing the project with [SAP Cloud Portal](../deployment/to-cf#option-a-sap-cloud-portal) configuration adds an Application Router component as well as HTML5 Application Repository:

```sh
cds add portal
```

The resulting architecture is very similar to the [IAS scenario](#ui-level-testing), but only with XSUAA service instances instead of IAS service instances.
There is one more difference: **By default, XSUAA does not enforce mTLS**.

To be able to fetch the token, the Application Router needs a binding to the XSUAA instance.

::: details AppRouter component with XSUAA binding
```yaml
modules:
- name: bookshop
    type: approuter.nodejs
    path: app/router
    [...]
    requires:
      - name: srv-api
        group: destinations
        properties:
          name: srv-api # must be used in xs-app.json as well
          url: ~{srv-url}
          forwardAuthToken: true
      - name: bookshop-auth
      [...]
    provides:
      - name: app-api
        properties:
          app-protocol: ${protocol}
          app-uri: ${default-uri}
          url: ${default-url}
```
:::

As the login flow is based on an HTTP redirect between the CAP application and XSUAA login page,
XSUAA needs to know a valid callback URI which is offered by the Application Router out of the box.
The same is true for the logout flow.

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
            - https://*~{app-api/app-uri}/**
    requires:
      - name: app-api      
```
:::


Now update the Cloud deployment with

```sh
cds up
```

and verify it by running `cf apps` in the targeted space:

```sh
name           requested state   processes   routes
bookshop-potal               started           web:1/1     <org>-<space>-bookshop.<landscape-domain>
bookshop-potal-db-deployer   stopped           web:0/1
bookshop-potal-srv           started           web:1/1     <org>-<space>-bookshop-srv.<landscape-domain>
```

and open the route exposed by the `bookshop` UI application in a new browser session.



## Hybrid Authentication { #hybrid-auth }

will come soon


## Custom Authentication { #custom-auth }

<div class="java">

There are multiple reasons why customization might be required:
1. Endpoints for non-business requests often require specific authentication methods (e.g. health check, technical services).
2. The application is deployed in the context of a service mesh with ingress authentication (e.g. Istio).
3. The application needs to integrate with a 3rd party authentication service.

![Endpoints with different authentication strategy](./assets/custom-auth.drawio.svg){width="380px"}


[Advanced configuration options](../../java/security#spring-boot) allow you to control the behaviour of CAP's authentication behaviour according to your needs:


- For CAP endpoints you are fine to go with the [automatic authentication](#model-auth) fully derived from the CAP model.
- For custom endpoints that should be protected by the same authentication strategy you are also fine with automatc authentication as CAP will cover these endpoints by default.
- For custom endpoints that should have a different kind of authentication strategy (e.g. X.509, basic or none) you can add a security configuration that [partially overrules](#partially-auth) the CAP integration partially for exactly these endpoints.
- In case the authentiaction is delegated to a different component, just [fully overrule](#fully-auth) CAP authentication and replace by any suitable strategy.

::: tip Secure by Default
**By default, CAP authenticates all endpoints of the microservice, including the endpoints which are not served by CAP itself**.
This is the safe baseline on which minor customization steps can be applied on top.
:::

</div>

<div class="node">

Ideally, all authentication use-cases should be covered by the generic implementations CAP provides.
However, your application's specific requirements may make it necessary to customize authentication.
For these scenarios, the CAP Node.js runtime allows to specify an implementation of a custom authentication middleware in <Config>cds.requires.auth.impl</Config>, by providing a path relative to the project root.

:::warning
Be **very** careful when creating your own `auth` implementation. 
This should be a last resort for when every other possible solution (e.g. through [modelling](./authorization.md#restrictions) or by [configuration](#pluggable-authentication)) has been investigated and dismissed.
:::

Like any other [custom middleware](../../node.js/cds-serve.md#custom-middlewares), the auth middleware you create needs to accept express's `req`, `res` and `next` and end up by sending a response, throwing an error or calling `next()`.
Additionally, a custom auth middleware in CAP needs to set `cds.context.user` and, in a multitenant applications, `cds.context.tenant`.

```js
module.exports = function custom_auth (req, res, next) {
  
  // do your custom authentication
  
  cds.context.user = new cds.User({
    id: '<user-id>',
    roles: ['<role-a>', '<role-b>'],
    attr: {
      <user-attribute-a>: '<value>',
      <user-attribute-b>: '<value>'
    }
  })
  cds.context.tenant = '<tenant>'
}
```

<!-- TODO: Auth Factory Public?  
You might, for example want to expose an unauthenticated technical endpoint:

```js
const cds = requires('@sap/cds')
module.exports = function custom_auth (req, res, next) {

  if (req.url.endswith('/my-technical-endpoint')) next()

  cds.auth()(req, res, next)
}
```
-->

:::tip
In case you want to customize the `cds.context.user`, check out [this example](../../node.js/cds-serve#customization-of-cds-context-user).
:::

</div>


### Automatic Authentication { #model-auth }

As the auto-configuration authenticates all service endpoints found in the CDS model by default,
you don't need to explicitly activate authentication for these endpoints. 

Endpoints that should be public can be explicitly annotated with [pseudo-role](cap-users#pseudo-roles) `any`:

```cds
service BooksService @(requires: 'any') {
  @readonly entity Books @(requires: 'any') {...}
  entity Reviews {...}
  entity Orders @(requires: 'Customer') {...}
}
```

| Path                      | Authenticated ?  |
|:--------------------------|:----------------:|
| `/BooksService` and `/BooksService/$metadata`          |      <X/>       |
| `/BooksService/Books`     |      <X/>       |
| `/BooksService/Reviews`   |       <Y/>       |
| `/BooksService/Orders`    |       <Y/>       |

::: tip
In multitenant applications, anonymous requests to public endpoints are missing the tenant information and hence this gap needs to be filled by custom code.
:::

By default, if a CAP service `MyService` is authenticated, also `/MyService/$metadata` is authenticated.

<div class="java">

With `cds.security.authentication.authenticateMetadataEndpoints: false` you can switch off this behaviour on a global level.

[Learn more about authentication options](../../java/security#spring-boot){.learn-more}

</div>

<div class="node">
Automatic authentication enforcement can be disabled via feature flag <Config>cds.requires.auth.restrict_all_services: false</Config>, or by using [mocked authentication](#mock-user-auth) explicitly in production.
</div>

### Overrule Partially { #partially-auth .java }

If you want to explicitly define the authentication for specific endpoints, **you can add an _additional_ Spring security configuration on top** overriding the default configuration given by CAP:

```java
@Configuration
@EnableWebSecurity
public class CustomSecurityConfig {

  @Bean
  @Order(1) // needs to have higher priority than CAP security config
  public SecurityFilterChain customFilterChain(HttpSecurity http) throws Exception {
    return http
      .securityMatcher(AntPathRequestMatcher.antMatcher("/public/**"))
      .csrf(c -> c.disable()) // don't insist on csrf tokens in put, post etc.
      .authorizeHttpRequests(r -> r.anyRequest().permitAll())
      .build();
  }

}
```
Due to the custom configuration, all URLs matching `/public/**` are opened for public access in this example.

Ensure your custom configuration has higher priority than CAP's default security configuration by decorating the bean with a low order. 

::: warning _❗ Warning_
Be cautious with the configuration of the `HttpSecurity` instance in your custom configuration. Make sure that only the intended endpoints are affected.
:::

[Learn more about overruling Spring security configuration in CAP Java](../../java/security#custom-spring-security-config){.learn-more}


### Overrule Fully { #fully-auth }

In services meshes such as [Istio](https://istio.io/) the authentication is usually fully delegated to a central ingress gateway and the internal communication with the services is protercted by a secure channel:

![Service Mesh with Ingress Gateway](./assets/ingress-auth.drawio.svg){width="500px"}

::: tip
User propagation should be done by forwarding the request token in `Authorization`-header accordingly.
This will make standard CAP authorization work properly.
:::

::: warning
If you switch off CAP authentication, make sure that the internal communication channels are secured by the given infrastructure.
:::

<div class="java">
In such architectures, CAP authentication is obsolete and can be deactivated entirely with <Config java>`cds.security.authentication.mode="never"`</Config>.

[Learn more about how to switch off authentication in CAP Java](../../java/security#custom-spring-security-alone){.learn-more}

</div>

<div class="node">
TODO
</div>


## Pitfalls
- **Don't miss to configure security middleware.**
  Endpoints of (CAP) applications deployed on SAP BTP are, by default, accessible from the public network. 
  Without security middleware configured, CDS services are exposed to the public. 

- **Don't rely on Application Router authentication**. Application Router as a frontend proxy does not shield the backend from incoming traffic. Therefore, the backend must be secured independently.

- **Don't deviate from security defaults**. Only when absolutely necessary should experts make the decision to add modifications or replace parts of the standard authentication mechanisms. 
  
- **Don't forget to add authentication tests** to ensure properly configured security in your deployed application that rejects unauthenticated requests.

