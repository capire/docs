---
description: >
  HCQL for CAP Node.js: service setup, compact client instructions, discovery and query examples, and configuration references.
---

# HCQL — CQL over HTTP

HCQL exposes CDS-modeled services through HTTP. Use REST-style requests for simple CRUD, CQL for expressive queries, and modeled operations for business changes.

> [!tip]
> - HCQL uses **Core QL**; see the [Core QL reference](./hcql/core-ql.md) for syntax and examples.
> - This guide is written with a primary **Agents-first** focus.

[[toc]]

## Serving HCQL

Enable the protocol with this [service setup example](./hcql/serving.md).

<!-- @include: ./hcql/serving.md#reference -->

## Client Instructions

### Quick Workflow

1. Discover the endpoint and needed schema; reuse the contract.
2. Filter, navigate and aggregate server-side.
3. Select needed fields only and limit collections, including expands.
4. Bind dynamic scalar inputs; use JSON for dynamic records.
5. Check write semantics and query restrictions below.
6. Inspect status before parsing; confirm stored state only when required.
7. Retry only when safe to repeat.

### Discover the Service Contract

Obtain the server address and HCQL endpoint from your environment or [startup output](./hcql/serving.md). All request paths below are relative to that endpoint, not the server root.

Check what a service is about with `GET /`, read needed schemas together: `GET /?describe=Books,Authors,submitOrder`; use `GET /?describe=all` when the complete contract is needed. Discovery returns metadata without a `data` wrapper.

In the current development runtime, discovery bypasses service-role checks; global authentication may still require login. Queries and actions remain protected by service authorization.

Use discovered names, types, relationships and key order. Reuse metadata until the endpoint/model changes or a reference remains unresolved. See [discovery examples](./hcql/discovery.md) for index links and response shapes.

`Reference to …` denotes an unexposed target. Read advertised foreign-key fields through dotted paths, such as `currency.code`; navigation to the target entity and reads of its other fields are not allowed.

### Choose a Request Form

| Method and path | Operation | Body |
| --- | --- | --- |
| GET `/Books/201` | Read one row | None |
| GET `/Books` | Read a collection | None |
| POST `/Books` | INSERT | JSON record or array |
| PATCH `/Books/201` | UPDATE supplied fields | JSON record |
| PUT `/Books/201` | UPSERT | JSON record with complete keys |
| DELETE `/Books/201` | DELETE one row | None |

REST instance routes require exactly one key; URL-encode its value. For composite-key data requests, use CQL positional keys in discovered order on the final target.

For navigation, aggregation or composite keys, POST a CQL JSON envelope to the **HCQL service root**:

```http
POST /
Content-Type: application/json

{
  "cql": "SELECT from Books[:ID] { ID, title } where stock >= :minimum",
  "args": { "ID": 201, "minimum": 1 }
}
```

Literal rendering:

```sql :cql
SELECT from Books[201] { ID, title } where stock >= 1
```

### Bind Input Values

Omit `args` when unused. Pass dynamic scalar keys and predicates as data rather than concatenating query text:

| Placeholders   | Envelope `args` |
| -------------- | --------------- |
| Positional `?` | JSON array      |
| Indexed `?n`   | JSON array      |
| Named `:name`  | JSON object     |

Indexes in `?n` start at 1; see [Core QL binding syntax](./hcql/core-ql.md#binding-parameters) for more details.

Input records accept literals only, not bindings, expressions or pseudo variables; prefer JSON CRUD payloads for dynamic records. Never pass CQN expressions as untrusted binding values.

### Read, Navigate and Aggregate

REST options support `$select`, `$where`, `$search`, `$orderby`, `$top` and `$skip`. Names are lowercase; URL-encode values. **Expressions are CQL, not OData:** `stock > 0`, not `stock gt 0`.

```http
GET /Books?$select=ID,title&$where=stock%20%3E%200&$orderby=ID&$top=20
```

```sql :cql
SELECT from Books { ID, title } where stock > 0 order by ID limit 20
```

See [bounded expands and aggregation](./hcql/examples.md#bounded-expands-and-aggregation) for richer reads.

#### Full-Text Search

Use REST `$search=<term>` or CQL `where $search like 'term'`; no SQL LIKE wildcards are required. In CQL, keep search in the top-level WHERE and combine it with other predicates using `and`, not `or`.

#### Localized Data

Send `Accept-Language` for localized fields. To read or write translations directly, use `Books:texts` for the `Books` entity. See [localized data examples](./hcql/examples.md#localized-data) for the available fields and required keys.

### Write Semantics

- Use **keyed** JSON **PATCH** for partial edits.
- **PUT is UPSERT.** Include complete keys in the payload.
- **POST** an array to insert multiple rows in one request.
- Deep writes follow compositions. Association payloads reference existing targets by key, without changing target data.
- **Supplied composition collections delete unlisted children.** Deep updates preserve omitted compositions; supplied collections reconcile by complete child keys. Matching children are updated, new children created, and unlisted children deleted. Include every child to retain; keys alone suffice. `[]` clears a to-many composition; `null` removes a to-one composition.

See [write examples](./hcql/examples.md#update-one-existing-record), including targeted child edits that preserve siblings. Navigation alone does not establish write support for every relationship or projection.

### Call Actions and Functions

| Binding | Discover signature | Call path |
| --- | --- | --- |
| Unbound | `/?describe=submitOrder` | `/submitOrder` |
| Instance-bound | `/?describe=Books` → `entities.Books.actions` | `/Books/201/reserve` |

Use discovered argument names/types in a JSON body. Prefer POST for actions; functions accept GET or POST. Routes accept GET/POST only. Instance routes require one key, URL-encoded; body arguments cannot override the instance. Collection-bound operations are unsupported. See [custom action examples](./hcql/examples.md#custom-actions).

### Default Public Query Restrictions

- UPDATE/DELETE require complete positional keys on the final target. A WHERE predicate matching one row is not a substitute.
- `UPDATE SET` is rejected, including literal assignments. Use record updates or a modeled action for computed changes.
- CQN-level validation rejects `JOIN`, `UNION`, subqueries, subject aliases, raw SQL and non-standard functions/pseudo variables.
- Only exposed service targets and permitted navigation/query shapes are allowed. Managed associations to non-exposed targets allow discovered foreign-key fields only, not target data or wildcard expansion.
- Service authorization and [input validation](../services/constraints.md) apply; metadata does not exhaustively describe validation or lifecycle guarantees.

Respect denials. [Server-owned opt-ins](./hcql/config.md#default-query-policy) are not client workarounds or per-role permissions. Reserve CQN for [trusted structured integrations](./hcql/config.md#trusted-internal-integrations).

### Handle Responses and Errors

Inspect HTTP status and content type before parsing. Query/operation results use `{ "data": ... }`; HCQL JSON errors use `{ "errors": [...] }`. Authentication middleware or proxies can return non-JSON errors, such as plain-text `401 Unauthorized`. Empty collections return `data: []`. Optional `messages` can accompany results; nullish data with messages can omit `data`.

**204 has no body: do not parse JSON**, including for a missing keyed read.

| Status | Handling |
| --- | --- |
| 2xx | Success; INSERT normally returns 201 |
| 204 | Nullish result without messages; no body |
| 400 | Correct syntax, bindings, names or request form before retrying |
| 401 | Prompt the user for authentication; do not guess credentials |
| 403 | Respect authorization or query-policy denial |
| 404 | Inspect write/operation path; not the normal missing-read response |
| 405 / 415 | Use an allowed method / enabled content or query format |
| 409 | Resolve duplicate-key or application-state conflict before retrying |

With local mocked authentication, passwords may be omitted when none is configured.

Retry transient failures only when safe to repeat; an error does not prove that an external side effect did not occur. Decimal values can arrive as JSON strings, aggregates as numbers; use discovered types and decimal-safe handling where precision matters.

Successful writes need not return complete records. If stored-state confirmation is required, read only the affected keys and fields.

## Discovery Examples

<!-- @include: ./hcql/discovery.md#reference -->

## Query Examples

**Reading Markdown:** the client contract above is self-contained for routine requests. Load linked examples or setup/configuration references when needed.

Read/update examples assume existing rows. Adapt requests to your discovered contract.

<!-- @include: ./hcql/examples.md#reference -->

## Server Configuration

For server owners customizing endpoints or configuring trusted integrations.

<!-- @include: ./hcql/config.md#reference -->

## For Service Owners

[Performance considerations](./hcql/performance.md): uncached full-stack and adapter measurements, interpretation and privileged-mode tradeoffs. Optional reading; not part of the client workflow.
