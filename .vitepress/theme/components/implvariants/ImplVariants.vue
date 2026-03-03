<script setup>
import { onMounted, computed, ref, watch } from 'vue'
import { useData } from 'vitepress'
import VPSwitch from '../VPSwitch.vue'
import IconNode from './IconNode.vue'
import IconJava from './IconJava.vue'

const { frontmatter } = useData()
const supportsVariants = computed(() => !!frontmatter.value['impl-variants'])
const checked = ref(false)
const toggle = typeof localStorage !== 'undefined' ? useVariant() : () => {}
const knownImplVariants = ['node', 'java']

onMounted(() => {
  if (!supportsVariants.value) return

  const check = currentCheckState()
  // Persist value initially. If query param was used, users expect to get this value from now on.
  const variantNew = check ? 'java' : 'node'
  localStorage.setItem('impl-variant', variantNew)

  syncState(check)
})

watch(supportsVariants, (supports) => {
  if (supports) {
    syncState(currentCheckState())
  }
})

function currentCheckState() {
  const url = new URL(window.location)
  if (url.searchParams.has('impl-variant'))
    return url.searchParams.get('impl-variant') === 'java'
  return localStorage.getItem('impl-variant') === 'java'
}

function syncState(check) {
  checked.value = check

  for (const swtch of document.getElementsByClassName('SwitchImplVariant')) {
    swtch.classList.toggle('checked', check)
  }
  for (const container of document.getElementsByClassName('SwitchImplVariantContainer')) {
    container.title = check ? 'Java content. Toggle to see Node.js.' : 'Node.js content. Toggle to see Java.'
  }

  markOutlineItems()
}

function useVariant() {
  function toggle() {
    let check = currentCheckState()
    check = !check

    const variantNew = check ? 'java' : 'node'
    localStorage.setItem('impl-variant', variantNew)

    toggleContent(variantNew)
    syncState(check)

    if (supportsVariants.value) {
      const url = new URL(window.location)
      url.searchParams.set('impl-variant', variantNew)
      window.history.replaceState({}, '', url)
    }
  }
  return toggle
}

function toggleContent(variant) {
  const htmlClassList = document.documentElement.classList
  knownImplVariants.forEach(v => htmlClassList.remove(v))
  htmlClassList.add(variant)
}

// Only mark outline items here, as these are not part of the generated HTML,
// but are created on the fly with JS.
// All other DOM content is handled at build time on MD level (see md-attrs-propagate.ts)
function markOutlineItems() {
  const hashes = {}
  const impls = document.querySelectorAll('.node, .java')
  for (let each of impls) {
    hashes['#' + each.id] = each
  }
  const anchors = document.querySelectorAll('li > a.outline-link')
  for (const a of anchors) {
    const li = a.parentElement
    if (li.firstChild !== a)  continue
    const target = hashes[a.hash]
    if (target)  markClasses(li, target.classList)
  }
}

function markClasses(el, classes) {
  if (classes.contains('node'))   el.classList.add('node')
  if (classes.contains('java'))   el.classList.add('java')
}

</script>

<template>

<label title="Toggle Node/Java" class="SwitchImplVariantContainer">
  <VPSwitch
      class="SwitchImplVariant"
      :aria-checked="checked"
      @click.prevent="toggle">
    <IconNode class="icon-node" />
    <IconJava class="icon-java" />
  </VPSwitch>
</label>

</template>

<style scoped>

.icon-node {
  opacity: 1;
}

.icon-java {
  opacity: 0;
}
.checked .icon-node  {
  opacity: 0;
}

.checked .icon-java {
  opacity: 1;
}

.checked :deep(.check) {
  /*rtl:ignore*/
  transform: translateX(18px);
}

</style>
