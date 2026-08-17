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
 * Options use key=value pairs; boolean flags are standalone words:
 * - model=<name>: run query against a named model defined elsewhere on the page
 *   example: ```cds live model=FooBar
 * - result=<lang>: format the result as the given language (e.g. sql) instead of JSON
 *   example: ```js live result=sql
 * - as=<lang>: execute the code block as a different language
 *   example: ```cds live as=cql
 * - readonly: make the code block readonly
 *   example: ```cds live readonly
 * - async: run the query asynchronously
 *   example: ```js live async
 *
 * Named model definitions (static, non-live):
 * - ```cds model=FooBar  — defines a named model; rendered as a plain code block
 * - ```cds model=FooBarBoo:FooBar  — extends FooBar; combined source is resolved at render time
 * - ```cds model=FooBar data=FooData  — attaches a named CSV data set to the model
 *
 * Named CSV data sets (static, non-live):
 * - ```csv data=FooData:db/Foo.csv  — defines a named data set; rendered as a plain code block
 * - ```csv hidden data=FooData:db/Foo.csv  — same, but suppressed from output (not rendered)
 *
 * CSV and model blocks may appear anywhere on the page — they are collected in a full token pass
 * before any fence is rendered, so forward references work.
 */

interface ModelDef { source: string; csvs?: Record<string, string> }

function parseInfoKV(parts: string[]): { flags: Set<string>; kv: Record<string, string> } {
  const flags = new Set<string>()
  const kv: Record<string, string> = {}
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq === -1) flags.add(part)
    else kv[part.slice(0, eq)] = part.slice(eq + 1)
  }
  return { flags, kv }
}

function buildDataMap(tokens: any[]): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {}
  for (const token of tokens) {
    if (token.type !== 'fence') continue
    const parts = token.info.trim().split(/\s+/)
    if (parts[0] !== 'csv') continue
    const { kv } = parseInfoKV(parts.slice(1))
    if (!kv.data) continue
    const colonIdx = kv.data.indexOf(':')
    if (colonIdx === -1) continue
    const name = kv.data.slice(0, colonIdx)
    const path = kv.data.slice(colonIdx + 1)
    result[name] = { [path]: token.content.trim() }
  }
  return result
}

function buildModelMap(tokens: any[], dataMap: Record<string, Record<string, string>>): Record<string, ModelDef> {
  const raw: Record<string, { source: string; base?: string; csvs?: Record<string, string> }> = {}
  for (const token of tokens) {
    if (token.type !== 'fence') continue
    const parts = token.info.trim().split(/\s+/)
    if (parts[0] !== 'cds') continue
    const { flags, kv } = parseInfoKV(parts.slice(1))
    if (flags.has('live') || !kv.model) continue
    const colonIdx = kv.model.indexOf(':')
    const name = colonIdx === -1 ? kv.model : kv.model.slice(0, colonIdx)
    const base = colonIdx === -1 ? undefined : kv.model.slice(colonIdx + 1)
    raw[name] = { source: token.content.trim(), base, csvs: kv.data ? dataMap[kv.data] : undefined }
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
    if (!(env as any)._modelMap) {
      const dataMap = buildDataMap(tokens)
      ;(env as any)._modelMap = buildModelMap(tokens, dataMap)
    }

    const { info } = tokens[idx]
    const hlMatch = info.match(/\{[\d,\-]+\}/)
    const highlightSpec = hlMatch?.[0] ?? ''
    const infoNormalized = info.replace(/\s*\{[\d,\-]+\}/, '').trim()
    const parts = infoNormalized.split(/\s+/).filter(Boolean)
    const [language = ''] = parts
    const { flags, kv } = parseInfoKV(parts.slice(1))

    // Suppress hidden CSV data blocks — content is captured in the pre-pass
    if (language === 'csv' && flags.has('hidden') && kv.data) return ''

    if (!flags.has('live')) {
      return fence!(tokens, idx, options, env, ...args)
    }

    const mdDir = dirname(env.realPath ?? env.path)
    const filePath = './' + relative(mdDir, join(__dirname, '../../theme/components/cds-playground/LiveCode.vue'))
    const imp = `import LiveCode from "${filePath}";`
    insertScriptSetup(env, imp)

    const modelName = kv.model ?? null
    const modelDef: ModelDef | undefined = modelName ? (env as any)._modelMap[modelName] : undefined

    const props: Record<string, string> = {
      language: kv.as ?? language,
    }
    if (modelDef?.source) props.modelSource = md.utils.escapeHtml(modelDef.source)
    if (modelDef?.csvs) props.modelData = md.utils.escapeHtml(JSON.stringify(modelDef.csvs))
    if (highlightSpec) props.highlightLines = highlightSpec
    if (kv.result) props.resultKind = kv.result

    const liveFlags = ['readonly', 'async'].filter(k => flags.has(k))

    const content = tokens[idx].content.trim()
    return `<LiveCode initialQuery="${md.utils.escapeHtml(content)}" ${Object.entries(props).map(([k, v]) => `${k}="${v}"`).join(' ')} ${liveFlags.join(' ')}></LiveCode>`
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
