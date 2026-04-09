import { basename } from 'node:path'
import { createContentLoader } from 'vitepress'
import filter from '../../.vitepress/theme/components/indexFilter.ts'

const basePath = basename(__dirname)

export default createContentLoader(`**/${basePath}/*.md`, {
  transform(rawData) {
    return filter(rawData, `/${basePath}/`)
  }
})
