#!/usr/bin/env node

import { parseDocument } from 'htmlparser2'
import { spawn } from 'child_process'
import { readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { parseArgs } from 'node:util'

const { Bright,Dim,Reset, foreground:{
    Red, Yellow, Green
}} = {

    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",

    foreground: {
        Black: "\x1b[30m",
        Red: "\x1b[31m",
        Green: "\x1b[32m",
        Yellow: "\x1b[33m",
        Blue: "\x1b[34m",
        Magenta: "\x1b[35m",
        Cyan: "\x1b[36m",
        White: "\x1b[37m",
    },
    background: {
        Black: "\x1b[40m",
        Red: "\x1b[41m",
        Green: "\x1b[42m",
        Yellow: "\x1b[43m",
        Blue: "\x1b[44m",
        Magenta: "\x1b[45m",
        Cyan: "\x1b[46m",
        White: "\x1b[47m",
    }
}

const urlExcludesBase = [
    /\/java\/assets\/cds-maven-plugin-site\//,
    /\/java\/custom-logic\//,
    /\/releases\/changelog\//,
    /\/releases\/latest/,
    /\/releases\/current/,
    /\/tools\/lint/,
]

// extended set of excludes because public content refers to internal content in some places
const urlExcludesPublicRepo = [
    ...urlExcludesBase,
    /\/guides\/security\//,
    /\/releases/,
    /\/resources/,
    /cds\/compiler\/messages/,
    /mcp/
]

const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
        x: { type: 'boolean', short: 'x', default: false },
        public: { type: 'boolean', default: false },
    },
    allowPositionals: true,
})

const urlExcludes = values.public ? urlExcludesPublicRepo : urlExcludesBase

let [base] = positionals

// Build a set of URL paths that are directory-backed (have index.html)
// so we know when to add trailing slash for correct relative URL resolution.
const distDir = '.vitepress/dist'
const dirPages = new Set()
function scanDirs(dir, prefix) {
    try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                const sub = join(dir, entry.name)
                const subPrefix = prefix + entry.name + '/'
                if (existsSync(join(sub, 'index.html'))) dirPages.add(subPrefix)
                scanDirs(sub, subPrefix)
            }
        }
    } catch {}
}
scanDirs(distDir, '/')

let server
if (!base) {
    // Auto-start a vitepress preview server
    const port = 4173 + Math.floor(Math.random() * 1000)
    base = `http://localhost:${port}/docs/`
    server = spawn('npx', ['vitepress', 'preview', '.', '--port', port], {
        stdio: 'ignore',
        detached: true,
    })
    // Wait for server to be ready
    for (let i = 0; i < 30; i++) {
        try {
            const res = await fetch(base)
            if (res.ok) break
        } catch {}
        await new Promise(r => setTimeout(r, 500))
    }
}

try {
    if (values.x) { console.log (`Checking external links on ${base}...`); await check ({ excludeInternalLinks:true }) }
    else { console.log (`Checking internal links on ${base}...`); await check ({ excludeExternalLinks:true }) }
} finally {
    if (server) {
        process.kill(-server.pid)
        await new Promise(r => server.on('close', r))
    }
}

async function check (options={}) {

    let N=0, all=new Set, broken={}, errors=[], pages={}
    const visited = new Set()
    const failedUrls = new Set()
    const queue = [base]
    const incomingLinks = {} // url -> [{ from: page, original: href }]

    function record (link, reason, p) {
        ++N
        if (broken.page !== p)  errors.push (broken = {page:p,links:[]})
        broken.links.push ({ link, reason, toString() { return reason +': '+ link } })
    }

    // Phase 1: Crawl all reachable internal pages
    while (queue.length > 0) {
        const batch = queue.splice(0, 10)
        await Promise.all(batch.map(crawlPage))
    }

    async function crawlPage (url) {
        let cleanUrl = url.split('#')[0]
        // Normalize /index URLs to directory form (e.g. /releases/index -> /releases/)
        if (cleanUrl.endsWith('/index')) cleanUrl = cleanUrl.slice(0, -5)
        if (visited.has(cleanUrl)) return
        visited.add(cleanUrl)
        // Also mark the counterpart (with/without trailing slash) as visited
        // to avoid crawling the same page twice with different URL resolution
        if (cleanUrl.endsWith('/')) visited.add(cleanUrl.slice(0,-1))
        else visited.add(cleanUrl + '/')

        const path = cleanUrl.replace(base,'/')
        if (path.startsWith('/assets')) return
        if (urlExcludes.find(l => l.test(path))) return

        let html, finalUrl, resolveBase
        try {
            const res = await fetch(cleanUrl)
            if (!res.ok) {
                failedUrls.add(cleanUrl)
                return
            }
            const ct = res.headers.get('content-type') || ''
            if (!ct.includes('text/html')) return
            finalUrl = res.url  // after redirects
            // Use filesystem knowledge to determine if this page is directory-backed.
            // Directory pages (served from dir/index.html) need trailing slash for
            // correct relative URL resolution (e.g. ./foo resolves within the directory).
            const urlPath = path.endsWith('/') ? path : path + '/'
            resolveBase = dirPages.has(urlPath) ? cleanUrl.replace(/\/?$/, '/') : finalUrl
            html = await res.text()
        } catch(e) {
            failedUrls.add(cleanUrl)
            console.error(`Error fetching ${cleanUrl}: ${e.message}`)
            return
        }

        const doc = parseDocument(html)
        const p = {
            url: cleanUrl, path,
            doc,
            anchors: {},
            hashed: [],
        }
        pages[path] = p

        console.log (Dim+path, Reset)

        for (let hash of fetchLocalIn(doc)) p.hashed.push ({ hash })

        walkLinks(doc, (href) => {
            if (!href || href.startsWith('mailto:') || href.startsWith('javascript:') || href.startsWith('tel:')) return
            let resolved
            try { resolved = new URL(href, resolveBase).href } catch { return }

            all.add(resolved)
            const [resolvedBase] = resolved.split('#')
            const [,hash] = href.split('#')
            const isInternal = resolvedBase.startsWith(base)

            if (hash && isInternal) {
                p.hashed.push ({ url: resolvedBase.replace(base,'/'), hash })
            }

            if (isInternal && !options.excludeInternalLinks) {
                if (!incomingLinks[resolvedBase]) incomingLinks[resolvedBase] = []
                incomingLinks[resolvedBase].push({ from: p, original: href })
                if (!visited.has(resolvedBase)) {
                    queue.push(resolvedBase)
                }
            }
        })
    }

    // Phase 2: Check for broken internal links (pages that failed to load)
    if (!options.excludeInternalLinks) {
        for (const [url, links] of Object.entries(incomingLinks)) {
            if (failedUrls.has(url)) {
                const linkRel = url.replace(base,'/')
                if (urlExcludes.find(l => l.test(linkRel))) continue
                for (const { from, original } of links) {
                    record(original, 'Not found', from)
                }
            }
        }
    }

    // Phase 3: Check external links (if -x mode)
    if (!options.excludeExternalLinks) {
        const externalLinks = new Map()
        for (const p of Object.values(pages)) {
            walkLinks(p.doc, href => {
                if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:') || href.startsWith('tel:')) return
                let resolved
                try { resolved = new URL(href, p.url).href } catch { return }
                if (!resolved.startsWith(base)) {
                    if (!externalLinks.has(resolved)) externalLinks.set(resolved, [])
                    externalLinks.get(resolved).push({ from: p, original: href })
                }
            })
        }

        console.log(`\nChecking ${externalLinks.size} external links...`)
        const entries = [...externalLinks.entries()]
        for (let i = 0; i < entries.length; i += 10) {
            await Promise.all(entries.slice(i, i + 10).map(async ([url, links]) => {
                try {
                    const res = await fetch(url, {
                        method: 'HEAD',
                        signal: AbortSignal.timeout(10000),
                        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkChecker)' },
                        redirect: 'follow',
                    })
                    if (!res.ok) {
                        for (const { from, original } of links) record(original, `HTTP ${res.status}`, from)
                    }
                } catch (e) {
                    for (const { from, original } of links) record(original, e.message || 'Connection error', from)
                }
            }))
        }
    }

    // Phase 4: Check hash/anchor links across pages
    for (let p of Object.values(pages)) {
        for (let {url,hash} of p.hashed) try {
            if (url) {
                if (urlExcludes.find(l => l.test(url)))  continue
                const page = pages[url] || pages[url.replace(/\/$/, '')]
                if (!page)  continue
                checkLocal (page.doc,hash) || record (url+' #'+hash, 'Unresolved hash link', p)
            }
            else if (hash) {
                if (urlExcludes.find(l => l.test(p.path))) continue
                checkLocal (p.doc,hash) || record ('#'+hash, 'Unresolved local link', p)
            }
        } catch(e) { record(url+' #'+hash, 'Unresolved hash link', p) }
    }

    // Phase 5: Report results
    console.log (`\n-----------------------------------------------------------------`)
    if (Object.keys(pages).length === 0) {
        console.log (Bright+Red+`Could not fetch any pages from ${base}\n`, Reset)
        process.exitCode = 1
    } else if (broken.links) {
        console.log (Bright+Red+`Found ${N} broken link(s) to internal targets in ${errors.length} source(s):`, Reset)
        for (let broken of errors) {
            console.log ('in:', broken.page.path)
            for (let each of broken.links)  console.log (Bright+Red+ each)
            console.log (Reset)
        }
        if (N > 0) process.exitCode = 1
    } else {
        console.log (Bright+Green+`It's all fine in ${all.size} links, no broken links found\n`, Reset)
    }
}

function checkLocal (doc, id) {
    return doc._anchors?.[id] ?? ((doc._anchors ??= {})[id] = findById(doc, id))
}

function findById (node, id) {
    for (let each of (node.children || [])) {
        if (each.attribs?.id === id)  return each
        if (each.children) {
            const found = findById (each, id)
            if (found)  return found
        }
    }
}

function fetchLocalIn (node, all=new Set) {
    for (let each of (node.children || [])) {
        if (each.name === 'a') {
            const href = each.attribs?.href
            if (href && href[0]==='#')  all.add (href.slice(1))
        }
        if (each.children)  fetchLocalIn (each,all)
    }
    return all
}

function walkLinks (node, callback) {
    for (let each of (node.children || [])) {
        if (each.name === 'a' && each.attribs?.href) {
            callback(each.attribs.href)
        }
        if (each.children)  walkLinks(each, callback)
    }
}
