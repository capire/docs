---
description: >
  This guide explains when a SaaS provider can safely open regular services to tenant code — CRUD event handlers, after-READ enrichment, and cross-record validation — once it controls which extensions reach which tenant.
---

# Partner-Driven Extensibility

[[toc]]

## Introduction

[Business Logic Extensibility](business-logic) covers the recommended default: a provider declares **pre-defined extension points** — actions on a dedicated `@extensible.code` service that the app calls at well-known places — and tenants only fill in handlers. The surface is explicit and easy to govern.

This guide covers what becomes safe once the provider *also* controls **which** extensions get deployed and **to whom**: reviewed partner deliverables, premium tiers gated by feature toggles, customer scratch spaces, or a separate extensible microservice. With that supply-chain control, you can responsibly open much more — **CRUD event handlers on regular entities, after-READ enrichment, and cross-record validation** — none of which the pre-defined-extension-point model exposes.

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

Pre-defined extension points remain the right default whenever the integration can be expressed as a hook the app calls. You only need the patterns here when the **application developer** — not the end customer — decides what code runs in each tenant. Four common arrangements justify opening things up:

**Reviewed partner or vendor extensions.** The app is sold or deployed together with extensions from a known partner (an ISV, a consulting partner, or your own services team). Each deliverable goes through review — code review, security scan, contractual obligations — and the provider pushes the approved extension on the customer's behalf. The people writing the handlers are accountable, so opening CRUD events on selected entities is reasonable.

**Customer-tier feature toggles.** Because `@extensible.code` is a CDS annotation, it can be gated by [feature toggles](feature-toggles). The same source CDS then presents a different extension surface per tenant: a premium tier unlocks `@extensible.code` on `Travels`, while a basic tier sees nothing. The annotation is evaluated at activation time, so validation stays consistent with what was opened for the tenant. This lets you monetize extensibility, run pilots, or roll out a new surface gradually, all with no code changes.

**Placeholder service as a scratch space.** Sometimes the value proposition is "give the customer a sandboxed area to build *something* of their own". Ship an otherwise empty `@extensible.code` service — no entities the app cares about, no app-side handlers — and let tenants populate it:

```cds
@extensible.code
service CustomerScratchpad {
  // intentionally empty — customers add their own entities and actions here
}
```

The scratch space is contained: the sandbox can only query entities inside this service, so customer code cannot reach the rest of the app.

**Separate extensible microservice.** When even a placeholder service feels too close to the core, ship the extension area as a **separate microservice** that consumes the main app through a narrow CDS contract — only the entities and actions you expose — and runs the sandbox with a generous surface. This is the heaviest option operationally, but it offers the strongest isolation, since the core app stays closed.

## Opening Regular Services {#opening}

On a regular application service, nothing is extensible by default. Opt individual entities and unbound operations in with `@extensible.code`:

::: code-group

```cds{2,8} [srv/travel-service/service.cds]
service TravelService {
  @extensible.code
  entity Travels as projection on our.Travels actions { … };  // opens the entity + its bound actions

  entity InternalData as projection on my.InternalData;         // stays closed

  @extensible.code
  action recalcTotals(travelID: Integer);                       // unbound — annotation applies directly
}
```

:::

The annotation lives at **three levels** — service, entity, and unbound action/function:

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

  // Reusable cross-record budget guard — callers pass the delta they apply.
  @extensible.code
  action assert_within_budget(customerID: String, delta: Decimal);

  // Paginated read helper — returns a JSON string (see Paginated Reads).
  @extensible.code
  action listTravelsByCustomer(customerID: String, limit: Integer, offset: Integer) returns String;
}
```

:::

The handlers also read and write two supporting entities: a per-customer budget ceiling and an audit log. These are **not** provider entities: the partner **brings them as extension entities**. A new entity a subscriber adds is **extensible by default**, so handlers query it through `this.entities` with no annotation at all:

::: code-group

```cds [extension model]
using { TravelService } from '@capire/xtravels';

extend service TravelService with {

  // Per-customer budget ceiling — read by assert_within_budget.
  entity CustomerBudgets {
    key customer_ID : String;
        maxTotal    : Decimal;
  }

  // Audit trail written by the after-handlers.
  entity TravelLog {
    key ID        : UUID;
        travel_ID : Integer;
        action    : String;
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

- `{ "for": ["TravelService"], "new-entities": 3 }` — at most **3** new entities may be added to `TravelService` (here `CustomerBudgets` and `TravelLog`, leaving room for one). A base-model **service** must be listed before *any* entity may be added to it.
- `{ "for": ["com.partner.ext"], "new-entities": 3 }` — at most **3** standalone tables in the `com.partner.ext` **namespace**. Namespaces are open by default; this caps them.
- `{ "for": [...], "kind": "entity", "new-fields": 5 }` — caps new fields on an existing entity (the `agencyEmail` model extension below adds one).

Exceed a cap and the push is rejected, naming every offending definition:

```
'TravelService.ExtraOne' exceeds extension limit of 3 for Service 'TravelService'
'com.partner.ext.TableFour' exceeds extension limit of 3 for Namespace 'com.partner.ext'
```

## CRUD Event Handler Scope {#crud}

Beyond the action and event handlers used for [pre-defined extension points](business-logic), opening an entity enables **before** and **after** handlers on its CRUD events (Create, Read, Update, Delete, Upsert). The full event scope — signatures, transaction semantics, and the `req.data` / `req.subject` / `req.results` each handler sees — is in [Code Extension Reference › Event Scope](code-extension#events). The handler-file convention and sandbox API are unchanged from [Part 1](code-extension#files).

The examples below implement one handler of each kind.

## after-READ Enrichment {#after-read}

A common use-case is adding computed information to read responses without changing the persisted model. This enriches each `Travels` row with the agency's email as a **virtual field**.

First, add the virtual element to the data model (see [Extending the Data Model](customization#extending-the-data-model) for the mechanics):

::: code-group

```cds [extension model]
extend Travels with {
  virtual agencyEmail : String @title: 'Agency Email';
}
```

:::

Then fill it at runtime. `this.entities` keeps the entity references readable:

::: code-group

```js [srv/TravelService/Travels/after-READ.js]
module.exports = async function enrichTravels(results, req) {
  const { TravelAgencies } = this.entities
  for (let r of results) {
    if (!r.Agency_ID) continue                    // FK not projected — nothing to look up
    const agency = await SELECT.one.from(TravelAgencies)
      .columns('EMailAddress')
      .where({ ID: r.Agency_ID })
    r.agencyEmail = agency?.EMailAddress ?? 'No email on file'
  }
}
```

:::

- Use a `for…of` loop, **not** `forEach`, because the `SELECT` is asynchronous and `forEach` doesn't await.
- **Guard on the source column.** A client that projects a subset (e.g. `$select=ID,agencyEmail`) may not include `Agency_ID`; a `.where({ ID: undefined })` then builds an empty, invalid expression and the handler fails. Skip rows whose source key is absent, as above.

::: warning after-READ does not recurse
Nested reads inside the sandbox do **not** re-fire after-READ handlers. If your handler reads `Travels` from within an after-READ on `Travels`, the nested read won't trigger the extension again. This prevents recursion, but means virtual fields you populate here are **not** filled on nested results.
:::

::: tip Restrict after-READ to virtual fields
Set `limitedAfterRead: true` in the [sandbox config](code-extension#config) to restrict what after-READ handlers may change to virtual fields only; this prevents extension code from rewriting persisted data through the read path.
:::

## before Handlers {#before}

`before` handlers run before the event reaches the database. They can read and mutate `req.data` to change what gets written, or call `req.reject` to abort. `req.data` is always `{}` for `before-DELETE`.

### before CREATE — validate, default, and call an action {#before-create}

This handler enforces required fields, applies defaults, and delegates the cross-record budget check to a reusable unbound action. **Any unbound service action is callable via `this.<action>(params)`** from within any sandbox handler:

::: code-group

```js [srv/TravelService/Travels/before-CREATE.js]
module.exports = async function beforeCreateTravel(req) {
  if (!req.data.Description?.trim())
    req.reject(400, 'Description is required')

  if (req.data.BeginDate && req.data.EndDate && req.data.EndDate < req.data.BeginDate)
    req.reject(400, 'End date must be after begin date')

  // Defaults for optional fields the caller omitted
  if (req.data.Status_code   == null) req.data.Status_code   = 'O'    // Open
  if (req.data.Currency_code == null) req.data.Currency_code = 'EUR'

  // Cross-record budget check — reuse the same action UPDATE uses
  if (req.data.Customer_ID && req.data.BookingFee != null) {
    await this.assert_within_budget({
      customerID: req.data.Customer_ID,
      delta:      req.data.BookingFee,   // a create adds the full fee
    })
  }
}
```

:::

The sandbox validates parameter and return types against the CDS model on every action call. Only unbound (service-level) actions are callable via `this`; instance-bound actions cannot be invoked this way.

### before UPDATE — a cross-record budget {#before-update}

State machines and per-field transition rules belong in the CDS model; CAP already offers declarative flow annotations for them. Handlers earn their keep when a rule reaches **across records** and needs a live aggregate no annotation can express.

A customer has a fixed travel budget stored in `CustomerBudgets`. Before a travel is updated, the handler reads the currently-persisted `BookingFee`, computes the delta the caller is applying, and delegates the customer-wide check:

::: code-group

```js [srv/TravelService/Travels/before-UPDATE.js]
module.exports = async function beforeUpdateTravel(req) {
  if (req.data.BookingFee == null) return   // payload doesn't touch the fee — nothing to enforce

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

### before DELETE — dependency guard {#before-delete}

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

Implement `assert_within_budget` (declared in [Opening Regular Services](#opening)). It reads the customer's current spend, adds `delta`, and rejects if the budget would be exceeded. Callers compute the delta (`new − old` for UPDATE; `new` for CREATE), which keeps the action simple and event-agnostic:

::: code-group

```js [srv/TravelService/on-assert_within_budget.js]
module.exports = async function assert_within_budget(req) {
  const { Travels, CustomerBudgets } = this.entities
  const { customerID, delta } = req.data

  const budget = await SELECT.one.from(CustomerBudgets)
    .columns('maxTotal')
    .where({ customer_ID: customerID })
  if (!budget) return   // no budget on record — nothing to enforce

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

The invariant: **reject in `before`, react in `after`.** That makes `after` handlers the place for audit trails, change tracking, and cleanup, not for enforcing rules.

### after CREATE — audit entry {#after-create}

::: code-group

```js [srv/TravelService/Travels/after-CREATE.js]
module.exports = async function afterCreateTravel(result, req) {
  const { TravelLog } = this.entities
  await INSERT.into(TravelLog).entries({
    ID:        utils.uuid(),
    travel_ID: req.data.ID,
    action:    `created (customer=${req.data.Customer_ID}, agency=${req.data.Agency_ID})`,
  })
}
```

:::

Read from `req.data`: it carries the full payload, including the ID assigned in `before-CREATE`. Use `utils.uuid()` (available on every sandbox handler) rather than a hand-rolled ID. Under CAP 10, `result` is a minimal projection (typically just key columns), so `req.data` gives you every field the write touched.

### after UPDATE — change tracking {#after-update}

`req.data` still carries the caller's payload, so you can log exactly which tracked fields changed without re-reading the row:

::: code-group

```js [srv/TravelService/Travels/after-UPDATE.js]
const TRACKED = ['Status_code', 'BookingFee', 'Description']

module.exports = async function afterUpdateTravel(result, req) {
  const { TravelLog } = this.entities
  const changed = TRACKED.filter(f => f in req.data)
  if (!changed.length) return

  await INSERT.into(TravelLog).entries({
    ID:        utils.uuid(),
    travel_ID: req.subject.ref[0].where?.[2].val,
    action:    `updated: ${changed.map(f => `${f}=${req.data[f]}`).join(', ')}`,
  })
}
```

:::

The `TRACKED` allow-list keeps noise out of the log. The travel ID comes from `req.subject.ref` (the URL key), populated for OData PATCH/PUT.

### after DELETE — cleanup of non-composition dependents {#after-delete}

CAP automatically deletes composition targets with their parent. Anything referencing a travel through a **plain association** (foreign key only) is not touched; `TravelLog` is such a case. Sweep those rows:

::: code-group

```js [srv/TravelService/Travels/after-DELETE.js]
module.exports = async function afterDeleteTravel(result, req) {
  const { TravelLog } = this.entities
  const ID = req.subject.ref[0].where?.[2].val
  if (ID == null) return   // programmatic delete without an OData key — nothing to sweep

  await DELETE.from(TravelLog).where({ travel_ID: ID })
}
```

:::

`result` is `undefined` for after-DELETE (the row is gone), so the key comes from `req.subject`. Guard on the key: OData deletes populate `req.subject.ref[0].where`, but a programmatic `DELETE.from(…).where(…)` may not. The cleanup runs after commit. If it fails, the travel is still deleted; log the failure or emit a compensating event rather than trying to abort here.

## Paginated Reads {#pagination}

The sandbox adds no result-size cap of its own; reads inherit CAP's [implicit pagination](../services/served-ootb#implicit-pagination), a default maximum of 1,000 records (see [query rules](code-extension#queries)). Use `.limit(rows, offset)` to page deliberately; the second argument is the row offset:

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

## Best Practices {#best-practices}

These patterns open more surface than [pre-defined extension points](business-logic). The following keep it manageable:

- **Reject in `before`, react in `after`.** `before` runs inside the request's transaction and can abort it; `after` runs after commit and cannot undo the write. Put invariants in `before` and side effects (audit, notify, cleanup) in `after`.
- **Open the smallest surface that fits.** Annotate individual entities and unbound operations, not the whole service. You can widen later; **narrowing** an already-opened surface breaks deployed extensions.
- **Prefer pre-defined extension points whenever the integration is a single hook.** CRUD handlers are powerful but ambient: an author must reason about every write that reaches the entity. A dedicated `@extensible.code` action gives the same result with a clearer contract. See [When to Open Things Up](#when).
- **Factor cross-record rules into unbound actions.** The `assert_within_budget` pattern scales because every handler that touches the invariant delegates to one place. Duplicating the check in each handler drifts.
- **Keep declarative rules declarative.** Status transitions, mandatory fields, and value ranges belong on the model (`@assert.*`, flow annotations, `@readonly`). Restating them in a handler bypasses tooling and hides the rule. The `before-UPDATE` example here is deliberately a **cross-record aggregate**, something annotations cannot express.
- **When in doubt, go back to [pre-defined extension points](business-logic).** If your integration is *"call this action at this point"*, keep it there. The scenarios that justify this guide all share a controlled extension-supply chain.
