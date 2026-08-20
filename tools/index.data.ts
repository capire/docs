import { basename, dirname } from 'node:path'
import { createContentLoader } from 'vitepress'
import filter from '../.vitepress/theme/components/indexFilter.ts'
import { fileURLToPath } from 'node:url'

const basePath = basename(dirname(fileURLToPath(import.meta.url)))

export default createContentLoader([
  `**/${basePath}/*.md`,
  `**/${basePath}/**/index.md`,
  `**/hybrid-testing.md`,
], {
  transform(rawData) {
    return filter(rawData, `/${basePath}/`)
  }
})
