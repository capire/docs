---
synopsis: >
  APIs of the <code>@sap/cds-dk</code> package like <code>cds.import</code>.
---

# CDS Design Time APIs

This guide is about programmatic CDS design-time APIs.

## Install `@sap/cds-dk`

The design-time APIs are provided with package `@sap/cds-dk` which needs to be installed locally in your project:

```sh
npm add @sap/cds-dk --save-dev
```

That given, you can use the APIs in your project like this:
```js
const cds = require('@sap/cds-dk')
cds.import(...)
```

> [!important] Do not load cds-dk code at runtime
> Note that the `@sap/cds-dk` is a designtime dependency that runs locally or in CI pipelines.
> Avoid loading code like above at application runtime in deployed applications.

<script setup>
import { data as pages } from './index.data.ts'
</script>

<br>
<IndexList :pages='pages' />
