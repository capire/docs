import { MarkdownEnv, MarkdownRenderer } from 'vitepress'
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

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
    const mdDir = dirname(env.realPath ?? env.path)
    const filePath = join(mdDir, src.replace('?raw', ''))
    const content = readFileSync(filePath, 'utf-8')
    const sanitized = content.replace(/<\?xml[\s\S]*?\?>/, '') // remove XML declaration
      .replace(/<!DOCTYPE[\s\S]*?>/, '') // remove DOCTYPE
      .replace(/<--([\s\S]*?)-->/g, '') // remove comments
    return `<span class="diagram">${sanitized}</span>`
  }
}
