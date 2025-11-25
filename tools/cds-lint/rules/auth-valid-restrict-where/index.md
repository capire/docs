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

# auth-valid-restrict-where

## Rule Details

The `where` property of a [`@restrict`](/guides/security/authorization#restrict-annotation) privilege defines a filter expression that restricts access on an instance level (optional). This rule checks that the values of `@restrict.where` are valid, that is, the filter expression must be a valid expression that compiles without any errors.

## Examples

#### ✅ &nbsp; Correct example

In the following example, the `@restrict` privilege is defined with a valid `where` property `CreatedBy = $user'`:

::: code-group
<<< correct/srv/cat-service.cds#snippet{cds:line-numbers} [srv/cat-service.cds]
:::
<PlaygroundBadge
  name="auth-valid-restrict-where"
  kind="correct"
  :rules="{'@sap/cds/auth-valid-restrict-where': ['warn', 'show']}"
  :files="['db/schema.cds', 'srv/cat-service.cds']"
/>

#### ❌ &nbsp; Incorrect example

This example shows the `@restrict` privilege defined with an invalid `where` property `CreatedBy === $user`. Since this is not a valid filter expression according to the CDS compiler, the rule reports a warning:

::: code-group
<<< incorrect/srv/cat-service.cds#snippet{cds:line-numbers} [srv/cat-service.cds]
:::
<PlaygroundBadge
  name="auth-valid-restrict-where"
  kind="incorrect"
  :rules="{'@sap/cds/auth-valid-restrict-where': ['warn', 'show']}"
  :files="['db/schema.cds', 'srv/cat-service.cds']"
/>

## Version
This rule was introduced in `@sap/eslint-plugin-cds 2.4.1`.