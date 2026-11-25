import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { readTarball, verifyIntegrity, extractPackage, verifyPackage, packageEntryPoint } from './package-security.js'

const integrity = bytes => 'sha512-' + createHash('sha512').update(bytes).digest('base64')

async function temporary(t) {
    const directory = await fs.mkdtemp(path.join(process.env.TYPES_TEST_TMPDIR ?? os.tmpdir(), 'package-security-'))
    t.after(() => fs.rm(directory, { recursive: true, force: true }))
    return directory
}

// Minimal tar fixtures let us include paths that ordinary archivers refuse to write.
function archive(entries) {
    const blocks = entries.flatMap(({ name, type = '0', link = '', content = '' }) => {
        const body = Buffer.from(content)
        const header = Buffer.alloc(512)
        header.write(name, 0, 100)
        header.write('0000644\0', 100)
        header.write('0000000\0', 108)
        header.write('0000000\0', 116)
        header.write(body.length.toString(8).padStart(11, '0') + '\0', 124)
        header.write('00000000000\0', 136)
        header.fill(32, 148, 156)
        header.write(type, 156)
        header.write(link, 157, 100)
        header.write('ustar\0', 257)
        header.write('00', 263)
        const checksum = header.reduce((sum, byte) => sum + byte, 0)
        header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148)
        return [header, body, Buffer.alloc((512 - body.length % 512) % 512)]
    })
    return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]))
}

test('only bytes matching the committed SHA-512 integrity are accepted', () => {
    const bytes = Buffer.from('reviewed package')
    verifyIntegrity(bytes, integrity(bytes))
    assert.throws(() => verifyIntegrity(Buffer.from('tampered package'), integrity(bytes)), /integrity mismatch/)
    assert.throws(() => verifyIntegrity(bytes, 'sha1-not-a-trusted-hash'), /SHA-512/)
})

test('oversized downloads are refused', async () => {
    const chunk = Buffer.alloc(1024 * 1024)
    async function* body() {
        for (let i = 0; i < 65; i++) yield chunk
    }
    await assert.rejects(readTarball({ body: body() }), /exceeds 64 MiB/)
})

test('CI cannot opt into unpinned local checkouts', async () => {
    await assert.rejects(promisify(execFile)(process.execPath, [
        fileURLToPath(new URL('update-types.js', import.meta.url)), '--local',
    ], { env: { ...process.env, CI: 'true' } }), error => {
        assert.match(error.stderr, /Local package sources are not permitted in CI/)
        return true
    })
})

test('extracts regular package files and verifies package identity', async t => {
    const directory = await temporary(t)
    const file = path.join(directory, 'package.tgz')
    await fs.writeFile(file, archive([
        { name: 'package/package.json', content: JSON.stringify({ name: 'fixture', version: '1.0.0' }) },
        { name: 'package/index.d.ts', content: 'export interface Model {}' },
    ]))
    await extractPackage(file, directory)
    await verifyPackage(path.join(directory, 'package'), 'fixture', '1.0.0')
    await assert.rejects(verifyPackage(path.join(directory, 'package'), 'fixture', '2.0.0'), /identity/)
    assert.equal(await fs.readFile(path.join(directory, 'package/index.d.ts'), 'utf8'), 'export interface Model {}')
})

for (const entry of [
    { name: 'package/../outside.txt' },
    { name: '/outside.txt' },
    { name: 'package\\..\\outside.txt' },
    { name: 'outside.txt' },
    { name: 'package/link', type: '2', link: '../outside.txt' },
    { name: 'package/link', type: '1', link: '../outside.txt' },
]) {
    test(`rejects unsafe archive entry ${entry.name} (type ${entry.type ?? '0'})`, async t => {
        const directory = await temporary(t)
        const file = path.join(directory, 'package.tgz')
        await fs.writeFile(file, archive([entry]))
        await assert.rejects(extractPackage(file, directory))
        await assert.rejects(fs.access(path.join(directory, 'outside.txt')), { code: 'ENOENT' })
        await assert.rejects(fs.access(path.join(directory, 'package/link')), { code: 'ENOENT' })
    })
}

test('typings cannot refer to files outside the package', () => {
    const directory = path.resolve('fixture-package')
    assert.equal(packageEntryPoint(directory, { typings: 'dist/index.d.ts' }), path.join(directory, 'dist/index.d.ts'))
    assert.throws(() => packageEntryPoint(directory, { typings: '../outside.d.ts' }), /inside/)
    assert.throws(() => packageEntryPoint(directory, { typings: '/outside.d.ts' }), /inside/)
})
