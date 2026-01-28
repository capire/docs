<template>
  <Teleport to="body">
    <dialog id="shortcuts" ref="dialog" class="modal-dialog" v-show="visible">
      <div class="modal-content" v-if="visible">
        <div class="modal-header">
          <span class="modal-close" title="Close dialog" @click="visible = false">&times;</span>
          <h5 class="no-anchor">Keyboard Shortcuts</h5>
        </div>
        <div id="shortcuts-list" class="modal-body">
          <table>
            <tr v-for="cmd in activeCommands" :key="cmd.name">
              <td>{{ cmd.name }}</td>
              <td class="keybinding">
                <template v-for="(key, i) in cmd.keyStrings" :key="key">
                  <span v-if="i > 0"> or </span>
                  <kbd>{{ key }}</kbd>
                </template>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useData } from 'vitepress'

const { site, theme, page } = useData()
const metaKey = ref('Meta')
const keyStrokesSearch = [[metaKey, ref('K')], ref('/')]
const formattedStrokes = { Escape: 'Esc' }

onMounted(() => {
  const metaFormatted = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform) ? `⌘` : `Ctrl`
  formattedStrokes[metaKey.value] = metaFormatted
  metaKey.value = metaFormatted
  document.addEventListener('keydown', onKeyDown)
})
onUnmounted(() => document.removeEventListener('keydown', onKeyDown))

const visible = ref(false)
const dialog = ref(null) // must match to ref="dialog" from template
const querySelectorSearchInput = 'input[class=search-input]'

const showHiddenCommands = ref(false)
const commands = computed(() => [
  DOMCommand('Search', 'local-search', keyStrokesSearch, false, ()=>{}), // VP search has the actual logic
  DOMCommand('Toggle dark/light mode', 'VPSwitchAppearance', ['#']),
  DOMCommand('Toggle Node.js or Java', 'SwitchImplVariant', ['v']),
  DOMCommand('Previous page', '.pager-link.prev', ['p',',']),
  DOMCommand('Next page', '.pager-link.next', ['n','.']),
  DOMCommand('Scroll to top', '.scroll-to-top', ['t']),
  DOMCommand('Edit on GitHub', '.edit-link-button', ['e']),
  DOMCommand('Edit Secondary File on Github', 'secondary-file', ['E'], true, openSecondaryEditLink ),
  ...commandsFromConfig(),
  { name:'Show keyboard shortcuts', keys:[ref('h'),ref('?')], run: () => { visible.value = !visible.value } },
  { name:'Close dialog', keys:[ref('Escape')], hidden:true, run: () => visible.value = false },
])

const activeCommands = computed(() => commands.value
  .filter(cmd => (showHiddenCommands.value || !cmd.hidden) && ('enabled' in cmd ? cmd.enabled() : true))
  .map(cmd => {
    cmd.keyStrings = cmd.keys.map(stroke => stroke.length
      ? `${formattedStrokes[stroke[0].value]||stroke[0].value} ${formattedStrokes[stroke[1].value]||stroke[1].value}`
      : formattedStrokes[stroke.value]||stroke.value)
    return cmd
  })
)

// Close when the user clicks anywhere outside of the dialog.
// This is not a true 'modal' behavior, but still more convenient than not.
const onClickOutside = event => { if (event.target === dialog.value)  visible.value = false }

watch(visible, isVisible => {
  if (isVisible) {
    window.addEventListener('click', onClickOutside)
    dialog.value.showModal()
  } else {
    window.removeEventListener('click', onClickOutside)
    dialog.value.close()
  }
})

function onKeyDown(event) {
  const { tagName, isContentEditable } = document.activeElement
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || isContentEditable)  return
  if (document.activeElement === document.querySelectorAll(querySelectorSearchInput)[0])  return // search is active
  if (event.altKey || event.ctrlKey || event.metaKey)  return // only simple keys for now
  if (event.key === 'Shift' && visible.value) {
    showHiddenCommands.value = !showHiddenCommands.value
    return
  }
  const cmd = commands.value.find(cmd => !!cmd.keys.find(k => k.value === event.key))
  const enabled = cmd && cmd.run && ('enabled' in cmd ? cmd.enabled() : true)
  if (enabled) {
    event.preventDefault()
    cmd.run(event)
  }
}

function DOMCommand(name, idQuerySel, keys=[], hidden=false, runFn=undefined) {
  const enabled = () => {
    let element = document.getElementById(idQuerySel)
    if (element)  return element
    const elements = document.getElementsByClassName(idQuerySel)
    if (elements.length)  return elements[0]
    const sel = document.querySelectorAll(idQuerySel)
    if (sel.length)  return sel[0]
  }
  return {
    name, hidden, enabled,
    keys: keys.map(k => (k.value ?? Array.isArray(k)) ? k : ref(k)),
    run: () => {
      const element = enabled()
      if (element) {
        if (runFn) return runFn(element)
        if (window.location.hash && !element.hash)  element.hash = window.location.hash
        element.click()
      }
    }
  }
}

function commandsFromConfig() {
  return (theme.value.capire?.gotoLinks||[]).filter(link => !!link.key || !!link.href).map(link => {
    const { hostname } = new URL(link.href)
    return {
      name: `Go to ${link.name || hostname}`,
      enabled: () => window.location.hostname !== hostname,
      run: () => {
        const url = new URL(link.href)
        if (url.href.startsWith('http')) {
          url.pathname += window.location.pathname.slice(site.value.base.length) // base path may be different on the target site
          url.search = window.location.search
          url.hash = window.location.hash
        } else { // local URLs
          url.href = url.href.replace(encodeURIComponent('${filePath}'), page.value.filePath)
          const el = document.getElementById('secondary-file')
          if (el?.textContent) {
            url.href = url.href.replace(encodeURIComponent('${secondaryFilePath}'), el.textContent)
          }
          // if still unresolved placeholders, stop here
          if (url.href.match(RegExp(encodeURIComponent('${'), 'g'))) return
        }
        window.open(url, '_blank');
      },
      keys: [ref(link.key)],
      hidden: !!link.hidden
    }
  }).sort((c1, c2) => c1.name.localeCompare(c2.name))
}

function openSecondaryEditLink(element) {
  const filePath = element.textContent
  if (filePath) {
    const { pattern = '' } = theme.value.editLink || {}
    let url
    if (typeof pattern === 'function') {
      url = pattern(Object.assign({}, page.value, { filePath }))
    } else {
      url = pattern.replace(/:path/g, filePath)
    }
    if (url) {
      window.open(url, '_blank')
    }
  }
}

</script>

<style scoped>
table {
  width: 100%;
  border-style: hidden !important;
}
td, th {
  border: 1px solid var(--vp-c-divider);
  border-left: hidden !important;
}

/* Modal Dialog */
.modal-dialog {
  width: 100%; /* Full width */
  height: 100%; /* Full height */
  max-width: unset;
  max-height: unset;
  border-style: unset;
  background-color: rgba(0,0,0,0.6); /* Black w/ opacity */
}

/* Modal Content */
.modal-content {
  position: relative;
  overflow: hidden;
  resize: both;
  background-color: var(--vp-c-bg-soft);
  margin: 10% auto;
  border: 1px solid var(--vp-c-divider);
  padding: 30px 40px;
  width: 400px;
  box-shadow: 0 0 44px 44px rgba(0, 0, 0, 0.2);
  animation-name: fadeIn;
  animation-duration: 0.3s
}

/* Modal Header */
.modal-header {
  background-color: var(--vp-c-bg-soft);
}

.modal-header h5 { 
  font-weight: 600;
  margin-bottom: 20px;
  /* text-align: center; */
}

/* Modal Body */
.modal-body {
  font-size: 14px;
}

/* The Close Button */
.modal-close {
  color: gray;
  float: right;
  font-size: 20px;
  font-weight: bold;
  margin: 5px auto;
}

.modal-close:hover,
.modal-close:focus {
  color: var(--vp-button-brand-hover-bg);
  text-decoration: none;
  cursor: pointer;
}

.keybinding {
  text-align: right;
}

/* Add Animation */
@keyframes fadeIn {
  0%   { opacity:0; }
  100% { opacity:1; }
}

</style>
