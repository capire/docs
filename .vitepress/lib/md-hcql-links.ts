import type { MarkdownRenderer } from 'vitepress'

const guide = 'guides/protocols/hcql.md'
const agentGuide = 'guides/ai/coding-agents.md'
const referenceRoot = '/guides/protocols/hcql/'
const agentReferenceRoot = '/guides/ai/'
const sections: Record<string, string> = {
  serving: 'serving-hcql',
  discovery: 'discovery-examples',
  examples: 'query-examples',
  config: 'server-configuration',
}

/** Resolve included client guidance to published paths; keep HCQL reference links local. */
export function install(md: MarkdownRenderer) {
  md.core.ruler.push('hcql_local_links', state => {
    const { relativePath, includes = [] } = state.env
    if (typeof relativePath !== 'string') return
    const page = relativePath.replace(/\\/g, '/').replace(/^@external\//, '')
    if (page !== guide && page !== agentGuide) return
    if (!Array.isArray(includes)) return

    const anchors = new Set(state.tokens
      .filter(token => token.type === 'heading_open')
      .map(token => token.attrGet('id')))

    const includeDirs: string[] = []
    for (const token of state.tokens) {
      if (token.type === 'html_block') {
        for (const marker of token.content.matchAll(/<!-- @include-(?:start: (.*?)|end) -->/g)) {
          if (marker[1]) includeDirs.push(marker[1].replace(/\\/g, '/'))
          else includeDirs.pop()
        }
      }
      for (const link of token.children ?? []) {
        if (link.type !== 'link_open') continue
        const href = link.attrGet('href')
        if (typeof href !== 'string' || href.startsWith('#') || /^(?:[\w+.-]+:|\/\/)/.test(href)) continue

        if (page === agentGuide) {
          if (includeDirs.at(-1)?.endsWith(agentReferenceRoot.slice(0, -1))) {
            const url = new URL(href, `https://capire.invalid${agentReferenceRoot}`)
            link.attrSet('href', url.pathname + url.search + url.hash)
          }
          continue
        }

        const inReference = includeDirs.at(-1)?.endsWith(referenceRoot.slice(0, -1))
        const url = new URL(href, `https://capire.invalid${inReference ? referenceRoot : '/guides/protocols/hcql'}`)
        // Resolve included links before VitePress rebases them against source paths,
        // which can contain @external rather than the published page location.
        if (inReference) link.attrSet('href', url.pathname + url.search + url.hash)
        if (!url.search && url.pathname === '/guides/protocols/hcql.md' && url.hash && anchors.has(decodeURIComponent(url.hash.slice(1)))) {
          link.attrSet('href', url.hash)
          continue
        }
        if (url.search || !url.pathname.startsWith(referenceRoot)) continue
        const name = url.pathname.slice(referenceRoot.length).replace(/\.(md|html)$/, '')
        if (!Object.hasOwn(sections, name)) continue
        if (!includes.some(file => typeof file === 'string' && file.replace(/\\/g, '/').endsWith(`${referenceRoot}${name}.md`))) continue

        let anchor = url.hash ? decodeURIComponent(url.hash.slice(1)) : sections[name]
        if (name === 'examples' && anchor === 'localized-data') anchor = 'localized-data-1'
        if (anchors.has(anchor)) link.attrSet('href', `#${anchor}`)
      }
    }
  })
}
