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

# auth-restrict-grant-service

## Rule Details

Restrictions can be defined on different types of CDS resources, but there are some limitations regarding supported privileges (see [limitations](../../../guides/security/authorization#supported-combinations-with-cds-resources)).

Unsupported privilege properties are ignored by the runtime. For bound or unbound actions, the `grant` property is implicitly removed (assuming `grant: '*'` instead). The same is true for functions. This rule ensures that `@restrict.grant` on service level and for bound/unbound actions and functions is limited to `grant: '*'`.

## Examples

#### ✅ &nbsp; Correct example

Let's consider the following example with the `CatalogService` where the function `getViewsCount()` is restricted to the *Admin* role, granting all CDS events:

::: code-group
<<< ../examples/auth-restrict-grant-service/correct/srv/cat-service.cds#snippet{cds:line-numbers} [srv/cat-service.cds]
:::
<PlaygroundBadge
  name="auth-restrict-grant-service"
  kind="correct"
  :rules="{'@sap/cds/auth-restrict-grant-service': ['error', 'show']}"
  :files="['srv/cat-service.cds', 'db/schema.cds']"
/>

#### ❌ &nbsp; Incorrect example

If you modify the above example and use `grant: ['WRITE']` in the privilege of the function, the rule would be triggered to inform you that the value of `grant` is limited to `'*'`:

::: code-group
<<< ../examples/auth-restrict-grant-service/incorrect/srv/cat-service.cds#snippet{cds:line-numbers} [srv/cat-service.cds]
:::
<PlaygroundBadge
  name="auth-restrict-grant-service"
  kind="incorrect"
  :rules="{'@sap/cds/auth-restrict-grant-service': ['error', 'show']}"
  :files="['srv/cat-service.cds', 'db/schema.cds']"
/>

## Version
This rule was introduced in `@sap/eslint-plugin-cds 2.6.4`.
