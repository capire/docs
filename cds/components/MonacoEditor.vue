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
const { isDark } = useData()
import { createHighlighter } from 'shiki'
import { shikiToMonaco } from '@shikijs/monaco'


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

    languages
    const highlighter = await createHighlighter({
        themes: ['github-dark', 'github-light'],
        langs: ['javascript', 'js', 'typescript', 'vue', ...languages],
    })

    // register languages you will use
    monaco.languages.register({ id: 'javascript' })
    monaco.languages.register({ id: 'js' })
    monaco.languages.register({ id: 'cds' })
    monaco.languages.register({ id: 'typescript' })
    monaco.languages.register({ id: 'vue' })

    self.MonacoEnvironment = {
        getWorker(_, label) {
        if (label === 'typescript' || label === 'javascript') return new tsWorker.default()
        if (label === 'html') return new htmlWorker.default()
        if (label === 'css') return new cssWorker.default()
        if (label === 'json') return new jsonWorker.default()
        return new editorWorker.default()
        }
    }
    // hook Shiki into Monaco (tokenization + theme registration)
    shikiToMonaco(highlighter, monaco)

  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: props.language || 'plaintext',
    theme: 'github-dark',
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


onMounted(setupMonaco)

watch(() => props.language, async (newLang) => {
  if (!editor || !monaco) return
  monaco.editor.setModelLanguage(editor.getModel(), newLang)
})

watch(() => props.modelValue, (val) => {
  if (!editor) return
  const model = editor.getModel()
  if (model && model.getValue() !== val) model.setValue(val)
})

watchEffect(() => {
  monaco?.editor?.setTheme(isDark.value ? 'github-dark' : 'github-light');
})

</script>

<style>
.monaco-editor-container {
  background-color: var(--vp-code-block-bg) !important;
  font-family: var(--vp-font-family-mono) !important;
  font-size: var(--vp-code-font-size) !important;
  line-height: var(--vp-code-line-height) !important;
  width: 100%;
  border-radius: 8px;
  margin-bottom: 0.5em;
}

.monaco-editor, .monaco-editor .margin, .monaco-editor-background {
    background-color: var(--vp-code-block-bg) !important;
    font-family: var(--vp-font-family-mono) !important;
    font-size: var(--vp-code-font-size) !important;
    line-height: var(--vp-code-line-height) !important;
}
</style>
