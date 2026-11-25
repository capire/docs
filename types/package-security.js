import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, timingSafeEqual } from 'node:crypto'
import { x } from 'tar'

export async function readTarball(response) {
    const chunks = []
    let size = 0
    for await (const chunk of response.body) {
        size += chunk.length
        if (size > 64 * 1024 * 1024) throw new Error('Package archive exceeds 64 MiB')
        chunks.push(Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
}

export function verifyIntegrity(bytes, integrity) {
    if (!/^sha512-[A-Za-z0-9+/]{86}==$/.test(integrity)) {
        throw new Error('Expected a committed SHA-512 package integrity hash')
    }
    const expected = Buffer.from(integrity.slice('sha512-'.length), 'base64')
    const actual = createHash('sha512').update(bytes).digest()
    if (!timingSafeEqual(actual, expected)) throw new Error('Package integrity mismatch')
}

export async function extractPackage(archive, destination) {
    let rejected
    let size = 0
    await x({
        file: archive,
        cwd: destination,
        strict: true,
        preservePaths: false,
        filter: (name, entry) => {
            const parts = name.split('/')
            size += entry.size
            if (parts[0] !== 'package' || parts.includes('..') || name.includes('\\')
                || !['File', 'Directory'].includes(entry.type)
                || size > 512 * 1024 * 1024) {
                rejected = new Error(`Unsafe package archive entry: ${name}`)
                return false
            }
            return true
        },
    })
    if (rejected) throw rejected
}

export async function verifyPackage(directory, name, version) {
    const metadata = JSON.parse(await fs.readFile(path.join(directory, 'package.json'), 'utf8'))
    if (metadata.name !== name || metadata.version !== version) {
        throw new Error(`Unexpected package identity: ${metadata.name}@${metadata.version}`)
    }
}

export function packageEntryPoint(directory, metadata) {
    const entry = path.resolve(directory, metadata.types ?? metadata.typings ?? 'index.d.ts')
    const relative = path.relative(directory, entry)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error('Package typings must stay inside the extracted package')
    }
    return entry
}
