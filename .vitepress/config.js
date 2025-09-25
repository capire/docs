// The base path for the site
const base =  process.env.GH_BASE || '/docs/'

// Construct vitepress config object...
import { defineConfig } from 'vitepress'
import languages from './languages'
import path from 'node:path'
import { Menu } from './menu.js'

const menu = await Menu.from ('./menu.md')

const config = defineConfig({

  title: 'capire',
  titleTemplate: ':title | capire', // for the window title
  description: 'Documentation for SAP Cloud Application Programming Model',

  base,
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true, // TODO enable again to fix links from here to internal content

  srcExclude: [
    '**/.github/**',
    '**/README.md',
    '**/LICENSE.md',
    '**/CONTRIBUTING.md',
    '**/CODE_OF_CONDUCT.md',
    '**/menu.md',
    '**/-*.md'
  ],

  markdown: {
    languages,
    toc: {
      level: [2,3]
    },
  },

  themeConfig: {
    sidebar: menu.items,
    nav: menu.navbar,
    logo: '/cap-logo.svg',
    outline: [2,3],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/capire/docs' }
    ],
    editLink: {
      pattern: 'https://github.com/capire/docs/edit/main/:path'
    },
    footer: {
      message: `
        <a href="https://www.sap.com/about/legal/impressum.html" target="_blank">Legal Disclosure</a> |
        <a href="https://www.sap.com/corporate/en/legal/terms-of-use.html" target="_blank">Terms of Use</a> |
        <a href="${base}resources/privacy">Privacy</a> |
        <a href="${base}resources/cookies">Cookies</a>`,
      copyright: `Copyright © 2019-${new Date().getFullYear()} SAP SE`
    },
    externalLinkIcon: true,
  },

  head: [
    ['meta', { name: 'theme-color', content: '#db8b0b' }],
    ['meta', { 'http-equiv': 'Content-Security-Policy', content: "script-src 'self' https://www.capire-matomo.cloud.sap 'unsafe-inline' 'unsafe-eval'" }],
    ['link', { rel: 'icon', href: base+'favicon.ico' }],
    ['link', { rel: 'shortcut icon', href: base+'favicon.ico' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: base+'cap-logo.png' }],
    ['script', { src: base+'script.js' } ]
  ],

  vite: {
    build: {
      chunkSizeWarningLimit: 6000, // chunk for local search index dominates
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: [
            'legacy-js-api', // to avoid 'Deprecation Warning: The legacy JS API...', see https://github.com/vitejs/vite/issues/18164
            'global-builtin'
          ]
        }
      }
    }
  },
})
export default config



// -----------------------------------------------------------------------------------------------

// Add rewrites
import rewrites from './rewrites'
config.rewrites = rewrites

// Read menu from local menu.md, but only if we run standalone, not embeded as @external
// if (process.cwd() === path.dirname(__dirname)) {
//   const menu_md = path.resolve (__filename,'../../menu.md')
//   const Menu = await import('./menu')
//   const menu = await Menu.from (menu_md, rewrites)
//   config.themeConfig.sidebar = menu.items
//   config.themeConfig.nav = menu.navbar
// }

// Add custom capire info to the theme config
config.themeConfig.capire = {
  versions: {
    java_services: '4.3.1',
    java_cds4j: '4.3.0'
  },
  gotoLinks: []
}

// Add meta tag to prevent indexing of preview deployments
if (process.env.VITE_CAPIRE_PREVIEW) {
  config.head.push(['meta', { name: 'robots', content: 'noindex,nofollow' }])
}

// Add link to survey
if (process.env.NODE_ENV !== 'production') {
  // open in VS Code
  const home = path.resolve(__dirname, '..')
  let href = 'vscode://' + path.join('file', home, encodeURIComponent('${filePath}')).replaceAll(/\\/g, '/').replace('@external/', '')
  config.themeConfig.capire.gotoLinks.push({ href, key: 'o', name: 'VS Code' })
}

// Add search options
config.themeConfig.search = {
  provider: 'local',
  options: {
    miniSearch: {
      options: {
        tokenize: text => text.split( /[\n\r #%*,=/:;?[\]{}()&]+/u ), // simplified charset: removed [-_.@] and non-english chars (diacritics etc.)
        processTerm: (term, fieldName) => {
          term = term.trim().toLowerCase().replace(/^\.+/, '').replace(/\.+$/, '')
          const stopWords = ['frontmatter', '$frontmatter.synopsis', 'and', 'about', 'but', 'now', 'the', 'with', 'you']
          if (term.length < 2 || stopWords.includes(term))  return false

          if (fieldName === 'text') {
            // as we don't tokenize along . to keep expressions like `cds.requires.db`, split and add the single parts as extra terms
            const parts = term.split('.')
            if (parts.length > 1) {
              const newTerms = [term, ...parts].filter(t => t.length >= 2).filter(t => !stopWords.includes(t))
              return newTerms
            }
          }
          return term
        },
      },
      searchOptions: {
        combineWith: 'AND',
        fuzzy: false, // produces too many bad results, like 'watch' finds 'patch' or 'batch'
        // @ts-ignore
        boostDocument: (documentId, term, storedFields) => {
          // downrate matches in archives, changelogs etc.
          if (documentId.match(/\/archive|changelog|old-mtx-apis|java\/multitenancy/)) return -5

          // downrate Java matches if Node is toggled and vice versa
          const toggled = localStorage.getItem('impl-variant')
          const titles = storedFields?.titles.filter(t => !!t).map(t => t.toLowerCase())
          if (toggled === 'node' && (documentId.includes('/java/')    || titles.includes('java')))    return -1
          if (toggled === 'java' && (documentId.includes('/node.js/') || titles.includes('node.js'))) return -1

          // Uprate if term appears in titles. Add bonus for higher levels (i.e. lower index)
          const titleIndex = titles.map((t, i) => t?.includes(term) ? i : -1).find(i => i>=0) ?? -1
          if (titleIndex >=0)  return 10000 - titleIndex

          return 1
        }
      }
    }
  }
}

// Add twoslash transformer to the markdown config
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
config.markdown.codeTransformers = [
  transformerTwoslash()
]

// Add custom markdown renderers...
import * as MdAttrsPropagate from './lib/md-attrs-propagate'
import * as MdTypedModels from './lib/md-typed-models'
config.markdown.config = md => {
  MdAttrsPropagate.install(md)
  MdTypedModels.install(md)
}

// Add sitemap
const siteURL = new URL(process.env.SITE_HOSTNAME || 'http://localhost:4173/docs')
if (!siteURL.pathname.endsWith('/'))  siteURL.pathname += '/'
config.sitemap = {
  hostname: siteURL.href
}

// Add custom buildEnd hook
import * as cdsMavenSite from './lib/cds-maven-site'
import { promises as fs } from 'node:fs'
config.buildEnd = async ({ outDir, site }) => {
  const sitemapURL = new URL(siteURL.href)
  sitemapURL.pathname = path.join(sitemapURL.pathname, 'sitemap.xml')
  console.debug('✓ writing robots.txt with sitemap URL', sitemapURL.href) // eslint-disable-line no-console
  const robots = (await fs.readFile(path.resolve(__dirname, 'robots.txt'))).toString().replace('{{SITEMAP}}', sitemapURL.href)
  await fs.writeFile(path.join(outDir, 'robots.txt'), robots)

  // disabled by default to avoid online fetches during local build
  if (process.env.VITE_CAPIRE_EXTRA_ASSETS) {
    // zip assets aren't copied automatically, and `vite.assetInclude` doesn't work either
    const hanaAssetDir = 'advanced/assets'
    const hanaAsset = path.join(hanaAssetDir, 'native-hana-samples.zip')
    await fs.mkdir(path.join(outDir, hanaAssetDir), {recursive: true})
    console.debug('✓ copying HANA assets to ', path.join(outDir, hanaAsset)) // eslint-disable-line no-console

    await fs.copyFile(path.join(__dirname, '..', hanaAsset), path.join(outDir, hanaAsset))
    await cdsMavenSite.copySiteAssets(path.join(outDir, 'java/assets/cds-maven-plugin-site'), site)
  }
}
