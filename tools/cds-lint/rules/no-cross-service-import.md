---
status: released
---

<script setup>
  import PlaygroundBadge from '../components/PlaygroundBadge.vue'
</script>

# no-cross-service-import

## Rule Details

This rule helps you avoid importing artifacts generated for one service into the implementation of another service when using cds-typer. Keeping service boundaries clear makes your codebase easier to maintain and understand.

#### Version
This rule was introduced in `@sap/eslint-plugin-cds 4.0.2`.

## Examples

### ✅ &nbsp; Correct example

Here, the imported entity belongs to `AdminService` and is used within the implementation of `AdminService` itself—this is the recommended approach:
::: code-group
<<< ../examples/no-cross-service-import/correct/srv/admin-service.js#snippet{js:line-numbers} [srv/admin-service.js]
:::
<PlaygroundBadge
  name="no-cross-service-import"
  kind="correct"
  :files="['srv/admin-service.js']"
/>

### ❌ &nbsp; Incorrect example

In this case, an entity from `CatalogService` is imported into the implementation of `AdminService`. This cross-service import is discouraged, as it can lead to confusion and maintenance issues:

::: code-group
<<< ../examples/no-cross-service-import/incorrect/srv/admin-service.js#snippet{js:line-numbers} [srv/admin-service.js]
:::
<PlaygroundBadge
  name="no-cross-service-import"
  kind="incorrect"
  :files="['srv/admin-service.js']"
/>
