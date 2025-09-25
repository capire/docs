---
outline: [2,2]
breadcrumbs:
  - CDS Lint
    - Rules Reference
status: released
---

<script setup>
  import PlaygroundBadge from '../components/PlaygroundBadge.vue'
</script>

# sql-cast-suggestion

## Rule Details

With compiler v2, appending a type declaration to a column expression in a view's query doesn't generate a cast in SQL anymore because that created conflicts with various database-specific behaviors. This rule ensures that such casts are added explicitly by suggesting possible missing SQL casts.

## Examples

#### ✅ &nbsp; Correct example

In the following example, the entity `ListOfBooks` contains explicit casts for elements `name2` and `name3`, so the rule will not be triggered for these elements:

::: code-group
<<< ../examples/sql-cast-suggestion/correct/db/schema.cds#snippet{ts:line-numbers} [db/schema.cds]
:::
<PlaygroundBadge
  name="sql-cast-suggestion"
  kind="correct"
  :rules="{'@sap/cds/sql-cast-suggestion': ['warn', 'show']}"
  :files="['db/schema.cds']"
/>

#### ❌ &nbsp; Incorrect example

This example shows the rule triggered for elements `name1` and `name2` because they require explicit casts:

::: code-group
<<< ../examples/sql-cast-suggestion/incorrect/db/schema.cds#snippet{ts:line-numbers} [db/schema.cds]
:::
<PlaygroundBadge
  name="sql-cast-suggestion"
  kind="incorrect"
  :rules="{'@sap/cds/sql-cast-suggestion': ['warn', 'show']}"
  :files="['db/schema.cds']"
/>

## Version
This rule was introduced in `@sap/eslint-plugin-cds 1.0.8`.