import { MarkdownRenderer, MarkdownEnv } from 'vitepress'


export function install(md: MarkdownRenderer) {
  const fence = md.renderer.rules.fence
  md.renderer.rules.fence = (tokens, idx, options, env: MarkdownEnv, ...args) => {

    const { info } = tokens[idx]
    const [language, live, ...rest] = info.split(' ')
    if (live === 'live') {
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
