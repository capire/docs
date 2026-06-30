import { defineLoader } from 'vitepress'

//@ts-expect-error
const { themeConfig: { capire }} = global.VITEPRESS_CONFIG.site
const version = capire.versions.java_services

export default defineLoader({
  async load() {
    const props = (await import('./properties.json')).default.properties as unknown as JavaSdkProperties[]
    const properties = massageProperties(props)
    return { properties, version }
  }
})

function massageProperties(properties: JavaSdkProperties[]): OurProperties[] {
  return properties.map(({ name, header, type, default:defaultValue, doc }) => {
    const isListValue = type?.startsWith('List')
    let defaultValueHTML = defaultValue ? `<code class="no-bg">${defaultValue}</code>` : ''
    defaultValueHTML = isListValue ? defaultValueHTML.replace(/, ?/g, ',<br>') : defaultValueHTML
    return {
      name,
      nameHTML: name
        .replaceAll(/<(index|key)>/g, '<i>&lt;$1&gt;</i>') // decorate special <key> and <index> names
        .replaceAll('.', '.<wbr>'),  // wrap long property names on dots
      type: type?.replaceAll(/<(.*)>/g, ''), // remove generics for display
      typeFull: type,
      description: md2Html(doc),
      defaultValue: isListValue ? (defaultValue??'').split(',').map(item => item.trim()) : defaultValue,
      defaultValueHTML,
      header,
      anchor: name.replaceAll('.', '-').replaceAll(/[<>]/g, '').toLowerCase()
    }
  })
}

function md2Html(string:string) {
  return string
    // @ts-ignore
    .replaceAll(/`(.*?)`/g, '<code>$1</code>')
    .replaceAll(/(https?:\/\/.*?)(\s)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>$2')
}

type JavaSdkProperties = {
  name: string,
  header: string,
  type: string,
  default: string,
  doc: string
}

type OurProperties = {
  name: string,
  nameHTML: string,
  header: string,
  type: string,
  description: string,
  defaultValue: string | string[],
  defaultValueHTML: string,
  typeFull: string,
  anchor: string
}
