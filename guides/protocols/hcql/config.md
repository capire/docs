---
description: HCQL endpoints, request formats, query policy, expression allowlists and trusted internal integrations.
search: false
---

# HCQL Server Configuration

Part of the [HCQL guide](../hcql.md). This page is for server owners, not instructions to clients to bypass denied requests. For initial setup, see [Serving HCQL](./serving.md).

<!-- #region reference -->
### Endpoint Configuration

| Setting | Default | Effect |
| --- | --- | --- |
| Service annotation `@hcql` | Not set | Enable HCQL for the service; a string value also sets its endpoint path |
| `cds.protocols.hcql.path` | `/hcql` | Prefix relative service paths; absolute service paths are used unchanged |
| `cds.protocols.hcql.impl` | Built-in HCQL adapter | Replace the adapter through CAP's general protocol-extension mechanism |

For example, `@hcql: 'books'` serves at `/hcql/books` with the default prefix; `@hcql: '/books'` serves at `/books`. These are illustrative endpoint settings, not fixed URLs clients should assume. See [`@path`](../../../node.js/cds-serve.md#path) for general service paths and [protocol configuration](../../../node.js/cds-serve.md#cds-protocols) for serving multiple protocols and custom adapters.

### Request Formats

Configure these settings under <Config>`cds.protocols.hcql.allows`</Config> **before server startup**:

| Setting | Default | Effect |
| --- | --- | --- |
| `cql.json` | `true` | Enable CQL JSON envelopes |
| `cql.text` | `true` | Enable the `text/plain` CQL body parser |
| `cqn.json` | `true` | Enable bare or wrapped JSON CQN queries |

- CQL JSON envelopes remain enabled if either `cql.json` or `cql.text` is true; disable both to disable CQL.

Allow only CQL JSON envelopes as the query format:

::: code-group
```yaml [cap.yaml]
protocols:
  hcql:
    allows:
      cql:
        json: true
        text: false
      cqn:
        json: false
```
```json [package.json]
{
  "cds": {
    "protocols": {
      "hcql": {
        "allows": {
          "cql": { "json": true, "text": false },
          "cqn": { "json": false }
        }
      }
    }
  }
}
```
:::

### Default Query Policy

The following settings also belong under <Config>`cds.protocols.hcql.allows`</Config>. They apply process-wide to HCQL services, not per request or per role. Configure them before startup.

| Setting       | Default               | Effect                                                                                |
| ------------- | --------------------- | ------------------------------------------------------------------------------------- |
| `UPDATE.set`  | `false`               | With `true`, permit SET assignments <br>(beware: expressions are not input-validated) |
| `UPDATE.many` | `false`               | With `true`, permit non-keyed/bulk updates                                            |
| `DELETE.many` | `false`               | With `true`, permit non-keyed/bulk deletes                                            |
| `CALL`        | `true`                | With `false`, disable root CALL queries on a runtime supporting [CALL](../../../node.js/cds-ql.md#hcql-operation-requests); existing operation routes remain available |
| `functions`   | →&nbsp;see&nbsp;below | Configure allowed expression functions                                                |
| `pseudos`     | →&nbsp;see&nbsp;below | Configure allowed pseudo-variable roots                                               |
| `cqn.any`     | `false`               | With `true`, bypass **all** query validation                                          |

> [!danger]
> Relaxing these defaults should be considered for [trusted internal integrations](#trusted-internal-integrations) only!
> Do not enable options merely to make a denied client request succeed.

Service authorization and input validation still apply.

#### Expression Allowlists

The default `functions` array permits the functions listed in [Core QL functions and operators](./core-ql.md#functions--operators).

The default `pseudos` array contains `$user`, `$locale`, `$now`, `$at` and `$search`. The only supported dotted pseudo-variable path is `$user.id`.

These lists replace the defaults. For example:

::: code-group
```yaml [cap.yaml]
protocols:
  hcql:
    allows:
      functions: [count, sum]
      pseudos: [$now]
```
```json [package.json]
{
  "cds": {
    "protocols": {
      "hcql": {
        "allows": {
          "functions": ["count", "sum"],
          "pseudos": ["$now"]
        }
      }
    }
  }
}
```
:::

### Trusted Internal Integrations

Reserve CQN for trusted service-to-service integrations, with least overhead. Broader query access does not bypass authorization, input validation or routing constraints.

`cqn.any = true` bypasses query validation entirely. It does not disable service authorization or input validation. It also leaves [CQL parser requirements](../hcql.md#bind-input-values), [REST key constraints](../hcql.md#choose-a-request-form), [operation-route constraints](../hcql.md#call-actions-and-functions) and [search restrictions](../hcql.md#full-text-search) unchanged. Never expose this bypass to untrusted clients.

Body-size limits, authentication and parser selection are shared CAP settings, not additional HCQL policy options. Use the general [CAP configuration reference](../../../node.js/cds-env.md) for these; HTTP body-parser options can also be set through the service annotation `@cds.server.body_parser.limit`.
<!-- #endregion reference -->
