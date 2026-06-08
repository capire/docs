---
status: released
---

<script setup>
  import PlaygroundBadge from '../../components/PlaygroundBadge.vue'
</script>

# no-cross-service-import

## Rule Details

This rule prevents importing artifacts generated for one service into another service's implementation when using cds-typer. Clear service boundaries make your codebase easier to maintain and understand.

#### Version
This rule was introduced in `@sap/eslint-plugin-cds 4.0.2`.

## Examples

### ✅ &nbsp; Correct example

The imported entity belongs to `AdminService` and is used within the implementation of `AdminService` itself. This is the recommended approach:
::: code-group
<<< correct/srv/AdminService.js#snippet{js:line-numbers} [srv/AdminService.js]
:::
<PlaygroundBadge
  name="no-cross-service-import"
  kind="correct"
  :files="['srv/AdminService.js']"
/>

### ❌ &nbsp; Incorrect example

An entity from `CatalogService` is imported into the implementation of `AdminService`. This cross-service import is discouraged because it can lead to confusion and maintenance issues:

::: code-group
<<< incorrect/srv/AdminService.js#snippet{js:line-numbers} [srv/AdminService.js]
:::
<PlaygroundBadge
  name="no-cross-service-import"
  kind="incorrect"
  :files="['srv/AdminService.js']"
/>
