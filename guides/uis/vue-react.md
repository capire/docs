---

---

# Serving Vue.js or React

CAP is easily integrated with Vue.js, React, Svelte, or any other popular UI library. This guide explains how to set up a minimal project with a UI.

<!-- [[toc]] -->

## Example project

The example here is built on a minimal CAP project:

```sh
cds init bookshop --nodejs --add tiny-sample && code bookshop
```

### Vue.js

Simply create a Vue.js or React app in `app/catalog`:

::: code-group

```sh [Vue.js]
cds add vue --into catalog
```

```sh [React]
cds add react --into catalog
```

:::

::: details What this does in the background for Vue.js

```sh
cd app
npm create vite@latest catalog -- --template vue
```

> Confirm "Install with npm and start now?" if asked.

Now add a proxy to `app/catalog/vite.config.js`:

```js [Vue.js] {6-10}
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/odata': 'http://localhost:4004'
    }
  }
})

```

Replace _src/App.vue_ with a minimal example:

```vue [App.vue]
<script setup>
import { ref, onMounted } from 'vue'

const books = ref([])

onMounted(async () => {
  const r = await fetch('/odata/v4/catalog/Books')
  books.value = (await r.json()).value
})
</script>

<template>
  <h1>Books</h1>
  <table>
    <tr v-for="b in books" :key="b.ID">
      <td>
        <span style="color:#111">{{ b.title }}</span>
        <span style="color:#777"><i> by {{ b.author }}</i></span>
      </td>
    </tr>
  </table>
</template>
```
:::

::: details What this does in the background for React

```sh
cd app
npm create vite@latest catalog -- --template react
```

> Confirm "Install with npm and start now?" if asked.

Now add a proxy to `app/catalog/vite.config.js`:

#### React
```js [React] {6-10}
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/odata': 'http://localhost:4004'
    }
  }
})
```

Replace _src/App.jsx_ with a minimal example:

#### App.jsx
```jsx [App.jsx]
import { useEffect, useState } from 'react'

export default function App() {
  const [books, setBooks] = useState([])

  useEffect(() => {
    fetch('/odata/v4/catalog/Books')
      .then(r => r.json())
      .then(r => setBooks(r.value))
  }, [])

  return (
    <>
      <h1>Books</h1>
      <table>
        <tbody>
          {books.map(b => (
            <tr key={b.ID}>
              <td>
                <span style={{ color: '#111' }}>{b.title}</span>
                <span style={{ color: '#777' }}><i> by {b.author}</i></span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
```
:::

Now simply start the dev server:

```sh
cds watch
```

Open http://localhost:4004 to see your running applications.

### Next Up

You can deploy this project to Cloud Foundry or Kyma using the SAP BTP Application Frontend service (Cloud Foundry only) or a custom App Router setup.

[Learn more about Cloud Foundry deployment](../deploy/to-cf#add-ui){.learn-more}
[Learn more about Kyma deployment](../deploy/to-kyma.md){.learn-more}
