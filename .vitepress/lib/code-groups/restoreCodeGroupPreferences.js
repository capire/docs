;(() => {
  // Code Group Tab Synchronization - Early Execution Script
  // This script loads preferences and applies them before Vue hydration to prevent flicker
  //
  // Features:
  // - Syncs tabs with exact or fuzzy matching ("/" delimiter)
  // - "macOS/Linux" matches "macOS/Linux", "macOS", and "Linux"
  // - "macOS" matches "macOS" and "macOS/Linux"
  // - Stores preferences by independent dimensions (runtime vs OS)
  //   - runtime: Node.js ↔ Java
  //   - os: macOS ↔ Windows ↔ Linux (+ combinations)
  // - Storage format: { "runtime": "Java", "os": "macOS" }
  // - First entry in each dimension array is the default

  // eslint-disable-next-line no-undef
  __CODE_GROUP_SHARED__

  // Clean up old localStorage entries from previous implementation
  const cleanupOldEntries = () => {
    try {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('code-group-preference:') || key.startsWith('code-group-tab:'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch {
      // localStorage might not be available
    }
  }

  cleanupOldEntries()

  const activeTabs = getActiveTabsByDimension() // eslint-disable-line no-undef
  window.__CODE_GROUP_ACTIVE_TABS__ = activeTabs

  const applyToCodeGroup = (element) => {
    const tabElements = element.querySelectorAll('.tabs label')
    const tabs = Array.from(tabElements).map((label) =>
      (label.textContent || '').trim()
    ).filter(Boolean)

    if (tabs.length === 0) return

    const selectedTab = getBestTab(tabs, activeTabs) // eslint-disable-line no-undef
    const selectedIndex = tabs.indexOf(selectedTab)

    if (selectedIndex === -1) return

    setActiveTab(element, selectedIndex) // eslint-disable-line no-undef
  }

  const getScrollOffset = () => 134

  const scrollToHash = (hash) => {
    try {
      const target = document.getElementById(decodeURIComponent(hash).slice(1))
      if (target) {
        const targetPadding = parseInt(window.getComputedStyle(target).paddingTop, 10)
        const targetTop = window.scrollY +
          target.getBoundingClientRect().top -
          getScrollOffset() +
          targetPadding

        window.scrollTo(0, targetTop)
      }
    } catch { /* ignore invalid hash */ }
  }

  const applyToAllCodeGroups = () => {
    const codeGroups = document.querySelectorAll('.vp-code-group')
    codeGroups.forEach(applyToCodeGroup)

    return codeGroups.length
  }

  const initialHash = window.location.hash
  let hashScrollPending = false

  if (initialHash) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    hashScrollPending = true
  }

  const restoreHashScroll = () => {
    if (hashScrollPending) {
      history.replaceState(null, '', window.location.pathname + window.location.search + initialHash)
      requestAnimationFrame(() => {
        scrollToHash(initialHash)
        hashScrollPending = false
      })
    }
  }

  const initialCodeGroupCount = applyToAllCodeGroups()

  if (initialCodeGroupCount > 0) restoreHashScroll()

  let observer
  const stopObserving = () => {
    observer?.disconnect()
    observer = null
  }

  if (document.readyState === 'loading' || hashScrollPending) {
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.classList?.contains('vp-code-group')) {
              applyToCodeGroup(node)
              restoreHashScroll()
            } else if (node.querySelector) {
              const codeGroups = node.querySelectorAll('.vp-code-group')
              codeGroups.forEach(applyToCodeGroup)

              if (codeGroups.length > 0) {
                restoreHashScroll()
              }
            }
          }
        }
      }
    })

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      })
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyToAllCodeGroups()
      restoreHashScroll()
      stopObserving()
    })
  } else if (!hashScrollPending) {
    stopObserving()
  }
})()