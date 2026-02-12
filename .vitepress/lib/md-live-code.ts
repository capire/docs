import { MarkdownRenderer, MarkdownEnv } from 'vitepress'


export function install(md: MarkdownRenderer) {
  const fence = md.renderer.rules.fence
  md.renderer.rules.fence = (tokens, idx, options, env: MarkdownEnv, ...args) => {

    const { info } = tokens[idx]
    if (info.includes(' live')) {
        const [language] = info.split(' ')
        const content = tokens[idx].content.trim()
        return `<LiveCode initialQuery="${md.utils.escapeHtml(content)}" language=${language}></LiveCode>`
    }
    return fence!(tokens, idx, options, env, ...args)
  }
}
