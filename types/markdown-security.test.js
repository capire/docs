import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { build } from 'vitepress'
import { parseDocument } from 'htmlparser2'
import { install } from '../.vitepress/lib/md-api-reference.js'

const exec = promisify(execFile)

async function convert(directory, source) {
    const tsconfig = path.join(directory, 'tsconfig.json')
    await fs.writeFile(tsconfig, JSON.stringify({ files: [path.basename(source)], compilerOptions: { skipLibCheck: true } }))
    const root = path.join(directory, 'docs')
    const docs = path.join(root, 'nodejs/types')
    const configPath = new URL('typedoc.json', import.meta.url)
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
    const plugin = config.plugin.map(name => name.startsWith('.') ? fileURLToPath(new URL(name, configPath)) : name)
    const options = path.join(directory, 'typedoc.json')
    await fs.writeFile(options, JSON.stringify({ ...config, plugin, tsconfig, basePath: directory, entryPoints: [source], out: docs }))
    await exec(process.execPath, [
        fileURLToPath(new URL('./bin/typedoc', import.meta.resolve('typedoc/package.json'))),
        '--options', options,
    ])
    return { root, docs }
}

test('the inert renderer also covers search and embedded paths, but leaves guides unchanged', () => {
    const html = '<p>{{ untrustedCode() }}</p><script>untrustedCode()</script><img src="x" onerror="untrustedCode()">'
    const md = { renderer: { render: () => html } }
    install(md)
    for (const env of [
        { path: '/nodejs/types/model.md' },
        { relativePath: '@external/nodejs/types/model.md' },
        { relativePath: 'nodejs\\types\\model.md' },
    ]) {
        const safe = md.renderer.render([], {}, env)
        assert(safe.startsWith('<div v-pre>'))
        assert(!safe.includes('<script'))
        assert(!safe.includes('<img'))
    }
    assert.equal(md.renderer.render([], {}, { relativePath: 'node.js/cds-serve.md' }), html)
})

test('untrusted JSDoc stays inert when TypeDoc Markdown is built by VitePress', async t => {
    const directory = await fs.mkdtemp(path.join(process.env.TYPES_TEST_TMPDIR ?? os.tmpdir(), 'markdown-security-'))
    t.after(() => fs.rm(directory, { recursive: true, force: true }))
    await fs.symlink(fileURLToPath(new URL('../', import.meta.resolve('vue/package.json'))), path.join(directory, 'node_modules'), 'dir')
    const sentinel = path.join(directory, 'untrusted-code-executed')
    const source = path.join(directory, 'fixture.d.ts')
    await fs.writeFile(source, `/**
 * <script setup>
 * import { writeFileSync } from 'node:fs';
 * writeFileSync(${JSON.stringify(sentinel)}, 'executed');
 * </script>
 * <img src="x" onerror="untrustedBrowserCode()">
 * <iframe src="https://untrusted.example/"></iframe>
 * {{ (() => { throw new Error('UNTRUSTED_INTERPOLATION_EXECUTED') })() }}
 * [Untrusted URL](javascript:alert%281%29)
 * @example
 * <script>untrustedBrowserCode()</script>
 * @example
 * \`\`\`js
 * // <script>untrustedBrowserCode()</script> is just example text.
 * \`\`\`
 */
export interface Fixture { value: string }
`)
    const { root, docs } = await convert(directory, source)
    const secret = 'BUILD_HOST_SECRET_MUST_NOT_BE_PUBLISHED'
    await fs.writeFile(path.join(root, 'private.txt'), secret)
    await fs.writeFile(path.join(root, 'private.svg'), secret)
    // Exercise the renderer's boundary independently of TypeDoc sanitization too.
    await fs.appendFile(path.join(docs, 'Interface.Fixture.md'), `
<script setup>
import { writeFileSync } from 'node:fs';
writeFileSync(${JSON.stringify(sentinel)}, 'raw script executed');
</script>

<img src="x" onerror="untrustedBrowserCode()">
<iframe src="https://untrusted.example/"></iframe>
<div v-html="untrustedBrowserCode()">Unsafe directive</div>
<a href="java&#x73;cript:untrustedBrowserCode()">Encoded unsafe URL</a>
<a href="data:text/html,unsafe">Unsafe data URL</a>
<a href="//untrusted.example/">Protocol-relative URL</a>
![Private build file](../../private.txt)
![Private SVG asset](../../private.svg?raw)
{{ (() => { throw new Error('RAW_INTERPOLATION_EXECUTED') })() }}
`)
    await fs.mkdir(path.join(root, '.vitepress'), { recursive: true })
    const sharedConfig = fileURLToPath(new URL('../.vitepress/config.js', import.meta.url))
    await fs.writeFile(path.join(root, '.vitepress/config.mjs'), `import shared from ${JSON.stringify(sharedConfig)}; export default { markdown: shared.markdown }`)
    await build(root, { outDir: path.join(directory, 'site') })
    await assert.rejects(fs.access(sentinel), { code: 'ENOENT' })
    const htmlDirectory = path.join(directory, 'site/nodejs/types')
    const htmlFiles = (await fs.readdir(htmlDirectory)).filter(file => file.endsWith('.html'))
    assert(htmlFiles.some(file => file.includes('Fixture')))
    for (const file of htmlFiles) {
        const html = await fs.readFile(path.join(htmlDirectory, file), 'utf8')
        if (file.includes('Fixture')) assert(html.includes('UNTRUSTED_INTERPOLATION_EXECUTED'))
        function check(node) {
            for (const [attribute, value] of Object.entries(node.attribs ?? {})) {
                assert(!attribute.startsWith('on'), `Executable event handler: ${attribute}`)
                assert(!/^(?:javascript|data):/i.test(value), `Executable URL: ${value}`)
                if (attribute === 'href') assert(!value.startsWith('//'), 'Protocol-relative URL')
                if (['src', 'srcdoc'].includes(attribute)) {
                    assert(!value.includes('untrusted.example'), 'Untrusted embedded frame')
                }
            }
            assert.notEqual(node.name, 'iframe')
            assert.notEqual(node.name, 'img')
            for (const child of node.children ?? []) check(child)
        }
        check(parseDocument(html))
    }
    async function checkFiles(folder) {
        for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
            const file = path.join(folder, entry.name)
            if (entry.isDirectory()) await checkFiles(file)
            else assert(!(await fs.readFile(file)).includes(Buffer.from(secret)), 'Build-host file leaked into site output')
        }
    }
    await checkFiles(path.join(directory, 'site'))
})

for (const [label, comment] of [
    ['include', '{@include ./secret.txt}'],
    ['includeCode', '{@includeCode ./secret.txt}'],
    ['document', '@document ./secret.txt'],
    ['media', '![Secret](./secret.txt)'],
]) {
    test(`TypeDoc cannot publish host files through ${label}`, async t => {
        const directory = await fs.mkdtemp(path.join(process.env.TYPES_TEST_TMPDIR ?? os.tmpdir(), 'typedoc-file-security-'))
        t.after(() => fs.rm(directory, { recursive: true, force: true }))
        await fs.writeFile(path.join(directory, 'secret.txt'), 'BUILD_HOST_SECRET')
        const source = path.join(directory, 'fixture.d.ts')
        await fs.writeFile(source, `/** ${comment} */\nexport namespace Fixture { export interface Model {} }`)
        await assert.rejects(convert(directory, source), error => {
            assert.match(error.stderr, /Disallowed documentation directive|Copying documentation assets is disabled/)
            return true
        })
        await assert.rejects(fs.access(path.join(directory, 'docs/nodejs/types/index.md')), { code: 'ENOENT' })
    })
}

test('declaration imports cannot publish sources from outside the approved tree', async t => {
    const directory = await fs.mkdtemp(path.join(process.env.TYPES_TEST_TMPDIR ?? os.tmpdir(), 'typedoc-source-security-'))
    t.after(() => fs.rm(directory, { recursive: true, force: true }))
    const input = path.join(directory, 'input')
    await fs.mkdir(input)
    const secret = path.join(directory, 'host-secret.d.ts')
    await fs.writeFile(secret, `export declare const token: 'BUILD_HOST_SECRET';`)
    const source = path.join(input, 'fixture.d.ts')
    await fs.writeFile(source, `export type Secret = typeof import('../host-secret');`)
    await assert.rejects(convert(input, source), error => {
        assert.match(error.stderr, /Type source outside approved roots/)
        return true
    })
})
