import { Converter } from 'typedoc'
import { MarkdownRendererEvent } from 'typedoc-plugin-markdown'
import { realpathSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Comments must not instruct the converter to read or publish build-host files.
export function load(app) {
    app.converter.on(Converter.EVENT_BEGIN, context => {
        const roots = [
            realpathSync(app.options.getValue('basePath')),
            realpathSync(fileURLToPath(new URL('./lib/', import.meta.resolve('typescript/package.json')))),
        ]
        // The source packages may reference installed declaration dependencies
        // and TypeScript's standard library, but not arbitrary build-host files.
        let directory = path.dirname(app.options.getValue('tsconfig'))
        while (true) {
            const modules = path.join(directory, 'node_modules')
            if (existsSync(modules)) roots.push(realpathSync(modules))
            const parent = path.dirname(directory)
            if (parent === directory) break
            directory = parent
        }
        for (const program of context.programs) {
            for (const source of program.getSourceFiles()) {
                const file = realpathSync(source.fileName)
                if (!roots.some(root => {
                    const relative = path.relative(root, file)
                    return !relative.startsWith('..') && !path.isAbsolute(relative)
                })) throw new Error(`Type source outside approved roots: ${file}`)
            }
        }
    }, 1000)
    function rejectIncludes(_context, reflection) {
        const comment = reflection.comment
        const parts = [...(comment?.summary ?? []), ...(reflection.content ?? [])]
        for (const tag of comment?.blockTags ?? []) {
            if (tag.tag === '@document') throw new Error('Disallowed documentation directive: @document')
            parts.push(...tag.content)
        }
        for (const part of parts) {
            if (part.kind === 'inline-tag' && ['@include', '@includeCode'].includes(part.tag)) {
                throw new Error(`Disallowed documentation directive: ${part.tag}`)
            }
        }
    }
    for (const event of [
        Converter.EVENT_CREATE_PROJECT, Converter.EVENT_CREATE_DOCUMENT,
        Converter.EVENT_CREATE_DECLARATION, Converter.EVENT_CREATE_SIGNATURE,
        Converter.EVENT_CREATE_PARAMETER, Converter.EVENT_CREATE_TYPE_PARAMETER,
    ]) {
        // Run before the built-in include handlers (default priority 0).
        app.converter.on(event, rejectIncludes, 1000)
    }
    function rejectMedia(project) {
        if (project.files.getMediaPaths().length) {
            throw new Error('Copying documentation assets is disabled')
        }
    }
    app.converter.on(Converter.EVENT_END, context => rejectMedia(context.project), 1000)
    app.renderer.on(MarkdownRendererEvent.BEGIN, event => rejectMedia(event.project), 1000)
}
