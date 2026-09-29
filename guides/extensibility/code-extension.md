---
description: >
  Reference for the code-extension sandbox: engines, configuration, handler files, the sandbox API, event scope, query rules, forbidden constructs, and quarantine behavior.
---

# Code Extension Reference

[[toc]]

## Introduction

Code extensions run tenant-supplied JavaScript handlers **sandboxed** on the application, via the `@sap/cds-oyster` plugin. The plugin is active only in **multitenant** setups; it registers a `code-extensibility` service that validates handlers at `cds push` and executes them at runtime inside a constrained sandbox.

This page is the shared reference for both extensibility guides:

- [Business Logic Extensibility](business-logic) — declaring **pre-defined extension points** on a dedicated service (the recommended default).
- [Partner-Driven Extensibility](business-logic-advanced) — opening regular services to CRUD, before/after, and after-READ handlers once you control which extensions reach which tenant.

See those guides for the end-to-end walkthroughs; the sections below document the sandbox itself.

## The Sandbox {#sandbox}

Extension handlers never run as ordinary Node.js modules on the tenant. They run in a sandbox that constrains what they can reach. There are two engines:

| Sandbox    | When                                    | Characteristics                                        |
|------------|-----------------------------------------|--------------------------------------------------------|
| **mocked** | local `development` profile (`cds watch`) | in-process, permissive — fast iteration                |
| **wasm**   | production, and `cds watch --wasm`      | isolated WebAssembly runtime — enforces all restrictions |

The plugin picks the engine automatically. **Every multitenant setup uses `wasm`** — the realistic push flow always runs the isolated engine. The permissive `mocked` engine is a single-tenant local-development convenience, selected only when `code-extensibility.sandbox` is `mocked` and the app is single-tenant. Because production is always `wasm`, verify under `cds watch --wasm` before pushing.

### Debugging in the mocked sandbox {#debugging}

The `mocked` engine runs each handler **in-process**, executing your handler file as its own source (the sandbox sets the file path as the script's `sourceURL`). That makes handlers debuggable like any other Node.js code: launch the app with an inspector, then set breakpoints directly in the handler file.

```sh
cds watch --debug        # or --inspect-brk to also break on the first line
```

Attach your editor's Node debugger (VS Code's JavaScript debugger, Chrome DevTools, …) and set a breakpoint in `srv/<Service>/on-<action>.js` or any CRUD handler file. Execution stops there on the next call, so you can step through the handler, inspect `req`, `req.data`, and `this.entities`, and evaluate `SELECT` / `cql` in the debug console.

This works **only** in the `mocked` engine, which is selected for single-tenant local development — the default when you run an extension standalone with `cds watch`. The `wasm` engine runs handler code in an isolated WebAssembly runtime with no attach point, so breakpoints never bind there. Debug your logic in the mocked sandbox, then [verify under `--wasm`](business-logic#verify-wasm) to catch anything the isolated engine forbids.

## Configuration {#config}

The plugin auto-registers `cds.requires.code-extensibility` with profile-aware defaults, so most projects need no configuration. To tune limits or force `wasm` locally, add a `code-extensibility` block — all keys are optional:

::: code-group

```jsonc [package.json]
{
  "cds": {
    "requires": {
      "code-extensibility": {
        "sandbox": "wasm",        // force the production engine locally
        "maxTime": 3000,          // per-call time budget in ms (default 3000)
        "maxMemory": 4,           // memory budget in MB (default 4)
        "maxCallbacks": 100,      // max callback invocations (default 100)
        "maxDepth": 10,           // max nested sandbox calls (default 10)
        "continueOnError": false, // keep running on system errors (default false)
        "limitedAfterRead": false // restrict after-READ writes to virtual fields (default false)
      }
    }
  }
}
```

:::

::: warning Don't add this block just to enable the feature
This block only *customizes* an already-registered service. Adding it for the default case (e.g. `"code-extensibility": true`) overrides the plugin's profile-aware defaults.
:::

- Set `limitedAfterRead: true` to restrict what after-READ handlers may change to **virtual fields only**, preventing extension code from rewriting persisted data through the read path.
- The defaults are conservative but generic. Tighten `maxTime` / `maxMemory` / `maxCallbacks` / `maxDepth` for less-trusted code, and decide deliberately whether `continueOnError` should keep the app running when a handler faults.

## Handler Files {#files}

Handlers live in service-named folders, one file per binding:

```zsh
srv/
└─ <ServiceName>/
   ├─ on-<action>.js          # unbound action or event
   └─ <EntityName>/
      ├─ when-<CUD>.js         # before a Create/Update/Delete
      ├─ after-<READ>.js       # after a Read
      └─ on-<action>.js        # bound action or event
```

## Sandbox API {#api}

Inside a handler you get a constrained but familiar surface:

- `req.data` — the action parameters / payload.
- `req.subject` — the addressed entity set.
- `req.reject(code, msg)` / `req.error` / `req.warn` / `req.info` / `req.notify` — outcome and messages.
- `this.entities`, CRUD (`this.read`, `this.update`, …), `this.exists(…)`, `this.emit(…)` — scoped to the `@extensible.code` service's entities only.
- `cql` query builders and `utils.uuid`.

Handlers need not be `async`; a plain synchronous function is fine when no query or service call is involved.

::: warning No `req.user` in the sandbox
The sandbox does not expose `req.user`. If a handler needs the acting identity, the provider must pass it as an **action parameter**.
:::

## Event Scope {#events}

A handler binds to an **action or event** (bound or unbound) or, on an opened entity, to a **CRUD event**. Actions and events are the surface of [pre-defined extension points](business-logic#extension-point); opening a regular entity additionally enables the CRUD handlers below.

| When     | What                                  | Behavior |
| :------- | :------------------------------------ | :------- |
| `before` | Create, Update, Upsert                | Manipulate `req.data` for custom calculations; validate input and reject requests. |
| `before` | Delete                                | Validate or prevent deletion. `req.data` is always `{}` — use `req.subject` to identify the record. |
| `after`  | Read, Create, Update, Delete, Upsert  | Manipulate `req.results`. The DB transaction has already committed, so any CQL runs in a **new** transaction. Signature is `(result, req)`, where `result` equals `req.results`. |

- Handlers fire **after** the draft workflow; draft-specific events are not currently supported.
- Sandboxed code runs within the CAP event loop alongside other handlers; execution order relative to other handlers is **not guaranteed**.
- **after-READ does not recurse.** Nested reads inside the sandbox do not re-fire after-READ handlers, so virtual fields populated there are not filled on nested results. This prevents runaway recursion.

## Queries {#queries}

Handlers use the standard CAP query language, with a few sandbox rules:

- Queries are scoped to the **current service's** entities only; reaching for database tables or other services is rejected. This is the data-access fence.
- `INSERT` / `UPSERT` accept only the `.entries({…})` form.
- A handful of fluent clauses aren't exposed (`.groupBy`, `.having`, `.forUpdate`, `.stream`, …); use a ``cql`…` `` tagged template for those.
- The sandbox adds **no** result-size cap of its own; reads inherit CAP's [implicit pagination](../services/served-ootb#implicit-pagination), a default maximum of 1,000 records. Add an explicit `.limit(n)` when a handler scans a large set: a query that overrides that limit and materializes an oversized result can exhaust `maxMemory`, which aborts the query and **quarantines** the extension tenant-wide until the next successful push.

## Forbidden Constructs {#forbidden}

The `wasm` sandbox constrains what handler code may do. All of the following are **rejected at `cds push`** (a `422` validation error), but tolerated in the permissive `mocked` sandbox — which is exactly why the [`--wasm` check](business-logic#verify-wasm) matters before pushing:

| Not allowed in a handler | Instead |
|--------------------------|---------|
| `console`, `debugger` | Use `req.info` / `req.warn` for diagnostics. |
| `require(...)` / imports | Extract shared logic into a service action and call it via `this.<action>(…)`. |
| `throw` | Signal outcomes with `req.reject` / `req.error`. |
| `await` on anything other than a CQL query or a `this.*` call | Only data-access is asynchronous; other work must be synchronous. |
| Globals `Object`, `Reflect`, `Symbol`, `Proxy`, `global`, `globalThis`; `prototype` / `__proto__`; generator functions | Use plain object literals and spread syntax; keep handlers simple. |

## Quarantine {#quarantine}

When a handler raises an *unhandled* runtime error — as opposed to a deliberate `req.reject` / `req.error` — the sandbox **quarantines** it: the extension is flagged (`isBlockedCode` / `blockedCodeReason` on `cds.xt.Extensions`) and silently skipped **for the whole tenant** until the next successful push clears the flag. Nothing notifies the subscriber.

Providers should make it an operations task to watch `cds.xt.Extensions` for blocked extensions and reach out to the extension developer to fix and re-push. Handlers should signal outcomes with `req.reject` / `req.error`, never `throw`.

## Troubleshooting {#troubleshooting}

| Symptom | Cause / Fix |
|---------|-------------|
| `cds add ext-handler` generates nothing | No local _srv/*.cds_ imports the base model. Add one (see [Business Logic Extensibility](business-logic#developer)). |
| Stubs generated for unrelated services | `ext-handler` covers the whole model; use `--filter <action>` or delete the extras — non-`@extensible.code` services won't push. |
| `422` validation error on push | A [forbidden construct](#forbidden) in a handler (`console`, `require`, `throw`, `Object`, stray `await`, …). The message names the file and offending name; remove it. |
| Push not processed | `@sap/cds-oyster` missing in the provider's `mtx/sidecar`. |
| Handler never fires locally | The provider's `before(...)` wiring isn't in the pulled model; re-provide it in _srv/server.js_ (see [Business Logic Extensibility](business-logic#test-locally)). |
| Handler silently skipped for the whole tenant | An **unhandled runtime error** blocks the extension (`isBlockedCode`); see [Quarantine](#quarantine). Fix the handler and re-push. Use `req.reject`/`req.error`, never `throw`. |
| `422 … not permitted` mentioning `@extensible.code` | Extensions may not carry `@extensible.code` themselves — it's a provider-only annotation. Remove it from the extension model. |
| Breakpoints don't bind / debugger won't stop | You're on the `wasm` engine (a multitenant app, or `sandbox: wasm`). Breakpoints only work in the single-tenant `mocked` engine; see [Debugging in the mocked sandbox](#debugging). |
