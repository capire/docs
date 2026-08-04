<template>
  <div class="interactive-query">
    <div class="editor-row">
      <div class="editor" :hidden="loaded">
        <div class="language-sh">
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
          :language="props.language"
          @loaded="loaded = true"
          @evaluate="evaluate"
        />
      </div>
      <button class="icon-button" @click="evaluate" :title="`Evaluate (${metaKey}+Enter)`" :disabled="evalStatus === 'evaluating'">
        <div v-if="evalStatus === 'evaluating'" class="spinner" aria-hidden="true"></div>
        <svg v-else-if="evalStatus === 'success'" class="status-icon success" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else-if="evalStatus === 'error'" class="status-icon error" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
        <div v-else v-html="play"></div>
      </button>
      <button v-if="modelTabs.length" class="icon-button model-toggle-btn" @click="toggleModel"
          :title="modelVisible ? 'Hide CDS model' : 'Show CDS model'" :aria-pressed="modelVisible">
        <svg class="model-icon" viewBox="0 0 24 24" aria-hidden="true">
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v6a8 3 0 0 0 16 0V5" />
          <path d="M4 11v6a8 3 0 0 0 16 0v-6" />
        </svg>
      </button>
    </div>

    <div v-if="queryResult" :class="`vp-code-group ${tabs?.some(tab => tab.error) ? 'error' : ''}`">
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
            :class="`language-${tab.kind} ${selectedTab === tab.key ? 'active' : ''}`" >
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

  <div v-if="modelVisible" class="vp-code-group model-group">
    <div class="tabs">
      <template v-for="tab in modelTabs" :key="tab.key">
        <input
          type="radio"
          :id="tab.key"
          :checked="selectedModelTabKey === tab.key"
          @click.prevent="toggleModelTab(tab.key)"
        >
        <label :for="tab.key" @click.prevent="toggleModelTab(tab.key)">{{ tab.name }}</label>
      </template>
    </div>

    <div class="blocks">
      <div v-for="tab in modelTabs" :key="tab.key" v-show="selectedModelTabKey === tab.key"
          :class="`language-${tab.kind} ${selectedModelTabKey === tab.key ? 'active' : ''}`">
        <button title="Copy Code" class="copy" @click="copyCode($event, tab.value)"></button>
        <span class="lang">{{ tab.kind }}</span>
        <span v-html="format(tab, isDark)"></span>
      </div>
    </div>
  </div>

</template>

<script setup>
import { computed, onMounted, ref, useId } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import { useData } from 'vitepress'
import play from '/icons/play.svg?url&raw'
import { runners } from './runners'
import highlighter from './highlighter'
import templates from 'virtual:templates'

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
const evalStatus = ref(null)

// the model the query runs against, shown on demand so it doesn't clutter the snippet
const modelVisible = ref(false)
const selectedModelTab = ref(null)
const modelTabs = computed(() => (templates.bookshop ?? [])
  .filter(file => file.path.endsWith('.cds'))
  .sort((f1, f2) => f1.path.localeCompare(f2.path))
  .map(file => ({ key: `${uid}-model-${file.path}`, kind: 'cds', name: file.path, value: file.content })))
const selectedModelTabKey = computed(() => selectedModelTab.value ?? modelTabs.value[0]?.key)

function toggleModel() {
  modelVisible.value = !modelVisible.value
}

function toggleModelTab(key) {
  selectedModelTab.value = key
}

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
async function copyCode(event, text = queryText.value) {
  const el = event.target
  event.stopPropagation()
  await navigator.clipboard.writeText(text)

  el.classList.add('copied')
  clearTimeout(timeoutIdMap.get(el))
  const timeoutId = setTimeout(() => {
    el.classList.remove('copied')
    el.blur()
    timeoutIdMap.delete(el)
  }, 2000)
  timeoutIdMap.set(el, timeoutId)
}

let statusTimeoutId = null
async function evaluate() {
  if (evalStatus.value === 'evaluating') return
  evalStatus.value = 'evaluating'
  if (statusTimeoutId) {
    clearTimeout(statusTimeoutId)
    statusTimeoutId = null
  }
  queryResult.value = null
  try {
    const exec = props.onEvaluate ?? runners[props.language]
    if (!exec) throw new Error(`No runner found for language: ${props.language}. Available runners: ${Object.keys(runners).join(', ')}`)
    const result = await exec(queryText.value)
    tabs.value = formatTabs(result).filter(({ value }) => value)

    if (!tabs.value.map(tab => tab.key).includes(selectedTab.value)) selectedTab.value = tabs.value[0].key
    evalStatus.value = 'success'
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
    evalStatus.value = 'error'
  }
  queryResult.value = Object.fromEntries(tabs.value.map(tab => [
    tab.key,
    tab.value === 'object' ? JSON.stringify(tab.value, null, 2) : tab.value
  ]))
  statusTimeoutId = setTimeout(() => {
    evalStatus.value = null
    statusTimeoutId = null
  }, 600)
}

const metaKey = ref('Meta')
onMounted(() => { metaKey.value = /(Mac|iPhone|iPad)/i.test(navigator?.userAgentData?.platform) ? `⌘` : `Ctrl` })

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
  min-width: 0 !important;
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

.icon-button:disabled {
  cursor: default;
  opacity: 0.7;
}

.spinner {
  width: 1.25em;
  height: 1.25em;
  border: 2px solid var(--vp-button-brand-text);
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.icon-button svg.success, .icon-button svg.error {
  width: 1.5em;
  height: 1.5em;
  fill: none;
  stroke: var(--vp-button-brand-text);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  transform-origin: center;
  animation: pop 0.2s ease-out;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pop {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

.icon-button:hover {
  background-color: var(--vp-button-brand-hover-bg);
  color: var(--vp-button-brand-hover-text);
}

.editor-row .icon-button {
  margin-top: 8px;
}

/* Model disclosure toggle: same .icon-button base, muted until active/hover */
.model-toggle-btn {
  background-color: transparent;
  color: var(--vp-c-text-2);
}

.model-toggle-btn:hover, .model-toggle-btn[aria-pressed="true"] {
  background-color: var(--vp-c-default-soft);
  color: var(--vp-c-brand-1);
}

.model-toggle-btn .model-icon {
  width: 1.4em;
  height: 1.4em;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Sits directly below the query/results area, so drop the default vp-code-group top margin */
.model-group {
  margin-top: 0;
}

/* .interactive-query's own bottom margin would otherwise leave a gap before it */
.interactive-query:has(+ .model-group) {
  margin-bottom: 0;
}


.vp-code-group.error {
  border: 1px solid var(--vp-c-danger-2);
  border-radius: 4px;

  input:checked + label::after {
    background-color: var(--vp-c-danger-2);
  }
}

.hint {
  padding: 0 22px;
}


</style>
