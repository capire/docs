import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { Parser } from 'htmlparser2'
import { createMarkdownRenderer } from 'vitepress'
import { install } from './md-hcql-links.ts'
import { slugify } from './slugify.ts'

const root = resolve(import.meta.dirname, '../..')
const renderer = createMarkdownRenderer(root, {
  anchor: { slugify },
  config: install,
}, '/docs/')

async function render(page, source = undefined, rewritten = false) {
  const file = resolve(root, page)
  const md = await renderer
  return md.renderAsync(source ?? await readFile(file, 'utf8'), {
    path: rewritten ? resolve(root, '../', page) : file,
    realPath: file,
    relativePath: rewritten ? page : `@external/${page}`,
    cleanUrls: true,
  })
}

function links(html) {
  const result = new Map()
  let current
  const parser = new Parser({
    onopentag(name, attributes) {
      if (name === 'a') current = { href: attributes.href, text: '' }
    },
    ontext(text) {
      if (current) current.text += text
    },
    onclosetag(name) {
      if (name === 'a' && current) {
        result.set(current.text.trim(), current.href)
        current = undefined
      }
    },
  })
  parser.end(html)
  return result
}

for (const rewritten of [false, true]) {
  test(`included agent instructions use published paths${rewritten ? ' with source-path rewrites' : ''}`, async () => {
    const result = links(await render('guides/ai/coding-agents.md', undefined, rewritten))
    for (const [label, target] of [
      ['@hcql', 'protocols/hcql'],
      ['Core QL runtime queries', 'protocols/hcql/core-ql'],
      ['@odata', 'protocols/odata'],
      ['@cap-js/sqlite', 'databases/sqlite'],
      ['@cap-js/hana', 'databases/hana'],
    ]) {
      const url = new URL(result.get(label), 'https://capire.invalid/docs/guides/ai/coding-agents')
      assert.equal(url.href, `https://capire.invalid/docs/guides/${target}`)
    }
  })

  test(`merged guide uses local reference anchors${rewritten ? ' with source-path rewrites' : ''}`, async () => {
    const result = links(await render('guides/protocols/hcql.md', undefined, rewritten))
    assert.equal(result.get('bounded expands and aggregation'), '#bounded-expands-and-aggregation')
    assert.equal(result.get('discovery examples'), '#discovery-examples')
    assert.equal(result.get('localized data examples'), '#localized-data-1')
    assert.equal(result.get('custom action examples'), '#custom-actions')
    assert.equal(result.get('startup output'), '#serving-hcql')
    assert.equal(result.get('Endpoint Configuration'), '#endpoint-configuration')
    assert.equal(result.get('REST key constraints'), '#choose-a-request-form')
    assert.equal(result.get('operation-route constraints'), '#call-actions-and-functions')
    assert.equal(result.get('trusted structured integrations'), '#trusted-internal-integrations')
    const validation = new URL(result.get('input validation'), 'https://capire.invalid/docs/guides/protocols/hcql')
    assert.equal(validation.href, 'https://capire.invalid/docs/guides/services/constraints')
  })
}

test('standalone reference pages retain cross-page links', async () => {
  const result = links(await render('guides/protocols/hcql/serving.md'))
  assert.equal(result.get('server configuration'), './config')
  const endpoint = new URL(result.get('Endpoint Configuration'), 'https://capire.invalid/docs/guides/protocols/hcql/serving')
  assert.equal(endpoint.href, 'https://capire.invalid/docs/guides/protocols/hcql/config#endpoint-configuration')
})

test('other pages retain their original navigation', async () => {
  const result = links(await render('guides/protocols/index.md', '[Setup](/guides/protocols/hcql/serving)'))
  assert.equal(result.get('Setup'), '/docs/guides/protocols/hcql/serving')
})

test('missing targets, query parameters and external URLs are not localized', async () => {
  const source = `
## Serving HCQL
<!-- @include: ./hcql/serving.md#reference -->

[Missing fragment](/guides/protocols/hcql/serving#missing)
[Not included](/guides/protocols/hcql/config#serving-hcql)
[With query](/guides/protocols/hcql/serving?view=source)
[External](https://example.com/guides/protocols/hcql/serving)
[Protocol-relative](//example.com/guides/protocols/hcql/serving)
[Existing anchor](#serving-hcql)
`
  const result = links(await render('guides/protocols/hcql.md', source))
  assert.equal(result.get('Missing fragment'), '/docs/guides/protocols/hcql/serving#missing')
  assert.equal(result.get('Not included'), '/docs/guides/protocols/hcql/config#serving-hcql')
  assert.equal(result.get('With query'), '/docs/guides/protocols/hcql/serving?view=source')
  assert.equal(result.get('External'), 'https://example.com/guides/protocols/hcql/serving')
  assert.equal(result.get('Protocol-relative'), '//example.com/guides/protocols/hcql/serving')
  assert.equal(result.get('Existing anchor'), '#serving-hcql')
})
