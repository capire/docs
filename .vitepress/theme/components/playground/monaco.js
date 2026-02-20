import highlighter from './highlighter'
import { shikiToMonaco } from '@shikijs/monaco'

let monaco

async function setupMonaco() {
  if (typeof window === 'undefined' || monaco) return

  const [monacoApi, editorWorker, tsWorker] = await Promise.all([
    import('monaco-editor/esm/vs/editor/editor.api'),
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    import('monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'),
    import('monaco-editor/esm/vs/language/typescript/monaco.contribution'),
    import('monaco-editor/esm/vs/language/json/monaco.contribution')
  ])
  monaco = monacoApi

  monaco.languages.register({ id: 'javascript' })
  monaco.languages.register({ id: 'js' })
  monaco.languages.register({ id: 'cds' })
  monaco.languages.register({ id: 'cql' })
  monaco.languages.register({ id: 'typescript' })

  self.MonacoEnvironment = {
    getWorker(_, label) {
      if (label === 'typescript' || label === 'javascript') return new tsWorker.default()
      return new editorWorker.default()
    }
  }

  shikiToMonaco(highlighter, monaco)
}

await setupMonaco()

export { monaco };
export default monaco;
