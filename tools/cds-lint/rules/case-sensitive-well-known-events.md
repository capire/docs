---
status: released
---

<script setup>
  import PlaygroundBadge from '../components/PlaygroundBadge.vue'
</script>

# case-sensitive-well-known-events

## Rule Details

This rule identifies registrations to events that are likely well-known event names that must be written in all caps.

#### Version
This rule was introduced in `@sap/eslint-plugin-cds 4.0.2`.

## Examples

### ✅ &nbsp; Correct example

The following example shows the correctly capitalized event name `READ`:

::: code-group
<<< ../examples/case-sensitive-well-known-events/correct/srv/admin-service.js#snippet{js:line-numbers} [srv/admin-service.js]
:::
<PlaygroundBadge
  name="case-sensitive-well-known-events"
  kind="correct"
  :files="['srv/admin-service.js']"
/>

### ❌ &nbsp; Incorrect example

This example shows a registration to an event `Read`, which should likely be `READ`. This can lead to unexpected behavior because event names in CAP are case sensitive:
::: code-group
<<< ../examples/case-sensitive-well-known-events/incorrect/srv/admin-service.js#snippet{js:line-numbers} [srv/admin-service.js]
:::
<PlaygroundBadge
  name="case-sensitive-well-known-events"
  kind="incorrect"
  :files="['srv/admin-service.js']"
/>
