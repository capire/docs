---
synopsis: >
  This section describes which events occur in combination with SAP Fiori Drafts.
status: released
uacp: Used as link target from SAP Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html
---

# Fiori Drafts

<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}

## Overview { #draftevents}

See [Cookbook > Serving UIs > Draft Support](../advanced/fiori#draft-support) for an overview on SAP Fiori Draft support in CAP.

## Reading Drafts

When enabling an entity for draft, an additional set of database tables is created for the entity composition tree. These database tables are used to store the drafts.
When reading draft-enabled entities, data from the active entity and the drafts is merged into a joint result. As part of this, draft-specific elements like `IsActiveEntity`, `HasActiveEntity` or `HasDraftEntity` are calculated.

The standard `READ` event of a `CqnService` orchestrates the delegation of the query to the active entity and the drafts. It might execute multiple queries for this internally.
As part of this orchestration additional events `ACTIVE_READ` and `DRAFT_READ` are triggered. They allow custom handlers to override reading of active entities or reading of drafts:

| HTTP / OData request    | Event constant name                | Default implementation                                                                                                       |
| ----------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GET                     | `CqnService.EVENT_READ`            | Reads and merges data from active entities with their drafts. Internally triggers `ACTIVE_READ` and `DRAFT_READ`.            |
| n/a                     | `DraftService.EVENT_ACTIVE_READ`   | Reads data from active entities.                                                                                             |
| n/a                     | `DraftService.EVENT_DRAFT_READ`    | Reads data from drafts.                                                                                                      |

::: tip
`@Before` or `@After` handlers which modify queries or read data are best registered on the `READ` event.
Events `ACTIVE_READ` or `DRAFT_READ` are preferrable for custom `@On` handlers of draft-enabled entities.
:::

By default queries executed internally by the `READ` event are optimized for performance. In certain scenarios queries will rely on the possibility of joining between tables of the active entity and drafts on the database.

Active entity data and draft data is usually stored in tables on the same database schema. However, it is also possible to enable remote entities or entities stored in a different persistence for drafts. In that case set the property `cds.drafts.persistence` to `split` (default: `joint`). This enforces the following behavior:

- Queries strictly separate active entities and drafts.
- Queries to active entities don't contain draft-specific elements like `IsActiveEntity`.

You can then delegate reading of active entities, for example to a remote S/4 system:

```java
@On(entity = MyRemoteDraftEnabledEntity_.CDS_NAME)
public CdsResult<?> delegateToS4(ActiveReadEventContext context) {
    return remoteS4.run(context.getCqn());
}
```

> Note that this is only useful when also delegating `CREATE`, `UPDATE` and `DELETE` events, which only operate on active entities always, to the remote S/4 system as well.

::: warning
When setting `cds.drafts.persistence` to `split` only queries that are specified by the SAP Fiori draft orchestration are supported.
:::

## Editing Drafts

When users edit a draft-enabled entity in the frontend, the following requests are sent to the CAP Java backend. As an effect, draft-specific events are triggered, as described in the following table. The draft-specific events are defined by the [DraftService](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/draft/DraftService.html) interface.

::: tip
Draft-enabled entities have an extra key `IsActiveEntity` by which you can access either the active entity or the draft (inactive entity).
:::

| HTTP / OData request                   | Event constant name                | Default implementation                                                                                                      |
| -------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| POST                                   | `DraftService.EVENT_DRAFT_NEW`     | Creates a new empty draft. Internally triggers `DRAFT_CREATE`.                                                              |
| PATCH with key `IsActiveEntity=false`  | `DraftService.EVENT_DRAFT_PATCH`   | Updates an existing draft                                                                                                   |
| DELETE with key `IsActiveEntity=false` | `DraftService.EVENT_DRAFT_CANCEL`  | Deletes an existing draft                                                                                                   |
| DELETE with key `IsActiveEntity=true`  | `CqnService.EVENT_DELETE`          | Deletes an active entity *and* the corresponding draft                                                                      |
| POST with action `draftPrepare`        | `DraftService.EVENT_DRAFT_PREPARE` | Empty implementation                                                                                                        |
| POST with action `draftEdit`           | `DraftService.EVENT_DRAFT_EDIT`    | Creates a new draft from an active entity. Internally triggers `DRAFT_CREATE`.                                              |
| POST with action `draftActivate`       | `DraftService.EVENT_DRAFT_SAVE`    | Activates a draft and updates the active entity. Triggers an `CREATE` or `UPDATE` event on the affected entity.             |
| n/a                                    | `DraftService.EVENT_DRAFT_CREATE`  | Stores a new draft in the database.                                                                                         |

You can use these events to add custom logic to the SAP Fiori draft flow, for example to interact with drafts or to validate user data.

The following example registers a `@Before` handler to fill in default-values into a draft before the user starts editing:

```java
@Before
public void prefillOrderItems(DraftNewEventContext context, OrderItems orderItem) {
    // Pre-fill fields with default values
}
```

The `DRAFT_CREATE` is an internal event that is not triggered by OData requests directly. It can be used to set default or calculated values on new drafts, regardless if they were created from scratch (`DRAFT_NEW` flow) or based on an existing active entity (`DRAFT_EDIT` flow).

For more examples, see the [Bookshop sample application](https://github.com/SAP-samples/cloud-cap-samples-java/tree/master/srv/src/main/java/my/bookshop/handlers/AdminServiceHandler.java).

## Activating Drafts

When you finish editing drafts by pressing the *Save* button, a draft gets activated. That means, either a single `CREATE` or `UPDATE` event is triggered to create or update the active entity with all of its compositions through a deeply structured document. You can register to these events to validate the activated data.

The following example shows how to validate user input right before an active entity gets created:

```java
@Before
public void validateOrderItem(CdsCreateEventContext context, OrderItems orderItem) {
    // Add validation logic
}
```

During activation the draft data is deleted from the database. This happens before the active entity is created or updated within the same transaction.
In case the create or update operation raises an error, the transaction is rolled back and the draft data is restored.

## Working with Draft-Enabled Entities

When deleting active entities that have a draft, the draft is deleted as well. In this case, a `DELETE` and `DRAFT_CANCEL` event are triggered.

To read an active entity, send a `GET` request with key `IsActiveEntity=true`, for example:

```http
GET /v4/myservice/myentity(IsActiveEntity=true,ID=<key>);
```

Likewise, to read the corresponding draft, call:

```http
GET /v4/myservice/myentity(IsActiveEntity=false,ID=<key>);
```

To get all active entities, you could use a filter as illustrated by the following example:

```http
GET /v4/myservice/myentity?$filter=IsActiveEntity eq true
```

## Bypassing the SAP Fiori Draft Flow { #bypassing-draft-flow }

It's possible to create and update data directly without creating intermediate drafts. For example, this is useful when prefilling draft-enabled entities with data or in general, when technical components deal with the API exposed by draft-enabled entities. To achieve this, use the following requests. You can register event handlers for the corresponding events to validate incoming data:

| HTTP / OData request                            | Event constant name                                      | Default implementation                               |
| ----------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| POST with `IsActiveEntity: true` in payload     | `CqnService.EVENT_CREATE`                                | Creates the active entity                            |
| PUT with key `IsActiveEntity=true` in URI       | `CqnService.EVENT_CREATE` <br> `CqnService.EVENT_UPDATE` | Creates or updates the active entity (full update)   |
| PATCH with key `IsActiveEntity=true` in URI     | `CqnService.EVENT_UPDATE`                                | Creates or updates the active entity (sparse update) |

These events have the same semantics as described in section [Handling CRUD events](./cqn-services/application-services#crudevents).

## Draft Lock { #draft-lock }

An entity with a draft is locked from being edited by other users until either the draft is saved or a timeout is hit (15 minutes by default). You can configure this timeout by the following application configuration property:

```yaml
cds.drafts.cancellationTimeout: 1h
```

You can turn off this feature completely by means of the application configuration property:

```yaml
cds.security.draftProtection.enabled: false
```

## Draft Garbage Collection { #draft-gc }

Stale drafts are automatically deleted after a timeout (30 days default). You can configure the timeout with the following application configuration property:

```yaml
cds.drafts.deletionTimeout: 8w
```

In this example, the draft timeout is set to 8 weeks.

This feature can be also turned off completely by setting the application configuration:

```yaml
cds.drafts.gc.enabled: false
```

::: tip
To get notified when a particular draft-enabled entity is garbage collected, you can register an event handler on the `DRAFT_CANCEL` event.
:::

## Overriding SAP Fiori's Draft Creation Behaviour { #fioridraftnew}

By default SAP Fiori triggers a POST request with an empty body to the entity collection to create a new draft.
This behavior can be overridden [by implementing a custom action](./cqn-services/application-services#actions), which SAP Fiori will trigger instead.

1. Define an action bound to the draft-enabled entity with an explicitly binding parameter typed with `many $self`.

    This way, the action used to create a new draft is bound to the draft-enabled entity collection.

1. Annotate the draft-enabled entity with `@Common.DraftRoot.NewAction: '<action name>'`.

    This indicates to SAP Fiori that this action should be used when creating a new draft.

1. Implement the action in Java.

    The implementation of the action must trigger the `newDraft(CqnInsert)` method of the `DraftService` interface to create the draft. In addition, it must return the created draft entity.

The following code summarizes all of these steps in an example:

```cds
service AdminService {
  @odata.draft.enabled
  @Common.DraftRoot.NewAction: 'AdminService.createDraft'
  entity Orders as projection on my.Orders actions {
    action createDraft(in: many $self, orderNo: String) returns Orders;
  };
}
```

```java
@On(entity = Orders_.CDS_NAME)
public void createDraft(CreateDraftContext context) {
    Orders order = Orders.create();
    order.setOrderNo(context.getOrderNo());
    context.setResult(adminService.newDraft(Insert.into(Orders_.class).entry(order)).single(Orders.class));
}
```

## Consuming Draft Services { #draftservices}

If an [Application Service](cqn-services/application-services#application-services) is created based on a service definition, that contains a draft-enabled entity, it also implements the [DraftService](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/draft/DraftService.html) interface.
This interface provides an API layer around the [draft-specific events](fiori-drafts#draftevents), and allows to create new draft entities, patch, cancel or save them, and put active entities back into edit mode.

The Draft-Service-specific APIs only operate on entities in draft-mode. The CQN Query APIs (`run` methods) provided by any Application Service, operate on active entities only.
However, there's one exception from this behavior, which is the `READ` event: When reading from a Draft Service, active entities and draft entities are both queried and the results are combined.

::: warning
Persistence Services aren't draft-aware. Use the respective Draft Service or Application Service, when running draft-aware queries.
:::

The following example, shows the usage of the Draft-Service-specific APIs:

```java
import static bookshop.Bookshop_.ORDERS;

DraftService adminService = ...;
// create draft
Orders order = adminService.newDraft(Insert.into(ORDERS)).single(Orders.class);
// set values
order.setOrderNo("DE-123456");
// patch draft
adminService.patchDraft(Update.entity(ORDERS).data(order)
    .where(o -> o.ID().eq(order.getId()).and(o.IsActiveEntity().eq(false))));
// save draft
CqnSelect orderDraft = Select.from(ORDERS)
    .where(o -> o.ID().eq(order.getId()).and(o.IsActiveEntity().eq(false)));
adminService.saveDraft(orderDraft);
// read draft
Orders draftOrder = adminService.run(orderDraft).single().as(Order.class);
// put draft back to edit mode
CqnSelect orderActive = Select.from(ORDERS)
    .where(o -> o.ID().eq(order.getId()).and(o.IsActiveEntity().eq(true)));
adminService.editDraft(orderActive, true);
// read entities in draft mode and activated entities
adminService.run(Select.from(ORDERS).where(o -> o.ID().eq(order.getId())));
```
