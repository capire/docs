import { basename } from 'node:path'
import { createContentLoader } from 'vitepress'
import filter from '../.vitepress/theme/components/indexFilter.ts'

export default createContentLoader([`**/java/*.md`, `**/java/**/index.md`], {
  transform(rawData) {
    return filter(rawData, `/java/`)
  }
})
