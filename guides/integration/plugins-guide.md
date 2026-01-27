# CAP Plugins Guide 
Also known as *'Calipso'* {.subtitle}

CAP applications frequently integrate with platform services like identity, logging, document & object storage, notifications, and telemetry. The recommended approach is to use CAP plugins, which encapsulate reusable integrations and domain artifacts following the Calesi pattern.
{.abstract}

[toc]:./
[[toc]]

## What are CAP Plugins?

CAP plugins are reusable modules designed to integrate external services or extend CAP functionality across multiple applications. Typical examples include the [attachment](../../plugins/index.md#attachments) and [change-tracking](../../plugins/index.md#change-tracking) plugins, which encapsulate common integration patterns and domain logic.

By following plug-and-play principles, plugins minimize setup and ongoing maintenance, enabling rapid adoption with minimal configuration. They are built to work seamlessly with CAP service conventions, so developers can easily enable, configure, and customize integrations without duplicating effort or reimplementing core logic.

For advanced scenarios, plugins expose configurable options—always adhering to CAP’s conventions—so teams can tailor integrations to their needs while maintaining consistency and reliability. Under the hood, plugins leverage the [CAP-level Service Integration (Calesi)](./calesi.md) pattern, ensuring that integrations are robust, testable, and evolve without disruption. This approach promotes reuse, simplifies upgrades, and accelerates development across the CAP ecosystem.

<p align="center">
  <img src="./assets/calipso-usecases.drawio.svg" alt="Plugin use cases" />
</p>


::: details Decision Rationale


✅ <u>Valid use cases:</u>
- **Integrating with SAP BTP services:** The main purpose of plugins is to abstract technical integration with SAP BTP services—such as audit-logging, attachments, or data-privacy—so developers only need to model and annotate their data semantically.
- **Extending CAP runtime functionality:** Plugins like [odata-v2](../../plugins/index.md#odata-v2-adapter-odata-v2-proxy), [websockets](../../plugins/index.md#websocket), or [graphql](../../plugins/index.md#graphql-adapter) add new capabilities to the CAP runtime, keeping the core framework modular and clean.
- **Generating database-level artifacts:** Plugins such as [change-tracking](../../plugins/index.md#change-tracking) or data-privacy can generate additional database artifacts or services, pushing logic to the database layer for better performance and a leaner application layer.
- **Reusing UI sections via annotations:** Plugins like [change-tracking](../../plugins/index.md#change-tracking) or attachments provide UI annotations that automatically surface data in Fiori Elements UIs. These plugins supply only annotations, not custom UI code.

❌ <u>Invalid use cases:</u>
- **Reusable UI components:** If you need to provide reusable UI components, use the Fiori elements guide on [developing reuse components](https://ui5.sap.com/#/topic/6314fcd2510648fbaad3cee8a421030d).
- **Standalone UI apps or Shell plugins:** If your goal is to deliver a full reuse UI app or [Shell plugin](https://help.sap.com/docs/build-work-zone-standard-edition/sap-build-work-zone-standard-edition/add-shell-plugin?locale=en-US), create a reuse SaaS service on BTP instead. For example, a generic app to view drafts across multiple solutions should be implemented as a SaaS UI, not as a plugin. This approach avoids deploying redundant UIs in every application, resulting in a cleaner customer landscape and a better user experience.

:::

### Principles

Calipso builds on the foundation of [Calesi](./calesi.md). The core Calesi concepts—such as ease of use, local testability, evolution without disruption, extrinsic extensibility and promoting reuse—should always guide Calipso plugin development.

<p align="center">
  <img src="./assets/calipso-principles.drawio.svg" alt="The five foundations of Calesi + Calipso: Easy to use, Local testability, Evolution without disruption, extrinsic extensibility and Reuse not reinvent." />
</p>

### Quickstart development

This guide focuses on general concepts and does not cover language-specific implementation details. For concrete instructions on building plugins for specific runtimes, refer to the following guides:
- [CAP Node.js Plugin Guide](../../node.js/cds-plugins.md)
- [CAP Java Plugin Guide](../../java/building-plugins.md)

## Implement your plugin

### Consider all CAP runtimes

Plugins should be available for both CAP runtimes. To avoid duplicate effort, consider which parts can be unified:

<p align="center">
  <img src="./assets/calipso-runtime-decision-tree.svg" alt="What is needed for efficient development." />
</p>

### Concept architecture first

Before jumping into implementation, begin by designing the architecture of your plugin. Define the responsibilities, integration points, and how your plugin will interact with CAP services and external systems. Consider aspects such as runtime compatibility, extensibility, and maintainability. Document your architecture decisions, including diagrams if possible, to clarify the overall structure and guide development.

Once the architecture is clear and agreed upon, proceed to implement the plugin according to your design. This approach helps avoid rework, ensures alignment with CAP principles, and makes it easier to onboard contributors.

### Sidecar approach

A [sidecar](https://tutorials.cloudfoundry.org/cf4devs/advanced-concepts/sidecars/) on BTP is essentially another process running alongside your app service. By implementing custom CAP service endpoints in a sidecar, you avoid reimplementing the same functionality for both Node.js and Java runtimes—ensuring compatibility and reducing duplicate effort.

If sidecar limitations are too restrictive for your use case, you can still achieve a single implementation for both runtimes by configuring the CAP service endpoints provided by the plugin as their own micro-service. CAP's multi-tenancy service is an example of this approach.

### Authorization

When an external service needs to call your CAP app, use the following ways to grant the external service the permissions to access the service.

#### Enforce permissions

Use `@requires : 'MyServiceRestriction'` annotated to your CDS service to enforce that any user trying to send a request against this OData service must have the scope (XSUAA) / group (IAS/AMS) assigned to them. CAP will take care of the enforcement.

#### XSUAA

When the CAP application is using [XSUAA](../../guides/security/authentication.md#xsuaa-auth) for enforcing authorizations, you can grant the scope needed for the CAP service via the "grant-as-authority-to-apps" configuration, like in the following sample `xs-security.json` file:

::: code-group

```cds [service.cds]
@requires : 'MyServiceRestriction'
service JobScheduling {
  action toBeCalledByBTPService();
}
```
```json [xs-security.json]
{
  "scopes": [
    {
      "name": "$XSAPPNAME.MyServiceRestriction",
      "description": "Lorem ipsum",
      "grant-as-authority-to-apps": ["$XSSERVICENAME(myservice-instance)"] // [!code ++]
    }
  ]
}
```
```yaml [mta.yaml]
resources:
  - name: myservice-instance
    type: org.cloudfoundry.managed-service
    parameters:
      service: <service>
      service-plan: <plan>
      config:
        xs-security: // [!code ++]
          authorities: // [!code ++]
            - $ACCEPT_GRANTED_AUTHORITIES // [!code ++]
  - name: cap-app-auth
    type: org.cloudfoundry.managed-service
      requires:
        - name: app-api
      parameters:
        config:
          tenant-mode: shared
          xsappname: cap-app-${org}-${space}
        path: ./xs-security.json
        service: xsuaa
        service-plan: application
      processed-after: [myservice-instance] // [!code ++]
```
:::

Furthermore, in the deployment descriptor you need to enable that the service instance accepts granted scopes from XSUAA.


#### IAS/AMS

In the [IAS/AMS](../../guides/security/authentication.md#adding-ias) scenario you would create a [provided api](https://help.sap.com/docs/btp/sap-business-technology-platform/regular-and-native-sidecar-containers) with the same name as the role you require with the `@requires` annotation.

This provided API then needs to be manually assigned to the consuming service in the Cloud Identity Services UI and at runtime AMS will map the assigned provided API to the role that is required by your CAP service.

### Logging

Add comprehensive debug logging throughout your plugin to simplify troubleshooting and support. Effective logging helps developers quickly identify issues, understand plugin behavior, and trace integration points.

**Best practices for logging:**
- **Use CAP's built-in logging APIs** ([node.js](../../node.js/cds-log.md) | [Java](../../java/operating-applications/observability.md)) to ensure consistency and integration with platform tools.
- **Log at key lifecycle events:** initialization, configuration loading, service binding, request handling, error handling, and external service interactions.
- **Include contextual information** such as tenant, user, request ID, and relevant parameters to make logs actionable.
- **Differentiate log levels:** use `debug` for detailed troubleshooting, `info` for high-level events, `warn` for recoverable issues, and `error` for failures.
- **Enable configurable log verbosity** via CAP log levels so developers can adjust the level of detail as needed.
- **Document log levels** in your README so developers know how to enable different levels in your services.

Well-structured logging accelerates troubleshooting, improves maintainability, and enhances the developer experience for plugin consumers.

> [!WARNING]
> **Never log credentials, sensitive user information, or personal data.** Logging such information can lead to security breaches and violate privacy regulations like GDPR. Always review your logging statements to ensure no confidential or personally identifiable information is exposed.


### Be multi-tenancy ready

Your plugin must work in a multi-tenancy (MTX) setup. Refer to the [multi-tenancy](../../guides/multitenancy/index.md) documentation to learn more.

Key considerations:
- **Model provisioning by MTX:** In an MTX setup, the CDS model is provided by the MTX micro-service. Therefore, any plugin that modifies the data model needs to be included in the micro-service.
- **Register your service as a SaaS dependency:** CAP's MTX service provides hooks that allow you to declare the service your plugin integrates with as a SaaS dependency. This ensures that your service is provisioned for every subscriber of the CAP application.
- **Respect customer model extensions:** MTX allows customers to extend the CDS model. If your plugin introduces security-relevant custom annotations, ensure that these cannot be removed or overridden by customer extensions.
- **Avoid entity-specific handlers:** Multi-tenant applications often use feature flags to roll out functionality gradually. Handlers registered by your plugin must therefore not depend on specific entities, so they continue to function even when certain entities are gated behind feature flags.


### Configuration

- **Plug & Play, convention over configuration** — Favor conventions that enable automatic integration and minimize manual configuration steps.
- **Always use `cds.env`** — For environment configuration, always use CAP's built-in `cds.env`. Never use `xsenv`, `VCAP_SERVICES`, or similar environment-specific mechanisms directly.
- **Use Service Bindings à la CAP** — Bind services using CAP's service binding conventions (e.g., `cds.requires.db...`) for consistent and maintainable integration.
- **Use Profiles for environment-specific configuration** — Leverage CAP profiles to specify environment-specific settings, such as connecting to BTP services in production and mocking data locally during development or testing.

### Code completion 

If you must introduce new annotations, check if they can be added to [SAP's OData vocabulary](https://sap.github.io/odata-vocabularies/) as only these appear in the CDS code completion. Offering annotations without any code completion leads to a worse development experience!

::: details For Node.js plugins: 
- If your plugin offers new APIs, make sure they have code completion in VS Code by having [jsdoc](https://jsdoc.app/) comments or type definition files.
- Add typing for configuration options via a [schema](../../node.js/cds-plugins.md#configuration-schema).
:::

## Test Your Plugin

Thoroughly testing your plugin ensures reliability, maintainability, and a smooth developer experience for consumers. Effective testing covers not only individual functions but also integration with CAP services, deployment scenarios, and performance. The following strategies help you validate that your plugin works as intended across different environments and use cases.

Also ensure your plugin can run locally without requiring a hybrid connection. When external services are called, use mock data to accelerate development and support the principle of "local testability".

<p align="center">
  <img src="./assets/calipso-testing.drawio.svg" alt="Outlining the following testing strategies." />
</p>

### Test features not functions

Prefer integration tests at the CAP service API or HTTP level to validate features rather than individual functions. Tests should remain as implementation-agnostic as possible to reduce refactoring efforts as your plugin evolves.

### E2E tests

Use CAP's [hybrid mode](../../tools/cds-bind), which allows a local CAP service to connect to SAP BTP-hosted services, to test the actual service integration.

Example using jest:
```bash
cds bind --exec '--' npx jest
```

### Deployment tests

Include both single-tenant and multi-tenant deployments in your test strategy. Deploy the application with your plugin to ensure that it starts, provisions correctly, and runs on SAP BTP.

### Performance tests

Performance is critical in cloud scenarios. If your plugin hooks into existing request cycles, for example by adding SAVE or READ handlers, conduct performance tests to ensure it does not significantly degrade response times or system throughput.

### Unit tests

Write unit tests only for complex functions where it is really needed. For most cases, integration tests against the CAP API are preferred because CAP handlers may introduce side effects that unit tests would fail to capture.

Also avoid unit-testing CAP's DB API or other CAP-provided APIs, as testing these is covered by the respective CAP components.

<span id="afterUnitTests" />

## Documentation

### README

Have a well-described _README.md_ file explaining how to contribute to your plugin but also how to get started using your plugin.

For service integrations, you should also include an Architecture Diagram to show how CAP integrates with your BTP service. See the [BTP Solution Diagram](https://github.com/SAP/btp-solution-diagrams/tree/main/assets/shape-libraries-and-editable-presets/draw.io) templates for [draw.io](https://draw.io). 

> [!note]
> Make sure to save diagrams as editable svg vector so they can be adjusted later on and have change-tracking enabled through git.

### Capire

If your plugin is in the `cap-js` and/or `cap-java` organization, add the documentation to [capire](https://github.com/capire/docs). <span id="afterCapireOrg" />

> [!warning]
> If you are part of `cap-js-community` or another organization your plugins documentation is _usually_ not added to Capire.

### SFlight

Add your plugin to the SFlight sample showcasing it to the public. All modifications necessary in cds should be in their own cds file so developers can easily digest what modifications are necessary to use your plugin.
