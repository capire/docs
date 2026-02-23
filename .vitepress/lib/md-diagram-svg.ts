import { MarkdownEnv, MarkdownRenderer } from 'vitepress'

/**
 * Renders SVG diagrams in markdown files as <svg> element.
 * This allows the diagrams to be interactive.
 *
 * To use, add `?raw` to the end of the image source, e.g. `![](diagram.svg?raw)`.
 */
export function install(md: MarkdownRenderer) {
  const defaultImage =
    md.renderer.rules.image ||
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options))

  md.renderer.rules.image = (tokens, idx, options, env: MarkdownEnv, self) => {
    const token = tokens[idx]
    const src = token.attrGet('src') || ''

    if (!/\.svg\?raw$/.test(src)) {
        return defaultImage(tokens, idx, options, env, self)
    }

    const name = 'svg_' + src.replace('?raw', '').replace(/[^a-zA-Z0-9_]/g, '_') // stable variable name for the imported SVG content
    const importPath = src.startsWith('/') && src.startsWith('.') ? src : './' + src

    const sfcBlocks = env.sfcBlocks! 
    if (!sfcBlocks.scriptSetup) {
      sfcBlocks.scriptSetup = {
        content: '<script setup>\n</script>',
        contentStripped: '\n',
        tagClose: '</script>',
        tagOpen: '<script setup>',
        type: 'script'
      }
      sfcBlocks.scripts.push(sfcBlocks.scriptSetup)
    }

    const { scriptSetup } = sfcBlocks
    const { tagOpen, tagClose, contentStripped: rest } = scriptSetup

    const imp = `import ${name} from "${importPath}";`

    if (!scriptSetup.content.includes(imp)) {
      scriptSetup.contentStripped = `${imp}\n${rest}`
      scriptSetup.content = `${tagOpen}${imp}\n${rest}${tagClose}`
    }

    // use v-html to render the SVG content as actual elements
    // with v-html, vite's HMR update works on diagram change
    return `<span class="diagram" v-html="${name}"></span>`
  }
}
