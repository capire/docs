<template>
  <div class="interactive-query">
    <textarea 
      v-model="queryText" 
      :rows="rows"
      @keydown.meta.enter="runQuery" 
      @keydown.ctrl.enter="runQuery"
    ></textarea>
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

const props = defineProps({
  initialQuery: {
    type: String,
    default: 'SELECT from Books { title }'
  },
  rows: {
    type: Number,
    default: 3
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
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.interactive-query textarea {
  width: 100%;
  padding: 0.5em;
  font-family: monospace;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-bottom: 0.5em;
}

.interactive-query button {
  padding: 0.5em 1em;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.interactive-query button:hover {
  background-color: #359268;
}

.query-result,
.query-error {
  margin-top: 1em;
  padding: 1em;
  border-radius: 4px;
}

.query-result {
  background-color: #e8f5e9;
  border: 1px solid #4caf50;
}

.query-error {
  background-color: #ffebee;
  border: 1px solid #f44336;
}

.query-result pre,
.query-error pre {
  margin: 0.5em 0 0 0;
  overflow-x: auto;
}
</style>
