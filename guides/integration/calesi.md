
# CAP-level Service Integration (Calesi)

Calesi is the pattern and set of tools for integrating external services into CAP applications in a runtime-agnostic, extensible way.

CAP provides built-in capabilities to integrate with external services at the CAP framework level. This guide explains how to consume and expose services using CAP's service integration features, known as Calesi. Calesi refers to the increasing numbers of BTP platform services which offer a CAP-level client library, drastically reducing the boilerplate code applications would have to write.

## Introduction

For example, adding attachments required thousands of lines of code, caring for the UI, streaming of large data, size limiting, malware scanning, multitenancy, and so forth... after we provided the [Attachments plugin](../../plugins/index#attachments), all an application needs to do now is to add that line to an entity:

```cds
entity Foo { //...
   attachments : Composition of many Attachments; // [!code focus]
}
```

Read through the runtime specific guides to learn about how to implement plugins:
- [CAP Node.js Plugin guide](../../node.js/cds-plugins.md)
- [CAP Java Plugin guide](../../java/building-plugins.md)

### Consider all CAP runtimes

Plugins should be available for both CAP runtimes. To avoid duplicate effort, consider which parts can be unified:

<p align="center">
  <img src="./assets/calesi-runtime-decision-tree.svg" alt="What is needed for efficient development." />
</p>

## Example

Whenever you have to integrate external services, you should follow the Calesi patterns. For example, let's take an audit logging use case: Data privacy regulations require to write audit logs whenever personal data is modified.

1. **Declare the service interface** — provide a CAP service that encapsulates outbound communication with the audit log service. Start by defining the respective service interface in CDS:

   ```cds
   service AuditLogService {

     event PersonalDataModified : LogEntry {
       subject   : DataSubject;
       changes   : many {
         field : String;
         old   : String;
         new   : String;
       };
       tenant    : Tenant;
       user      : User;
       timestamp : DateTime:
     }

   }
   ```

2. **Implement a mock variant** — Add a first service implementation: one for mocked usage during development:

   ```js
   class AuditLogService {init(){
     this.on('PersonalDataModified', msg => {
       console.log('Received audit log message', red.data)
     })
   }}
   ```

   >  [!tip]
   >
   > With that, you already fulfilled a few goals and guidelines from Hexagonal Architecture: The interface offered to your clients is agnostic and follows CAP's uniform service API style. Your consumers can use this mock implementation at development to speed up their [inner loop development](../../get-started/features.md#fast-inner-loops) phases.

3. **Provide the real impl** — Start working on the 'real' implementation that translates received audit log messages into outbound calls to the real audit log service.

   > [!note]
   >
   > You bought yourself some time for doing that, as your clients already got a working mock solution, which they can use for their development.

4. **Plug and play** —Add profile-aware configuration presets, so your consumers don't need to do any configuration at all:

   ```js
   {
     cds: {
       requires: {
         'audit-log': {
           "[development]": { impl: ".../audit-log-mock.js" },
           "[production]":  { impl: ".../the-real-audit-log-srv.js" },
         }
       }
     }
   }
   ```

5. **Served automatically?** — Check if you could automate things even more instead of having your use your service programmatically. For example, we could introduce an annotation *@PersonalData*, and write audit log entries automatically whenever an entity or element is tagged with that:

   ```js :line-numbers
   cds.on('served', async services => {
     const auditlog = await cds.connect.to('AuditLog')
     for (let each of services) {
       for (let e of each.entities) if (e['@PersonalData']) {
         each.on('UPDATE',e, auditlog.emit('PersonalDataModified', {...}))
       }
     }
   })
   ```

That example was an *outbound* communication use case. Basically, we encapsulate outbound channels with CAP Services, as done in CAP for messaging service interfaces and database services.

For *inbound* integrations, we would create an adapter, that is, a service endpoint which translates incoming messages into CAP event messages which it forwards to CAP services. With that, the actual service provider implementation is again a protocol-agnostic CAP service, which could as well be called locally, for example in development and tests.

> [!tip]
>
> Essentially, the 'Calesi' pattern is about encapsulating any external communication within a CAP-service-based interface, so that the actual consumption and/or implementation benefits from the related advantages, such as an agnostic consumption, intrinsic extensibility, automatic mocking, and so on.

## Framework Extensions

CAP Framework Extensions and Calesi Correlation

The CAP (Cloud Application Programming) framework is designed to be highly extensible, following the principle that **"Every active thing is a Service."** This extensibility applies not only to application-defined services but also to all core framework services, such as databases, messaging, remote proxies, and MTX (multi-tenancy) services.

### Extending Framework Services

Calesi (TODO: and Calipso?) plugins leverage the fundamental capability of CAP to generically extend any service—whether it is an application-defined service or a built-in framework service—using event handlers such as `.before`, `.on`, and `.after`. This extensibility applies not only to your own app services, but also to all core CAP framework services, including database services, messaging services, outbox services, and even services provided by other plugins, such as the Attachments service.

By attaching handlers to these services, plugins can intercept, modify, or enhance the behavior of core functionalities without changing the framework code itself. This enables powerful patterns for cross-cutting concerns, integration, and customization at the framework level.

#### Example: Extending the Primary Database Service

```js
cds.db.before('*', req => {
    console.log(req.event, req.target.name);
});
```

In this example, a handler is registered for all events (`'*'`) on the primary database service (`cds.db`). This allows you to log, validate, or modify requests before they are processed by the database.

#### Example: Extending Remote Service Proxies

```js
const proxy = await cds.connect.to('SomeRemoteService');
proxy.on('READ', 'Something', req => {
    // handle that remote call yourself
});
proxy.before('READ', '', req => {
    // modify requests before they go out to the actual service
});
proxy.after('READ', '', result => {
    // post-process responses from the service
});
```

Here, event handlers are attached to a remote service proxy. You can intercept and handle specific events, modify outgoing requests, or process incoming responses, providing fine-grained control over remote interactions.

### Correlation to Calesi

Calesi plugins make extensive use of these extension mechanisms to customize and enhance both application and framework services. By utilizing CAP's event-driven extension points, Calesi developers can:

- Implement cross-cutting concerns (e.g., logging, authorization, validation) centrally.
- Adapt and extend core and plugin-provided services to meet specific business requirements.
- Integrate with external systems or modify the flow of data between services.

This approach ensures that Calesi solutions remain modular, maintainable, and fully aligned with CAP's best practices for extensibility.

## Guiding Principles for Calesi Plugins

<p align="center">
  <img src="./assets/calesi-principles.svg" alt="The four foundations of Calesi: Easy to use, Local testability, Evolution without disruption and Reuse not reinvent." />
</p>

### Easy to use

Complexity should be hidden as much as possible while still offering configuration options for advanced use cases. As a baseline, an application must run after adding your plugin, before any configuration is applied.

For configuration adjustments, use CAP design patterns such as [profiles](../../node.js/cds-env.md#configuration-profiles-profiles) to offer different variants. Make sure that every configuration option has a sensible default that supports running on SAP BTP without additional setup.

### Local testability

CAP applications rely on `cds watch` for rapid local development, so plugins must function locally, even when they integrate with SAP BTP services.

If your plugin depends on a BTP service, provide a local mock implementation. The mock does not need to be sophisticated, a simple `console.log()` capturing what would be sent to the real service is sufficient. For reference, see how [@cap-js/attachments](https://github.com/cap-js/attachments) provides its local mock variant.

### Evolution without disruption

A core value proposition of CAP plugins is that integrating via a plugin is easier and more stable than implementing the integration manually.

Plugins should expose a semantic abstraction layer that remains stable over time. This layer should reflect the meaning of the underlying functionality rather than its low-level implementation. When the underlying BTP service evolves, only the plugin implementation should need to change and not the application code using the plugin.

### Extrinsic extensibility

Extrinsic extensibility refers to using CAPs [service](../guides/providing-services.md) pattern, meaning that "_everything is a service_". This allows applications to hook into your provided service and extend or modify the logic, making it easier to adjust the implementation to their needs if required.

### Reuse not reinvent

Prefer existing CAP capabilities and ecosystem components over custom implementations:

- **Use CAP APIs** | Use CAP native APIs instead of reimplementing them. For example, use the CAP-provided logger instead of creating a custom logging mechanism.

- **Reuse existing plugins** | Similarly, use existing CAP plugins if you need to interact with a BTP service already covered by a CAP plugin. For example, if you need to audit log some activities in your plugin, use the `@cap-js/audit-logging` plugin as a peer dependency and its APIs instead of calling the audit logging API directly.

- **Leverage existing annotations** | Favor reusing existing annotations documented in the [SAP OData vocabulary](https://sap.github.io/odata-vocabularies/) and [Open OData vocabulary](https://docs.oasis-open.org/odata/odata-vocabularies/v4.0/odata-vocabularies-v4.0.html) instead of inventing new ones. For example use [`@title`](../../guides/uis/fiori.md#prefer-title-and-description) when you need a label for a property instead of a new annotation or use the `@Capabilities` annotations when you want to allow configuring functionality restrictions for your service.

- **Use runtime-agnostic access to services** | In **Node.js** always use [`cds.env`](../../node.js/cds-env#programmatic-settings) to read the credentials and service bindings of the application in an agnostic way. You should avoid accessing `VCAP_SERVICES` directly as it is Cloud Foundry specific and thus does not work on Kyma. [`cds.env`](../../node.js/cds-env#programmatic-settings) works consistently across runtimes and environments.

- TODO: <!-- Clarify with Daniel if needs to be removed --> **Use established SAP BTP libraries when needed** | When functionality exceeds what CAP offers, rely on well-supported libraries like the [`SAP Cloud SDK`](https://sap.github.io/cloud-sdk/docs/js/overview). It provides utilities for calling BTP services via service bindings or destinations and should be preferred over manual handling of CSRF tokens, OAuth flows, or raw HTTP calls.

### Follow CAP Best-Practices

Follow the general [best practices](../domain/#best-practices) for CAP when applicable to your plugin.

For example, make sure to have a proper error handling when you make outbound calls and validate request inputs as well as configurations for your service to let the developer know if something is missing instead of simply crashing.

Use [queues](../../node.js/queue#) for asynchronous handling and additional resiliency when doing outbound calls or processing asynchronous events.

## Configuration

- **Plug & Play, convention over configuration** — Favor conventions that enable automatic integration and minimize manual configuration steps.
- **Always use `cds.env`** — For environment configuration, always use CAP's built-in `cds.env`. Never use `xsenv`, `VCAP_SERVICES`, or similar environment-specific mechanisms directly.
- **Use Service Bindings à la CAP** — Bind services using CAP's service binding conventions (e.g., `cds.requires.db...`) for consistent and maintainable integration.
- **Use Profiles for environment-specific configuration** — Leverage CAP profiles to specify environment-specific settings, such as connecting to BTP services in production and mocking data locally during development or testing.

## Test Your Plugin

Thoroughly testing your plugin ensures reliability, maintainability, and a smooth developer experience for consumers. Effective testing covers not only individual functions but also integration with CAP services, deployment scenarios, and performance. The following strategies help you validate that your plugin works as intended across different environments and use cases.

<p align="center">
  <img src="./assets/calesi-testing.png" alt="Outlining the following testing strategies." />
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

## Learn more

- TODO: add helpful links