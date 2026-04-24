<template>

  <VDropdown v-if="popperVisible" :ariaId="`aria-`+cfgKey" theme="cfgPopper" :distance="6" :triggers="['click', 'hover']" :delay="300" :popperTriggers="['hover']"
  >
  <!-- :hideTriggers="[]" :shown="true" -->

    <a class="cfg vp-doc"><span class="cfg">{{ label }}</span></a>

    <template #popper>
      <div class="vp-code-group vp-doc" v-if="java">
        <CodeGroup :groups="[
          { id: 'java-appyml',  label: 'application.yml', lang: 'yml',        group, code: javaAppyml },
          { id: 'java-sysprop', label: 'System property', lang: 'properties', group, code: javaEnvStr, transient: true }
        ]" />
      </div>
      <div class="vp-code-group vp-doc" v-else>
        <CodeGroup :groups="[
          { id: 'pkg-rc',   label: 'package.json',   lang: 'json',       group, code: pkgStr },
          // { id: 'pkg-priv', label: '~/.cdsrc.json',  lang: 'json',       group, code: rcJsonStr, private: true },
          // { id: 'pkg',      label: '.cdsrc.json',    lang: 'json',       group, code: rcJsonStr },
          { id: 'js',  label: '.cdsrc.js',           lang: 'js',         group, code: rcJsStr },
          { id: 'yml', label: '.cdsrc.yaml',         lang: 'yml',        group, code: rcYmlStr },
          { id: 'env', label: '.env file',           lang: 'properties', group, code: propStr },
          // { id: 'shl', label: 'Linux/macOS Shells',  lang: 'sh',         group, code: 'export '+envStr, transient: true },
          // { id: 'shp', label: 'Powershell',          lang: 'powershell', group, code: '$Env:'+envStr, transient: true },
          // { id: 'shw', label: 'Cmd Shell',           lang: 'cmd',        group, code: 'set '+envStr, transient: true }
        ]" />
      </div>
    </template>
  </VDropdown>
  <span class="cfg" v-else>{{ label }}</span> <!-- intermediate fallback -->
</template>

<script setup lang="ts">
  import { defineComponent, h, onMounted, ref, useSlots } from 'vue'
  import FloatingVue from 'floating-vue'
  import yaml from 'yaml'

  const { value, java, keyOnly, filesOnly, showPrivate, section, label:labelProp, keyDelim } = defineProps<{
    java?: boolean,
    keyOnly?: boolean,
    filesOnly?: boolean,
    showPrivate?: boolean,
    section?: string,
    label?: string,
    value?: string,
    keyDelim?: string
  }>()

  // sub component that renders code blocks similar to the markdown `::: code-block` syntax
  const CodeGroup = defineComponent(
    ({ groups }) => () => [
      h('div', { class: 'tabs' }, groups
        .filter((b) => filesOnly ? !b.transient : true)
        .filter((b) => showPrivate ? true : !b.private)
        .flatMap((b, idx) => [
          h('input', { type: 'radio', name: 'group', id: `${b.group}-${b.id}`, checked: idx === 0 }),
          h('label', { for: `${b.group}-${b.id}` }, b.label)
      ])),
      h('div', { class: 'blocks' }, groups
        .filter((b) => filesOnly ? !b.transient : true)
        .filter((b) => showPrivate ? true : !b.private)
        .flatMap((b, idx) => [
          h('div', { class: ['language-'+b.lang, idx === 0 ? 'active': ''] }, [
            h('button', { title: 'Copy Code', class: 'copy' }),
            h('span', { class: 'lang' }, b.lang),
            h('pre', { class: 'shiki' },
              h('code',
                h('span', { class: 'line' },
                  h('span', b.code)
                )
              )
            )
          ])
        ]
      ))
    ], {
      props: {
        groups: { type: Array<{id:string, group:string, code:string, label:string, lang:string, transient?:boolean, private?:boolean }>, required: true }
      }
    }
  )

  FloatingVue.options.themes.cfgPopper = { $extend: 'dropdown' }

  const slots = useSlots()
  const slotVal = slots.default?.().at(0)?.children?.toString().trim() ?? 'error: provide <Config>your_key:value</Config>'

  const [key, val = value] = slotVal.split(/\s*[:=]\s*(.*)/) // split on first `:` or `=`
  const label = labelProp || ( keyOnly ? key : slotVal )
  const keyDel = keyDelim ?? '.'

  const cfgKey = ref()
  const popperVisible = ref(false)
  const group = ref()
  const pkgStr = ref()
  const rcJsonStr = ref()
  const rcJsStr = ref()
  const rcYmlStr = ref()
  const propStr = ref()
  const envStr = ref()
  const javaAppyml = ref()
  const javaEnvStr = ref()

  onMounted(() => {
    popperVisible.value = true
    const fqn = (section ? section + keyDel : '') + key
    cfgKey.value = fqn
    let value:any = !val ? '...'
    : val === 'true' ? true
    : val === 'false' ? false
    : val === 'null' ? null
    : Number(val) || val

    group.value = 'group-'+fqn

    let jsonVal
    if (typeof value === 'string' && value.trim().match(/^[[{].*[\]}]$/)) { try { jsonVal = JSON.parse(value) } catch {/*ignore*/ } }
    const pkg = toJson(fqn, jsonVal ?? value, keyDel)

    pkgStr.value = JSON.stringify(pkg, null, 2)
    rcJsonStr.value = JSON.stringify(pkg.cds??{}, null, 2)
    rcJsStr.value = 'module.exports = ' + rcJsonStr.value.replace(/"(\w*?)":/g, '$1:')
    rcYmlStr.value = yaml.stringify(pkg.cds)

    let envKey = fqn.replaceAll('_', '__').replaceAll(keyDel, '_')
    if (/^[a-z_]+$/.test(envKey)) envKey = envKey.toUpperCase() // only uppercase if not camelCase
    envStr.value = `${envKey}=${jsonVal ? JSON.stringify(jsonVal) : value}`
    propStr.value = `${fqn} = ${jsonVal ? JSON.stringify(jsonVal) : value}`

    javaAppyml.value = yaml.stringify(pkg)
    javaEnvStr.value = `-D${propStr.value}`
  })

function toJson(key:string, value:string, delim:string): Record<string, any> {
  let res  = {}
  const parts = key.split(delim)
  parts.reduce((r:Record<string,any>, a, i) => {
    r[a] = r[a] || (i < parts.length-1 ? {} : value)
    return r[a];
  }, res)
  return res
}

</script>

<style>
  .v-popper--theme-cfgPopper .v-popper__inner {
    background-color: var(--vp-code-block-bg) !important;
  }
</style>

<style scoped>
  .v-popper {
    display: inline;
  }
  a.cfg {
    color: var(--vp-c-brand-1);
    font-style: italic;
    text-decoration: underline dashed 0.5px;
  }
</style>
