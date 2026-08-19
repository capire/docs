<template>
  <div class="interactive-query">
    <div class="editor-row">
      <div class="editor" :hidden="loaded">
        <div class="language-sh">
          <button title="Copy Code" class="copy"></button>
          <span class="lang">{{ props.language === 'cds'? 'cql' : props.language }}</span>
          <span v-html="format?.({value: queryText, kind: props.language}, isDark, props.highlightLines)"></span>
        </div>
      </div>
      <div class="editor language-sh" :hidden="!loaded" v-if="!readonly">
        <button title="Copy Code" class="copy" @click.prevent="copyCode"></button>
        <span class="lang">{{ props.language === 'cds'? 'cql' : props.language }}</span>
        <MonacoEditor
          v-model="queryText"
          :language="props.language"
          :highlightLines="props.highlightLines"
          @loaded="loaded = true"
          @evaluate="evaluate"
        />
      </div>
      <div class="action-buttons" :class="{ visible: evalStatus || modelVisible }">
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
            :title="modelVisible ? 'Hide CDS model and sample data' : 'Show CDS model and sample data'" :aria-pressed="modelVisible">
          <svg class="model-icon" viewBox="0 0 24 24" aria-hidden="true">
            <ellipse cx="12" cy="5" rx="8" ry="3" />
            <path d="M4 5v6a8 3 0 0 0 16 0V5" />
            <path d="M4 11v6a8 3 0 0 0 16 0v-6" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="combinedTabs.length" :class="`vp-code-group ${combinedTabs.some(tab => tab.error) ? 'error' : ''}`">
      <div class="tabs">
        <template v-for="tab in combinedTabs" :key="tab.key">
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
        <div v-for="tab in combinedTabs" :key="tab.key" v-show="selectedTab === tab.key"
            :class="`language-${tab.kind} ${selectedTab === tab.key ? 'active' : ''}`" >
          <button title="Copy Code" class="copy" @click="copyCode($event, tab.value)"></button>
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
import { computed, onMounted, ref, useId } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import { useData } from 'vitepress'
import play from '/icons/play.svg?url&raw'
import { runners, runWithModel } from './runners'
import highlighter from './highlighter'
import templates from 'virtual:templates'
import { transformerMetaHighlight } from '@shikijs/transformers'

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
  async: {
    type: Boolean,
    default: false
  },
  language: {
    type: String,
    default: 'js'
  },
  modelSource: {
    type: String,
    default: ''
  },
  modelData: {
    type: String,
    default: ''
  },
  highlightLines: {
    type: String,
    default: ''
  },
  resultKind: {
    type: String,
    default: ''
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
const modelTabs = computed(() => {
  if (props.modelSource) {
    const tabs = [{ key: `${uid}-model-custom`, kind: 'cds', name: 'schema.cds', value: props.modelSource }]
    if (props.modelData) {
      const csvs = JSON.parse(props.modelData)
      for (const [path, content] of Object.entries(csvs)) {
        tabs.push({ key: `${uid}-data-${path}`, kind: 'csv', name: path, value: content })
      }
    }
    return tabs
  }
  return (templates.bookshop ?? [])
    .filter(file => file.path.endsWith('.cds') || file.path.endsWith('.csv'))
    .sort((f1, f2) => {
      const kindOrder = (f) => f.path.endsWith('.csv') ? 1 : 0
      return kindOrder(f1) - kindOrder(f2) || f1.path.localeCompare(f2.path)
    })
    .map(file => ({ key: `${uid}-model-${file.path}`, kind: file.path.endsWith('.csv') ? 'csv' : 'cds', name: file.path, value: file.content }))
})

// eval tabs (if any) come first, model tabs are appended at the end
const combinedTabs = computed(() => [
  ...(queryResult.value ? tabs.value : []),
  ...(modelVisible.value ? modelTabs.value : [])
])

function toggleModel() {
  modelVisible.value = !modelVisible.value
  if (modelVisible.value) {
    // draw attention to the newly appended model tabs, whether or not eval tabs are shown
    selectedTab.value = modelTabs.value[0]?.key
  } else if (modelTabs.value.some(tab => tab.key === selectedTab.value)) {
    // was showing a model tab that just got hidden: fall back to an eval tab if there is one
    selectedTab.value = tabs.value[0]?.key ?? null
  }
}

function format({ value, kind }, dark, highlightSpec = '') {
  if (!highlighter.getLoadedLanguages().includes(kind)) {
    kind = 'plaintext'
  }
  const opts = { lang: kind, theme: dark ? 'github-dark' : 'github-light', transformers: [], meta: undefined }
  if (highlightSpec) {
    opts.meta = { __raw: highlightSpec }
    opts.transformers = [transformerMetaHighlight()]
  }
  return highlighter.codeToHtml(
    typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    opts)
}

function formatTabs(result) {
  if (props.resultKind) {
    // evalJS wraps results in tab objects with a possibly JSON-stringified value; unwrap first.
    // When resultTabs produces yaml+json tabs, take the json tab (not the yaml one at [0]).
    const raw = Array.isArray(result) && result[0]?.kind !== undefined
      ? (result.find(t => t.kind === 'json') ?? result[0]).value
      : result
    let data = raw
    if (typeof raw === 'string') try { data = JSON.parse(raw) } catch {}
    const value = Array.isArray(data) ? data.join(';\n') : typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    return [{ key: `${uid}-Result`, kind: props.resultKind, name: `Result (as ${props.resultKind.toUpperCase()})`, value }]
  }
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
    const exec = props.onEvaluate
      ?? (props.modelSource ? (q) => runWithModel(q, props.modelSource, props.modelData ? JSON.parse(props.modelData) : undefined, props.language, props.async) : runners[props.language])
    if (!exec) throw new Error(`No runner found for language: ${props.language}. Available runners: ${Object.keys(runners).join(', ')}`)
    const result = await exec(queryText.value, props.async)
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
  position: relative;
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

/* Shiki placeholder shown before Monaco mounts. Padding must match Monaco's own
   (left/right: 0) so the code text doesn't visibly jump when Monaco takes over. */
.interactive-query .editor-row :deep(.shiki) {
  margin: 0;
}
.interactive-query .editor-row :deep(.shiki code) {
  line-height: 24px;
  padding: 0 !important;
}

/* styles.scss reserves 40px on hover/focus for its copy button (only on screens >= 1600px). Reserve
   that space permanently instead, so hovering only reveals our own copy button without shifting
   the box's width and reflowing/wrapping the code. */
@media screen and (min-width: 1600px) {
  .editor-row .editor.language-sh,
  .blocks > [class*='language-'] {
    padding-right: 40px;
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
  background-color: transparent;
  color: var(--vp-c-text-2);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 30px;
  height: 30px;
  padding: 0.2em;
  flex-shrink: 0;

  div {
    width: 1.1em;
    height: 1.1em;
    stroke: currentColor;
    fill: currentColor;
  }
}

.icon-button:disabled {
  cursor: default;
  opacity: 0.7;
}

.spinner {
  width: 0.9em;
  height: 0.9em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.icon-button svg.success, .icon-button svg.error {
  width: 1.1em;
  height: 1.1em;
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  transform-origin: center;
  animation: pop 0.2s ease-out;
}

.icon-button svg.success {
  color: var(--vp-c-green-1);
}

.icon-button svg.error {
  color: var(--vp-c-red-1);
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
  background-color: var(--vp-c-default-soft);
  color: var(--vp-c-brand-1);
}

/* Overlay group for Evaluate/Model buttons: kept out of layout flow (like vitepress's own
   copy button) so their presence never affects the editor's available width/wrapping. */
.action-buttons {
  position: absolute;
  top: 9px;
  right: 56px;
  z-index: 4;
  display: flex;
  gap: 0.15em;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.editor-row:hover .action-buttons,
.editor-row:focus-within .action-buttons,
.action-buttons.visible {
  opacity: 1;
  pointer-events: auto;
}

/* Vitepress only reveals its copy button when hovering/focusing the .language-sh div itself,
   so hovering our own action-buttons overlay (a sibling) wouldn't show it; tie it to the
   whole row instead so all three buttons always appear together. Needs 4 classes to
   out-specificity vitepress's own `.vp-doc [class*='language-']:hover > button.copy` rule */
.interactive-query .editor-row:hover .language-sh button.copy,
.interactive-query .editor-row:focus-within .language-sh button.copy {
  opacity: 1;
}

/* Vitepress positions .lang at top: 2px, which sits above the vertical center of the buttons;
   needs 4 class selectors to out-specificity vitepress's own `.vp-doc [class*='language-'] > span.lang` rule */
.interactive-query .editor-row .language-sh .lang {
  top: 7px;
}

/* Shrink vitepress's default 40px copy button to match our icon-buttons so all
   three buttons appear at the same height; needs 3 classes to out-specificity vitepress's
   own `.vp-doc [class*='language-'] > button.copy` rule */
.interactive-query .editor-row .language-sh button.copy {
  top: 9px;
  width: 30px;
  height: 30px;
  background-size: 15px;
}

/* Model disclosure toggle: same .icon-button base; highlight while the model panel is open */
.model-toggle-btn[aria-pressed="true"] {
  background-color: var(--vp-c-default-soft);
  color: var(--vp-c-brand-1);
}

.model-toggle-btn .model-icon {
  width: 1.1em;
  height: 1.1em;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.interactive-query :deep(.vp-code-group .tabs) {
  overflow-x: auto;
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
