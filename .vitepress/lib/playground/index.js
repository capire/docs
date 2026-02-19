import templates from './vite-plugin-templates'
import path from 'path'

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
