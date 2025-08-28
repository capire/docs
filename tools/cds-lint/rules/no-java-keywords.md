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

# no-java-keywords

## Rule Details

The CAP Java code generation bases its class and method names on CDS entities.
If reserved Java keywords are used as CDS identifiers, the code generation or compilation may fail.
This rule helps identify such identifiers early on and suggest to use the `@cds.java.name` annotation.

## Examples

#### ✅ &nbsp; Correct example

In the following example, use of the reserved Java keyword as identifiers is fixed via the `@cds.java.name` annotation, so the rule doesn't raise any warnings:

::: code-group
<<< ../examples/no-java-keywords/correct/db/schema.cds#snippet{cds:line-numbers} [db/schema.cds]
:::
<PlaygroundBadge
  name="no-java-keywords"
  kind="correct"
  :rules="{'@sap/cds/no-java-keywords': ['warn', 'show']}"
  :files="['db/schema.cds']"
  :packages="{'cds': { 'requires': {'db': { 'kind': 'sql' } }} }"
/>

#### ❌ &nbsp; Incorrect example

In the next example, the reserved SQL keyword `new` is used as an element name, so the rule will raise a warning:

::: code-group
<<< ../examples/no-java-keywords/incorrect/db/schema.cds#snippet{cds:line-numbers} [db/schema.cds]
:::
<PlaygroundBadge
  name="no-java-keywords"
  kind="incorrect"
  :rules="{'@sap/cds/no-java-keywords': ['warn', 'show']}"
  :files="['db/schema.cds']"
  :packages="{'devDependencies': { '@cap-js/sqlite': '^2' } }"
/>

## Version
This rule was introduced in `@sap/eslint-plugin-cds 3.2.0`.
