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

# assoc2many-ambiguous-key

## Rule Details

An [association/composition to/of `MANY`](../../../cds/cdl#to-many-associations) that targets an entity without an `ON` condition is not allowed because it is an `n:1` relationship. Always specify an `ON` condition following the canonical expression pattern `<assoc>.<backlink> = $self`. The backlink can be any managed to-one association on the many side pointing back to the one side.

## Examples

#### ✅ &nbsp; Correct example

In the following example, we define a unique association from `Authors` to `Books` with a well-defined `ON` condition and backlink, thus satisfying the rule's conditions:

::: code-group
<<< ../examples/assoc2many-ambiguous-key/correct/db/schema.cds#snippet{cds:line-numbers} [db/schema.cds]
:::
<PlaygroundBadge
  name="assoc2many-ambiguous-key"
  kind="correct"
  :rules="{'@sap/cds/assoc2many-ambiguous-key': ['error', 'show']}"
  :files="['db/schema.cds']"
/>

#### ❌ &nbsp; Incorrect example

If you extend this example by creating a view `AuthorView` with a key `ID` and the element `bookIDs` without an `ON` condition, the rule is triggered because the key is no longer unique and `bookIDs` leads to multiple entries:

::: code-group
<<< ../examples/assoc2many-ambiguous-key/incorrect/db/schema.cds#snippet{cds:line-numbers} [db/schema.cds]
:::
<PlaygroundBadge
  name="assoc2many-ambiguous-key"
  kind="incorrect"
  :rules="{'@sap/cds/assoc2many-ambiguous-key': ['error', 'show']}"
  :files="['db/schema.cds']"
/>

## Version
This rule was introduced in `@sap/eslint-plugin-cds 1.0.1`.
