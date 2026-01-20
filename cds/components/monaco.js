
import languages from '../../.vitepress/languages'
import { createHighlighter } from 'shiki'
import highlighter from './highlighter'
import { shikiToMonaco } from '@shikijs/monaco'

let monaco

async function setupMonaco() {
  if (typeof window === 'undefined' || monaco) return

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

  shikiToMonaco(highlighter, monaco)
}

await setupMonaco()

export { monaco };
export default monaco;
