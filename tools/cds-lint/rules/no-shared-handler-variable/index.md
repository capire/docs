---
status: released
---

<script setup>
  import PlaygroundBadge from '../../components/PlaygroundBadge.vue'
</script>

# no-shared-handler-variable

## Rule Details

Discourages sharing state between handlers using variables from parent scopes because this can lead to data leakage between tenants. This rule automatically checks handler registrations inside classes that extend `cds.ApplicationService`.

To enable this check for functions declared outside such classes, add a type annotation.
Any function annotated with

- `@type {import('@sap/cds').CRUDEventHandler.Before}`,
- `@type {import('@sap/cds').CRUDEventHandler.On}`,
- `@type {import('@sap/cds').CRUDEventHandler.After}`

will also be checked by this rule.

## Examples

### ✅ &nbsp; Correct example

In the following example, only locally defined variables are used within handler implementation:

::: code-group
<<< correct/srv/admin-service.js#snippet{js:line-numbers} [srv/admin-service.js]
:::
<PlaygroundBadge
  name="no-shared-handler-variable"
  kind="correct"
  :files="['srv/admin-service.js']"
/>

### ❌ &nbsp; Incorrect example

In the following example, the variables `newBook` and `readBooks` are declared in scopes surrounding the handler function, making their value available to subsequent calls of that handler. While this may seem advantageous, it can cause issues in a multitenant scenario, where the handler function can be invoked by multiple tenants.

::: code-group
<<< incorrect/srv/admin-service.js#snippet{js:line-numbers} [srv/admin-service.js]
:::
<PlaygroundBadge
  name="no-shared-handler-variable"
  kind="incorrect"
  :files="['srv/admin-service.js']"
/>

## Caveats
The following code styles are not checked by this rule as of today:

### Inline Import + Extension
The following example imports `@sap/cds` within the `extends` clause of the service implementation.
```js
class AdminService extends require('@sap/cds').ApplicationService { /* … */ }
```
Instead, import `@sap/cds` separately, as shown in the other examples.

### Using Methods as Handler
Using a misbehaving class method as handler implementation will also not be detected, even if it is located in service implementation class itself:

```js
const cds = require('@sap/cds')

class AdminService extends cds.ApplicationService {
  badHandler () { /* bad things going on in here */ }

  init () {
    this.on('READ', 'Books', this.badHandler)
  }
}
```
Use a function instead.

### Other Service-Implementation Styles Than Classes
Only classes extending `cds.ApplicationService` are checked as part of this rule, to avoid triggering too many false positives. So all other implementation styles will not trigger this rule:
```js
cds.services['AdminService'].on('READ', 'Books', () => {})
```
(or any of the old implementation patterns for services besides classes, like using `cds.service.impl`.)


#### Version
This rule was introduced in `@sap/eslint-plugin-cds 4.0.2`.
