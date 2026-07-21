import { MarkdownRenderer, MarkdownEnv } from 'vitepress'
import { dirname, join, relative } from 'path'
import { enabled } from '.'

/**
 * Makes code blocks with "live" in the info string interactive by rendering a <LiveCode /> component.
 *
 * ```cds live
 * select from Books { title }
 * ```
 * 
 * ```js live
 * await INSERT.into('Books').entries(
 *   { ID: 2, author_ID: 150, title: 'Eldorado' }
 * )
 * ```
 *
 * Additional options:
 * - as <lang>: specify the language to execute the code block as (defaults to the language specified before "live")
 *   example: ```cds live as cql
 * - readonly: make the code block readonly
 *   example: ```cds live readonly
 */
export function install(md: MarkdownRenderer) {
  if (!enabled) return
  const fence = md.renderer.rules.fence
  md.renderer.rules.fence = (tokens, idx, options, env: MarkdownEnv, ...args) => {

    const { info } = tokens[idx]
    const [language, live, ...rest] = info.split(' ')
    if (live === 'live') {
      const mdDir = dirname(env.realPath ?? env.path)
      const filePath = './' + relative(mdDir, join(__dirname, '../../theme/components/cds-playground/LiveCode.vue'))
      const imp = `import LiveCode from "${filePath}";`
      insertScriptSetup(env, imp)

      const opts = Object.fromEntries(['as'].map(key => {
        const idx = rest.findIndex(k => k === key)
        return idx > -1 ? [key, rest.splice(idx+1, 1)[0]] : [];
      }))
      const props = {
        language: opts.as ?? language,
      }
      const flags = ['readonly'].filter(k => rest.includes(k))

      const content = tokens[idx].content.trim()
      return `<LiveCode initialQuery="${md.utils.escapeHtml(content)}" ${Object.entries(props).map(([k, v]) => `${k}="${v}"`)} ${flags.join(' ')}></LiveCode>`
    }
    return fence!(tokens, idx, options, env, ...args)
  }
}

function insertScriptSetup(env: MarkdownEnv, imp: string) {
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

  if (!scriptSetup.content.includes(imp)) {
    scriptSetup.contentStripped = `${imp}\n${rest}`
    scriptSetup.content = `${tagOpen}${imp}\n${rest}${tagClose}`
  }
}
