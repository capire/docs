import templates from './vite-plugin-templates.ts'
import path from 'path'
import { dirname } from 'path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
let enabled = false
let plugins = () => []

try {
  const { node, cap } = await import('vite-plugin-cds')
  plugins = () => {
    return [node(), cap(), templates([path.join(__dirname, 'templates')])]
  }
  enabled = true
}
catch {
  // eslint-disable-next-line no-console
  console.error('live code not available - run `npm i` to update your modules')
}

export {
  enabled,
  plugins,
}
export default { enabled, plugins }
