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

# auth-valid-restrict-keys

## Rule Details

To define authorizations on a fine-grained level, the `@restrict` annotation allows you to add all kinds of restrictions based on static user roles, the request operation, and instance filters. The building block of such a restriction is a single privilege. This rule checks that the privileges defined in `@restrict` have properly spelled `to`, `grant`, and `where` keys.

## Examples

#### ✅ &nbsp; Correct example

In the following example, the `@restrict` annotation on `CatalogService.ListOfBooks` has correctly spelled `to`, `grant`, and `where` keys in the defined privilege:

::: code-group
<<< ../examples/auth-valid-restrict-keys/correct/srv/cat-service.cds#snippet{ts:line-numbers} [srv/cat-service.cds]
:::
<PlaygroundBadge
  name="auth-valid-restrict-keys"
  kind="correct"
  :rules="{'@sap/cds/auth-valid-restrict-keys': ['warn', 'show']}"
  :files="['db/schema.cds', 'srv/cat-service.cds']"
/>

#### ❌ &nbsp; Incorrect example

This example shows the `@restrict` annotation on `CatalogService.ListOfBooks` with typos in the `grant` key (`grants` instead of `grant`), the `to` key (`too` instead of `to`), and the `where` key (`were` instead of `where`) and the rule will report them as a warning:

::: code-group
<<< ../examples/auth-valid-restrict-keys/incorrect/srv/cat-service.cds#snippet{ts:line-numbers} [srv/cat-service.cds]
:::
<PlaygroundBadge
  name="auth-valid-restrict-keys"
  kind="incorrect"
  :rules="{'@sap/cds/auth-valid-restrict-keys': ['warn', 'show']}"
  :files="['db/schema.cds', 'srv/cat-service.cds']"
/>

## Version
This rule was introduced in `@sap/eslint-plugin-cds 2.4.1`.