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

# valid-csv-header

## Rule Details

To provide your database with initial data, you can use CSV files. Their filenames are expected to match fully qualified names of respective entity definitions in your CDS models and their content is standard CSV content with the column titles corresponding to declared element names. This rule ensures that the header of the CSV file matches the column names of the entity definition.

## Examples

Let's consider the following model definition:

::: code-group
<<< correct/db/schema.cds#snippet{cds:line-numbers} [db/schema.cds]
:::

#### ✅ &nbsp; Correct example

The following example shows a correct CSV file header that matches the column names of the entity definition:

::: code-group
<<< correct/db/data/sap.capire.bookshop-Books.csv#snippet{csv:line-numbers} [db/data/sap.capire.bookshop-Books.csv]
:::
<PlaygroundBadge
  name="valid-csv-header"
  kind="correct"
  :rules="{'@sap/cds/valid-csv-header': ['warn', 'show']}"
  :files="['db/schema.cds', 'db/data/sap.capire.bookshop-Books.csv']"
/>

#### ❌ &nbsp; Incorrect example

This example shows a typo in the header of the CSV file. The column name `title` is misspelled as `tile`, so the rule reports a warning:

::: code-group
<<< incorrect/db/data/sap.capire.bookshop-Books.csv#snippet{csv:line-numbers{1}} [db/data/sap.capire.bookshop-Books.csv]
:::
<PlaygroundBadge
  name="valid-csv-header"
  kind="incorrect"
  :rules="{'@sap/cds/valid-csv-header': ['warn', 'show']}"
  :files="['db/schema.cds', 'db/data/sap.capire.bookshop-Books.csv']"
/>

## Version
This rule was introduced in `@sap/eslint-plugin-cds 2.3.0`.