---
description: HCQL endpoint discovery and example service metadata responses.
search: false
---

# HCQL Discovery Examples

Part of the [HCQL guide](../hcql.md). Paths are relative to the discovered HCQL service endpoint. Examples use the [Books/Authors service](./serving.md).

<!-- #region reference -->
### Endpoint Links

The server's public index (`GET /` at the server root) can advertise relative links such as `hcql/books/?describe=all`. Resolve the href against the index URL; do not require a leading `/hcql/`. The resulting path before `?describe=...` is the HCQL service endpoint.

### Inspect Service Metadata

Paths below are relative to the discovered service endpoint.

| Request  | Result |
| --- | --- |
| `GET /` or `GET /?describe` | Lightweight summary: service name, optional description, entity and action names |
| `GET /?describe=Books,Authors` | Detailed schemas of selected entities or operations |
| `GET /?describe=all` | Detailed schemas of all exposed entities and operations |

If needed names are already known, request their details directly; otherwise start with the summary. Use `describe=all` for small services or when the complete contract is needed. Descriptions use concise types such as `Integer` and `Composition of many Books`, not raw CSN types/target/cardinality objects.

For the [Books/Authors service example](./serving.md), the summary request is:

```http
GET /?describe
```

```json
{
  "service": "BooksService",
  "entities": ["Books", "Authors"],
  "actions": []
}
```

Request both definitions to inspect their fields, keys and relationships:

```http
GET /?describe=Books,Authors
```

```json
{
  "service": "BooksService",
  "entities": {
    "Books": {
      "kind": "entity",
      "elements": {
        "ID": { "key": true, "type": "Integer" },
        "title": { "type": "String" },
        "stock": { "type": "Integer" },
        "author": {
          "type": "Association to Authors",
          "elements": { "ID": { "type": "Integer" } }
        }
      }
    },
    "Authors": {
      "kind": "entity",
      "elements": {
        "ID": { "key": true, "type": "Integer" },
        "name": { "type": "String" },
        "books": { "type": "Composition of many Books" }
      }
    }
  }
}
```

Discovery responses return metadata directly, without a `data` wrapper.

<!-- #endregion reference -->
