import sanitizeHtml from 'sanitize-html'

// Downloaded API documentation is data, not a source of Vue components or code.
export function install(md) {
    const render = md.renderer.render.bind(md.renderer)
    md.renderer.render = (tokens, options, env) => {
        const source = (env.relativePath ?? env.path ?? '').replaceAll('\\', '/')
        if (!/(?:^|\/)nodejs\/types\//.test(source)) return render(tokens, options, env)
        const policy = {
            allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, '*': ['id', 'class'] },
            allowedSchemes: ['http', 'https', 'mailto'],
            allowProtocolRelative: false,
        }
        // Sanitize before html_block rendering, which VitePress uses to extract
        // <script setup> and other SFC blocks into executable build inputs.
        function sanitizeTokens(items) {
            for (const token of items) {
                // Images can cause build-time asset imports before final HTML
                // sanitization, including files outside the documentation tree.
                if (token.type === 'image') {
                    token.type = 'text'
                    token.tag = ''
                    token.attrs = null
                    token.children = null
                }
                if (['html_block', 'html_inline'].includes(token.type)) {
                    token.content = sanitizeHtml(token.content, policy)
                }
                if (token.children) sanitizeTokens(token.children)
            }
        }
        sanitizeTokens(tokens)
        const safe = sanitizeHtml(render(tokens, options, env), policy)
        return `<div v-pre>\n${safe}\n</div>\n`
    }
}
