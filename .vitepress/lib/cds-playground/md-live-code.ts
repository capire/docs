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
 * - ```cds [FooBar, data: FooData]  — attaches a named CSV data set to the model
 *
 * Named CSV data sets (static, non-live):
 * - ```csv [FooData: data/Foo.csv]  — defines a named data set; rendered as a plain code block
 * - ```csv hidden [FooData: data/Foo.csv]  — same, but suppressed from output (not rendered)
 *
 * CSV and model blocks may appear anywhere on the page — they are collected in a full token pass
 * before any fence is rendered, so forward references work.
 */

const MODEL_ARG_RE = /^\[.+\]$/

interface ModelDef { source: string; csvs?: Record<string, string> }

function parseBracketKV(inner: string): { name: string; base?: string; data?: string } {
  const commaIdx = inner.indexOf(',')
  const namePart = commaIdx === -1 ? inner.trim() : inner.slice(0, commaIdx).trim()
  const colonIdx = namePart.indexOf(':')
  const name = colonIdx === -1 ? namePart : namePart.slice(0, colonIdx).trim()
  const base = colonIdx === -1 ? undefined : namePart.slice(colonIdx + 1).trim()
  let data: string | undefined
  if (commaIdx !== -1) {
    const dataMatch = inner.slice(commaIdx + 1).match(/\bdata\s*:\s*(\S+)/)
    if (dataMatch) data = dataMatch[1]
  }
  return { name, base, data }
}

function buildDataMap(tokens: any[]): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {}
  for (const token of tokens) {
    if (token.type !== 'fence') continue
    const bracketMatch = token.info.match(/\[([^\]]+)\]/)
    if (!bracketMatch) continue
    const [lang] = token.info.slice(0, bracketMatch.index).trim().split(/\s+/)
    if (lang !== 'csv') continue
    const inner = bracketMatch[1]
    const colonIdx = inner.indexOf(':')
    if (colonIdx === -1) continue
    const name = inner.slice(0, colonIdx).trim()
    const path = inner.slice(colonIdx + 1).trim()
    result[name] = { [path]: token.content.trim() }
  }
  return result
}

function buildModelMap(tokens: any[], dataMap: Record<string, Record<string, string>>): Record<string, ModelDef> {
  const raw: Record<string, { source: string; base?: string; csvs?: Record<string, string> }> = {}
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
    const { name, base, data } = parseBracketKV(bracketMatch[1])
    raw[name] = { source: token.content.trim(), base, csvs: data ? dataMap[data] : undefined }
  }
  const resolved: Record<string, ModelDef> = {}
  function resolve(name: string): ModelDef {
    if (name in resolved) return resolved[name]
    const def = raw[name]
    if (!def) return { source: '' }
    const baseDef = def.base ? resolve(def.base) : null
    const source = baseDef ? `${baseDef.source}\n${def.source}` : def.source
    const csvs = def.csvs ?? baseDef?.csvs
    return (resolved[name] = { source, csvs })
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
      const dataMap = buildDataMap(tokens)
      ;(env as any)._modelMap = buildModelMap(tokens, dataMap)
    }

    const { info } = tokens[idx]
    const hlMatch = info.match(/\{[\d,\-]+\}/)
    const highlightSpec = hlMatch?.[0] ?? ''
    const infoNormalized = info.replace(/\s*\{[\d,\-]+\}/, '')
    const [language, live, ...rawRest] = infoNormalized.split(' ')

    // Suppress named CSV data blocks marked hidden — content is captured in the pre-pass and shown as a model tab.
    if (language === 'csv' && live === 'hidden' && /\[[^\]]+:[^\]]+\]/.test(info)) return ''

    const rest = rawRest.map(flag => flag.replace(/^\[|\]$/g, '')) // e.g. "[async]" -> "async"
    if (live === 'live') {
      const mdDir = dirname(env.realPath ?? env.path)
      const filePath = './' + relative(mdDir, join(__dirname, '../../theme/components/cds-playground/LiveCode.vue'))
      const imp = `import LiveCode from "${filePath}";`
      insertScriptSetup(env, imp)

      const opts = Object.fromEntries(['as'].map(key => {
        const idx = rest.findIndex(k => k === key)
        return idx > -1 ? [key, rest.splice(idx+1, 1)[0]] : [];
      }))

      const modelArg = rawRest.find((p: string) => MODEL_ARG_RE.test(p))
      const modelName = modelArg ? modelArg.slice(1, -1) : null
      const modelDef: ModelDef | undefined = modelName ? (env as any)._modelMap[modelName] : undefined

      const props: Record<string, string> = {
        language: opts.as ?? language,
      }
      if (modelDef?.source) props.modelSource = md.utils.escapeHtml(modelDef.source)
      if (modelDef?.csvs) props.modelData = md.utils.escapeHtml(JSON.stringify(modelDef.csvs))
      if (highlightSpec) props.highlightLines = highlightSpec

      const flags = ['readonly', 'async'].filter(k => rest.includes(k))

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
