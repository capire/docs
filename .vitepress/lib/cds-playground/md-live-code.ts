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
 * - [ModelName]: run query against a named model defined elsewhere on the page
 *   example: ```cds live [FooBar]
 *
 * Named model definitions (static, non-live):
 * - ```cds [FooBar]  — defines a named model; rendered as a plain code block
 * - ```cds [FooBarBoo: FooBar]  — extends FooBar; combined source is resolved at render time
 */

const MODEL_ARG_RE = /^\[.+\]$/

function buildModelMap(tokens: any[]): Record<string, string> {
  const raw: Record<string, { source: string; base?: string }> = {}
  for (const token of tokens) {
    if (token.type !== 'fence') continue
    // Match the bracket first since its content may contain spaces (e.g. "[Foo: Bar]"),
    // which would otherwise be broken apart by a naive split(' ').
    const bracketMatch = token.info.match(/\[([^\]]+)\]/)
    if (!bracketMatch) continue
    const before = token.info.slice(0, bracketMatch.index).trim().split(/\s+/)
    const [lang] = before
    if (lang !== 'cds') continue
    // Only pick up non-live model definition blocks
    if (before.includes('live')) continue
    const inner = bracketMatch[1]
    const colonIdx = inner.indexOf(':')
    const name = colonIdx === -1 ? inner.trim() : inner.slice(0, colonIdx).trim()
    const base = colonIdx === -1 ? undefined : inner.slice(colonIdx + 1).trim()
    raw[name] = { source: token.content.trim(), base }
  }
  const resolved: Record<string, string> = {}
  function resolve(name: string): string {
    if (name in resolved) return resolved[name]
    const def = raw[name]
    if (!def) return ''
    const baseSource = def.base ? resolve(def.base) : ''
    return (resolved[name] = baseSource ? `${baseSource}\n${def.source}` : def.source)
  }
  Object.keys(raw).forEach(resolve)
  return resolved
}

export function install(md: MarkdownRenderer) {
  if (!enabled) return
  const fence = md.renderer.rules.fence
  md.renderer.rules.fence = (tokens, idx, options, env: MarkdownEnv, ...args) => {
    // Build the model map before any fence is rendered: VitePress's preWrapperPlugin
    // strips "[...]" from token.info as a side effect of rendering (for code-group tab
    // titles), so scanning tokens lazily would miss brackets on already-rendered fences.
    if (!(env as any)._modelMap) {
      (env as any)._modelMap = buildModelMap(tokens)
    }

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

      const modelArg = rest.find((p: string) => MODEL_ARG_RE.test(p))
      const modelName = modelArg ? modelArg.slice(1, -1) : null
      let modelSource = ''
      if (modelName) {
        modelSource = (env as any)._modelMap[modelName] ?? ''
      }

      const props: Record<string, string> = {
        language: opts.as ?? language,
      }
      if (modelSource) props.modelSource = md.utils.escapeHtml(modelSource)

      const flags = ['readonly'].filter(k => rest.includes(k))

      const content = tokens[idx].content.trim()
      return `<LiveCode initialQuery="${md.utils.escapeHtml(content)}" ${Object.entries(props).map(([k, v]) => `${k}="${v}"`).join(' ')} ${flags.join(' ')}></LiveCode>`
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
