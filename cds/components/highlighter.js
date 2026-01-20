import { createHighlighter } from 'shiki'
import languages from '../../.vitepress/languages'

const highlighter = await createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: ['javascript', 'js', 'sql', 'typescript', 'vue', ...languages],
})

export default highlighter
