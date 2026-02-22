<template>
  <div class="interactive-query">
    <div class="editor-row">
      <div class="editor" :hidden="loaded">
        <div class="language-sh vp-adaptive-theme">
          <button title="Copy Code" class="copy"></button>
          <span class="lang">{{ props.language === 'cds'? 'cql' : props.language }}</span>
          <span v-html="format?.({value: queryText, kind: props.language}, isDark)"></span>
        </div>
      </div>
      <div class="editor language-sh" :hidden="!loaded" v-if="!readonly">
        <button title="Copy Code" class="copy" @click.prevent="copyCode"></button>
        <span class="lang">{{ props.language === 'cds'? 'cql' : props.language }}</span>
        <MonacoEditor
          v-model="queryText"
          :rows="props.rows"
          :language="props.language"
          @loaded="loaded = true"
          @evaluate="evaluate"
        />
      </div>
      <button class="icon-button" @click="evaluate" title="Evaluate">
        <div v-html="play"></div>
      </button>
    </div>

    <div v-if="queryResult" :class="`vp-code-group vp-adaptive-theme ${tabs?.some(tab => tab.error) ? 'error' : ''}`">
      <div class="tabs">
        <template v-for="tab in tabs" :key="tab.key">
          <input
            type="radio"
            :id="tab.key"
            :checked="selectedTab === tab.key"
            @click.prevent="toggleTab(tab.key)"
          >
          <label :for="tab.key" @click.prevent="toggleTab(tab.key)">{{ tab.name }}</label>
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
import { ref, useId } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import { useData } from 'vitepress'
import play from '/icons/play.svg?url&raw'
import { runners } from './runners'
import highlighter from './highlighter'

const uid = useId()

const { isDark } = useData()

const props = defineProps({
  initialQuery: {
    type: String,
    default: ''
  },
  readonly: {
    type: Boolean,
    default: false
  },
  rows: {
    type: Number,
    default: 3
  },
  language: {
    type: String,
    default: 'js'
  },
  onEvaluate: {
    type: Function
  }
})

const loaded = ref(false)

const tabs = ref([])
const selectedTab = ref(`${uid}-Result`)

const queryText = ref(props.initialQuery)
const queryResult = ref(null)


function format({ value, kind }, dark) {
  if (!highlighter.getLoadedLanguages().includes(kind)) {
    kind = 'plaintext'
  }
  const html = highlighter.codeToHtml(
    typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    { lang: kind, theme: dark ? 'github-dark' : 'github-light' })
  return html
}

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

function toggleTab(key) {
  selectedTab.value = selectedTab.value === key ? null : key
}

// monaco inserts non-breaking spaces
// so we override vitepress's default copy behavior
const timeoutIdMap = new WeakMap()
async function copyCode(event) {
  const el = event.target
  event.stopPropagation()
  await navigator.clipboard.writeText(queryText.value)

  el.classList.add('copied')
  clearTimeout(timeoutIdMap.get(el))
  const timeoutId = setTimeout(() => {
    el.classList.remove('copied')
    el.blur()
    timeoutIdMap.delete(el)
  }, 2000)
  timeoutIdMap.set(el, timeoutId)
}

async function evaluate() {
  queryResult.value = null
  try {
    const exec = props.onEvaluate ?? runners[props.language]
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
  padding: 0px 12px 0px 22px;
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

.editor {
  margin: 0 !important;
}

.editor .language-sh {
  :deep(pre), :deep(code) {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
}

.editor.language-sh {
  overflow: unset;
}

.interactive-query .editor-row .monaco-editor-container {
  margin: 8px 0;
}

/* Shiki in place of an editor */
.interactive-query .editor-row .vp-adaptive-theme {
  margin: 0;
  :deep(code) {
    line-height: 24px;
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
:deep(.shiki code) {
  font-size: 14px;
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

.editor-row .icon-button {
  margin-top: 8px;
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
