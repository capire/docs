import { defineLoader } from 'vitepress'

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
    if (defaultValue && type?.startsWith('List')) { // split list default values into multiple lines for better readability
      defaultValue = defaultValue.replace(/, ?/g, ',<br>')
    }
    return {
      name: name.replaceAll(/<(index|key)>/g, '<i>&lt;$1&gt;</i>'),  // decorate special <key> and <index> names
      type: type?.replaceAll(/<(.*)>/g, ''), // remove generics for display
      typeFull: type,
      description: md2Html(doc),
      defaultValue: defaultValue ? `<code class="no-bg">${defaultValue}</code>` : '',
      header,
      // @ts-ignore
      anchor: name.replaceAll('.', '-')
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
  header: string,
  type: string,
  description: string,
  defaultValue: string,
  typeFull: string,
  anchor: string
}
