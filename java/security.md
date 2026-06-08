---
synopsis: >
  Describes authentication and authorization specific for CAP Java.
status: released
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html
---

<script setup>
  import { h } from 'vue'
  const X  =  () => h('span', { class: 'x',   title: 'Available' }, ['✓'] )
  const Na =  () => h('span', { class: 'na',  title: 'Not available' }, ['✗'] )
</script>
<style scoped>
  .x   { color: var(--vp-c-green-1); }
  .na  { color: var(--vp-c-red-1); }
</style>

# Security
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}

{ #security}

::: info
This chapter appends CAP Java sepcifc information only. 
Consult the comprehensive [Security Guide](../guides/security/) first to learn about CAP Security features in general.
:::

## Authentication { #authentication}

### Auto Configuration { #xsuaa-ias }

To enable auto-configuration for authentication based on platform services, following two conditions need to be met:
1. Required Maven [dependencies](#maven-dependencies) available.
2. [Binding](#bindings) to a corresponding service instance (XSUAA and/or IAS) is available at runtime.

::: warning
Only **if both, the library dependencies and an XSUAA or IAS service binding are in place**, the CAP Java SDK activates a Spring security configuration, which enforces authentication for all endpoints **automatically**.
:::

#### Maven Dependencies { #maven-dependencies }
To ensure the proper maven dependencies, we recommend using the `cds-starter-cloudfoundry` or the `cds-starter-k8s` starter bundle.
Both can be active for the local scenario.

:::details Runtime Maven dependencies required for authentication

- `cds-feature-identity`
- `org.springframework.boot:spring-boot-starter-security`
- `com.sap.cloud.security:resourceserver-security-spring-boot-starter` that brings [spring-security library](https://github.com/SAP/cloud-security-services-integration-library/tree/main/spring-security)

:::

#### Service Bindings { #bindings }

Additionally, your application must be bound to corresponding service instances depending on your scenario.  
The following list describes which service must be bound depending on the tokens your application should accept:
   * only accept tokens issued by XSUAA --> bind your application to an [XSUAA service instance](../guides/security/authentication#xsuaa-auth)
   * only accept tokens issued by IAS --> bind your application to an [IAS service instance](../guides/security/authentication#ias-auth)
   * accept tokens issued by XSUAA and IAS --> bind your application to service instances of [both types](../guides/security/authentication#hybrid-auth).

::: tip Unique Binding
CAP Java picks only a single binding of each type. If you have multiple XSUAA or IAS bindings, choose a specific binding with property `cds.security.xsuaa.binding` respectively `cds.security.identity.binding`.
Choose an appropriate XSUAA service plan to fit the requirements. For instance, if your service should be exposed as technical reuse service, make use of plan `broker`.
:::

### Custom Authentication { #spring-boot }

#### Authenticated Endpoints { #auth-endpoints }

By default, the [auto-configuration](#xsuaa-ias) covers
* Protocol adapter endpoints (managed by CAP such as OData V4/V2 or custom protocol adapters)
* Remaining custom endpoints (not managed by CAP such as custom REST controllers or Spring Actuators)

There are several application parameters in section `cds.security.authentication` that influence the behaviour of the auto-configuration wit hregards to the affected endpoints:

| Configuration Property                               | Description                                             | Default
| :---------------------------------------------------- | :----------------------------------------------------- | ------------
| `authenticateUnknownEndpoints`  | Determines, if security configurations enforce authentication for endpoints not managed by protocol-adapters. | `true`
| `authenticateMetadataEndpoints`  | Determines, if OData $metadata endpoints enforce authentication. | `true`

#### Authentication Modes { #auth-mode}

The property `cds.security.authentication.mode` controls the strategy used for authentication of protocol-adapter endpoints. There are four possible values:

| Configuration Property                               | Description                                             |
| :---------------------------------------------------- | :----------------------------------------------------- |
| `never` | No endpoint requires authentication. All protocol-adapter endpoints are considered public.
| `model-relaxed` | Authentication is derived from the authorization annotations `@requires` and `@restrict`. If no such annotation is available, the endpoint is considered public.
| `model-strict` | Authentication is derived from the authorization annotations `@requires` and `@restrict`. If no such annotation is available, the endpoint is authenticated. An explicit `@requires: 'any'` makes the endpoint public (Default).
| `always` | All endpoints require authentication.

By default the authentication mode is set to `model-strict` to comply with secure-by-default.
In that case you can use the annotation `@requires: 'any'` on service-level to make the service and its entities public again.
You can only make an endpoint public if the full endpoint path is also considered public.
For example you can only make an entity public, if the service that contains it is also considered public.

::: tip
The authentication mode has no impact on the *authorization* behaviour.
:::

#### Overrule Partially { #custom-spring-security-config }

If you want to explicitly change the automatic security configuration, you can add an _additional_ Spring security configuration on top that overrides the default configuration by CAP.
This can be useful if an alternative authentication method is required for *specific endpoints* of your application.

As the default security configurations provided by CAP act as the last line of defense and handle any request by default, you need to ensure that your custom security configurations have higher precedence. At the `SecurityFilterChain` bean method,  set the `@Order` annotation with a lower numeric value, for example `1`:

```java
@Configuration
@EnableWebSecurity
public class AppSecurityConfig {

  @Bean
  @Order(1) // needs to have higher priority than CAP security config
  public SecurityFilterChain appFilterChain(HttpSecurity http) throws Exception {
    return http
      .securityMatcher(AntPathRequestMatcher.antMatcher("/public/**"))
      .csrf(c -> c.disable()) // don't insist on csrf tokens in put, post etc.
      .authorizeHttpRequests(r -> r.anyRequest().permitAll())
      .build();
  }

}
```
Due to the custom configuration, all URLs matching `/public/**` are opened for public access.

::: warning _
Be cautious with the configuration of the `HttpSecurity` instance in your custom configuration. Make sure that only the intended endpoints are affected.
:::

Another typical example is the configuration of [Spring Actuators](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html#actuator.enabling). For example a custom configuration can apply basic authentication to actuator endpoints `/actuator/**`:

```java
@Configuration
@EnableWebSecurity
public class ActuatorSecurityConfig {

  @Bean
  @Order(1)
  public SecurityFilterChain actuatorFilterChain(HttpSecurity http)
      throws Exception {
    return http
      .securityMatcher(AntPathRequestMatcher.antMatcher("/actuator/**"))
      .httpBasic(Customizer.withDefaults())
      .authenticationProvider(/* basic auth users with PasswordEncoder */)
      .authorizeHttpRequests(r -> r.anyRequest().authenticated())
      .build();
  }

}
```


#### Overrule Fully { #custom-spring-security-alone }

In case you want to write your own custom security configuration that acts as a last line of defense and handles any request you need to disable the CAP security configurations by setting <Config java>cds.security.authentication.authConfig.enabled: false</Config>, as Spring Security forbids registering multiple security configurations with an any request security matcher.

If you even want to deactivate OAuth token validation for XSUAA or IAS, e.g. to establish an own authentication strategy, 
the following properties can be used:

| Configuration Property                               | Description                                             | Default
| :---------------------------------------------------- | :----------------------------------------------------- | ------------
| `cds.security.xsuaa.enabled`  | Whether automatic XSUAA security configuration is enabled. | `true`
| `cds.security.identity.enabled`  | Whether automatic IAS security configuration is enabled. | `true`



## CAP Users { #custom-authentication}

CAP is not bound to any specific authentication method or user representation such as those introduced with XSUAA or IAS; it runs requests based on a [user abstraction](../guides/security/cap-users#claims). 
The CAP user of a request is represented by a [UserInfo](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/request/UserInfo.html) object that can be retrieved from the [RequestContext](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/request/RequestContext.html) as explained in the [authentication guide](../guides/security/cap-users#developing-with-users).

### Mock Users { #mock-users}

By default, CAP Java creates a security configuration, which accepts _mock users_ for test purposes.

::: tip

Mock users are only initialized if the `org.springframework.boot:spring-boot-starter-security` dependency is present in the `pom.xml` file of your service.

:::

#### Preconfigured Mock Users { #preconfigured-mock-users}

For convenience, the runtime creates default mock users reflecting the [pseudo roles](../guides/security/cap-users#pseudo-roles): 

| Name                               | Role                                             | Password
| :---------------------------------------------------- | :----------------------------------------------------- | ------------
| `authenticated`  | `authenticated-user` | _empty_
| `system`  |`system-user` | _empty_
| `privileged`  | privileged mode | _empty_


For example, requests sent during a Spring MVC unit test with annotation `@WithMockUser("authenticated")` will pass authorization checks that require `authenticated-user`. 
The privileged user will pass any authorization checks. 

There are several properties to control behavioud of mock users:

| Configuration Property                               | Description                                             | Default
| :---------------------------------------------------- | :----------------------------------------------------- | ------------
| `cds.security.mock.defaultUsers`  | Activates creation of pre-defined mock users at startup. | `true`
| `cds.security.mock.enabled`  | Activates mock users. | `false` in production profile, `true` otherwise.


#### Custom Mock Users {#custom-mock-users}

You can also define mock users explicitly. This mock user configuration only applies if:
* The service runs without a service binding (non-production mode)
* Mock users are defined in the active application configuration

Define the mock users in a Spring profile, which may be only active in local testing, as in the following example:
::: code-group
```yaml [srv/src/main/resources/application.yaml]
---
spring:
  config.activate.on-profile: default
cds:
  security:
    mock:
      users:
        - name: Viewer-User
          tenant: CrazyCars
          roles:
            - Viewer
          attributes:
            Country: [GER, FR]
          additional:
            email: myviewer@crazycars.com
          features:
            - cruise
            - park

        - name: Admin-User
          password: admin-pass
          privileged: true
          features:
            - "*"
```
:::
- Mock user with name `Viewer-User` is a typical business user with SaaS tenant `CrazyCars` who has the assigned role `Viewer` and user attribute `Country` (`$user.Country` evaluates to the value list `[GER, FR]`). This user also has the additional attribute `email`, which can be retrieved with `UserInfo.getAdditionalAttribute("email")`. The [features](../java/reflection-api#feature-toggles) `cruise` and `park` are enabled for this mock user.
- `Admin-User` is a user running in privileged mode. Such a user is helpful in tests that bypasses all authorization handlers.

A setup for Spring MVC-based tests based on the given mock users and the CDS model from [above](#spring-boot) could look like this:

```java
@RunWith(SpringRunner.class)
@SpringBootTest
@AutoConfigureMockMvc
public class BookServiceOrdersTest {
	String ORDERS_URL = "/odata/v4/BooksService/Orders";

	@Autowired
	private MockMvc mockMvc;

	@Test
	@WithMockUser(username = "Viewer-User")
	public void testViewer() throws Exception {
		mockMvc.perform(get(ORDERS_URL)).andExpect(status().isOk());
	}
	@Test
	public void testUnauthorized() throws Exception {
		mockMvc.perform(get(ORDERS_URL)).andExpect(status().isUnauthorized());
	}
}
```

#### Mock Tenants

A `tenants` section allows to specify additional configuration for the _mock tenants_. In particular it is possible to assign features to tenants:
::: code-group
```yaml [srv/src/main/resources/application.yaml]
---
spring:
  config.activate.on-profile: test
cds:
  security:
    mock:
      users:
        - name: Alice
          tenant: CrazyCars
      tenants:
        - name: CrazyCars
          features:
            - cruise
            - park
```
:::
The mock user `Alice` is assigned to the mock tenant `CrazyCars` for which the features `cruise` and `park` are enabled.



### Custom Users { #custom-users}

Therefore, if you bring your own authentication, you must transform the authenticated user and inject it as `UserInfo` to the current request. This is done by means of [UserInfoProvider](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/runtime/UserInfoProvider.html) interface that can be implemented as Spring bean as demonstrated in [Registering Global Parameter Providers](../java/event-handlers/request-contexts#global-providers).
More frequently you might have the requirement to just adapt the request's `UserInfo` which is possible with the same interface:


```java
@Component
public class CustomUserInfoProvider implements UserInfoProvider {

    private UserInfoProvider defaultProvider;

    @Override
    public UserInfo get() {
        ModifiableUserInfo userInfo = UserInfo.create();
        if (defaultProvider != null) {
            UserInfo prevUserInfo = defaultProvider.get();
            if (prevUserInfo != null) {
                userInfo = prevUserInfo.copy();
            }
        }
        if (userInfo != null) {
           /* any modification of the resolved user goes here: */
           XsuaaUserInfo xsuaaUserInfo = userInfo.as(XsuaaUserInfo.class);
           userInfo.setName(xsuaaUserInfo.getEmail() + "/" +
                            xsuaaUserInfo.getOrigin()); // normalizes name
        }

        return userInfo;
    }

    @Override
    public void setPrevious(UserInfoProvider prev) {
        this.defaultProvider = prev;
    }
}
```

In the example, the `CustomUserInfoProvider` defines an overlay on the default XSUAA-based provider (`defaultProvider`). The overlay redefines the user's name by a combination of email and origin.
