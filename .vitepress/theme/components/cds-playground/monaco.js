import highlighter from './highlighter'
import { shikiToMonaco } from '@shikijs/monaco'

// no correct top-level await in Safari
async function setupMonaco() {
  const [monaco, editorWorker, tsWorker] = await Promise.all([
    import('monaco-editor/esm/vs/editor/editor.api'),
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    import('monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'),
    import('monaco-editor/esm/vs/language/typescript/monaco.contribution'),
    import('monaco-editor/esm/vs/language/json/monaco.contribution')
  ])

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
  return monaco
}

export default setupMonaco();
