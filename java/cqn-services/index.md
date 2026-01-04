---
synopsis: CQN Services are the core services of CAP that deal with CDS data. One of the key APIs provided by these services is the uniform query API based on CQN statements.
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html
---

# CQN Services { #cdsservices }
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

The most used services in CAP are the CQN-based services. The most prominent of these are the Application Service, Persistence Service, and Remote Service.
Those services can handle CRUD events by accepting CQN statements. They all implement the common interface [CqnService](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/cds/CqnService.html), which defines the CQN-based APIs.
::: tip
To learn more about how to run queries on these services, see sections [Building CQN Queries](../working-with-cql/query-api) and [Executing CQN Queries](../working-with-cql/query-execution).
:::

## Application Services

[Application Services](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/cds/ApplicationService.html) define the APIs that are exposed by a CAP application to its clients. They're backed by a [CDS Service](../../cds/cdl#services) definition in the CDS model, which defines the structure of the API.
Consequently, they only accept CQN statements targeting entities that are defined as part of their service definition. Typically these services are served by protocol adapters, such as OData V4, which use their CQN-based APIs.

[Learn more about adding business logic to Application Services.](./application-services){.learn-more}

Application Services are automatically augmented with generic providers (built-in event handlers), which handle common aspects such as [authorization](../../guides/security/authorization), [input validation](../../guides/services/providing-services#input-validation), [implicit pagination](../../guides/services/providing-services#implicit-pagination) and many more.
Their default ON event handler delegates CQN statements to the Persistence Service.

[Learn more about these capabilities in our Cookbooks.](../../guides/){.learn-more}

The creation of Application Services can be customized through configuration. By default an Application Service is created for every service that is defined in the CDS model.
Through configuration, it's also possible to create multiple Application Services based on the same model definition.

[Learn more about the configuration possibilities in our CDS Properties Reference.](../developing-applications/properties){.learn-more}

### Draft Services { #draftservices}

If an Application Service is created based on a service definition, that contains a draft-enabled entity, it also implements the [DraftService](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/draft/DraftService.html) interface.
This interface provides an API layer around the [draft-specific events](../fiori-drafts#draftevents), and allows to create new draft entities, patch, cancel or save them, and put active entities back into edit mode.

[Learn more about Draft Services in section Fiori Drafts.](../fiori-drafts){.learn-more}

## Persistence Services { #persistenceservice}

[Persistence Services](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/persistence/PersistenceService.html) are CQN-based database clients. CAP applications most commonly use SQL databases like SAP HANA in production.
For test and development, it's also possible to use a light-weight, in-memory database such as [H2](https://www.h2database.com). The CAP Java SDK therefore provides a JDBC-based Persistence Service implementation out of the box.
However, also other Persistence Service implementations based on NoSQL databases, such as MongoDB, are possible, even if not provided by the CAP Java SDK ready to use.

[Learn more about supported databases and their restrictions.](./persistence-services#database-support){.learn-more}

A Persistence Service isn't bound to a specific service definition in the CDS model. It's capable of accepting CQN statements targeting any entity or view that is stored in the corresponding database.

Transaction management is built in to Persistence Services. They take care of lazily initializing and maintaining database transactions as part of the active changeset context.

Some generic providers are registered on Persistence Services instead of on Application Services, like the ones for [managed data](../../guides/domain/index#managed-data).
This ensures that the functionality is also triggered, when directly interacting with a Persistence Service.

The Persistence Service is used when implementing event handlers for Application Services, for example when additional data needs to be read when performing custom validations.
Additionally, the default ON event handler of Application Services delegates CQN statements to the default Persistence Service.

[Learn more about how Persistence Services are created and configured.](./persistence-services){.learn-more}

## Remote Services

[Remote Services](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/cds/RemoteService.html) are CQN-based clients for remote APIs, for example OData. They're backed by a [CDS Service](../../cds/cdl#services) definition, that reflects the structure of the remote API. The CDS service definition is usually [imported](../../guides/services/consuming-services#external-service-api), for example from an EDMX specification.

They can be used when integrating APIs provided by the application with APIs provided by other applications or micro-services. This integration can happen synchronously by delegating CQN statements from Application Services to Remote Services or asynchronously by using Remote Services to replicate data into the applications own persistence.

Remote Services need to be explicitly configured and are never created automatically. The configuration of a Remote Service specifies the destination where the remote API is available and its protocol type.
It's also possible to create multiple Remote Services with different destinations based on the same model definition.
If a Remote Service is created for a service definition in the CDS model, no Application Service is automatically created for that definition.

[Learn more about how to configure and use Remote Services.](./remote-services){.learn-more}
