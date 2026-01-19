# CAP-level Integration of Platform Services (Calipso)

CAP applications frequently integrate with platform services like identity, logging, document storage, notifications, and telemetry. The recommended approach is to use CAP plugins, which encapsulate reusable integrations and domain artifacts following the Calesi pattern.

## What are Calipso Plugins?

Plugins minimize setup and maintenance, enabling rapid adoption through plug-and-play principles and simple configuration. For advanced needs, plugins can offer configurable options while adhering to CAP service conventions, allowing customization without unnecessary reimplementation. They built on top of the [CAP-level Service Integration (Calesi)](./calesi.md) pattern.

<p align="center">
  <img src="./assets/calipso-usecases.drawio.svg" alt="Plugin use cases" />
</p>


::: details Reasoning

Suitable plugin use cases:
- **Integrating with an existing SAP BTP service** is the primary example for Calipso plugins, such as the audit-logging, attachments or data-privacy plugin. They abstract the technical integration with the underlying SAP BTP service, only requiring the developer to properly model and semantically annotate their data model.
- **Enhancing CAP runtime functionality** is another primary use case, like the [odata-v2](../../plugins/index.md#odata-v2-adapter-odata-v2-proxy), [websockets](../../plugins/index.md#websocket) or [graphql](../../plugins/index.md#graphql-adapter) plugins, where the existing CAP runtime is enhanced with additional functionality, while keeping the core framework clean and modular.
- **Generating additional database-level artifacts** is done, for example, by the [change-tracking](../../plugins/index.md#change-tracking) or data-privacy plugin to push down logic to the database layer or generate additional services. This keeps the application layer lean and improves performance.
- **Reuse UI sections** via annotations are leveraged by [change-tracking](../@external/plugins/index.md#change-tracking) or attachments, for example, to automatically surface data in Fiori Elements UIs. Importantly, these plugins provide only the annotations, no dedicated UI coding is included.

Unsuitable plugin use cases:
- If you need to provide **reusable UI components**, refer to the Fiori elements guide on [developing reuse components](https://ui5.sap.com/#/topic/6314fcd2510648fbaad3cee8a421030d).
- If you need to offer a whole reuse UI app or [Shell plugin](https://help.sap.com/docs/build-work-zone-standard-edition/sap-build-work-zone-standard-edition/add-shell-plugin?locale=en-US), you should develop a reuse SaaS service on BTP. For example, if a customer wants a dedicated app to view all drafts from across multiple apps of a solution, this would not be a [Calesi](./calesi.md) scenario. Creating a Calipso plugin would result in multiple applications being created in customer landscapes, one per application which uses the plugin, which is considered bad practice. A reuse SaaS is the right way to implement such a scenario. Only one generic UI, the SaaS UI, is seen in the customer landscape for viewing all drafts across applications improving the UX for end users and avoiding cluttering the customer landscapes with redundant UIs.

:::

### Principles for Calipso Plugins

Calipso builds on the foundation of Calesi. The core Calesi concepts—such as ease of use, local testability, evolution without disruption, and promoting reuse—should always guide Calipso plugin development.

<p align="center">
  <img src="./assets/calesi-principles.drawio.svg" alt="The four foundations of Calesi: Easy to use, Local testability, Evolution without disruption and Reuse not reinvent." />
</p>

### Quickstart development

This guide focuses on general concepts and does not cover language-specific implementation details. For concrete instructions on building plugins for specific runtimes, refer to the following guides:
- [CAP Node.js Plugin Guide](../../node.js/cds-plugins.md)
- [CAP Java Plugin Guide](../../java/building-plugins.md)

## Implement your plugin

### Consider all CAP runtimes

Plugins should be available for both CAP runtimes. To avoid duplicate effort, consider which parts can be unified:

<p align="center">
  <img src="./assets/calesi-runtime-decision-tree.svg" alt="What is needed for efficient development." />
</p>

### Sidecar approach

A [sidecar](https://tutorials.cloudfoundry.org/cf4devs/advanced-concepts/sidecars/) on BTP is essentially another process running as part of the same Cloud Foundry application. This allows you to implement custom CAP service endpoints only once but staying compatible with all CAP runtimes.

If the sidecars limitations are too restrictive for your use case, having one implementation for both runtimes is also possible if you configure the CAP service endpoints provided by the plugin as their own micro-service. The multi-tenancy service from CAP is an example of that.

### Authorise another service to call the CAP app

When the external service needs to call the CAP app, use the following ways to grant the external service the permissions to access the service.

#### Enforce permissions

Use `@requires : 'MyServiceRestriction'` annotated to your CDS service to enforce that any user trying to send a request against this OData service must have the scope (XSUAA) / group (IAS/AMS) assigned to them. CAP will take care of the enforcement.

#### XSUAA 

<StatusBadge
    type="warning"
    text="Legacy"
    title="This feature is legacy and IAS / AMS should be preferred."
  />

When the CAP application is using XSUAA for enforcing authorizations, you can grant the scope needed for the CAP service via the "grant-as-authority-to-apps" configuration, like in the following sample `xs-security.json` file:

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

In the IAS/AMS scenario you would create a [provided api](https://help.sap.com/docs/btp/sap-business-technology-platform/regular-and-native-sidecar-containers) with the same name as the role you require with the `@requires` annotation.

This provided API then needs to be manually assigned to the consuming service in the Cloud Identity Services UI and at runtime AMS will map the assigned provided API to the role that is required by your CAP service.

### Be multi-tenancy ready

Your plugin must work in a multi-tenancy (MTX) setup. Refer to the [multi-tenancy](../../guides/multitenancy/index.md) documentation to learn more.

Key considerations:
- **Model provisioning by MTX:** In an MTX setup, the CDS model is provided by the MTX micro-service. Therefore, any plugin that modifies the data model needs to be included in the micro-service.
- **Register your service as a SaaS dependency:** CAP's MTX service provides hooks that allow you to declare the service your plugin integrates with as a SaaS dependency. This ensures that your service is provisioned for every subscriber of the CAP application.
- **Respect customer model extensions:** MTX allows customers to extend the CDS model. If your plugin introduces security-relevant custom annotations, ensure that these cannot be removed or overridden by customer extensions.
- **Avoid entity-specific handlers:** Multi-tenant applications often use feature flags to roll out functionality gradually. Handlers registered by your plugin must therefore not depend on specific entities, so they continue to function even when certain entities are gated behind feature flags.


## Configuration

- **Plug & Play, convention over configuration** — Favor conventions that enable automatic integration and minimize manual configuration steps.
- **Always use `cds.env`** — For environment configuration, always use CAP's built-in `cds.env`. Never use `xsenv`, `VCAP_SERVICES`, or similar environment-specific mechanisms directly.
- **Use Service Bindings à la CAP** — Bind services using CAP's service binding conventions (e.g., `cds.requires.db...`) for consistent and maintainable integration.
- **Use Profiles for environment-specific configuration** — Leverage CAP profiles to specify environment-specific settings, such as connecting to BTP services in production and mocking data locally during development or testing.

## Test Your Plugin

Thoroughly testing your plugin ensures reliability, maintainability, and a smooth developer experience for consumers. Effective testing covers not only individual functions but also integration with CAP services, deployment scenarios, and performance. The following strategies help you validate that your plugin works as intended across different environments and use cases.

<p align="center">
  <img src="./assets/calesi-testing.drawio.svg" alt="Outlining the following testing strategies." />
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

### UI tests

Some plugins like `@cap-js/attachments` or `@cap-js/change-tracking` add UI annotations, which modify how Fiori elements will render the UI. Write [UI5 One Page Acceptance](https://ui5.sap.com/#/topic/2696ab50faad458f9b4027ec2f9b884d) tests to verify that the resulting UI renders correctly and that your annotation generation is valid. The UI5 OPA tests can directly call the CAP backend to leverage the same mock data, avoiding a separate mock server.

### Performance tests

Performance is critical in cloud scenarios. If your plugin hooks into existing request cycles, for example by adding SAVE or READ handlers, conduct performance tests to ensure it does not significantly degrade response times or system throughput.

### Unit tests

Write unit tests only for complex functions where it is really needed. For most cases, integration tests against the CAP API are preferred because CAP handlers may introduce side effects that unit tests would fail to capture.

Also avoid unit-testing CAP's DB API or other CAP-provided APIs, as testing these is covered by the respective CAP components.

## Documentation

### Readme

Have a well-described `README.md` file explaining how to contribute to your plugin but also how to get started using your plugin.

For service integrations, you should also include an Architecture Diagram to show how CAP integrates with your BTP service. See the [BTP Solution Diagram](https://github.com/SAP/btp-solution-diagrams/tree/main/assets/shape-libraries-and-editable-presets/draw.io) templates for [draw.io](https://draw.io).

### Capire

If your plugin is in the `cap-js` and/or `cap-java` organization, add the documentation to [capire](https://github.com/capire/docs). <span id="afterCapireOrg" />

If you are part of `cap-js-community` or another organization your plugins documentation is _usually_ not added to Capire.
