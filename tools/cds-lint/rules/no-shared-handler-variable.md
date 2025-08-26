---
status: released
---

<script setup>
  import PlaygroundBadge from '../components/PlaygroundBadge.vue'
</script>

# no-shared-handler-variable

## Rule Details

Discourages sharing state between handlers using variables from parent scopes, as this can lead to data leakage between tenants.
This rule automatically checks handler registrations inside classes that extend `cds.ApplicationService`.

To enable this check for functions declared outside such classes, add a type annotation.
Any function annotated with

- `@type {import('@sap/cds').CRUDEventHandler.Before}`,
- `@type {import('@sap/cds').CRUDEventHandler.On}`,
- or `@type {import('@sap/cds').CRUDEventHandler.After}`

will also be checked by this rule.

#### Version
This rule was introduced in `@sap/eslint-plugin-cds 4.0.2`.

## Examples

### ✅ &nbsp; Correct example

In the following example, only locally defined variables are used within handler implementation:

::: code-group
<<< ../examples/no-shared-handler-variable/correct/srv/admin-service.js#snippet{js:line-numbers} [srv/admin-service.js]
:::
<PlaygroundBadge
  name="no-shared-handler-variable"
  kind="correct"
  :files="['srv/admin-service.js']"
/>

### ❌ &nbsp; Incorrect example

In the following example, the variables `newBook` and `readBooks` are declared in scopes surrounding the handler function, making their value available to subsequent calls of that handler. While this may seem advantageous, it can cause issues in a multitenant scenario, where the handler function can be invoked by multiple tenants.

::: code-group
<<< ../examples/no-shared-handler-variable/incorrect/srv/admin-service.js#snippet{js:line-numbers} [srv/admin-service.js]
:::
<PlaygroundBadge
  name="no-shared-handler-variable"
  kind="incorrect"
  :files="['srv/admin-service.js']"
/>
