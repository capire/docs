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
// Monaco Editor Vue Component
// Note: Do not create many of these: https://github.com/microsoft/monaco-editor/issues/2326
import { ref, watch, onMounted, onUnmounted, useId } from 'vue'
import 'monaco-editor/min/vs/editor/editor.main.css'
import { useData } from 'vitepress'

const { isDark } = useData()
const uid = useId()

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
const lineHeight = 24
const editorPaddingTop = 4
const editorPaddingBottom = 4
const editorHeight = ref(props.rows * lineHeight + editorPaddingTop + editorPaddingBottom + 0)

async function createEditor() {
  if (typeof window === 'undefined' || editor) return
  monaco = (await import('./monaco')).default
  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: props.language || 'plaintext',
    theme: isDark.value ? 'github-dark' : 'github-light',
    automaticLayout: true,
    wordWrap: 'on',
    wrappingIndent: 'none',
    lineNumbers: 'off',
    glyphMargin: false,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 0,
    folding: false,
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
  editor.addAction({
    id: 'run',
    label: 'Run',
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter
    ],
    run: () => {
      emit('execute')
    }
  })

  const model = editor.getModel()
  model?.onDidChangeContent(() => {
    emit('update:modelValue', model.getValue())
  })

  onUnmounted(() => {
    try { contentSizeDispose?.dispose?.() } catch {}
  })
}


onMounted(createEditor)

watch(() => props.language, async (newLang) => {
  if (!editor || !monaco) return
  monaco.editor.setModelLanguage(editor.getModel(), newLang)
})

watch(() => props.modelValue, (val) => {
  if (!editor) return
  const model = editor.getModel()
  if (model && model.getValue() !== val) model.setValue(val)
})

watch(() => isDark.value, (dark) => {
  monaco?.editor?.setTheme(dark ? 'github-dark' : 'github-light');
})

</script>

<style>
.monaco-editor-container {
  background-color: var(--vp-code-block-bg) !important;
  font-family: var(--vp-font-family-mono) !important;
  width: 100%;
  border-radius: 8px;
}

.monaco-editor, .monaco-editor .margin, .monaco-editor-background {
    background-color: var(--vp-code-block-bg) !important;
    font-family: var(--vp-font-family-mono) !important;
}
</style>
