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



### Generic Handlers in `srv.init()`

Generic handlers are registered by via respective class methods documented below in `cds.ApplicationService.prototype.init()` like so:

```tsx
class cds.ApplicationService extends cds.Service {
  init() {
    const generics = //... all static method with prefix 'handle_'
    for (let each of generics) this[each].call(this)
    return super.init()
  }
  static handle_authorization() {...}
  static handle_etags() {...}
  static handle_validations() {...}
  static handle_temporal_data() {...}
  static handle_localized_data() {...}
  static handle_managed_data() {...}
  static handle_paging() {...}
  static handle_fiori() {...}
  static handle_crud() {...}
}
```

> The reason we used `static` methods was to **(a)** give you an easy way of overriding and adding new generic handlers / features, and **(b)** without getting into conflicts with instance methods of subclasses.



### _static_ handle_authorization() {.method}

This method is adding request handlers for initial authorization checks, as documented in the [Authorization guide](../guides/security/authorization.md).



### _static_ handle_etags() {.method}

This method is adding request handlers for out-of-the-box concurrency control using ETags, as documented in the [Providing Services guide](../guides/services/providing-services#concurrency-control).



### _static_ handle_validations() {.method}

This method is adding request handlers for input validation based in `@assert` annotations, and other, as documented in the [Providing Services guide](../guides/services/providing-services#input-validation).




### _static_ handle_temporal_data() {.method}

This method is adding request handlers for handling temporal data, as documented in the [Temporal Data guide](../guides/domain/temporal-data.md).




### _static_ handle_localized_data() {.method}

This method is adding request handlers for handling localized data, as documented in the [Localized Data guide](../guides/uis/localized-data.md).




### _static_ handle_managed_data() {.method}

This method is adding request handlers for handling managed data, as documented in the [Providing Services guide](../guides/domain/index#managed-data).



### _static_ handle_paging() {.method}

This method is adding request handlers for paging & implicit sorting, as documented in the [Providing Services guide](../guides/services/providing-services#pagination-sorting).



### _static_ handle_fiori() {.method}

This method is adding request handlers for handling Fiori Drafts and other Fiori-specifics, as documented in the [Serving Fiori guide](../guides/uis/fiori.md).



### _static_ handle_crud() {.method}

This method is adding request handlers for all CRUD operations including *deep* CRUD, as documented in the [Providing Services guide](../guides/services/providing-services#generic-providers).



## Overriding Generic Handlers

You can override some of these methods in subclasses, for example to skip certain generic features, or to add additional ones. For example like that:

```js
class YourService extends cds.ApplicationService {
  static handle_validations() {
    // Note: this is an instance of YourService here:
    this.on('CREATE','*', req => {...})
    return super.handle_validations()
  }
}
```

>

## Adding Generic Handlers

You can also add own sets of generic handlers to all instances of `cds.ApplicationService`, and subclasses thereof, by simply adding a new class method prefixed with `handle_` like so:

```js
const cds = require('@sap/cds')
cds.ApplicationService.handle_log_events = cds.service.impl (function(){
  this.on('*', req => console.log(req.event))
})
```
