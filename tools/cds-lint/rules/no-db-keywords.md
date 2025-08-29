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

# no-db-keywords

## Rule Details

The CDS compiler and CAP runtimes provide smart quoting for reserved words in SQLite so that they can still be used in most situations.
But in general reserved words cannot be used as identifiers and this rule warns you if you use any of the [reserved SQL keywords](https://www.sqlite.org/lang_keywords.html).

## Examples

#### ✅ &nbsp; Correct example

In the following example, none of the reserved SQL keywords are used as identifiers, so the rule doesn't raise any warnings:

::: code-group
<<< ../examples/no-db-keywords/correct/db/schema.cds#snippet{cds:line-numbers} [db/schema.cds]
:::
<PlaygroundBadge
  name="no-db-keywords"
  kind="correct"
  :rules="{'@sap/cds/no-db-keywords': ['warn', 'show']}"
  :files="['db/schema.cds']"
  :packages="{'cds': { 'requires': {'db': { 'kind': 'sql' } } } }"
/>

#### ❌ &nbsp; Incorrect example

In the next example, the reserved SQL keyword `Order` is used as an entity name, so the rule will raise a warning:
<!-- TODO: Remove devDependency as soon as rule fix is released -->
::: code-group
<<< ../examples/no-db-keywords/incorrect/db/schema.cds#snippet{cds:line-numbers} [db/schema.cds]
:::
<PlaygroundBadge
  name="no-db-keywords"
  kind="incorrect"
  :rules="{'@sap/cds/no-db-keywords': ['warn', 'show']}"
  :files="['db/schema.cds']"
  :packages="{'devDependencies': { '@cap-js/sqlite': '^2' } }"
/>

## Version
This rule was introduced in `@sap/eslint-plugin-cds 2.1.0`.