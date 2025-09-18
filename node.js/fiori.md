---
status: released
---


# Fiori Support

See [Cookbook > Serving UIs > Draft Support](../advanced/fiori#draft-support) for an overview on SAP Fiori Draft support in CAP.

[[toc]]


<!--
## Serving `$metadata` Requests



## Serving `$batch` Requests

-->

## Lean Draft

Lean draft is a new approach which makes it easier to differentiate between drafts and active instances in your code. This new architecture drastically reduces the complexity.

### Handlers Registration {#draft-support}

Class `ApplicationService` provides built-in support for Fiori Draft.
Please note that draft-enabled entities must follow a specific draft choreography.

You can add your logic to the draft-specific events as follows:

  ```js
  // When a new draft is created
  srv.on('NEW', 'MyEntity.drafts', /*...*/)

  // When a draft is discarded
  srv.on('CANCEL', 'MyEntity.drafts', /*...*/)

  // When a new draft is created from an active instance
  srv.on('EDIT', 'MyEntity', /*...*/)

  // When the draft entity is saved
  srv.on('SAVE', 'MyEntity.drafts', /*...*/)

  // When the active entity is changed (e.g., when bypassing the draft)
  srv.on('SAVE', 'MyEntity', /*...*/)

  // bound action/function on active entity
  srv.on('boundActionOrFunction', 'MyEntity', /*...*/)

  // bound action/function on draft entity
  srv.on('boundActionOrFunction', 'MyEntity.drafts', /*...*/)
  ```

The examples are provided for `.on` handlers, but the same is true for `.before` and `.after` handlers.

- The `CANCEL` event is triggered when you cancel the draft. In this case, the draft entity is deleted and the active entity isn't changed.
- The `EDIT` event is triggered when you start editing an active entity. As a result `MyEntity.drafts` is created.
- The `SAVE` event is triggered when you activate the draft, which results in either a `CREATE` or an `UPDATE` on the active entity depending on whether an active entity previously existed or not (or, in other words, the respective draft was created via `NEW` or `EDIT`). For convenience, you can also register `SAVE` on active entities, in which case it acts a shortcut for `['UPDATE', 'CREATE']`. This allows you to streamline handlers for saving drafts and modifying actives in bypass draft scenarios.

:::warning Generic handlers should be executed
When overriding `on` handlers, call `next()` to ensure that the built-in draft logic is executed. Otherwise, the draft flow will be broken.
:::


It's also possible to use the array variant to register a handler for both entities, for example: `srv.on('boundActionOrFunction', ['MyEntity', 'MyEntity.drafts'], /*...*/)`.

:::warning Bound actions/functions modifying active entity instances
If a bound action/function modifies an active entity instance, custom handlers need to take care that a draft entity doesn't exist, otherwise all changes are overridden when saving the draft.
:::

All CRUD events are supported for both, active and draft entities.

  ```js
  // for active entities
  srv.on(['CREATE', 'READ', 'UPDATE', 'DELETE'], 'MyEntity', /*...*/)

  // for draft entities
  srv.on(['CREATE', 'READ', 'UPDATE', 'DELETE'], 'MyEntity.drafts', /*...*/)
  ```

### Draft Locks

To prevent inconsistency, the entities with draft are locked for modifications by other users. The lock is released when the draft is saved, canceled or a timeout is hit. The default timeout is 15 minutes. You can configure this timeout by the following application configuration property:

```properties
cds.fiori.draft_lock_timeout=30min
```

You can set the property to one of the following:
- number of hours like `'1h'`
- number of minutes like `'10min'`
- number of milliseconds like `1000`

:::tip Delete released draft locks
If the `draft_lock_timeout` has been reached, every user can delete other users' drafts to create an own draft. There can't be two drafts at the same time on the same entity.
:::

### Garbage Collection of Stale Drafts

Inactive drafts are deleted automatically after the default timeout of 30 days. You can configure or deactivate this timeout by the following configuration:

```json
{
  "cds": {
    "fiori": {
      "draft_deletion_timeout": "28d"
    }
  }
}
```

You can set the property to one of the following:
- `false` in order to deactivate the timeout
- number of days like `'30d'` 
- number of hours like `'72h'`
- number of milliseconds like `1000`

::: info Technical background
It can occur that inactive drafts are still in the database after the configured timeout. The deletion is implemented as a side effect of creating new drafts and there's no periodic job that does the garbage collection.
:::

### Bypassing the SAP Fiori Draft Flow
Creating or modifying active instances directly is possible without creating drafts. This comes in handy when technical services without a UI interact with each other.

To enable this feature, set this feature flag in your configuration:

```json
{
  "cds": {
    "fiori": {
      "bypass_draft": true
    }
  }
}
```

You can then create active instances directly:

```http
POST /Books

{
  "ID": 123,
  "IsActiveEntity": true
}
```

You can modify them directly:

```http
PATCH /Books(ID=123,IsActiveEntity=true)

{
  "title": "How to be more active"
}
```

This feature is required to enable [SAP Fiori Elements Mass Edit](https://sapui5.hana.ondemand.com/sdk/#/topic/965ef5b2895641bc9b6cd44f1bd0eb4d.html), allowing users to change multiple objects with the
same editable properties without creating drafts for each row.

:::warning Additional entry point
Note that this feature creates additional entry points to your application. Custom handlers are triggered with delta
payloads rather than the complete business object.
:::

### Differences to Previous Version

- Draft-enabled entities have corresponding CSN entities for drafts:

    ```js
    const { MyEntity } = srv.entities
    MyEntity.drafts // points to model.definitions['MyEntity.drafts']
    ```

- Queries are now cleansed from draft-related properties (like `IsActiveEntity`)
- `PATCH` event isn't supported anymore.
- The target is resolved before the handler execution and points to either the active or draft entity:

    ```js
    srv.on('READ', 'MyEntity.drafts', (req, next) => {
      assert.equal(req.target.name, 'MyEntity.drafts')
      return next()
    })
    ```

    ::: info Special case: "Editing Status: All"
    In the special case of the Fiori Elements filter "Editing Status: All", two separate `READ` events are triggered for either the active or draft entity.
    The individual results are then combined behind the scenes.
    :::

- Draft-related properties (with the exception of `IsActiveEntity`) are only computed for the target entity, not for expanded sub entities since this is not required by Fiori Elements.
- Manual filtering on draft-related properties is not allowed, only certain draft scenarios are supported.


### Programmatic Invocation of Draft Actions <Beta />

You can programmatically invoke draft actions with the following APIs:

```js
await srv.new(MyEntity.drafts, data)     // create new draft
await srv.discard(MyEntity.drafts, keys) // discard draft
await srv.edit(MyEntity, keys)           // create draft from active instance
await srv.new(MyEntity.drafts).for(keys) // same as above
await srv.save(MyEntity.drafts, keys)    // activate draft
```
