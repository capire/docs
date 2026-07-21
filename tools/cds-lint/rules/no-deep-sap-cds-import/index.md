---
status: released
---

<script setup>
  import PlaygroundBadge from '../../components/PlaygroundBadge.vue'
</script>

# no-deep-sap-cds-import

## Rule Details

Import only from the top-level `@sap/cds` package. Accessing internal modules or sub-paths is unsafe because these are not part of the official public API and may change or be removed without notice.
A few exceptions to this rule will not be reported as errors.

#### Version
This rule was introduced in `@sap/eslint-plugin-cds 4.0.2`.

## Examples

### ✅ &nbsp; Correct example

The following example imports `@sap/cds`:

::: code-group
<<< correct/srv/admin-service.js#snippet{js:line-numbers} [srv/admin-service.js]
:::
<PlaygroundBadge
  name="no-deep-sap-cds-import"
  kind="correct"
  :files="['srv/admin-service.js']"
/>

### ❌ &nbsp; Incorrect example

This example incorrectly performs a deep import of a file within `@sap/cds`:

::: code-group
<<< incorrect/srv/admin-service.js#snippet{js:line-numbers} [srv/admin-service.js]
:::
<PlaygroundBadge
  name="no-deep-sap-cds-import"
  kind="incorrect"
  :files="['srv/admin-service.js']"
/>
