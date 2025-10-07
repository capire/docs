---
outline: [2,2]
breadcrumbs:
  - CDS Lint
    - Rules Reference
status: released
---

<script setup>
  import PlaygroundBadge from '../../components/PlaygroundBadge.vue'
</script>

# no-join-on-draft

## Rule Details

Draft-enabled entities shall not be used in views that make use of `JOIN`. This rule will report a warning for any violations.

## Examples

#### ✅ &nbsp; Correct example

In the following example, no draft-enabled entities are used in the service `CatalogService`:

::: code-group
<<< correct/srv/cat-service.cds#snippet{cds:line-numbers} [srv/cat-service.cds]
:::
<PlaygroundBadge
  name="no-join-on-draft"
  kind="correct"
  :rules="{'@sap/cds/no-join-on-draft': ['warn', 'show']}"
  :files="['db/schema.cds', 'srv/cat-service.cds']"
/>

#### ❌ &nbsp; Incorrect example

This example shows the service `CatalogService` using a draft-enabled entity and making use of `JOIN`, which violates the rule:

::: code-group
<<< incorrect/srv/cat-service.cds#snippet{cds:line-numbers} [srv/cat-service.cds]
:::
<PlaygroundBadge
  name="no-join-on-draft"
  kind="incorrect"
  :rules="{'@sap/cds/no-join-on-draft': ['warn', 'show']}"
  :files="['db/schema.cds', 'srv/cat-service.cds']"
/>

### Version
This rule was introduced in `@sap/eslint-plugin-cds 2.2.1`.