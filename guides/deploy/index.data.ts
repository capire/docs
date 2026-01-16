import { basename } from 'node:path'
import { createContentLoader } from 'vitepress'
import filter from '../../.vitepress/theme/components/indexFilter.ts'

export default createContentLoader([`**/guides/deploy/*.md`, `**/guides/multitenancy/*.md`], {
  transform(rawData) {
    return filter(rawData, `/guides/`)
  }
})
