#!/usr/bin/env node

import AdmZip from 'adm-zip'
import { join } from 'path'
import { readFile, writeFile } from 'node:fs/promises'

const props = await fetchProperties()
await writeFile(join(import.meta.dirname, '../../java/developing-applications/properties.json'), JSON.stringify(props, null, 2))

console.error(`wrote ${props.length} properties to`, join(import.meta.dirname, '../../java/developing-applications/properties.json'))

async function fetchProperties() {
  const config = (await readFile(join(import.meta.dirname, '../../.vitepress/config.js'))).toString()
  const version = config.match(/java_services\s*:\s*['"]([^'"]+)['"]/)[1]

  const maven = process.env.MAVEN_HOST ?? 'https://repo1.maven.org/maven2'
  const url = maven + `/com/sap/cds/cds-services-api/${version}/cds-services-api-${version}-sources.jar`

  console.error(`fetching properties from`, url)
  const headers = process.env.MAVEN_TOKEN ? { Authorization: `Bearer ${process.env.MAVEN_TOKEN}` } : {}
  const resp = await fetch(url, { headers })
  const jar = await resp.arrayBuffer()

  return new Promise((res, rej) => {
    try {
      const zip = new AdmZip(Buffer.from(jar))
      zip.readAsTextAsync('properties.json', (data, err) => {
        if (err)  return rej(err)
        res(JSON.parse(data))
      })
    } catch (err) {
      return rej(new Error(`Could not load ${url}, response: ${Buffer.from(jar)}`, {cause: err}))
      // return res([])
    }
  })
}