import { SiteData } from 'vitepress'
import AdmZip from 'adm-zip'

export async function copySiteAssets(outDir:string, site:SiteData) {
  const { themeConfig: { capire }} = site
  const version = capire.versions.java_services
  const maven = process.env.MAVEN_HOST ?? 'https://repo1.maven.org/maven2'
  const url = maven + `/com/sap/cds/cds-maven-plugin/${version}/cds-maven-plugin-${version}-site.jar`
  const headers = process.env.MAVEN_TOKEN ? { Authorization: `Bearer ${process.env.MAVEN_TOKEN}` } : {} as Record<string, string>

  console.debug(`✓ fetching CDS Maven Site from ${url}`)
  const resp = await fetch(url, { headers })
  const jar = await resp.arrayBuffer()
  const zip = new AdmZip(Buffer.from(jar))
  zip.extractAllTo(outDir, true, false)
}
