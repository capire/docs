import highlighter from './highlighter'
import { shikiToMonaco } from '@shikijs/monaco'

// no correct top-level await in Safari
async function setupMonaco() {
  const monaco = await import('monaco-editor')

  monaco.languages.register({ id: 'javascript' })
  monaco.languages.register({ id: 'js' })
  monaco.languages.register({ id: 'cds' })
  monaco.languages.register({ id: 'cql' })
  monaco.languages.register({ id: 'typescript' })

  self.MonacoEnvironment = {
    getWorker(_, label) {
      if (label === 'typescript' || label === 'javascript') return getWorkerModule('/monaco-editor/esm/vs/language/typescript/ts.worker?worker', label)
      return new editorWorker.default()
    }
  }

  shikiToMonaco(highlighter, monaco)
  return monaco
}

export default setupMonaco();
