import { join } from 'node:path'
import { ContentData, DefaultTheme, SiteConfig} from 'vitepress'
type SBItem = DefaultTheme.SidebarItem

// @ts-ignore
const site = (global.VITEPRESS_CONFIG as SiteConfig<DefaultTheme.Config>).site
const sidebar = site.themeConfig.sidebar! as SBItem[]

type ContentDataCustom = ContentData & {
  title?:string
}

export default (pages:ContentDataCustom[], basePath:string):ContentDataCustom[] => {
  let items = findInItems(basePath, sidebar) || []
  items = items.map(item => { return { ...item, link: item.link?.replace(/\.md$/, '') }})
  const itemLinks = items.map(item => join(site.base, item.link||''))

  return pages
    .map(p => {
      const res = { ...p } // do not mutate original data
      res.url = res.url?.replaceAll('@external/', '')?.replace(/\/index$/, '/') || ''
      res.url = join(site.base, res.url)
      return res
    })
    .filter(p => {
      const item = items.find(item => item.link && p.url.endsWith(item.link.replace(/#.*/, '')))
      if (item)  p.title = item.text
      return !!item
    })
    .filter(p => !p.url.endsWith(basePath))
    .sort((p1, p2) => itemLinks.indexOf(p1.url) - itemLinks.indexOf(p2.url))
    .map(p => ({
      url: p.url,
      title: p.title,
      frontmatter: {
        synopsis: p.frontmatter.synopsis
      },
      // this data is inlined in each index page, so omit unnecessary data
      src:undefined, html:undefined, excerpt:undefined
    }))
}

import {inspect} from 'node:util'
inspect.defaultOptions.depth = 111

function findInItems(url:string, items:SBItem[]=[], all:SBItem[]=[]) : SBItem[] {
  for (const item of items) {
    if (item.link?.includes(url)) {
      // console.log(url, item.link)
      all.push(item)
    }
    if (item.items) {
      // console.log('>>', item.link || item.text)
      findInItems(url, item.items, all)
    }

  }
  return all
}
