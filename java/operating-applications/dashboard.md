---
synopsis: >
  This section describes how the CAP Developer Dashboard can be set up in both the local and cloud development environment to improve the developer experience.
status: released
---

# Developer Dashboard
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

::: warning Only to be used in development
The dashboard is only intended for use in the development environment. It is strictly forbidden to use the dashboard in a production environment, as it allows access to sensitive data and presents a security risk.
:::
<br>

![Screenshot of the CAP developer dashboard UI.](assets/dashboard.jpg)




The CAP Developer Dashboard simplifies development by providing a centralized point where developers can efficiently manage and monitor their CAP applications. It offers tools and functions to support the development process and helps developers to quickly identify and resolve problems. Additionally, the dashboard facilitates better integration of CAP components, such as messaging, resilience and multitenancy, ensuring seamless functionality throughout CAP applications.

You can get a brief overview of the dashboard's features in the [Developer Dashboard Presentation](https://broadcast.sap.com/replay/240604_recap?playhead=2188) at our RECAP 2024 conference.

Add the `cds-feature-dev-dashboard` feature to your maven dependencies:

```xml [pom.xml]
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-feature-dev-dashboard</artifactId>
</dependency>
```

## Local Setup

By default, the dashboard requires authorized access, which requires the `cds.Developer` role. The default mock user configuration provides the user `developer` already configured with this role. If you use your own mocked users, you must assign them the `cds.Developer` role if you want to give them access to the dashboard. 

::: code-group
```yaml [application.yaml]
cds:
  security:
    mock:
      users:
        - name: myUser
          password: myPass
          roles:
            - cds.Developer
```
:::

## Cloud Setup

If you also want to use the CAP Developer Dashboard in your cloud development scenario, you need to take a few more steps to achieve this. Let's take an example of a BTP Cloud Foundry app example with Approuter and XSUAA.

1. Deactivate the [production profile](../developing-applications/configuring#production-profile) in the _mta.yaml_.

2. Add the `cds.Developer` role to your security configuration in the *xs-security.json*.

3. Customize the approuter configuration (*xs-app.json*) by enabling support for websocket connections and defining the dashboard routes.

::: code-group
```yaml [mta.yaml]
modules:
  - name: my-cap-app-srv
    [...]
    properties:
      CDS_ENVIRONMENT_PRODUCTION_ENABLED: false
```

```json [xs-security.json]
{
	"xsappname": "dashboard-test",
	[...]
	"scopes": [
		{
			"name": "$XSAPPNAME.cds.Developer",
			"description": "CAP Developer"
		},
    [...]
	],
 "attributes": [
		{
			[...]
		}
	],
	"role-templates": [
		{
			"name": "capDeveloper",
			"description": "generated",
			"scope-references": [
				"$XSAPPNAME.cds.Developer"
			]
		},
    [...]
	]
}
```

```json [xs-app.json]
{
	...
	"authenticationMethod": "route",
	"websockets": {
		"enabled": true
	},
	"routes": [
		{
			"source": "^/dashboard",
			"authenticationType": "xsuaa",
			"destination": "backend"
		},
		{
			"source": "^/dashboard/(.*)",
			"authenticationType": "xsuaa",
			"destination": "backend"
		},
		{
			"source": "^/dashboard_api/(.*)",
			"authenticationType": "xsuaa",
			"destination": "backend"
		}, 
    [...]
	]
}
```
:::

Now you can deploy the application in BTP and assign the `cds.Developer` role to the users you want to grant access to the CAP Developer Dashboard.

::: warning
For security reasons, the **cds.Developer** role should only be used in conjunction with test users. It is strongly recommended not to use this role with users who could potentially be used in production systems.
:::

## Disable Authorization

In some cases, your application may run in a complex environment and you simply want to access the CAP Developer Dashboard running in your CAP Service Module directly without using a router in between. For this reason, you can switch off the authorization to grant direct unauthorized access.

1. Switch off authorization using one of the following options:

	::: code-group
	```yaml [application.yaml]
	cds:
	dashboard:
		authorization:
		enabled: false
	```

	```yaml [mta.yaml]
	modules:
	- name: my-cap-app-srv
		[...]
		properties:
		CDS_DASHBOARD_AUTHORIZATION_ENABLED: false
	```

	:::

2. Disable authentication. 

	::: code-group
	```java [WebSecurity]
	import static org.springframework.security.web.util.matcher.AntPathRequestMatcher.antMatcher;

	import org.springframework.context.annotation.Bean;
	import org.springframework.context.annotation.Configuration;
	import org.springframework.core.annotation.Order;
	import org.springframework.security.config.annotation.web.builders.HttpSecurity;
	import org.springframework.security.web.SecurityFilterChain;

	@Configuration
	public class WebSecurity {

		@Bean
	    @Order(1)
		public SecurityFilterChain appFilterChain(HttpSecurity http) throws Exception {

			return http
					.securityMatchers(m -> m.requestMatchers(antMatcher("/dashboard/**"), antMatcher("/dashboard_api/**")))
					.authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
					.csrf(c-> c.disable())
					.build();

		}
	}
	```
	:::


<div id="inOpenEndpoint" />
