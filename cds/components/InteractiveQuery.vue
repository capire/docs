<template>
  <div class="interactive-query">
    <!-- <textarea 
      v-model="queryText" 
      :rows="rows"
      @keydown.meta.enter="runQuery" 
      @keydown.ctrl.enter="runQuery"
    ></textarea> -->
    <div
      ref="editorContainer"
      class="monaco-editor-container"
      :style="{ height: `${editorHeight}px` }"
      @keydown.stop
      @keypress.stop
      @keyup.stop
    ></div>
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
import { ref, watch, onMounted, onUnmounted } from 'vue'
import languages from '../../.vitepress/languages'
import 'monaco-editor/min/vs/editor/editor.main.css'

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
const editorContainer = ref()
let editor
let monaco
const lineHeight = 22
const editorPaddingTop = 4
const editorPaddingBottom = 4
const editorHeight = ref(props.rows * lineHeight + editorPaddingTop + editorPaddingBottom + 0) // +0 to keep type as number

function mapMonacoLang(lang) {
  const m = (lang || 'js').toLowerCase()
  if (m === 'js' || m === 'javascript') return 'javascript'
  if (m === 'ts' || m === 'typescript') return 'typescript'
  if (m === 'html') return 'html'
  if (m === 'css' || m === 'scss' || m === 'less') return 'css'
  if (m === 'json') return 'json'
  // For custom grammars provided via TextMate (e.g., 'cds')
  return null
}

async function setupMonaco() {
  if (typeof window === 'undefined' || editor) return
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches

  // Dynamically import monaco and workers only on client
    const [monacoApi, editorWorker, tsWorker, htmlWorker, cssWorker, jsonWorker] = await Promise.all([
    import('monaco-editor/esm/vs/editor/editor.api'),
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    import('monaco-editor/esm/vs/language/html/html.worker?worker'),
    import('monaco-editor/esm/vs/language/css/css.worker?worker'),
      import('monaco-editor/esm/vs/language/json/json.worker?worker'),
    // Ensure language contributions are registered (ESM build requires explicit imports)
    import('monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'),
    import('monaco-editor/esm/vs/language/typescript/monaco.contribution'),
    import('monaco-editor/esm/vs/language/html/monaco.contribution'),
    import('monaco-editor/esm/vs/language/css/monaco.contribution'),
    import('monaco-editor/esm/vs/language/json/monaco.contribution')
  ])
  monaco = monacoApi

  // Configure worker factory
  self.MonacoEnvironment = {
    getWorker(_, label) {
      if (label === 'typescript' || label === 'javascript') return new tsWorker.default()
      if (label === 'html') return new htmlWorker.default()
      if (label === 'css') return new cssWorker.default()
      if (label === 'json') return new jsonWorker.default()
      return new editorWorker.default()
    }
  }

  const builtIn = mapMonacoLang(props.language)
  // Wire TextMate grammars when using custom languages from our set
  if (!builtIn) {
    await setupTextMateGrammar(props.language)
  }
  const theme = prefersDark ? 'vs-dark' : 'vs'
  editor = monaco.editor.create(editorContainer.value, {
    value: queryText.value,
    language: builtIn || props.language || 'plaintext',
    theme,
    automaticLayout: true,
    wordWrap: 'on',
    wrappingIndent: 'none',
    lineNumbers: 'off',
    glyphMargin: false,
    lineDecorationsWidth: 0,
    renderLineHighlight: 'none',
    renderIndentGuides: false,
    renderWhitespace: 'none',
    overviewRulerLanes: 0,
    overviewRulerBorder: false,
    scrollBeyondLastLine: false,
    scrollbar: {
      vertical: 'hidden',
      horizontal: 'hidden',
      useShadows: false,
      handleMouseWheel: false,
      alwaysConsumeMouseWheel: false,
      verticalScrollbarSize: 0,
      horizontalScrollbarSize: 0
    },
    minimap: { enabled: false },
    fontSize: 14,
    fontFamily: 'inherit',
    lineHeight,
    padding: { top: editorPaddingTop, bottom: editorPaddingBottom },
  })

  // Auto-resize height to fit content (no scrollbars)
  const updateHeight = () => {
    if (!editor || !editorContainer.value) return
    const contentHeight = editor.getContentHeight()
    editorHeight.value = contentHeight
    const width = editorContainer.value.clientWidth
    editor.layout({ width, height: contentHeight })
  }

  const contentSizeDispose = editor.onDidContentSizeChange(() => updateHeight())
  // Initial layout
  updateHeight()

  // Add Cmd/Ctrl+Enter to execute the query
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    runQuery()
  })


  const model = editor.getModel()
  model?.onDidChangeContent(() => {
    queryText.value = model.getValue()
  })

  // Clean up
  onUnmounted(() => {
    try { contentSizeDispose?.dispose?.() } catch {}
  })
}

async function setupTextMateGrammar(langId) {
  try {
    const langEntry = (languages || []).find(l => (l.aliases || []).includes(langId) || l.name === langId)
    if (!langEntry) return

    const [vscodeTextmate, oniguruma, onigWasmUrl] = await Promise.all([
      import('vscode-textmate'),
      import('vscode-oniguruma'),
      import('vscode-oniguruma/release/onig.wasm?url')
    ])

    const onigUrl = onigWasmUrl.default
    await oniguruma.loadWASM(await (await fetch(onigUrl)).arrayBuffer())

    const { Registry, INITIAL } = vscodeTextmate
    const registry = new Registry({
      onigLib: Promise.resolve({
        createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
        createOnigString: (s) => new oniguruma.OnigString(s)
      }),
      loadGrammar: async (scopeName) => {
        if (scopeName === langEntry.scopeName) {
          // Provide the raw TextMate grammar object
          return langEntry
        }
        return null
      }
    })

    const grammar = await registry.loadGrammar(langEntry.scopeName)
    if (!grammar) return

    monaco.languages.register({ id: langId })

    class TMState {
      constructor(ruleStack) { this.ruleStack = ruleStack }
      clone() { return new TMState(this.ruleStack) }
      equals(other) { return other && this.ruleStack === other.ruleStack }
    }

    const tmTokensProvider = {
      getInitialState: () => new TMState(INITIAL),
      tokenize: (line, state) => {
        const res = grammar.tokenizeLine(line, state.ruleStack)
        const tokens = res.tokens.map((t) => {
          const scopes = t.scopes
          let token = 'source'
          if (scopes.some(s => s.includes('comment'))) token = 'comment'
          else if (scopes.some(s => s.includes('string'))) token = 'string'
          else if (scopes.some(s => s.includes('keyword'))) token = 'keyword'
          else if (scopes.some(s => s.includes('constant.numeric') || s.includes('number'))) token = 'number'
          else if (scopes.some(s => s.includes('entity.name.function'))) token = 'function'
          else if (scopes.some(s => s.includes('variable'))) token = 'variable'
          else if (scopes.some(s => s.includes('storage.type') || s.includes('support.type'))) token = 'type'
          else if (scopes.some(s => s.includes('operator') || s.includes('punctuation'))) token = 'operator'
          return { startIndex: t.startIndex, scopes: token }
        })
        return { tokens, endState: new TMState(res.ruleStack) }
      }
    }

    monaco.languages.setTokensProvider(langId, tmTokensProvider)
    monaco.editor.setModelLanguage(editor.getModel(), langId)
  } catch (e) {
    // fallback silently if grammar wiring fails
    console.error('Failed to wire TextMate grammar for', langId, e)
  }
}

onMounted(setupMonaco)
watch(() => props.language, async (newLang) => {
  if (!editor || !monaco) return
  const builtIn = mapMonacoLang(newLang)
  if (builtIn) {
    monaco.editor.setModelLanguage(editor.getModel(), builtIn)
  } else {
    await setupTextMateGrammar(newLang)
  }
})
watch(queryText, (val) => {
  if (!editor) return
  const model = editor.getModel()
  if (model && model.getValue() !== val) model.setValue(val)
})

async function runQuery() {
  queryError.value = null
  queryResult.value = null
  try {
    // const result = await props.onExecute(queryText.value)

    const current = editor?.getModel()?.getValue() ?? queryText.value
    const result = await props.onExecute(current)
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

.monaco-editor-container {
  width: 100%;
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
