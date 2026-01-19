<template>
  <div class="interactive-query">
    <MonacoEditor
      v-model="queryText"
      :rows="props.rows"
      :language="props.language"
      @execute="runQuery"
    />
    <button @click="runQuery">Run Query</button>
    <div v-if="queryResult" class="query-result">
      <strong>Result:</strong>
      <pre>{{ queryResult }}</pre>
    </div>
    <div v-if="queryError" class="query-error">
      <strong>Error:</strong>
      <pre>{{ queryError }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MonacoEditor from './MonacoEditor.vue'

const props = defineProps({
  initialQuery: {
    type: String,
    default: 'SELECT from Books { title }'
  },
  rows: {
    type: Number,
    default: 3
  },
  language: {
    type: String,
    default: 'js'
  },
  onExecute: {
    type: Function,
    required: true
  }
})

const queryText = ref(props.initialQuery)
const queryResult = ref(null)
const queryError = ref(null)

async function runQuery() {
  queryError.value = null
  queryResult.value = null
  try {
    const result = await props.onExecute(queryText.value)
    queryResult.value = JSON.stringify(result, null, 2)
  } catch (error) {
    queryError.value = error.message || String(error)
  }
}
</script>

<style scoped>
.interactive-query {
  margin: 1em 0;
  padding: 1em;
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
}

.interactive-query button {
  padding: 0.5em 1em;
  background-color: var(--vp-button-brand-bg);
  color: var(--vp-button-brand-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.interactive-query button:hover {
  background-color: var(--vp-button-brand-hover-bg);
  color: var(--vp-button-brand-hover-text);
}

.query-result,
.query-error {
  margin-top: 1em;
  padding: 1em;
  border-radius: 4px;
}

.query-result {
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-green-1);
}

.query-error {
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-danger-1);
}

.query-result pre,
.query-error pre {
  margin: 0.5em 0 0 0;
  overflow-x: auto;
}
</style>
