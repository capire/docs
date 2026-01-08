---
status: released
---


# Fiori Support

See [Cookbook > Serving UIs > Draft Support](../guides/uis/fiori#draft-support) for an overview on SAP Fiori Draft support in CAP.

[[toc]]



<!--
## Serving `$metadata` Requests
-->



<!--
## Serving `$batch` Requests
-->



## Draft Entities {#draft-support}

Draft-enabled entities have corresponding CSN entities for drafts:

```js
const { MyEntity } = srv.entities
MyEntity.drafts // points to model.definitions[MyEntity.drafts]
```

In event handlers, the `target` is resolved before the handler execution and points to either the active or draft entity:

```js
srv.on('READ', MyEntity.drafts, (req, next) => {
  assert.equal(req.target.name, MyEntity.drafts)
  return next()
})
```

In the special case of the Fiori Elements filter "Editing Status: All", two separate `READ` events are triggered for either the active or draft entity.
The individual results are then combined behind the scenes.

Manual filtering on draft-related properties is not allowed, only certain draft scenarios are supported.



## Draft-specific Events

In addition to the standard CRUD events, draft entities provide draft-specific events in the lifecycle of a draft, as outlined in the following subsections.


### `NEW`

```js
srv.before('NEW', MyEntity.drafts, req => {
  req.data.ID = uuid()
})
srv.after('NEW', MyEntity.drafts, /*...*/)
srv.on('NEW', MyEntity.drafts, /*...*/)
```

The `NEW` event is triggered when the user created a new draft.
As a result `MyEntity.drafts` is created in the database.
You can modify the initial draft data in a `before` handler.

:::warning Known Limitation
Due to an implementation detail of the [`hdb` HANA driver](https://www.npmjs.com/package/hdb), trying to `INSERT` draft entities with fields that use the [`LargeBinary` type](https://cap.cloud.sap/docs/cds/types#core-built-in-types) will cause a deadlock.
The known workaround is to [configure your CAP app](../guides/databases/hana#setup-configuration) to use the [`hana-client` SAP HANA driver](https://www.npmjs.com/package/@sap/hana-client) instead.
:::

### `EDIT`

```js
srv.before('EDIT', MyEntity, /*...*/)
srv.after('EDIT', MyEntity, /*...*/)
srv.on('EDIT', MyEntity, /*...*/)
```

The `EDIT` event is triggered when the user starts editing an active entity.
As a result, a new entry to `MyEntity.drafts` is created.

For logical reasons handlers for the `EDIT` event are registered on the active entity, i.e. `MyEntity` in the code above, not on the `MyEntity.drafts` entity.


### `DISCARD`

```js
srv.before('DISCARD', MyEntity.drafts, /*...*/)
srv.after('DISCARD', MyEntity.drafts, /*...*/)
srv.on('DISCARD', MyEntity.drafts, /*...*/)
```

The `DISCARD` event is triggered when the user discards a draft started before.
In this case, the draft entity is deleted and the active entity isn't changed.

`CANCEL`, as a synonym for `DISCARD`, works as well.


### `PATCH`

```js
srv.before('PATCH', MyEntity.drafts, /*...*/)
srv.after('PATCH', MyEntity.drafts, /*...*/)
srv.on('PATCH', MyEntity.drafts, /*...*/)
```

The `PATCH` event is triggered whenever the user edits a field in a draft.
It's actually an alias for the standard CRUD `UPDATE` event.


### `SAVE`

```js
srv.before('SAVE', MyEntity.drafts, /*...*/)
srv.after('SAVE', MyEntity.drafts, /*...*/)
srv.on('SAVE', MyEntity.drafts, /*...*/)
```

The `SAVE` event is triggered when the user saves / activates a draft. This results in either a CREATE or an UPDATE on the active entity depending on whether the draft was created via `NEW` or `EDIT`.

> [!note]
> The `SAVE` event is also available for non-draft, i.e. active entities. In that case it acts as an convenience shortcut for registering handlers for the combination of `CREATE` and `UPDATE` events. In contrast to that, the `SAVE` event on draft entities is a distinct event that is only triggered when **activating** a draft.


### Custom Actions

Custom bound actions and functions defined for draft-enabled entities are also inherited by the draft entities.
This allows you to implement different logic depending on whether the action/function is called on the active or draft entity, like so:

```js
srv.on('someAction', MyEntity, /*...*/)
srv.on('someAction', MyEntity.drafts, /*...*/)
```

If you want the same handler logic for both, do that:

```js
srv.on('someAction', [ MyEntity, MyEntity.drafts ], /*...*/)
```



## Draft Locks

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



## Draft Timeouts

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



## Bypassing Drafts {.deprecated}

Use [Direct CRUD](#direct-crud) instead.

Until the next major release (`cds10`), you can still activate the draft bypass without also allowing direct CRUD via <Config>cds.fiori.bypass_draft:true</Config>.



## Direct CRUD <Beta />

With <Config>cds.fiori.direct_crud:true</Config>, creating or modifying active instances directly is possible without creating drafts.
This comes in handy when technical services without a UI interact with each other.

That is, you can then create and modify active instances directly:

```http
POST /Books

{
  "ID": 123
}
```

```http
PUT /Books(ID=123)

{
  "title": "How to be more active"
}
```

For this, the default draft creation behavior by SAP Fiori Elements is redirected to a collection-bound action via annotation `@Common.DraftRoot.NewAction`.
The thereby freed `POST` request to draft roots without specifying `IsActiveEntity` leads to the creation of an active instance (as it would without draft enablement).

The feature is required to enable [SAP Fiori Elements Mass Edit](https://sapui5.hana.ondemand.com/sdk/#/topic/965ef5b2895641bc9b6cd44f1bd0eb4d.html), allowing users to change multiple objects with the
same editable properties without creating drafts for each row.

:::warning Additional entry point
Note that this feature creates additional entry points to your application. Custom handlers are triggered with delta
payloads rather than the complete business object.
:::



## Programmatic APIs <Beta />

You can programmatically invoke draft actions with the following APIs:

```js
await srv.new(MyEntity.drafts, data)     // create new draft
await srv.discard(MyEntity.drafts, keys) // discard draft
await srv.edit(MyEntity, keys)           // create draft from active instance
await srv.new(MyEntity.drafts).for(keys) // same as above
await srv.save(MyEntity.drafts, keys)    // activate draft
```
