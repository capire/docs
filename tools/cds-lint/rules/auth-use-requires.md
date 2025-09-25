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

# auth-use-requires

## Rule Details

Some annotations such as `@requires` or `@readonly` are convenience shortcuts for `@restrict`. In actions and services with unrestricted events, it is recommended to use `@requires` instead of `@restrict.to`, which this rule enforces.

## Examples

#### ✅ &nbsp; Correct example

In the following example, the `CatalogService` action `addRating` correctly uses `@requires: 'Admin'` to indicate granting of unrestricted events to the `Admin` role:

::: code-group
<<< ../examples/auth-use-requires/correct/srv/cat-service.cds#snippet{cds:line-numbers} [srv/cat-service.cds]
:::
<PlaygroundBadge
  name="auth-use-requires"
  kind="correct"
  :rules="{'@sap/cds/auth-use-requires': ['warn', 'show']}"
  :files="['db/schema.cds', 'srv/cat-service.cds']"
/>

#### ❌ &nbsp; Incorrect example

In the following example, the `CatalogService` uses `@restrict` to assign unrestricted events (`grant: *`) to the `Admin` role (`to: Admin`). This could be written more clearly using `@requires` and so the rule reports a warning:

::: code-group
<<< ../examples/auth-use-requires/incorrect/srv/cat-service.cds#snippet{cds:line-numbers} [srv/cat-service.cds]
:::
<PlaygroundBadge
  name="auth-use-requires"
  kind="incorrect"
  :rules="{'@sap/cds/auth-use-requires': ['warn', 'show']}"
  :files="['db/schema.cds', 'srv/cat-service.cds']"
/>

## Version
This rule was introduced in `@sap/eslint-plugin-cds 2.4.1`.
