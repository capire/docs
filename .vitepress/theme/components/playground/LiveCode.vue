<template>
  <div class="language-sh vp-adaptive-theme" v-html="format?.({value: queryText, kind: props.language}, isDark)">
  </div>
  <div class="interactive-query">
    <div class="language-sh vp-adaptive-theme">
      <div class="editor-row" >
        <div class="editor" v-html="format?.({value: queryText, kind: props.language}, isDark)"></div>
        <button class="icon-button" @click="runQuery" aria-label="Run Query">
          <div v-html="play"></div>
        </button>
      </div>
    </div>
  </div>
  <div class="interactive-query">
    <!-- <div class="shiki github-dark" style="background-color: #24292e; color: #e1e4e8;"> -->
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
    <!-- </div> -->
  </div>
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

    <div v-if="queryResult" :class="`vp-code-group vp-adaptive-theme ${tabs?.some(tab => tab.error) ? 'error' : ''}`">
      <div class="tabs">
        <template v-for="tab in tabs" :key="tab.key">
          <input type="radio" :id="tab.key" v-model="selectedTab" :value="tab.key">
          <label :for="tab.key">{{ tab.name }}</label>
        </template>
      </div>

      <div class="blocks">
        <div v-for="tab in tabs" :key="tab.key" v-show="selectedTab === tab.key"
            :class="`language-${tab.kind} vp-adaptive-theme ${selectedTab === tab.key ? 'active' : ''}`" >
          <button title="Copy Code" class="copy"></button>
          <span class="lang">{{ tab.kind }}</span>
          <span v-html="format?.(tab, isDark)"></span>
          <div v-if="tab.hint" class="hint">
            💡 {{ tab.hint }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, useId } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import { useData } from 'vitepress'
import play from '/icons/play.svg?url&raw'
import { runners } from './runners'

const uid = useId()

const { isDark } = useData()

const props = defineProps({
  initialQuery: {
    type: String,
    default: ''
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

let highlighter
const queryText = ref(props.initialQuery)
const queryResult = ref(null)
const format = ref()

const transformers = [
  {
    root: node => {
      // debugger;
      node.children[0] = node.children[0].children[0]
    }
  }
]

function _format({value, kind, transformers}, dark) {
  // const highlighter = (await import('./highlighter')).default
  if (!highlighter.getLoadedLanguages().includes(kind)) {
    kind = 'plaintext'
  }
  const html = highlighter.codeToHtml(
    typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    { lang: kind, theme: dark ? 'github-dark' : 'github-light', transformers })
  // debugger;
  return html
}

onMounted(async () => {
  highlighter = (await import('./highlighter')).default
  format.value = _format
})

function formatTabs(result) {
    if (result && result.kind && result.value) {
      const { kind, name = 'Result', value } = result
      return [
        { key: `${uid}-${name}`, kind, name, value }
      ]
    }
    else if (Array.isArray(result) && result[0] && result[0].kind && result[0].value) {
      return result.map(r => {
        const { kind, name = kind, value } = r
        return { key: `${uid}-${name}`, kind, name, value }
      })
    } else {
      return [
        { key: `${uid}-Result`, name: 'Result', value: result }
      ]
    }

}

async function runQuery() {
  queryResult.value = null
  try {
    const exec = props.onExecute ?? runners[props.language]
    if (!exec) throw new Error(`No runner found for language: ${props.language}. Available runners: ${Object.keys(runners).join(', ')}`)
    const result = await exec(queryText.value)
    tabs.value = formatTabs(result).filter(({ value }) => value)

    if (!tabs.value.map(tab => tab.key).includes(selectedTab.value)) selectedTab.value = tabs.value[0].key
  } catch (error) {
    const tmp = [
      { key: `${uid}-Error`, name: 'Error', value: error.message || String(error), error },
    ]
    if (error.stack) tmp.push({ key: `${uid}-Stack`, name: 'Stack', value: error.stack, error })

    if (/UNIQUE constraint failed: /.test(tmp[0].value)) {
      tmp[0].hint = 'Try changing ID to a different value.'
    }

    tabs.value = tmp
    selectedTab.value = `${uid}-Error`
    window.tabs = tabs.value
  }
  queryResult.value = Object.fromEntries(tabs.value.map(tab => [
    tab.key,
    tab.value === 'object' ? JSON.stringify(tab.value, null, 2) : tab.value
  ]))
}
</script>

<style scoped>
.interactive-query {
  margin: 16px -24px;
  border-radius: 8px;
  background-color: var(--vp-code-block-bg);
  @media (min-width: 640px) {
    margin: 16px 0;
    border-radius: 8px;
  }
}

.interactive-query .editor-row {
  padding: 8px 12px 8px 22px;
}

.editor-row {
  display: flex;
  align-items: stretch;
  gap: 0.5em;
}

.editor-row .editor {
  flex: 1;
  min-width: 0;
}

/* Shiki in place of an editor */
.interactive-query .vp-adaptive-theme .editor-row {
  :deep(code) {
    padding: 0 !important;
  }

  :deep(pre) {
    margin: 4px 0;
    padding: 0 !important;
  }
}

/* Result tabs layout */
.interactive-query .vp-code-group {
  margin: 0 24px;
  @media (min-width: 640px) {
    margin: unset;
  }
}

/* Override shiki inline styles */
:deep(.shiki) {
  background-color: var(--vp-code-block-bg) !important;
}

/* Icon */
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--vp-button-brand-bg);
  color: var(--vp-button-brand-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 30px;
  height: 30px;
  padding: 0.25em;
  color: var(--vp-c-tip-1);
  flex-shrink: 0;

  div {
    width: 1.5em;
    height: 1.5em;
    stroke: var(--vp-button-brand-text);
    fill: var(--vp-button-brand-text);
  }
}

.icon-button:hover {
  background-color: var(--vp-button-brand-hover-bg);
  color: var(--vp-button-brand-hover-text);
}

.error {
  border: 1px solid var(--vp-c-danger-2);
  border-radius: 4px;
}


.vp-code-group.error input:checked + label::after {
  background-color: var(--vp-c-danger-2);
}

.hint {
  padding: 0 22px;
}


</style>
