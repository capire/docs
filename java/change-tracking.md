---
synopsis: >
  Find here information about the change tracking feature in CAP Java.
status: released
---

# Change Tracking

<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

The feature tracks the changes of all modifying operations executed via CQN statements, which are indirectly triggered
by the protocol adapters or directly by a custom code.
Changes made through the native SQL, JDBC, or other means that bypass the CAP Java runtime or that are forwarded
to the remote services aren't tracked.

## Enabling Change Tracking

To use the change tracking feature, you need to add a dependency to [cds-feature-change-tracking](https://central.sonatype.com/artifact/com.sap.cds/cds-feature-change-tracking) in the `srv/pom.xml` file of your service:

```xml
<dependency>
  <groupId>com.sap.cds</groupId>
    <artifactId>cds-feature-change-tracking</artifactId>
    <scope>runtime</scope>
</dependency>
```

- Your POM must also include the goal to resolve the CDS model delivered from the feature.
See [Reference the New CDS Model in an Existing CAP Java Project](/java/building-plugins#reference-the-new-cds-model-in-an-existing-cap-java-project).

- If you use SAP Fiori elements as your UI framework and intend to use the built-in UI, update your SAP UI5 version to 1.121.2 or higher.

### Annotating Entities

To capture changes for an entity, you need to extend it with a technical aspect and annotate it
with the annotation `@changelog` that declares the elements whose changes are to be logged.

Given the following entity that represents a book on the domain level:

```cds
namespace model;

entity Books {
    key ID: UUID;
    title: String;
    stock: Integer;
}
```

And the corresponding service definition with the projection of the entity:

```cds
namespace srv;

using {model} from '../db/schema'; // Our domain model

service Bookshop {
    entity Books as projection on model.Books;
}
```

Include the change log model that is provided by this feature:

```cds
using {sap.changelog as changelog} from 'com.sap.cds/change-tracking';
```

Extend **the domain entity** with the aspect `changelog.changeTracked` like this:

```cds
extend model.Books with changelog.changeTracked;
```

This aspect adds the association `changes` that lets you consume the change log both programmatically
via CQN statements and in the UI. This implies that every projection
of the entity `Books` has this association and the changes will be visible in all of them.

Annotate elements of the entity that you want to track with the `@changelog` annotation:

```cds
annotate Bookshop.Books {
  title @changelog;
  stock @changelog;
};
```

Your complete service definition should look like this:

```cds
namespace srv;

using {sap.changelog as changelog} from 'com.sap.cds/change-tracking';
using {model} from '../db/schema';

// The domain entity extended with change tracking aspect.
extend model.Books with changelog.changeTracked;

service Bookshop {
    entity Books as projection on model.Books;
}

// Projection is annotated to indicate which elements are change tracked.
annotate Bookshop.Books {
  title @changelog;
  stock @changelog;
};
```

:::warning Personal data is ignored
Elements with [personal data](../guides/data-privacy/annotations#personaldata), that is, elements that are annotated
with @PersonalData and hence subject to audit logging, are ignored by the change tracking.
:::

The level where you annotate your elements with the annotation `@changelog` is very important. If you annotate
the elements on the _domain_ level, every change made through every projection of the entity is tracked.
If you annotate the elements on the _service_ level, only the changes made through that projection are tracked.

Using the previous books example, the changes made through the service entity `Bookshop.Books` are tracked, but the changes
made on the domain entity are omitted. That can be beneficial if you have a service that is used for data replication
or mass changes where change tracking can be a very expensive operation, and you do not want to generate changes from such operations.

Change tracking also works with the entities that have compositions and tracks the changes made to the items of the compositions.

In the following example you have an entity that represents the order with a composition that represents the items of the order. You can annotate the elements of both and track the changes made through the order and the items in a deep update.

```cds
entity OrderItems : cuid {
  parent    : Association to Orders;
  [...]
  quantity: Integer @changelog;
}

entity Orders : cuid {
  customerName: String @changelog;
  [...]
  items: Composition of many OrderItems on items.parent = $self;
}
```

:::tip Remember: Extend `Orders` entity
You must extend the `Orders` with the aspect `changelog.changeTracked` and not the `OrderItems`. With this, all changes in the `Orders`, even deep ones, are associated with the `Orders`.
:::

### Identifiers for Entities

You can store some elements of the entity together with the changes in the change log to produce a user-friendly identifier that annotates changes.

You define this identifier by annotating the entity with the `@changelog` annotation and including the elements that you want
to store together with the changed value:

```cds
annotate Bookshop.Book with @changelog: [
  title
];
```

This identifier can contain the elements of the entity or values of to-one associations that are reachable via path.
For example, for a book you can store an author name if you have an association from the book to the author. The best candidates for identifier are the elements that are insert-only or that don't change often.

### Identifiers for Compositions

For compositions, no special annotations are required. The identifiers of the target entity are used instead.

For example, given the following model: 

```cds
entity Orders : cuid {
  OrderNo  : String;
  customer: Association to Customer;
  [...]
  items: Composition of many OrderItems on items.parent = $self;
}

entity OrderItems : cuid {
    parent    : Association to Orders;
    supplierName: String;
    [...]
    quantity    : Integer;
}
```

You can annotate your model as follows to define identifiers for both entities.

```cds
annotate Orders with @changelog: [OrderNo];

annotate OrderItems with @changelog: [
  parent.OrderNo,
  supplierName,
];
```

Changes for `Orders` and `OrderItems` will have their own respective target or root identifiers filled. 

### Human-readable values for associations

For associations, the value of the foreign key is stored in the changelog by default. You can change this and store the values of the associated entity instead. 
This kind of identifier changes the values stored in the changelog, while [entity identifiers](#identifiers-for-entities) annotate changed values.

You annotate your entity like this:

```cds
annotate Orders {
  customer @changelog: [ customer.name ]
}
```
Elements from the `@changelog` annotation value must always be prefixed by the association name.

:::warning Validation required
If the target of the association is missing, for example, when an entity is updated with the ID for a customer
that does not exist, the changelog entry is not created. You need to validate
such cases in the custom code or use annotations, for example, [`@assert.target`](/guides/providing-services#assert-target).
:::

### Caveats of Identifiers

Consider the following important points that are relevant for all kinds of identifiers and human-readable values: 

- When you define the identifier for an entity, keep in mind that the projections of the annotated entity
inherit the annotation `@changelog`. If you change the structure of the projection,
for example, exclude or rename the elements that are used in the identifier, you must annotate the projection again
to provide updated element names in the identifier. This is one additional benefit of annotating the top-most projection for change tracking. 

- The values of the identifier are stored together with the change log as-is. They are not translated and some data types might
not be formatted per user locale or some requirements, for example, different units of measurement or currencies.

### Displaying Changes

The changes of the entity are exposed as an association `changes` that you can use to display the change log in the UI.
By default, the entity `Changes` is auto-exposed, but it won't be writable via OData requests.

If you want to display the change log together with the overview of your entity, you need to add the facet
to the object page that displays the changes:

```cds
annotate Bookshop.Books with @(
  UI : { ...
    Facets : [ ...
       {
          $Type               : 'UI.ReferenceFacet',
          ID                  : 'ChangeHistoryFacet',
          Label               : '{i18n>ChangeHistory}',
          Target              : 'changes/@UI.PresentationVariant',
          ![@UI.PartOfPreview]: false
        } ...
   ] ...
  } ...);
```

If you want to have a common UI for all changes, you need to expose the change log as a projection and define
your own presentation for it as the changes are exposed only as part of the change-tracked entity. This projection
must be read-only and shouldn't be writable via OData requests.

The change log is extended with the texts coming from your entities' `@title` annotation and the element. Otherwise, the change log contains only the technical names of the entities and the elements.
Titles are translated, if they're annotated as translatable. See [Externalizing Texts Bundles](../guides/i18n#localization-i18n) for more information.

You can customize the standard UI on the entity itself:

```cds
annotate Bookshop.Books.changes with @(UI: {
    PresentationVariant: {
        Visualizations: ['@UI.LineItem'],
        RequestAtLeast: [change.targetEntity],
        SortOrder: [{
            Property: change.createdAt,
            Descending: true
        }]
    },
    LineItem: [...],
});
```

Or on the `ChangeLink` entity so that it changed for all entities:

```cds
annotate sap.changelog.ChangeLink with @(UI: {
    PresentationVariant: {
        Visualizations: ['@UI.LineItem'],
        RequestAtLeast: [change.targetEntity],
        SortOrder: [{
            Property: change.createdAt,
            Descending: true
        }]
    },
    LineItem: [...],
});
```

You can also customize individual fields by annotating them directly, as follows:

```cds
annotate Bookshop.Books.changes:up_ with @UI.Hidden;
```

## How Changes are Stored

The namespace `sap.changelog` defines an entity `Changes` that reflects each change, so the changes are stored in a flat table for all entities together.

Each entry in the `Changes` entity contains the following information:

- A marker that represents the nature of the change: addition, modification, or deletion.
- The qualified name of the entity that was changed and the qualified name of the root entity. They depend on the projection that was used to
  change the entity and reflect the root and a target of the modifying operation. For flat entities, they're the same.
- The attribute of the target projection that was changed.
- The new and old values as strings.
- The user who made the change and the timestamp of the change.
- The data type of the changed attribute.
- The technical path from the root entity to the tracked target entity.

By default, changes remain in your database even when their entities are deleted.

If you want to delete changelogs together with your entities, your **domain entity** must be extended with the `changelog.changeTracked` aspect.

To enable the deletion of changes per entity, annotate your domain entity like this:

```cds
annotate model.Books.changes:change with @cascade: { delete };
```

To enable deletion of changes for all entities in the model, add the following annotation to your model:

```cds
annotate sap.changelog.ChangeLink:change with @cascade: { delete };
```

## Detection of Changes

The change tracking intercepts the modifying CQL statements (`Insert`, `Upsert`, `Update`, and `Delete`) and
requires additional READ events to retrieve the old and the new image of the entity.

These two images are compared and differences are stored in the change log. The nature of the change is determined by comparing the old and new
values of the entity: data that weren't present in the old values are considered as added whereas data that aren't present in
the new values are considered as deleted. Elements that are present in both old and new values but have different values
are considered as modified. Each change detected by the change tracking feature is stored in the change log as a separate entry.

As a rule, specify primary keys to modify change tracked entities and avoid using [searched updates](/java/working-with-cql/query-api#searched-update).

### Changes in Deeply Structured Documents

In the case of the deeply structured documents, for example, entities with the compositions, the change tracking feature detects
the changes across the complete document and stores them in the change log with the metadata reflecting the structure of the change.

Take the order and item model used previously in this guide as an example.

For deep updates, use the [delta representation](/java/working-with-cql/query-api#deep-update-delta) for its items or the [full set representation](/java/working-with-cql/query-api#deep-update-full-set) to overwrite complete document.

The following example yields two changelog entries: one for the order and one for the item. The change log entry for the item reflects that the root of the change is an order. Both changes are reachable through the association `changes` of the order entity.

```java
Orders order = Orders.create("...");
order.setOrderNo("N1");
OrderItems item = OrderItems.create("...");
item.setQuantity(3);

order.setItems(CdsList.delta(item));
Update.entity(Orders_.class).entry(order);
```

If a direct update is unavoidable, Specify the order item that needs to be updated with a path expression:

```java
OrderItems item = OrderItems.create("...");
item.setQuantity(3);
Update.entity(Orders_.class, o -> o.filter(f -> f.ID().eq("...")).items()).entry(item);
```

Similarly, a `Delete` statement can be used to remove an item from an order:

```java
Delete.from(Orders_.class, o -> o.filter(f -> f.ID().eq("...")).items().filter(i -> i.ID().eq("...")));
```

The last segment can omit keys to indicate **bulk deletion**:

```java
Delete.from(Orders_.class, o -> o.filter(f -> f.ID().eq("...")).items());
```

The same path expression can be used in the `Insert` statement to directly add an item to a composition.

Changes are correctly referenced to the root if the following conditions are true:
- The path expression starts at the root of the document (`Orders`, in this case).
- The path navigates only through the compositions within the same document tree.
- All segments of the path, except the last one, must include keys.

:::warning Limitation
Avoid Direct modifications of composition items, they aren't supported by change tracking.
:::

In the following example, the item's updated changelog entry _won't_ be associated with an order: 

```java
OrderItems item = OrderItems.create("...");
item.setQuantity(3);
Update.entity(OrderItems_.class).entry(item);
```

You must rewrite such statements using one of the previously illustrated ways.

## Reacting on Changes

You can write an event handler to observe the change log entries. Keep in mind that the change log entries
are created for each statement and this event will not be bound to any kind of transaction or a batch operation.

First, update the dependency's scope to `compile` in the `srv/pom.xml` file of your service:

```xml
<dependency>
  <groupId>com.sap.cds</groupId>
    <artifactId>cds-feature-change-tracking</artifactId>
    <scope>compile</scope>
</dependency>
```

Second, add a handler to access the changes:

```java
import cds.gen.sap.changelog.Changes;

@Component
@ServiceName(ChangeTrackingService.DEFAULT_NAME)
public class ChangeTrackingHandler implements EventHandler {

  @After(event = ChangeTrackingService.CREATE_CHANGES)
  void afterCreate(CreateChangesEventContext context) {
    context.getResult().listOf(Changes.class).forEach(c -> {
      // Do something with the change log entry
    });
  }
}
```

You can query the change log entries via CQN statements, as usual.

## Things to Consider when Using Change Tracking

- Consider the storage costs of the change log. The change log can grow very fast and can consume a lot of space
  in case of frequent changes. You should consider the retention policy of the change log as it won't be deleted when you delete the entities.
- Consider the performance impact. Change tracking needs to execute additional reads during updates to retrieve and compare updated values.
  This can slow down the update operations and can be very expensive in the case of updates that affect a lot of entities.
- Consider the ways your entities are changed. You might want to track the changes only on the service projection level that are used for
  the user interaction and not on the domain level (for instance during data replication).
- If you want to expose the complete change log to the user, you need to consider the security implications of this. If your entities have complex access rules,
  you need to consider how to extend these rules to the change log.
