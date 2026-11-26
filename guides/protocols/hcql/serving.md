---
description: Serve a small Books/Authors HCQL service with associations and compositions in CAP Node.js.
search: false
---

# Serving HCQL

Part of the [HCQL guide](../hcql.md). See [server configuration](./config.md) for endpoint customization and query policy.

<!-- #region reference -->
Annotate a service with `@hcql`. For example, add this `services.cds` to a CAP Node.js project:

```cds
@hcql
service BooksService {
  entity Books {
    key ID : Integer;
    title : String;
    stock : Integer;
    author : Association to Authors;
  }
  entity Authors {
    key ID : Integer;
    name : String;
    books : Composition of many Books on books.author = $self;
  }
}
```

Books references an author through an association; Authors owns its books through a composition. This supports navigation and deep writes in the examples below.

Start the project with `cds watch`. No custom handler is required for generic CRUD. Read the server address and HCQL endpoint from startup output; in the default configuration, BooksService advertises `/hcql/books`.

See [Endpoint Configuration](./config.md#endpoint-configuration) for additional `@hcql` options and custom paths.
<!-- #endregion reference -->
