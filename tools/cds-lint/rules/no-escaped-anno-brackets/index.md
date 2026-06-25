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

# no-escaped-anno-brackets

## Rule Details

The escaped annotation syntax `![@...]` is unnecessary in modern CAP CDS. Inline annotations can be written as `@...` directly. This rule reports usages of the old escaped syntax and provides an autofix to replace them.

## Examples

#### ✅ &nbsp; Correct example

In the following example, inline annotations use the modern `@...` syntax without escaping:

::: code-group
<<< correct/db/schema.cds#snippet{cds:line-numbers} [db/schema.cds]
:::
<PlaygroundBadge
  name="no-escaped-anno-brackets"
  kind="correct"
  :rules="{'@sap/cds/no-escaped-anno-brackets': ['error', 'show']}"
  :files="['db/schema.cds']"
/>

#### ❌ &nbsp; Incorrect example

This example shows the old escaped annotation syntax `![@UI.Importance]` which is unnecessary and should be replaced with `@UI.Importance`:

::: code-group
<<< incorrect/db/schema.cds#snippet{cds:line-numbers} [db/schema.cds]
:::
<PlaygroundBadge
  name="no-escaped-anno-brackets"
  kind="incorrect"
  :rules="{'@sap/cds/no-escaped-anno-brackets': ['error', 'show']}"
  :files="['db/schema.cds']"
/>

## Version
This rule was introduced in `@sap/eslint-plugin-cds 4.2.3`.
