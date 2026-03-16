---

---

# Serving Vue.js or React

CAP is easily integrated with Vue.js, React, Svelte, or any other popular UI library. This guide explains how to set up a minimal project with a UI.

<!-- [[toc]] -->

## Example project

The example here is built on a minimal CAP project:

```sh
cds init bookshop --nodejs --add tiny-sample && cd bookshop
```

You can already start the CAP backend to watch for changes:
```sh
cds watch
```

**In a new terminal**, create a new Vue.js or React app in _app/catalog_:

::: code-group
```sh [Vue.js]
cd app
npm create vite@latest catalog -- --template vue
```
```sh [React]
cd app
npm create vite@latest catalog -- --template react
```
:::
> Confirm "Install with npm and start now?" if asked.

Now add a proxy to `app/catalog/vite.config.js`:

::: code-group
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

:::

Replace _src/App.vue_ (Vue.js) or _src/App.jsx_ (React) with a minimal example:

::: code-group
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

Now simply open the running dev server on http://localhost:5173 to see the UI.

::: details Dev server not accessible?

The server might not be started yet, run this command:
```sh
npm run dev
```
:::

### Next Up

You can deploy this project to Cloud Foundry or Kyma using the SAP BTP Application Frontend service (Cloud Foundry only) or a custom App Router setup.

[Learn more about Cloud Foundry deployment](../deploy/to-cf#add-ui){.learn-more}
[Learn more about Kyma deployment](../deploy/to-kyma.md){.learn-more}
