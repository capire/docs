<template>
  <div
    ref="editorContainer"
    class="monaco-editor-container"
    :style="{ height: `${editorHeight}px` }"
    @keydown.stop
    @keypress.stop
    @keyup.stop
  ></div>
</template>

<script setup>
import { ref, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import languages from '../../.vitepress/languages'
import 'monaco-editor/min/vs/editor/editor.main.css'
import { useData } from 'vitepress'
const { isDark, theme: vitepressTheme } = useData()

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'js'
  },
  rows: {
    type: Number,
    default: 3
  }
})

const emit = defineEmits(['update:modelValue', 'execute'])

const editorContainer = ref()
let editor
let monaco
const lineHeight = 22
const editorPaddingTop = 4
const editorPaddingBottom = 4
const editorHeight = ref(props.rows * lineHeight + editorPaddingTop + editorPaddingBottom + 0)

function mapMonacoLang(lang) {
  const m = (lang || 'js').toLowerCase()
  if (m === 'js' || m === 'javascript') return 'javascript'
  if (m === 'ts' || m === 'typescript') return 'typescript'
  if (m === 'html') return 'html'
  if (m === 'css' || m === 'scss' || m === 'less') return 'css'
  if (m === 'json') return 'json'
  return null
}


function cssVar(name) {
    return getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim()
}

function initTheme(isDarkNow) {
  const bgSoft = cssVar('--vp-c-bg-soft')// || '#202127';
  monaco?.editor?.defineTheme(isDarkNow? 'cap-dark' : 'cap', {
    base: isDarkNow ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      {
        token: "identifier",
        foreground: "9CDCFE"
      },
      {
        token: "identifier.function",
        foreground: "DCDCAA"
      },
      {
        token: "type",
        foreground: "1AAFB0"
      }
    ],
    colors: {
        "editor.background": bgSoft,
        "editor-background": bgSoft,
        "editorGutter.background": bgSoft,
    }
  });
}

function setTheme(isDarkNow) {
    initTheme(isDarkNow);
    if (isDarkNow) {
        monaco?.editor?.setTheme('cap-dark')
    } else {
        monaco?.editor?.setTheme('cap')
    }
}


async function setupMonaco() {
  if (typeof window === 'undefined' || editor) return

  const [monacoApi, editorWorker, tsWorker, htmlWorker, cssWorker, jsonWorker] = await Promise.all([
    import('monaco-editor/esm/vs/editor/editor.api'),
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    import('monaco-editor/esm/vs/language/html/html.worker?worker'),
    import('monaco-editor/esm/vs/language/css/css.worker?worker'),
    import('monaco-editor/esm/vs/language/json/json.worker?worker'),
    import('monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'),
    import('monaco-editor/esm/vs/language/typescript/monaco.contribution'),
    import('monaco-editor/esm/vs/language/html/monaco.contribution'),
    import('monaco-editor/esm/vs/language/css/monaco.contribution'),
    import('monaco-editor/esm/vs/language/json/monaco.contribution')
  ])
  monaco = monacoApi

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
  if (!builtIn) {
    await setupTextMateGrammar(props.language)
  }
  setTheme(isDark.value)

  const theme = isDark.value ? 'cap-dark' : 'cap'
  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: props.language || 'plaintext',
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

  const updateHeight = () => {
    if (!editor || !editorContainer.value) return
    const contentHeight = editor.getContentHeight()
    editorHeight.value = contentHeight
    const width = editorContainer.value.clientWidth
    editor.layout({ width, height: contentHeight })
  }

  const contentSizeDispose = editor.onDidContentSizeChange(() => updateHeight())
  updateHeight()

  // Emit execute on Cmd/Ctrl+Enter
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    emit('execute')
  })

  const model = editor.getModel()
  model?.onDidChangeContent(() => {
    emit('update:modelValue', model.getValue())
  })

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

watch(() => props.modelValue, (val) => {
  if (!editor) return
  const model = editor.getModel()
  if (model && model.getValue() !== val) model.setValue(val)
})

watchEffect(() => {
  console.log('dark mode is now', isDark.value)
  setTheme();
})

</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  border-radius: 8px;
  margin-bottom: 0.5em;
}
</style>
