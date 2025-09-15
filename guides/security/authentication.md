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

In essence, authentication verifies the user's identity and validates the presented claims, such as granted roles and tenant membership. 
Briefly, **authentication** ensures _who_ is going to use the service. 
In contrast, **authorization** dictates _how_ the user can interact with the application's resources based on their granted privileges. 
As access control relies on verified claims, authentication is a mandatory prerequisite for authorization.


[[toc]]





## Inbound Authentication { #inbound-authentication }

According to key concept [pluggable and customizable](key-concept-pluggable), the authentication method is customizable freely. 
CAP [leverages platform services](#key-concept-platform-services) to provide a set of authentication strategies that cover all important scenarios:

- For _local development_ and _unit testing_, [mock user](#mock-user-auth) is an appropriate built-in authentication feature.

- For _cloud deployments_, in particular deployments for production, CAP integration of [SAP Cloud Identity Services](https://help.sap.com/docs/IDENTITY_AUTHENTICATION) is first-choice for applications:  
  - [Identity Authentication Service (IAS)](#ias-auth) offers an [OpenId Connect](https://openid.net/connect/) compliant, cross-landscape identity management and single sign-on capabilities. 
  - [Authorization Management Service (AMS)](#ams-auth) offers central role and access management.

- [XS User and Authentication and Authorization Service](https://help.sap.com/docs/CP_AUTHORIZ_TRUST_MNG) (XSUAA) is a full-fleged [OAuth 2.0](https://oauth.net/2/)-based authorization server.
It is available to support existing applications and services in the scope of individual BTP landscapes.

::: tip
CAP applications can run IAS and XSUAA in hybrid mode to support a smooth migration.
:::

::: warn
Without security middleware configured, CDS services are exposed to public. 
Basic configuration of an authentication strategy is mandatory to protect your CAP application.
:::

### Mock User Authentication { #mock-user-auth }
  - Test Authentiction
  - setup
  - testing

::: Info
Mock users are deactivated by default in production environment.
:::

### IAS Authentication and AMS { #ias-auth }
  - setup cds add ias
  - role definition / assignment -> CAP Authorization ?
  
### AMS Integration { #ams-auth }
    - setup cds add ams
  - Define Reuse Service

### XSUAA Authentication { #xsuaa-auth }
  - setup cds add xsuaa
  - role definition / assignment -> CAP Authorization ?
  - Define Reuse Service

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

