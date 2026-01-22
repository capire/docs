---
status: released
---

<script setup>
  import PlaygroundBadge from '../../components/PlaygroundBadge.vue'
</script>

# use-cql-select-template-strings

## Rule Details

Discourages use of <code>SELECT(\`...\`)</code>, which allows [SQL injection attacks](../../../../node.js/cds-ql#avoiding-sql-injection), in favor of <code>SELECT \`...\`</code>.

#### Version
This rule was introduced in `@sap/eslint-plugin-cds 4.0.2`.

## Examples

### ✅ &nbsp; Correct example

In the following example, the `where` clause is a proper tagged template literal, so that the `req.data.name` expression can be validated before the SELECT is executed:

::: code-group
<<< correct/srv/admin-service.js#snippet{js:line-numbers} [srv/admin-service.js]
:::
<PlaygroundBadge
  name="use-cql-select-template-strings"
  kind="correct"
  :files="['srv/admin-service.js']"
/>

### ❌ &nbsp; Incorrect example

In the following example, the `where` clause is *not* a proper tagged template literal as it's enclosed by parentheses. In consequence, the `req.data.name` expression *cannot* be validated but is added as is to the SELECT statement. This is prone to SQL injection attacks.

::: code-group
<<< incorrect/srv/admin-service.js#snippet{js:line-numbers} [srv/admin-service.js]
:::
<PlaygroundBadge
  name="use-cql-select-template-strings"
  kind="incorrect"
  :files="['srv/admin-service.js']"
/>
