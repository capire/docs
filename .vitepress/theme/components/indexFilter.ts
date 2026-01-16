const { base, themeConfig: { sidebar }} = global.VITEPRESS_CONFIG.site
import { join } from 'node:path'
import { ContentData, DefaultTheme } from 'vitepress'

type ContentDataCustom = ContentData & {
  title?:string
}

type SBItem = DefaultTheme.SidebarItem

export default (pages:ContentDataCustom[], basePath:string):ContentDataCustom[] => {
  let items = findInItems(basePath, sidebar) || []
  items = items.map(item => { return { ...item, link: item.link?.replace(/\.md$/, '') }})
  const itemLinks = items.map(item => join(base, item.link||''))

  return pages
    .map(p => {
      const res = { ...p } // do not mutate original data
      res.url = res.url?.replaceAll('@external/', '')?.replace(/\/index$/, '/') || ''
      res.url = join(base, res.url)
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

function findInItems(url:string, items:SBItem[]=[]):SBItem[]|undefined {
  let res = items.find(item => item.link?.includes(url))
  if (res)  return res.items
  for (const item of items) {
    const result = findInItems(url, item.items)
    if (result)  return result
  }
}
