import templates from './vite-plugin-templates'
import path from 'path'

let enabled = false
let plugins = () => []
let LiveCode = null

try {
  const { node, cap } = await import('vite-plugin-cds')
  plugins = () => {
    return [node(), cap(), templates([path.join(__dirname, 'templates')])]
  }
  enabled = true
}
catch (e) {
  console.error('vite-plugin-cds not installed - run `npm i` to update your modules')
}

export {
  enabled,
  plugins,
}
export default { enabled, plugins }
