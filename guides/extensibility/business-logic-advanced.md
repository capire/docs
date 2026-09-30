---
description: >
  This guide explains when a SaaS provider can safely open regular services to tenant code (CRUD event handlers, after-READ enrichment, and cross-record validation) once it controls which extensions reach which tenant.
---

# Opening Regular Services

[[toc]]

## Introduction

[Business Logic Extensibility](business-logic) covers the recommended default: a provider declares **pre-defined extension points** (actions on a dedicated `@extensible.code` service that the app calls at well-known places), and tenants only fill in handlers. The surface is explicit and easy to govern.

This guide covers what becomes safe once the provider *also* controls **which** extensions get deployed and **to whom**: reviewed partner deliverables, premium tiers gated by feature toggles, customer scratch spaces, or a separate extensible microservice. With that supply-chain control, you can responsibly open much more (**CRUD event handlers on regular entities, after-READ enrichment, and cross-record validation**), none of which the pre-defined-extension-point model exposes.

In this guide, you will learn the following:

- **When** to open up a regular service, and the arrangements that justify it.
- How to **open** individual entities and unbound actions on a regular service.
- How to write **CRUD, before/after, and after-READ** handlers, and reusable cross-record validation.

::: warning Only with a controlled extension-supply chain
Use these patterns only if you can answer *yes* to: **do I control or trust the source of every extension that reaches the tenant?** If tenants author and push their own unreviewed code, stay with [pre-defined extension points](business-logic); they don't expose CRUD events to tenants at all.
:::

::: tip Builds on Part 1
This guide assumes the setup, project layout, sandbox model, and handler-file conventions from [Business Logic Extensibility](business-logic). It only covers what's *different* when you open regular services.
:::

## When to Open Things Up {#when}

Pre-defined extension points remain the right default whenever the integration can be expressed as a hook the app calls. You only need the patterns here when the **application developer**, not the end customer, decides what code runs in each tenant. Four common arrangements justify opening things up:

**Reviewed partner or vendor extensions.** The app is sold or deployed together with extensions from a known partner (an ISV, a consulting partner, or your own services team). Each deliverable goes through review (code review, security scan, contractual obligations), and the provider pushes the approved extension on the customer's behalf. The people writing the handlers are accountable, so opening CRUD events on selected entities is reasonable.

**Customer-tier feature toggles.** Because `@extensible.code` is a CDS annotation, it can be gated by [feature toggles](feature-toggles). The same source CDS then presents a different extension surface per tenant: a premium tier unlocks `@extensible.code` on `Travels`, while a basic tier sees nothing. The annotation is evaluated at activation time, so validation stays consistent with what was opened for the tenant. This lets you monetize extensibility, run pilots, or roll out a new surface gradually, all with no code changes.

**Placeholder service as a scratch space.** Sometimes the value proposition is "give the customer a sandboxed area to build *something* of their own". Ship an otherwise empty `@extensible.code` service (no entities the app cares about, no app-side handlers) and let tenants populate it:

```cds
@extensible.code
service CustomerScratchpad {
  // intentionally empty: customers add their own entities and actions here
}
```

The scratch space is contained: the sandbox can only query entities inside this service, so customer code cannot reach the rest of the app.

**Separate extensible microservice.** When even a placeholder service feels too close to the core, ship the extension area as a **separate microservice** that consumes the main app through a narrow CDS contract (only the entities and actions you expose) and runs the sandbox with a generous surface. This is the heaviest option operationally, but it offers the strongest isolation, since the core app stays closed.

## Opening Entities and Actions {#opening}

On a regular application service, nothing is extensible by default. Opt individual entities and unbound operations in with `@extensible.code`:

::: code-group

```cds{2,8} [srv/travel-service/service.cds]
service TravelService {
  @extensible.code
  entity Travels as projection on our.Travels actions { … };  // opens the entity + its bound actions

  entity InternalData as projection on my.InternalData;         // stays closed

  @extensible.code
  action recalcTotals(travelID: Integer);                       // unbound: annotation applies directly
}
```

:::

The annotation lives at **three levels**: service, entity, and unbound action/function:

- **Bound** actions and functions cannot be annotated individually; they inherit from the entity they attach to (which falls back to the service). Annotating a bound action has no effect.
- Annotating the **service** itself opens all its entities and operations at once; individual elements can then be closed again with `@extensible.code: false`. On regular services, prefer **per-entity / per-unbound-action** annotations, which keep the extension surface visible at the model level.

::: warning Actions a handler implements must be opened directly
An unbound action that a tenant handler *implements* must carry `@extensible.code` on the action itself. Pushing a handler for an unannotated target is rejected at `cds push`:

```
Code extension for TravelService.<target> is not allowed
```
:::

**Supporting actions for the examples below.** The provider opens `Travels` (above) and declares two reusable **unbound actions** the partner handlers call. Actions a handler implements must carry `@extensible.code`, and the partner does *not* redeclare them:

::: code-group

```cds [srv/travel-service/partner-ext.cds]
using { TravelService } from './service';

extend service TravelService with {

  // Reusable cross-record budget guard: callers pass the delta they apply.
  @extensible.code
  action assert_within_budget(customerID: String, delta: Decimal);

  // Paginated read helper: returns a JSON string (see Paginated Reads).
  @extensible.code
  action listTravelsByCustomer(customerID: String, limit: Integer, offset: Integer) returns String;
}
```

:::

The handlers also read two supporting entities (a per-customer budget ceiling and a per-customer policy flag) and emit a domain event. The entities are **not** provider entities: the partner **brings them as extension entities**. A new entity a subscriber adds is **extensible by default**, so handlers query it through `this.entities` with no annotation at all. The event is declared the same way, so `after-CREATE` can emit it:

::: code-group

```cds [extension model]
using { TravelService } from '@capire/xtravels';

extend service TravelService with {

  // Per-customer budget ceiling: read by assert_within_budget.
  entity CustomerBudgets {
    key customer_ID : String;
        maxTotal    : Decimal;
  }

  // Per-customer policy flags: read by before-CREATE.
  entity CustomerPolicies {
    key customer_ID : String;
        blocked     : Boolean;
  }

  // Domain event emitted by after-CREATE (see after Handlers).
  event TravelCreated {
    ID       : Integer;
    customer : String;
  }
}
```

:::

::: warning Never put `@extensible.code` in an extension
An extension model must not contain `@extensible.code` **anywhere**. It is the provider's switch for opening surface; the subscriber's job is to fill opened surface, not to open more. New extension entities are already extensible by default, so they need no annotation, and a push whose model carries `@extensible.code` is rejected outright:

```
Extension contains @extensible.code annotation which is not permitted
```
:::

### Restricting the Extension Surface {#restrict}

Letting subscribers add entities is powerful, so cap it. An **extension allow-list** on the sidecar's `cds.xt.ExtensibilityService` bounds how much a subscriber may add, per service and per namespace. It governs the *model* surface; see [Restrict Extension Points](customization#restrictions) for the full set of model-restriction options.

::: code-group

```jsonc [mtx/sidecar/package.json]
{
  "cds": {
    "requires": {
      "cds.xt.ExtensibilityService": {
        "extension-allowlist": [
          { "for": ["sap.capire.travels.Travels"], "kind": "entity", "new-fields": 5 },
          { "for": ["TravelService"], "new-entities": 3 },
          { "for": ["com.partner.ext"], "new-entities": 3 }
        ]
      }
    }
  }
}
```

:::

- `{ "for": ["TravelService"], "new-entities": 3 }`: at most **3** new entities may be added to `TravelService` (here `CustomerBudgets` and `CustomerPolicies`, leaving room for one; the `TravelCreated` **event** does not count against the entity cap). A base-model **service** must be listed before *any* entity may be added to it.
- `{ "for": ["com.partner.ext"], "new-entities": 3 }`: at most **3** standalone tables in the `com.partner.ext` **namespace**. Namespaces are open by default; this caps them.
- `{ "for": [...], "kind": "entity", "new-fields": 5 }`: caps new fields on an existing entity (the `customerStatus` model extension below adds one).

Exceed a cap and the push is rejected, naming every offending definition:

```
'TravelService.ExtraOne' exceeds extension limit of 3 for Service 'TravelService'
'com.partner.ext.TableFour' exceeds extension limit of 3 for Namespace 'com.partner.ext'
```

## CRUD Event Handler Scope {#crud}

Beyond the action and event handlers used for [pre-defined extension points](business-logic), opening an entity enables **before** and **after** handlers on its CRUD events (Create, Read, Update, Delete, Upsert). The full event scope (signatures, transaction semantics, and the `req.data` / `req.subject` / `req.results` each handler sees) is in [Code Extension Reference › Event Scope](code-extension#events). The handler-file convention and sandbox API are unchanged from [Part 1](code-extension#files).

The examples below implement one handler of each kind.

## after-READ Enrichment {#after-read}

A common use-case is adding computed information to read responses without changing the persisted model, for example a **customer-status tier** derived from a customer's travel history. Before writing a handler, reach for the cheapest mechanism that does the job:

1. **Prefer calculated elements and associations.** If the value can be derived from data the model already relates (a field on an associated entity, or an expression over existing columns), express it declaratively as a [calculated element](../../cds/cdl#calculated-elements) or expose it along an association. The framework resolves it in the *same* query, as a JOIN: no handler code, and no extra round-trips. For "show a field from a related record", this is almost always the right answer.
2. **Use an after-READ handler only for what the model can't express**: a value that needs a service call, an aggregate over a *different* set of rows, or a source the projection can't reach. Even then, favor enriching **single-record** reads, where the cost is one extra lookup.
3. **Never look up per row on a multi-record read.** A handler that issues one query per row turns a page of N rows into N database round-trips, the classic N+1. Either enrich single-record reads only, as below, or, when a page genuinely needs enriching, collect the keys and fetch them in **one** query.

The example enriches `Travels` with a `customerStatus` tier (Gold, Silver, or Bronze) computed from the customer's **lifetime spend across all their travels**. This can't be a calculated element or an association path: it isn't an expression over the row's own columns, and the `Customer` association yields the customer record, not an aggregate over that customer's *other* travels. It needs a handler, and because computing it means a full aggregate scan per customer, a **single-record** one.

First, add the virtual element to the data model (see [Extending the Data Model](customization#extending-the-data-model) for the mechanics):

::: code-group

```cds [extension model]
extend Travels with {
  virtual customerStatus : String @title: 'Customer Status';
}
```

:::

Then compute it for single-record reads only: guard on the result size, aggregate the customer's spend in one query, and apply the tiering rule:

::: code-group

```js [srv/TravelService/Travels/after-READ.js]
module.exports = async function enrichCustomerStatus(results, req) {
  // Only enrich a single addressed record (e.g. GET /Travels(42)).
  // On a collection read this would be one aggregate query per row.
  if (results.length !== 1) return

  const [travel] = results
  if (!travel.Customer_ID) return

  const { Travels } = this.entities

  // Lifetime spend across the customer's entire travel history.
  const { total } = await SELECT.one.from(Travels)
    .columns`sum(TotalPrice) as total`
    .where({ Customer_ID: travel.Customer_ID })

  const spend = total ?? 0
  travel.customerStatus = spend > 50000 ? 'Gold' : spend > 10000 ? 'Silver' : 'Bronze'
}
```

:::

- **Guard on result size.** `results.length !== 1` restricts the work to single-record reads: the aggregate scan runs once, for the one addressed row, never once per row of a page. A filtered collection read that returns a single row is enriched too; the guard keys on the result, not on the URL shape.
- **Aggregate in the database.** `` .columns`sum(TotalPrice) as total` `` computes the total in one query instead of fetching the customer's travels and summing in JavaScript. Push work down to the database.
- **The handler depends on the fields it reads.** It reads `travel.Customer_ID`, so a client projecting a subset that omits it (`$select=ID,customerStatus`) leaves `customerStatus` empty, because the handler returns early. Read the fields your enrichment needs, or don't narrow them away.
- **Object `where` does equality only.** `` .where({ Customer_ID: … }) `` is fine for an equality match, but operators must use the tagged-template form: `` .where`ID in ${ids}` ``, `` .where`TotalPrice > ${limit}` ``. The object form `{ in: [ … ] }` is **not** honored inside the sandbox and silently matches nothing.

::: warning after-READ does not recurse
Nested reads inside the sandbox do **not** re-fire after-READ handlers. If your handler reads `Travels` from within an after-READ on `Travels`, the nested read won't trigger the extension again. This prevents recursion, but means virtual fields you populate here are **not** filled on nested results.
:::

::: tip Restrict after-READ to virtual fields
Set `limitedAfterRead: true` in the [sandbox config](code-extension#config) to restrict what after-READ handlers may change to virtual fields only; this prevents extension code from rewriting persisted data through the read path.
:::

## before Handlers {#before}

`before` handlers run before the event reaches the database. They can read and mutate `req.data` to change what gets written, or call `req.reject` to abort. `req.data` is always `{}` for `before-DELETE`.

### before CREATE: cross-record checks {#before-create}

Single-record rules (a **required** field, a **value range**, a **default**) are declarative. Where they belong depends on *who owns the field*.

**Fields you add** in the extension model can carry their own validation, **as long as the field is defaulted**. The extension linter allows `@mandatory`, `@assert.range`, `@assert.notNull`, and `@readonly` on an extension field **only when it also has a `default`**, so the rule can never fail activation or reject data the tenant didn't send:

::: code-group

```cds [extension model]
extend TravelService.Travels with {
  x_headcount : Integer @assert.range: [1, 50] default 1;
}
```

:::

**The provider's own fields**, by contrast, can't be re-annotated from an extension: a `@mandatory` or `@assert.range` on `Travels.Description` is rejected at `cds push`. Those rules are the provider's to declare on the base model.

::: warning Case-expression constraints don't work in extensions
The declarative [constraint](../services/constraints) form (`@assert: (case … end)`, which a **cross-field** rule like `EndDate >= BeginDate` needs) is rejected at `cds push` from an extension (reported as `Annotation '@assert' … is not supported in extensions`), on your own fields as much as the provider's, and a `default` does not exempt it. Keep cross-field rules in a handler, or have the provider add the constraint to the base model.
:::

That leaves the handler for the checks a constraint genuinely *can't* express: anything that reaches **across records**. This before-CREATE does two: it rejects travels for a **blocked customer** (a lookup on another entity) and delegates the customer-wide **budget** check to a reusable unbound action. **Any unbound service action is callable via `this.<action>(params)`** from within a sandbox handler:

::: code-group

```js [srv/TravelService/Travels/before-CREATE.js]
module.exports = async function beforeCreateTravel(req) {
  const { CustomerPolicies } = this.entities
  const { Customer_ID, BookingFee } = req.data
  if (!Customer_ID) return

  // Lookup on another entity: is this customer blocked?
  const policy = await SELECT.one.from(CustomerPolicies)
    .columns('blocked')
    .where({ customer_ID: Customer_ID })
  if (policy?.blocked)
    req.reject(403, `Customer ${Customer_ID} is blocked and cannot have new travels`)

  // Cross-record budget check: reuse the same action UPDATE uses
  if (BookingFee != null)
    await this.assert_within_budget({ customerID: Customer_ID, delta: BookingFee })
}
```

:::

The sandbox validates parameter and return types against the CDS model on every action call. Only unbound (service-level) actions are callable via `this`; instance-bound actions cannot be invoked this way.

### before UPDATE: a cross-record budget {#before-update}

State machines and per-field transition rules belong in the CDS model; CAP already offers declarative flow annotations for them. Handlers earn their keep when a rule reaches **across records** and needs a live aggregate no annotation can express.

A customer has a fixed travel budget stored in `CustomerBudgets`. Before a travel is updated, the handler reads the currently-persisted `BookingFee`, computes the delta the caller is applying, and delegates the customer-wide check:

::: code-group

```js [srv/TravelService/Travels/before-UPDATE.js]
module.exports = async function beforeUpdateTravel(req) {
  if (req.data.BookingFee == null) return   // payload doesn't touch the fee, nothing to enforce

  const { BookingFee: currentFee, Customer_ID } = await SELECT.one.from(req.subject)
    .columns('BookingFee', 'Customer_ID')
    || req.reject(404, 'Travel not found')

  await this.assert_within_budget({
    customerID: Customer_ID,
    delta:      req.data.BookingFee - currentFee,
  })
}
```

:::

- `before-UPDATE` fires only when the payload includes `BookingFee`.
- `req.subject` carries the entity key when the request originates from an OData URL (e.g. `PATCH /Travels(key)`). For programmatic updates using a `.where()` clause, fall back to `req.data.ID` if present in the payload.

### before DELETE: dependency guard {#before-delete}

`req.data` is always `{}` here. Use `req.subject` to identify the record, then block on dependencies:

::: code-group

```js [srv/TravelService/Travels/before-DELETE.js]
module.exports = async function beforeDeleteTravel(req) {
  const { Bookings } = this.entities
  const ID = req.subject.ref[0].where?.[2].val

  const hasBookings = await this.exists(Bookings).where({ Travel_ID: ID })
  if (hasBookings)
    req.reject(409, 'Cancel all bookings before deleting this travel')
}
```

:::

### Reusable Validation with an Unbound Action {#reusable}

The budget check isn't specific to UPDATE: the same rule applies on **create** and on any partner-defined action that touches spend. Extract it into an unbound action so every handler calls it in one line.

Implement `assert_within_budget` (declared in [Opening Entities and Actions](#opening)). It reads the customer's current spend, adds `delta`, and rejects if the budget would be exceeded. Callers compute the delta (`new − old` for UPDATE; `new` for CREATE), which keeps the action simple and event-agnostic:

::: code-group

```js [srv/TravelService/on-assert_within_budget.js]
module.exports = async function assert_within_budget(req) {
  const { Travels, CustomerBudgets } = this.entities
  const { customerID, delta } = req.data

  const budget = await SELECT.one.from(CustomerBudgets)
    .columns('maxTotal')
    .where({ customer_ID: customerID })
  if (!budget) return   // no budget on record, nothing to enforce

  const { total } = await SELECT.one.from(Travels)
    .columns`sum(BookingFee) as total`
    .where({ Customer_ID: customerID })

  const projected = (total ?? 0) + delta
  if (projected > budget.maxTotal)
    req.reject(409, `Change pushes customer total to ${projected}, over the customer budget of ${budget.maxTotal}`)
}
```

:::

- **Tagged-template for aggregates.** ``.columns`sum(BookingFee) as total` `` parses the column alias through the CQL tagged-template grammar; the object-string form `('sum(…) as total')` is not equivalent.
- **`|| req.reject(...)`** works because `req.reject` always throws: when `SELECT.one` returns `null`, the right-hand side runs and the function exits via the thrown error; when a record is found, `||` short-circuits and the result destructures normally.

## after Handlers {#after}

`after` handlers run once the transaction has committed. They receive `(result, req)`, where `req.results` is the same value. Because the transaction is closed, any CQL you run executes in a **new** transaction. Side effects survive even if the caller aborts later work, and a rejection here surfaces to the caller but does **not** roll the original write back.

The invariant: **reject in `before`, react in `after`.** That makes `after` handlers the place for side effects (emitting domain events, sending notifications, kicking off downstream work), not for enforcing rules.

### after CREATE: emit a domain event {#after-create}

The canonical `after` reaction is emitting an event so downstream systems can pick up the change asynchronously. `after-CREATE` emits `TravelCreated`, declared as an event in the [extension model](#opening):

::: code-group

```js [srv/TravelService/Travels/after-CREATE.js]
module.exports = async function afterCreateTravel(result, req) {
  await this.emit('TravelCreated', {
    ID:       req.data.ID,
    customer: req.data.Customer_ID,
  })
}
```

:::

- **Emit only modeled events.** The sandbox rejects `this.emit('X', …)` unless `X` is an event declared in the service model, and it validates the payload against that declaration. Declaring the event is what makes the emit legal; see the `event TravelCreated` in [Opening Entities and Actions](#opening).
- **`await` the emit.** The sandbox await-linter requires it; a bare `this.emit(...)` is flagged.
- **Read from `req.data`, not `result`.** `req.data` carries the full payload, including the `ID` assigned in `before-CREATE`; under CAP 10 `result` is a minimal projection (typically just key columns).

::: tip after-UPDATE and after-DELETE work the same way
The same rules apply to the other `after` events, so they need no separate examples. Two facts worth keeping in mind: on UPDATE and DELETE the record key comes from `req.subject` (populated for OData PATCH/PUT/DELETE by the URL key, e.g. `req.subject.ref[0].where?.[2].val`), since `result` is a minimal projection on UPDATE and `undefined` on DELETE; and on DELETE, CAP cascades to **composition** targets automatically but leaves rows referenced through a plain **association** untouched, so sweep those with your own `DELETE` if needed. Because `after` runs post-commit, a failure there cannot roll the original write back; log it or emit a compensating event.
:::

## Paginated Reads {#pagination}

The sandbox adds no result-size cap of its own, but reads inside a handler still inherit CAP's [implicit pagination](../services/served-ootb#implicit-pagination): a `SELECT` returns at most the service's default page size (**1,000 records** unless the provider changed it) even without an explicit `.limit` (see [query rules](code-extension#queries)). The cap is applied **silently**: a handler that scans a large set without paging simply never sees the rows past the limit, with nothing to signal they were dropped. Page deliberately with `.limit(rows, offset)`, where the second argument is the row offset:

::: code-group

```js [srv/TravelService/on-listTravelsByCustomer.js]
module.exports = async function listTravelsByCustomer(req) {
  const { Travels } = this.entities
  const { customerID, limit = 20, offset = 0 } = req.data

  const results = await SELECT.from(Travels)
    .columns('ID', 'Description', 'BeginDate', 'EndDate', 'Status_code', 'BookingFee')
    .where({ Customer_ID: customerID })
    .orderBy({ BeginDate: 'desc' })
    .limit(limit, offset)
  return JSON.stringify(results)
}
```

:::

- Returning `many <Entity>` from an action is not currently validated by the sandbox return-type check. Use `returns String` and serialize with `JSON.stringify`.
- The `.orderBy()` is essential: without a stable sort, the same row can appear on multiple pages.
- Defaults make the action safe to call with only `customerID`.

Callers step through pages by incrementing `offset` by `limit`:

| Call        | `limit` | `offset` | Rows returned |
|-------------|---------|----------|---------------|
| First page  | 20      | 0        | rows 1–20     |
| Second page | 20      | 20       | rows 21–40    |
| Third page  | 20      | 40       | rows 41–60    |

::: tip Internal reads have no `nextLink`
The `@odata.nextLink` that CAP adds to a truncated OData **response** is a serialization artifact for HTTP clients (see [Implicit Pagination](../services/served-ootb#implicit-pagination)). A `SELECT` inside a handler returns a plain array with no such marker (nothing tells you rows were dropped), so track your own `offset` to walk the whole set. The default page size itself is the application provider's setting, via the [`@cds.query.limit`](../services/served-ootb#annotation-cds-query-limit) annotation or `cds.query.limit` config; as an extension developer, page explicitly with `.limit` rather than relying on it.
:::

## Best Practices {#best-practices}

These patterns open more surface than [pre-defined extension points](business-logic). The following keep it manageable:

- **Reject in `before`, react in `after`.** `before` runs inside the request's transaction and can abort it; `after` runs after commit and cannot undo the write. Put invariants in `before` and side effects (notify, emit events, cleanup) in `after`.
- **Open the smallest surface that fits.** Annotate individual entities and unbound operations, not the whole service. You can widen later; **narrowing** an already-opened surface breaks deployed extensions.
- **Prefer pre-defined extension points whenever the integration is a single hook.** CRUD handlers are powerful but ambient: an author must reason about every write that reaches the entity. A dedicated `@extensible.code` action gives the same result with a clearer contract. See [When to Open Things Up](#when).
- **Factor cross-record rules into unbound actions.** The `assert_within_budget` pattern scales because every handler that touches the invariant delegates to one place. Duplicating the check in each handler drifts.
- **Keep declarative rules declarative, within the extension boundary.** Value ranges and mandatory checks belong on the model, not in a handler that bypasses tooling and hides the rule. In an extension that works only on **fields you add** and **only when they carry a `default`** (`x_… @assert.range: […] default …`); the provider's own fields, cross-field case-expression constraints (`@assert: (case …)`), and undefaulted asserts are all rejected at `cds push`, so those stay a handler check or move to the base model. The `before-CREATE` customer lookup and the `before-UPDATE` **cross-record aggregate** are deliberately in handlers: no constraint can express them.
- **When in doubt, go back to [pre-defined extension points](business-logic).** If your integration is *"call this action at this point"*, keep it there. The scenarios that justify this guide all share a controlled extension-supply chain.
