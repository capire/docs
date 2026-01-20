<template>
  <div class="interactive-query">
    <div class="editor-row">
      <MonacoEditor
        v-model="queryText"
        :rows="props.rows"
        :language="props.language"
        @execute="runQuery"
        class="editor"
      />
      <button class="icon-button" @click="runQuery" aria-label="Run Query">
        <div v-html="play"></div>
      </button>
    </div>

    <div v-if="queryResult" class="vp-code-group vp-adaptive-theme">
      <div class="tabs">
        <template v-for="tab in tabs" :key="tab.key">
          <input type="radio" :id="`${uid}-${tab.key}`" v-model="selectedTab" :value="`${uid}-${tab.key}`">
          <label :for="`${uid}-${tab.key}`">{{ tab.name }}</label>
        </template>
      </div>

      <div class="blocks">
        <div v-for="tab in tabs" :key="tab.key" v-show="selectedTab === `${uid}-${tab.key}`"
            :class="`language-${tab.kind} vp-adaptive-theme ${selectedTab === `${uid}-${tab.key}` ? 'active' : ''}`" >
          <button title="Copy Code" class="copy"></button>
          <span class="lang">{{ tab.kind }}</span>
          <span v-html="format(tab, isDark)"></span>
        </div>
      </div>
    </div>
    <div v-if="queryError" class="query-error">
      <strong>Error:</strong>
      <pre>{{ queryError }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, useId } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import { useData } from 'vitepress'
import highlighter from './highlighter'
import play from '/icons/play.svg?url&raw'

const uid = useId()

const { isDark } = useData()

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

const tabs = ref([])
const selectedTab = ref(`${uid}-Result`)

const queryText = ref(props.initialQuery)
const queryResult = ref(null)
const queryError = ref(null)

function format({value, kind}, dark) {
  // const highlighter = (await import('./highlighter')).default
  if (!highlighter.getLoadedLanguages().includes(kind)) {
    kind = 'plaintext'
  }
  const html = highlighter.codeToHtml(
    typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    { lang: kind, theme: dark ? 'github-dark' : 'github-light' })
  return html
}

async function runQuery() {
  queryError.value = null
  queryResult.value = null
  try {
    const result = await props.onExecute(queryText.value)
    if (result && result.kind && result.value) {
      const { kind, name = 'Result', value } = result
      tabs.value = [
        { key: name, kind, name, value }
      ]
    }
    else if (Array.isArray(result) && result[0] && result[0].kind && result[0].value) {
      tabs.value = result.map(r => {
        const { kind, name = kind, value } = r
        return { key: name, kind, name, value }
      })
    } else {
      tabs.value = [
        { key: 'Result', name: 'Result', value: result }
      ]
    }
    selectedTab.value = `${uid}-${tabs.value[0].key}`
    queryResult.value = Object.fromEntries(tabs.value.map(tab => [
      `${uid}-${tab.key}`,
      tab.value === 'object' ? JSON.stringify(tab.value, null, 2) : tab.value
    ]))
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
  background-color: var(--vp-code-block-bg);
}

.editor-row {
  display: flex;
  align-items: stretch;
  gap: 0.5em;
}

.editor-row .editor {
  flex: 1;
}

.interactive-query .icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--vp-button-brand-bg);
  color: var(--vp-button-brand-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 2.5em;
  height: 2.5em;
  padding: 0.25em;
  color: var(--vp-c-tip-1);

  div {
    width: 1.5em;
    height: 1.5em;
    stroke: var(--vp-button-brand-text);
    fill: var(--vp-button-brand-text);
  }
} 


.interactive-query .icon-button:hover {
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
  background-color: var(--vp-code-block-bg);
  border: 1px solid var(--vp-c-green-1);
}

.query-error {
  background-color: var(--vp-code-block-bg);
  border: 1px solid var(--vp-c-danger-1);
}

.query-result pre,
.query-error pre {
  margin: 0.5em 0 0 0;
  overflow-x: auto;
}

:deep(.shiki) {
  background-color: var(--vp-code-block-bg) !important;
}
:deep(.line) {
  word-wrap: normal;
}
</style>
