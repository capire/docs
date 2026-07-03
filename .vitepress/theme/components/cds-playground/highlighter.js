import { createHighlighter } from 'shiki'
import languages from '../../../languages'

const highlighter = await createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: ['javascript', 'js', 'sql', 'typescript', 'vue', ...languages],
    langAlias: Object.fromEntries(languages.flatMap(l => {
        if (!l || typeof l !== 'object' || !Array.isArray(l.aliases) || !l.name) return []
        return l.aliases.map(alias => [alias, l.name])
    }))
})

export default highlighter
