---
# layout: cookbook
label: CAP Users
synopsis: >
  This guide introduces to CAP user abstraction.
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


# Users { #users }

A successfull authentication results in an CAP [user representation](#claims) reflecting the request user in an uniform way.
Referring to the key concepts, the abstraction serves to fully decouple authorization and business logic from pluggable authentication strategy.
It contains static information about the user such as name, ID and tenant. Moreover it contains additional claims such as roles or assigned attributes that are relevant for [authorization](./authorization).

Dynamic assignments of roles to users can be done by 
- [Authorization Management Service (AMS)](#ams-roles) in case of [IAS authentication](./authentication#ias-auth).
- [XS User Authentication and Authorization Service (XSUAA)](#xsuaa-roles) in case of [XSUAA authentication](./authentication#xsuaa-auth).

In addition, CAP users provide an API for [programmatic]( #developing-with-users ) processing and customization.

[[toc]]

## User Representation { #claims }

After successful authentication, a CAP user is mainly represented by the following properties:

- **_Logon name_** identifying the user uniquly
- **_Tenant_** describes the tenant of the user (subscriber or provider) which implies the CDS model and business data container.
- **_Roles_** the user has been assigned by an user administrator (business [user roles](#roles)) or roles which are derived by the authentication level ([pseudo roles](#pseudo-roles)).
- **_Attributes_** the user has been assigned e.g. for instance-based authorization.


### User Types

CAP users can be classified in multiple dimensions:

**Business users vs. technical users:** 
- Business users reflect named end users which do some login name to interact with the system.
- Technical users act on behalf of a whole tenant on a technical API level.

**Authenticated users vs. anonymous users**
- Authenticated users have passed (optional) authentication successfully by presenting a claim (e.g. a token).
- Anonymous users are not identifyable users, i.e. they havn't presented any claim for authentication.

**Provider vs. subscriber tenant**
- The provider tenants comprises all users of the application owner which usually have no business access to multi-tenant applications.
- A subscriber tenant comprises all users of an application customer.

|                  | Business users | Technical users
|-------------------|----------------|---
| Provider Tenant   |         -     | x 
| Subscriber Tenant |         x      | x 

::: tip
Apart from anonymous users, all users have a unique tenant.
Single-tenant applications deal with the provider tenant users only.
:::

- switch
- typical tasks

### Roles { #roles}

As a basis for access control, you can design application specific CAP roles which are assigned to users at application runtime.
**A CAP role should reflect _how_ a user can interact with the application at an operational level**, rather than a fine-grained event at a purely technical level.

```cds
annotate Issues with @(restrict: [
    { grant: ['READ','WRITE'],
      to: 'ReportIssues',
      where: ($user = CreatedBy) },
    { grant: ['READ'],
      to: 'ReviewIssues' }
]);
```

For instance, the role `ReportIssues` allows to work with the `Issues` created by the own user, whereas a user with role `ReviewIssues` is only allowed to read `Issues` of any user.

CAP roles represent basic building blocks for authorization rules that are defined by the application developers who have in-depth domain knowledge.
Independently from that, user administrators combine CAP roles in higher-level policies and assign to business users in the platform's central authorization management solution.

::: tip
CDS-based authorization deliberately refrains from using technical concepts, such as _scopes_ in _OAuth_, in favor of user roles, which are closer to the technical domain of business applications.
:::

#### Pseudo Roles { #pseudo-roles}
 
It's frequently required to define access rules that aren't based on an application-specific user role, but rather on the _technical authentication level_ of the request. 
For instance, a service should be accessible only for technical users, with or without user propagation. 
Such roles are called pseudo roles as they aren't assigned by user administrators, but are added by the runtime automatically on succcessful authentication, reflecting the technical level:

| Pseudo Role                 | User Type | Technical Indicator | User Name
|-----------------------------|---------------------|---------------|---------------|
| `authenticated-user`        | n/a  | Successful authentication |  - derived from the token - |
| `any`        | n/a      | n/a   | - derived from the token if available or `anonymous` - |
| `system-user` | Technical                   | Client credential flow | `system` |
| `internal-user` | Technical        | Client credential flow with same identity instance | 

The pseudo-role `system-user` allows you to separate access by business users from _technical_ clients. 
Note that this role does not distinguish between any technical clients sending requests to the API.

Pseudo-role `internal-user` allows to define application endpoints that can be accessed exclusively by the own PaaS tenant on technical level. 
In contrast to `system-user`, the endpoints protected by this pseudo-role do not allow requests from any external technical clients. 
Hence is suitable for **technical intra-application communication**, see [Security > Application Zone](./overview#application-zone).

::: warning
All technical clients that have access to the application's XSUAA or IAS service instance can call your service endpoints as `internal-user`.
**Refrain from sharing this service instance with untrusted clients**, for instance by passing services keys or [SAP BTP Destination Service](https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/create-destinations-from-scratch) instances.
:::


### Model References

The resulting object representaiton of the user is attached to the current request context and has an impact on the request flow for instance with regards to
- [authorizations](./authorization#restrictions)
- [enriching business data](../guides/domain-modeling#managed-data) with user data
- setting [DB session variables](../guides/db-feature-comparison#session-variables)

In the CDS model, some of the user properties can be referenced in annotations or static views:

| User Property                 | CDS Model Reference | CDS Artifact       |
|-------------------------------|---------------------|--------------------|
| Name                          | `$user`             | annotations and static views |
| Attribute                     | `$user.<attribute>` | [@restrict](./authorization#user-attrs) |
| Role                          | `<role>`            | [@requires](./authorization#requires) and [@restrict.to](./authorization#restrict-annotation) |


## Role Assignment with AMS { #ams-roles }

The Authorization Management Service (AMS) as part of SAP Cloud Identity Services (SCI) provides libraries and services for developers of cloud business applications to declare, enforce and manage instance based authorization checks. When used together with CAP the AMS  "Policies” can contain the CAP roles as well as additional filter criteria for instance based authorizations that can be defined in the CAP model. transformed to AMS policies and later on refined by customers user and authorization administrators in the SCI administration console and assigned to business users.

### Use AMS as Authorization Management System on SAP BTP

SAP BTP is currently replacing the authorization management done with XSUAA by an integrated solution with AMS. AMS is integrated into SAP Cloud Identity (SCI), which will offer authentication, authorization, user provisioning and management in one place.

For newly build applications the usage of AMS is generally recommended. The only constraint that comes with the usage of AMS is that customers need to copy their users to the Identity Directory Service as the central place to manage users for SAP BTP applications. This is also the general SAP strategy to simplify user management in the future.

### Case For XSUAA

There is one use case where currently an XSUAA based authorization management is preferable: When XSUAA based services to be consumed by a CAP application come with their own business user roles and thus make user role assignment in the SAP Cloud Cockpit necessary. This will be resolved in the future when the authorization management will be fully based on the SCI Admin console.

For example, SAP Task Center you want to consume an XSUAA-based service that requires own end user role. Apart from this, most services should be technical services that do not require an own authorization management that is not yet integrated in AMS.


<!-- [Learn more about using IAS and AMS with CAP Java.](/java/ams){.learn-more} -->
[Learn more about using IAS and AMS with CAP Node.js](https://github.com/SAP-samples/btp-developer-guide-cap/blob/main/documentation/xsuaa-to-ams/README.md){.learn-more}



Neue AMS CAP Doku https://sap.github.io/cloud-identity-developer-guide/CAP/Basics.html



## Role Assignment with XSUAA { xsuaa-roles }

Information about roles and attributes can be made available to the UAA platform service. 
This information enables the respective JWT tokens to be constructed and sent with the requests for authenticated users. 
In particular, the following happens automatically behind-the-scenes upon build:


### Generate Security Descriptor 

Derive scopes, attributes, and role templates from the CDS model:

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

This generates an _xs-security.json_ file:

::: code-group
```json [xs-security.json]
{
  "scopes": [
    { "name": "$XSAPPNAME.admin", "description": "admin" }
  ],
  "attributes": [
    { "name": "level", "description": "level", "valueType": "s" }
  ],
  "role-templates": [
    { "name": "admin", "scope-references": [ "$XSAPPNAME.admin" ], "description": "generated" }
  ]
}
```
:::

For every role name in the CDS model, one scope and one role template are generated with the exact name of the CDS role.

::: tip Re-generate on model changes
You can have such a file re-generated via
```sh
cds compile srv --to xsuaa > xs-security.json
```
:::

See [Application Security Descriptor Configuration Syntax](https://help.sap.com/docs/HANA_CLOUD_DATABASE/b9902c314aef4afb8f7a29bf8c5b37b3/6d3ed64092f748cbac691abc5fe52985.html) in the SAP HANA Platform documentation for the syntax of the _xs-security.json_ and advanced configuration options.

<!-- REVISIT: Not ideal cds compile --to xsuaa can generate invalid xs-security.json files -->
::: warning Avoid invalid characters in your models
Roles modeled in CDS may contain characters considered invalid by the XSUAA service.
:::

If you modify the _xs-security.json_ manually, make sure that the scope names in the file exactly match the role names in the CDS model, as these scope names will be checked at runtime.

### Publish Security Descriptor

If there's no _mta.yaml_ present, run this command:

```sh
cds add mta
```

::: details See what this does in the background…

1. It creates an _mta.yaml_ file with an `xsuaa` service.
2. The created service added to the `requires` section of your backend, and possibly other services requiring authentication.
::: code-group
```yaml [mta.yaml]
modules:
  - name: bookshop-srv
    requires:
      - bookshop-auth // [!code ++]
resources:
  name: bookshop-auth // [!code ++]
  type: org.cloudfoundry.managed-service // [!code ++]
  parameters: // [!code ++]
    service: xsuaa // [!code ++]
    service-plan: application // [!code ++]
    path: ./xs-security.json # include cds managed scopes and role templates // [!code ++]
    config: // [!code ++]
      xsappname: bookshop-${org}-${space} // [!code ++]
      tenant-mode: dedicated # 'shared' for multitenant deployments // [!code ++]
```
:::


Inline configuration in the _mta.yaml_ `config` block and the _xs-security.json_ file are merged. If there are conflicts, the [MTA security configuration](https://help.sap.com/docs/HANA_CLOUD_DATABASE/b9902c314aef4afb8f7a29bf8c5b37b3/6d3ed64092f748cbac691abc5fe52985.html) has priority.

[Learn more about **building and deploying MTA applications**.](/guides/deployment/){ .learn-more}

### Assign Roles in SAP BTP Cockpit

This is a manual step an administrator would do in SAP BTP Cockpit. See [Set Up the Roles for the Application](/node.js/authentication#auth-in-cockpit) for more details. 
If a user attribute isn't set for a user in the IdP of the SAP BTP Cockpit, this means that the user has no restriction for this attribute. 
For example, if a user has no value set for an attribute "Country", they're allowed to see data records for all countries.
In the _xs-security.json_, the `attribute` entity has a property `valueRequired` where the developer can specify whether unrestricted access is possible by not assigning a value to the attribute.



## Developing with CAP Users { #developing-with-users }


### Programmatic Reflection { #reflection  }

UserInfo

req.user
req.tenant

The service provider frameworks **automatically enforce** restrictions in generic handlers. They evaluate the annotations in the CDS models and, for example:

* Reject incoming requests if static restrictions aren't met.
* Add corresponding filters to queries for instance-based authorization, etc.

If generic enforcement doesn't fit your needs, you can override or adapt it with **programmatic enforcement** in custom handlers:

- [Authorization Enforcement in Node.js](/node.js/authentication#enforcement)
- [Enforcement API & Custom Handlers in Java](/java/security#enforcement-api)


### Modifying Users { #modifying-users }
  - UserProvider  


Depending on the configured [authentication](#prerequisite-authentication) strategy, CAP derives a *default set* of user claims containing the user's name, tenant and attributes:

| CAP User Property   | XSUAA JWT Property               | IAS JWT Property        |
|---------------------|----------------------------------|-------------------------|
| `$user`             | `user_name`                      | `sub`                   |
| `$user.tenant`      | `zid`                            | `zone_uuid`             |
| `$user.<attribute>` | `xs.user.attributes.<attribute>` | All non-meta attributes |

::: tip
CAP does not make any assumptions on the presented claims given in the token. String values are copied as they are.
:::

In most cases, CAP's default mapping will match your requirements, but CAP also allows you to customize the mapping according to specific needs. For instance, `user_name` in XSUAA tokens is generally not unique if several customer IdPs are connected to the underlying identity service.
Here a combination of `user_name` and `origin` mapped to `$user` might be a feasible solution that you implement in a custom adaptation. Similarly, attribute values can be normalized and prepared for [instance-based authorization](#instance-based-auth). Find details and examples how to programmatically redefine the user mapping here:

- [Set up Authentication in Node.js.](/node.js/authentication)
- [Custom Authentication in Java.](/java/security#custom-authentication)

::: warning Be very careful when redefining `$user`
The user name is frequently stored with business data (for example, `managed` aspect) and might introduce migration efforts. Also consider data protection and privacy regulations when storing user data.
:::


### Propagating Users { #propagating-users }
	- request internal
	- tenant switch
	- privileged mode
	- original authentication claim
	- asynchronous -> implicit to technical user

### Tracing { #user-tracing }

<div class="impl java">

DEBUG level by default

logging.level.com.sap.cds.security.authentication: DEBUG

```sh
MockedUserInfoProvider: Resolved MockedUserInfo [id='mock/viewer-user', name='viewer-user', roles='[Viewer]', attributes='{Country=[GER, FR], tenant=[CrazyCars]}'
```

Never in production!
</div>

<div class="impl node">
TODO
</div>


## Ptifalls

- asynchronous business requests
