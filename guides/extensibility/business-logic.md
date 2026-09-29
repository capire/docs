---
description: >
  This guide explains how SaaS providers open pre-defined extension points in their business logic, and how subscribers ship sandboxed handler code against them.
---

# Business Logic Extensibility

[[toc]]

## Introduction

[Model extensibility](customization) lets subscribers reshape a SaaS app's **data** by adding fields, entities, and annotations declaratively. This guide covers the complementary case: extending a SaaS app's **behavior**. A provider declares **pre-defined extension points** in its business logic, and subscribers implement them with their own JavaScript handlers, which run **sandboxed** on the tenant via the `@sap/cds-oyster` plugin.

In this guide, you will learn the following:

- How to declare a pre-defined extension point as a **SaaS provider**.
- How to implement and push a handler for it as an **extension developer**.

::: tip Model and code extensibility compose
An extension project can carry model extensions *and* handler code at the same time. This guide focuses on the code part; see [Extending SaaS Applications](customization) for the model part and the shared project setup.
:::

## Prerequisites {#prerequisites}

- A **CAP-based [multitenant SaaS application](../multitenancy/)** with [extensibility enabled](customization#prep-as-provider), since code extensibility builds on the same MTX sidecar. This guide continues with the [XTravels](https://github.com/capire/xtravels) sample from the [customization guide](customization#prerequisites).
- The `@sap/cds-oyster` plugin, added in the next step. It is only active in **multitenant** setups.

## As a SaaS Provider {#provider}

As a provider, you decide *where* extension code may run: you declare the extension points and call them from your own logic. Everything else stays closed.

### 1. Enable Code Extensibility

Add the `@sap/cds-oyster` plugin to **both** your application and its MTX sidecar. The sidecar processes `cds push` requests, while the app runs the deployed handlers:

::: code-group

```sh [app]
npm add @sap/cds-oyster
```

```sh [mtx/sidecar]
npm add @sap/cds-oyster --prefix mtx/sidecar
```

:::

That's all the configuration you need. The plugin registers a `code-extensibility` service with sensible sandbox defaults per profile: **mocked** for local development, and **wasm** in production. See [The Sandbox](#sandbox) for what those mean and when to override them.

::: warning Don't hand-configure the default case
The plugin auto-registers `cds.requires.code-extensibility` for you. Adding your own `"code-extensibility": true` block **overrides** that registration and discards the profile-aware defaults. Only add a block to *customize* limits (see [Configuration](code-extension#config)).
:::

### 2. Declare a Pre-defined Extension Point {#extension-point}

An extension point is an **action on a dedicated service** annotated with `@extensible.code`. That service is the *fence*: everything reachable from it is available to tenant handlers, and nothing else is.

Add a new file _srv/extension-service.cds_:

::: code-group

```cds [srv/extension-service.cds]
using { sap.capire.travels as our } from '../db/schema';

@extensible.code
service TravelExtensionService {

  // Extension point: called before a travel goes from Open to InReview.
  // Declared without an implementation — unimplemented calls are silent no-ops.
  action validateReview(travelID: Integer, user: String, timestamp: String);

  // Read-only projections handlers may query via `this.entities`.
  @readonly entity Travels  as projection on our.Travels;
  @readonly entity Bookings as projection on our.Bookings;
}
```

:::

- `@extensible.code` opens the **whole** service for code extensions. An unimplemented action on it is a **silent no-op** (HTTP 204) until a tenant deploys a handler, so your app runs unchanged out of the box. Individual elements can be closed again with `@extensible.code: false`.
- The action's parameters are the handler's only input. The sandbox does **not** expose `req.user`, so pass the acting identity (and anything else) explicitly as parameters, here `user` and `timestamp`.
- The `@readonly` projections define the data fence: handlers can read `Travels` and `Bookings`, nothing more.

### 3. Call the Extension Point {#wire}

Declaring the point isn't enough; your logic has to **call** it. In XTravels we add a `submitForReview` action that moves a travel from `Open` to `InReview` and gates the review lifecycle: a travel can only be accepted or rejected *after* it has been submitted. We call `validateReview` before the transition, so a tenant handler can veto it with `req.reject(...)`.

Add the action and wire it into the status flow, where `submitForReview` opens the review and `acceptTravel`/`rejectTravel` now transition **from `InReview`**:

::: code-group

```cds{4} [srv/travel-service/service.cds]
entity Travels as projection on our.Travels actions {
  action deductDiscount( percent: Percentage not null ) returns Travels;
  action submitForReview();
  action acceptTravel();
  action rejectTravel();
  action reopenTravel();
}
```

```cds{3-5} [srv/travel-service/flows.cds]
annotate TravelService.Travels with @flow.status: Status actions {
  deductDiscount  @from: [ #Open ];
  submitForReview @from: [ #Open ]                @to: #InReview;
  acceptTravel    @from: [ #InReview ]            @to: #Accepted;
  rejectTravel    @from: [ #InReview ]            @to: #Rejected;
  reopenTravel    @from: [ #Rejected, #Accepted ] @to: #Open;
}
```

:::

Then wire the call in your service implementation. Connect to the extension service and invoke it in a `before` handler. If no tenant handler is deployed, the call is a silent no-op and the transition proceeds:

::: code-group

```js [srv/travel-service/service.js]
async extension_points() {
  const ext = await cds.connect.to('TravelExtensionService')
  const { Travels } = this.entities
  const { submitForReview } = Travels.actions

  this.before(submitForReview, Travels, async req => {
    await ext.validateReview({
      travelID:  req.params[0].ID,
      user:      req.user.id,
      timestamp: req.timestamp?.toISOString()
    })
  })
}
```

:::

::: tip Provider decides the contract, tenant decides the policy
`validateReview` gets called on every `submitForReview`. Whether it passes, rejects, or does nothing is entirely up to the tenant's handler. That's the whole point of a pre-defined extension point: you fix *when* and *with what data* it runs; the subscriber fills in *what happens*.
:::

## As an Extension Developer {#developer}

You'll implement `validateReview` with a policy of your own: reject any travel whose total price exceeds a limit.

### 1. Start from the Template

Extension code lives in a standard extension project. Set one up exactly as in the [customization guide](customization#start-ext-project): run `cds init` and `cds add extension`, point `extends` at `@capire/xtravels`, then run [`cds pull`](customization#pull-base) and `npm install` to fetch the base model.

Two additions specific to code extensions:

1. Add the sandbox plugin as a dependency:

    ```sh
    npm add @sap/cds-oyster
    ```

2. Make sure a local _.cds_ file imports the base model, so the toolchain can resolve it. Even an otherwise-empty file will do:

    ::: code-group

    ```cds [srv/extension.cds]
    using { TravelExtensionService } from '@capire/xtravels';
    ```

    :::

::: warning Handlers are CommonJS
If `cds add extension` added `"type": "module"` to your _package.json_, **remove it**: handler files use `module.exports`, and ESM mode breaks them.
:::

### 2. Generate the Handler Stub

Scaffold an inactive stub for the extension point:

```sh
cds add ext-handler --filter validateReview
```

This writes _srv/TravelExtensionService/on-validateReview.js_ with a leading `#` in its name, marking it an **inactive** stub. Remove the `#` to activate it.

::: tip Scope the generation
Without `--filter`, `cds add ext-handler` generates stubs for *every* entity and action in the whole base model, including services that aren't `@extensible.code`. Those won't push. Filter to the extension point you're implementing, or delete the extras.
:::

### 3. Write the Handler

The file name encodes the binding: `srv/<Service>/on-<action>.js` for an unbound action. Implement your policy by reading the travel through the fenced projection and rejecting over the limit:

::: code-group

```js [srv/TravelExtensionService/on-validateReview.js]
module.exports = async function validateReview(req) {
  const { travelID } = req.data
  const { Travels } = this.entities

  const travel = await SELECT.one.from(Travels).where({ ID: travelID })
  if (travel?.TotalPrice > 10000) {
    req.reject(409, `Total price ${travel.TotalPrice} exceeds the 10000 policy limit — cannot submit for review.`)
  }
}
```

:::

`req.data` holds the action parameters; `this.entities` gives the provider's read-only projections. See [the sandbox API](code-extension#api) for the full surface.

### 4. Test-Drive Locally {#test-locally}

Run the extension standalone with `cds watch`. Under the `development` profile the handler runs in the **mocked** sandbox, a plain in-process execution that's quick to iterate on:

```sh
cds watch
```

Call `submitForReview` on a travel over the limit and confirm the `409`; on a cheap one it passes and the status flips to `InReview`.

::: tip Reproduce provider wiring locally
`cds pull` delivers the base *model*, not the provider's handler code, so the `before(submitForReview)` call that triggers your handler isn't present in a standalone run. Re-provide just that wiring in a read-only _srv/server.js_, exactly as described for [reference logic](customization#reference-wiring). On a real tenant this wiring is already there.
:::

### 5. Verify Against the Production Sandbox {#verify-wasm}

The mocked sandbox is permissive; production uses **wasm**, which enforces the real restrictions. Do a one-off check under wasm before pushing:

```sh
cds watch --wasm
```

If the handler behaves the same here, it will behave the same on the tenant. This is also where forbidden constructs surface early; see [Forbidden Constructs](code-extension#forbidden).

### 6. Push to the Tenant {#push}

Activate the extension on your tenant:

```sh
cds push
```

The push packages only the files under service-named folders (your _srv/TravelExtensionService/_ handler) plus the extension model. Verify against the deployed app: `submitForReview` on an over-limit travel now returns your `409` policy message; a cheap one succeeds.

::: warning Sidecar needs the plugin too
If `cds push` fails to process the handler, confirm `@sap/cds-oyster` is installed in the provider's **`mtx/sidecar`**, not only the app; see [step 1](#provider).
:::

## The Sandbox {#sandbox}

Extension handlers never run as ordinary Node.js modules on the tenant; they run **sandboxed**. Two engines exist: **mocked** in-process for local `cds watch` (permissive, fast to iterate), and **wasm** in production and under `cds watch --wasm` (isolated, enforces all restrictions). Every multitenant setup uses `wasm`, so the [`--wasm` check](#verify-wasm) before pushing is what catches forbidden constructs early.

The [Code Extension Reference](code-extension) documents the sandbox in full: [engines](code-extension#sandbox), [configuration](code-extension#config), the [handler-file layout](code-extension#files) and [sandbox API](code-extension#api), [query rules](code-extension#queries), [forbidden constructs](code-extension#forbidden), [quarantine](code-extension#quarantine), and [troubleshooting](code-extension#troubleshooting).

## Best Practices for Extension Developers {#best-practices}

- **Keep handlers small and focused** — one file, one job. Complex logic is hard to diagnose when a runtime error blocks the extension.
- **Push work down to the database** — filter and scope with `where` clauses and aggregates rather than looping in JavaScript.
- **Signal outcomes with `req.reject` / `req.error`, never `throw`** — an unhandled throw blocks the extension for the whole tenant until you re-push.
- **Test in the mocked sandbox, then verify with `cds watch --wasm`** before pushing, to catch forbidden constructs early.

## Best Practices for Application Providers {#provider-best-practices}

- **Monitor for quarantined extensions; subscribers aren't notified.** An *unhandled* runtime error in a handler (as opposed to a deliberate `req.reject`/`req.error`) **quarantines** it tenant-wide until the next successful push, and nothing notifies the subscriber. Make it an operations task to watch `cds.xt.Extensions` for blocked extensions and reach out to the extension developer to fix and re-push. See [Quarantine](code-extension#quarantine).
- **Be sparse with `@extensible.code`.** A **service-level** annotation opens the *entire* service — every entity, action, and event — to tenant handlers. Prefer the narrowest scope: annotate individual entities or actions, and set `@extensible.code: false` on anything you don't want reachable (helper entities, internal actions, sensitive projections). A dedicated extension service with a single action — the [pre-defined extension point](#extension-point) shown above — is the tightest option.
- **Pass identity and context explicitly.** The sandbox does not expose `req.user`. If a handler needs the acting user, tenant, or locale, pass it as an **action parameter** (as `validateReview` does with `user` and `timestamp`); never assume ambient request state.
- **Expose the minimum data surface.** Everything reachable from the annotated service is in scope for handlers. Expose only the projections a handler genuinely needs, mark them `@readonly` unless writes are required, and keep the fence as small as the use-case allows.
- **Set sandbox limits for your risk profile.** The defaults (`maxTime`, `maxMemory`, `maxCallbacks`, `maxDepth`) are conservative but generic: tighten them for less-trusted code, and decide deliberately whether `continueOnError` should keep the app running when a handler faults. See [Configuration](code-extension#config).

## Learn More

This guide covers the recommended scenario: a **pre-defined extension point**, an action the app calls at a well-known place, implemented by tenant handlers. When you also control *which* extensions reach *which* tenant — reviewed partner code, tier-gated toggles, a scratch space, or a separate microservice — you can safely open much more: CRUD events on regular entities, after-READ enrichment, and cross-record validation. See [Partner-Driven Extensibility](business-logic-advanced).
