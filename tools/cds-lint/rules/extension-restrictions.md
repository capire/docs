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

# extension-restrictions

## Rule Details

CAP provides intrinsic extensibility, which means all your entities and services are extensible by default. Your SaaS app becomes the base app for extensions by your customers, and your data model becomes the base model. Normally, you want to restrict which services or entities your SaaS customers are allowed to extend and to what degree they may do so. This rule ensures that extensions do not violate any restrictions set by the extended SaaS app.

## Examples

#### ✅ &nbsp; Correct example

::: code-group
<<< ../examples/extension-restrictions/correct/db/schema.cds#snippet{cds:line-numbers} [db/schema.cds]
:::
<PlaygroundBadge
  name="extension-restrictions"
  kind="correct"
  :rules="{'@sap/cds/extension-restrictions': 'warn'}"
  :files="['db/schema.cds', 'node_modules/base-app/.cdsrc.json', 'node_modules/base-app/index.csn']"
  :packages="{'dependencies': { '@sap/cds-mtxs': '^1' }, 'cds': { 'extends': 'base-app' } }"
/>

#### ❌ &nbsp; Incorrect example
<!-- TODO: Remove nolink=true as soon as rule works in Playground (i.e. Playground support node_modules additions without install) -->
::: code-group
<<< ../examples/extension-restrictions/incorrect/db/schema.cds#snippet{cds:line-numbers} [db/schema.cds]
:::
<PlaygroundBadge
  nolink="true"
  name="extension-restrictions"
  kind="incorrect"
  :rules="{'@sap/cds/extension-restrictions': 'warn'}"
  :files="['db/schema.cds', 'node_modules/base-app/.cdsrc.json', 'node_modules/base-app/index.csn']"
  :packages="{'dependencies': { '@sap/cds-mtxs': '^1' }, 'cds': { 'extends': 'base-app' } }"
/>

## Version
This rule was introduced in `@sap/eslint-plugin-cds 2.6.0`.

<!--
### Resources
[Rule source](https://github.tools.sap/cap/eslint-plugin-cds/tree/main/lib/rules/extension-restrictions.js)
-->
