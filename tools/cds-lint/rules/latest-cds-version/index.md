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

# latest-cds-version

## Rule Details

It is recommended to always use the latest version of `@sap/cds` to benefit from the latest features and bug fixes. This rule checks whether the latest `@sap/cds` version is being used and reports back in case a newer version is available.

## Examples

Let's suppose the latest version of `@sap/cds` available is `7.8.0`.

#### ✅ &nbsp; Correct example

If the current version in your environment is `7.8.0`, the rule passes and there's no output.

#### ❌ &nbsp; Incorrect example

If the current version in your environment is `7.0.0`, that is what the command `npm outdated @sap/cds` returns:

<pre class="log">
Package   Current  Wanted  Latest  Location               Depended by
<text style="color: red">@sap/cds</text>    7.0.0   <text style="color: limegreen">7.8.0</text>   <text style="color: magenta">7.8.0</text>  node_modules/@sap/cds  latest-cds-version
</pre>

Then the rule is triggered and prints the following output upon calling `cds lint` in the directory of your project (for example, _YOUR_PROJECT_PATH_):

<pre class="log">
/YOUR_PROJECT_PATH
  1:1  error  A newer CDS version is available!  <text style="color:gray">@sap/cds/latest-cds-version</text>

<text style="color:red">✖ 1 problem (1 error, 0 warnings)</text>
</pre>

## Version
This rule was introduced in `@sap/eslint-plugin-cds 1.0.4`.
