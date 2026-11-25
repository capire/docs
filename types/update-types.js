import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readTarball, verifyIntegrity, extractPackage, verifyPackage, packageEntryPoint } from './package-security.js'

const exec = promisify(execFile)
const TYPES = fileURLToPath(new URL('.', import.meta.url))
const SOURCES = path.join(TYPES, 'sources')
const local = process.argv.includes('--local')
const packages = JSON.parse(await fs.readFile(new URL('packages.json', import.meta.url), 'utf8'))
if (local && process.env.CI) throw new Error('Local package sources are not permitted in CI')

async function fetchPackage(name, directory) {
    const destination = path.join(SOURCES, directory, 'package')
    await fs.mkdir(path.dirname(destination), { recursive: true })

    if (local) {
        const source = path.join(os.homedir(), 'git', directory)
        process.stdout.write(`Using ${name} from ${source}\n`)
        await fs.rm(destination, { recursive: true, force: true })
        await fs.cp(source, destination, {
            recursive: true,
            filter: file => !['.git', 'node_modules'].includes(path.basename(file)),
        })
        return destination
    }

    const metadata = packages[name]
    process.stdout.write(`Downloading ${name}@${metadata.version}\n`)
    const tarball = await fetch(metadata.tarball)
    if (!tarball.ok) throw new Error(`Failed to download ${name}: ${tarball.status}`)
    const bytes = await readTarball(tarball)
    verifyIntegrity(bytes, metadata.integrity)

    const temporary = await fs.mkdtemp(path.join(SOURCES, `${directory}-`))
    try {
        const archive = path.join(temporary, 'package.tgz')
        await fs.writeFile(archive, bytes)
        await extractPackage(archive, temporary)
        await verifyPackage(path.join(temporary, 'package'), name, metadata.version)
        await fs.rm(destination, { recursive: true, force: true })
        await fs.rename(path.join(temporary, 'package'), destination)
    } finally {
        await fs.rm(temporary, { recursive: true, force: true })
    }
    return destination
}

const cdsTypes = await fetchPackage('@cap-js/cds-types', 'cds-types')
await fetchPackage('@sap/cds-dk', 'cds-dk')

// Use the package's published entry point, not a copied or rewritten declaration.
const metadata = JSON.parse(await fs.readFile(path.join(cdsTypes, 'package.json'), 'utf8'))
const configPath = path.join(TYPES, 'typedoc.json')
const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
const entryPoints = [
    packageEntryPoint(cdsTypes, metadata),
    ...config.entryPoints.map(entry => path.resolve(TYPES, entry)),
]

// TypeDoc reads JavaScript/JSDoc directly; no intermediate declarations are needed.
await fs.rm(path.resolve(TYPES, config.out), { recursive: true, force: true })
try {
    const { stdout, stderr } = await exec(process.execPath, [
        fileURLToPath(new URL('./bin/typedoc', import.meta.resolve('typedoc/package.json'))),
        '--options', configPath,
        '--entryPoints', ...entryPoints,
    ], { maxBuffer: 10 * 1024 * 1024 })
    if (stdout) process.stdout.write(stdout)
    if (stderr) process.stderr.write(stderr)
} catch (error) {
    if (error.stdout) process.stdout.write(error.stdout)
    if (error.stderr) process.stderr.write(error.stderr)
    process.exit(error.code ?? 1)
}
