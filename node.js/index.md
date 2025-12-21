---
section: Node.js
status: released
---

# CAP Service SDK for Node.js
Reference Documentation
{ .subtitle}


<!-- % include links-for-node.md %} -->

As an application developer you'd primarily use the Node.js APIs documented herein to implement **domain-specific custom logic** along these lines:

1. Define services in CDS &rarr; see [Cookbook > Providing & Consuming Services](../guides/services/providing-services#service-definitions)
2. Add service implementations &rarr; [`cds.Service` > Implementations](./core-services#implementing-services)
3. Register custom event handlers in which &rarr; [`srv.on`/`before`/`after`](./core-services#srv-on-before-after)
4. Read/write data from other services in which &rarr; [`srv.run`](./core-services#srv-run-query) + [`cds.ql`](./cds-ql)
5. ..., that is from your primary database &rarr; [`cds.DatabaseService`](./databases)
5. ..., that is from other connected services &rarr; [`cds.RemoteService`](./remote-services)
6. Emit and handle asynchronous events &rarr; [`cds.MessagingService`](./messaging)

All the rest is largely handled by the CAP runtime framework behind the scenes.
This especially applies to bootstrapping the [`cds.server`](./cds-serve) and the generic features
provided through [`cds.ApplicationService`](./app-services).
