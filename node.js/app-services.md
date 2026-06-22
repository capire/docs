---
status: released
---

# Application Services

[[toc]]


## Class `cds.ApplicationService`

Class `cds.ApplicationService` is the default service provider implementation, adding generic handlers as introduced in the Cookbook guides on [Providing Services](../guides/services/providing-services), [Localized Data](../guides/uis/localized-data.md) and [Temporal Data](../guides/domain/temporal-data.md).

Take this service definition for example:

```cds
service AdminService {
  entity Authors as projection on my.Authors;
  entity Books as projection on my.Books;
  entity Genre as projection on my.Genre;
}
```

Without any custom service implementation in place, `cds.serve` would create and instantiate instances of `cds.ApplicationService` by default like so:

```js
// srv/admin-service.cds
let name = 'AdminService', options = {...}
let srv = new cds.ApplicationService (name, cds.model, options)
await srv.init()
```

If you add a custom implementation, this would comonly be derived from `cds.ApplicationService`:

```js
// srv/admin-service.js
const cds = require('@sap/cds')
module.exports = class AdminService extends cds.ApplicationService {
  init() {
    // register your handlers ...
    return super.init()
  }
}
```



### Generic Handlers

`cds.ApplicationService` overrides `srv.handle(req)` to call several per-request handler functions directly — inline, before delegating to `super.handle(req)`. These are assigned as instance properties during `init()`:

```tsx
class cds.ApplicationService extends cds.Service {
  init() {
    const generics = //... all static methods with prefix 'handle_'
    for (let each of generics) this.constructor[each].call(this)
    // per-request handlers — assigned unless a subclass already defined a static handle_* for it
    this.handle_authorization ??= get_handle_authorization.call(this)
    this.handle_etags ??= get_handle_etags.call(this)
    this.handle_validations ??= get_handle_validations.call(this)
    this.handle_media_type ??= get_handle_media_type.call(this)
    this.handle_temporal_data ??= get_handle_temporal_data.call(this)
    this.handle_paging ??= get_handle_paging.call(this)
    this.handle_sorting ??= get_handle_sorting.call(this)
    return super.init()
  }
  async handle(req) {
    // called directly per request:
    if (this.handle_authorization) await this.handle_authorization(req)
    if (this.handle_etags) await this.handle_etags(req)
    if (this.handle_validations) await this.handle_validations(req)
    if (req.event === 'READ') {
      this.handle_temporal_data?.(req)
      this.handle_paging?.(req)
      this.handle_sorting?.(req)
    } else if (req.event === 'UPDATE') {
      this.handle_media_type?.(req)
    }
    return super.handle(req)
  }
  // registered as before/on handlers during init():
  static handle_fiori() {...}
  static handle_crud() {...}
}
```



### handle_authorization() {.method}

Called per request to perform authorization checks, as documented in the [Authorization guide](../guides/security/authorization.md).



### handle_etags() {.method}

Called per request to perform concurrency control using ETags, as documented in the [Providing Services guide](../guides/services/served-ootb#concurrency-control).



### handle_validations() {.method}

Called per request to perform input validation based on `@assert` annotations, as documented in the [Providing Services guide](../guides/services/constraints).



### handle_media_type() {.method}

Called per `UPDATE` request to handle media type / streaming concerns.



### handle_temporal_data() {.method}

Called per `READ` request to handle temporal data, as documented in the [Temporal Data guide](../guides/domain/temporal-data.md).



### handle_paging() {.method}

Called per `READ` request to apply paging, as documented in the [Providing Services guide](../guides/services/served-ootb#pagination-sorting).



### handle_sorting() {.method}

Called per `READ` request to apply implicit sorting, as documented in the [Providing Services guide](../guides/services/served-ootb#pagination-sorting).



### _static_ handle_fiori() {.method}

Registers before/on handlers for Fiori Drafts and other Fiori-specifics during `init()`, as documented in the [Serving Fiori guide](../guides/uis/fiori.md).



### _static_ handle_crud() {.method}

Registers on handlers for all CRUD operations including *deep* CRUD during `init()`, as documented in the [Providing Services guide](../guides/services/served-ootb).



## Overriding Generic Handlers

The per-request handlers (`handle_authorization`, `handle_etags`, `handle_validations`, `handle_media_type`, `handle_temporal_data`, `handle_paging`, `handle_sorting`) are instance properties. You can replace or disable one by assigning to it in `init()`:

```js
class YourService extends cds.ApplicationService {
  init() {
    const result = super.init()
    // replace with a no-op to skip validations entirely:
    this.handle_validations = null
    // or wrap the default:
    const orig = this.handle_validations
    this.handle_validations = async (req) => {
      // run before default validations
      if (req.data.someField === 'forbidden') req.reject(400, 'Not allowed')
      return orig?.(req)
    }
    return result
  }
}
```

Alternatively, define a **static** `handle_*` on your subclass. If found, the built-in instance function is skipped entirely, and your static method is called during `init()` instead (with `this` bound to the instance), where you can register `before`/`on` handlers as usual:

```js
class YourService extends cds.ApplicationService {
  static handle_validations() {
    // 'this' is the service instance — register handlers directly
    this.before('CREATE', '*', req => { /*...*/ })
  }
}
```

For `handle_fiori` and `handle_crud`, which remain `static` and register event handlers during `init()`, override them the same way:

```js
class YourService extends cds.ApplicationService {
  static handle_fiori() {
    super.handle_fiori.call(this) // keep standard Fiori support
    this.before('SAVE', '*', req => { /*...*/ })
  }
}
```

## Adding Generic Handlers

You can add your own sets of generic handlers to all instances of `cds.ApplicationService` by adding a new **static** method prefixed with `handle_`:

```js
const cds = require('@sap/cds')
cds.ApplicationService.handle_log_events = function() {
  this.on('*', req => console.log(req.event))
}
```

Static `handle_*` methods are called during `init()` with `this` bound to the service instance, so you can register event handlers directly.
