// This script ingests all files in the examples/ folder
// and makes them available to the Playground template.

import { readFileSync } from 'fs'
import { relative } from 'path'

let data: Record<string, string> = {};

export default {
  // Watch files in <rule>/<type>/
  watch: ['./**/*.cds', './**/*.csv', './**/*.json', './**/*.js'],
  load(watchedFiles: string[]) {
    watchedFiles.forEach((file) => {
      if (__filename.includes(file) || file.match(/@cds-models/)) return
      const key = relative(__dirname, file)
        // Watch globs ignore 'node_modules', so in examples, we call them 'node-modules' to avoid being ignored.
        // Once ingested, we need to change it back to 'node_modules' so they can be used by the Playground template.
        .replace('node-modules', 'node_modules')

      data[key] = readFileSync(file, 'utf-8')
    })
    return data;
  }
}
