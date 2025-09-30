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

# auth-valid-restrict-to

## Rule Details

The `to` property of a `@restrict` privilege defines one or more [user roles](../../../../guides/security/authorization#roles) or [pseudo roles](../../../../guides/security/authorization#pseudo-roles) that the privilege applies to. This rule checks that the values of `@restrict.to` are valid, that is, roles cannot be missing or misspelled and that roles including `any` should be simplified to just `any`.

## Examples

#### ✅ &nbsp; Correct example

The following example shows a correct usage of the `@restrict.to` annotation, where the `to` property is set to the `Viewer` rule which is a valid value:

::: code-group
<<< correct/srv/cat-service.cds#snippet{cds:line-numbers} [srv/cat-service.cds]
:::
<PlaygroundBadge
  name="auth-valid-restrict-to"
  kind="correct"
  :rules="{'@sap/cds/auth-valid-restrict-to': ['warn', 'show']}"
  :files="['db/schema.cds', 'srv/cat-service.cds']"
/>

#### ❌ &nbsp; Incorrect example

This example shows the `@restrict.to` annotation being left empty, which is a violation of this rule and a warning is raised:

::: code-group
<<< incorrect/srv/cat-service.cds#snippet{cds:line-numbers} [srv/cat-service.cds]
:::
<PlaygroundBadge
  name="auth-valid-restrict-to"
  kind="incorrect"
  :rules="{'@sap/cds/auth-valid-restrict-to': ['warn', 'show']}"
  :files="['db/schema.cds', 'srv/cat-service.cds']"
/>

## Version
This rule was introduced in `@sap/eslint-plugin-cds 2.4.1`.