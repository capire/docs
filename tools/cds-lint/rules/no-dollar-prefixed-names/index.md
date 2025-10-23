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

# no-dollar-prefixed-names

## Rule Details

Names must not start with $ to avoid possible shadowing of reserved variables.

## Examples

#### ✅ &nbsp; Correct example

In the following example, all elements names are well defined and do not start with `$`:

::: code-group
<<< correct/db/schema.cds#snippet{cds:line-numbers} [db/schema.cds]
:::
<PlaygroundBadge
  name="no-dollar-prefixed-names"
  kind="correct"
  :rules="{'@sap/cds/no-dollar-prefixed-names': ['error', 'show']}"
  :files="['db/schema.cds']"
/>

#### ❌ &nbsp; Incorrect example

This example shows the element `$pages` that starts with `$` and so the rule will raise an error for this element:

::: code-group
<<< incorrect/db/schema.cds#snippet{cds:line-numbers} [db/schema.cds]
:::
<PlaygroundBadge
  name="no-dollar-prefixed-names"
  kind="incorrect"
  :rules="{'@sap/cds/no-dollar-prefixed-names': ['error', 'show']}"
  :files="['db/schema.cds']"
/>

## Version
This rule was introduced in `@sap/eslint-plugin-cds 2.3.3`.