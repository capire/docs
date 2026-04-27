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

  // Define independent dimensions of tabs
  // Tabs within a dimension are mutually exclusive
  // Note: First entry in each dimension is the default (used when no preference is saved)
  // Note: Combinations like "macOS/Linux" are handled automatically by fuzzy matching
  const TAB_DIMENSIONS = {
    'runtime': ['Node.js', 'Java'],
    'os': ['macOS', 'Windows', 'Linux']
  }

  // Determine which dimension a tab belongs to (including fuzzy matches)
  const getTabDimension = (tabLabel) => {
    for (const [dimension, tabs] of Object.entries(TAB_DIMENSIONS)) {
      for (const dimTab of tabs) {
        if (tabsMatch(tabLabel, dimTab)) {
          return dimension
        }
      }
    }
    return null // Unknown dimension
  }

  // Check if two tab labels match (exact or fuzzy match)
  // Treats "/" as a delimiter for combined tabs
  const tabsMatch = (tab1, tab2) => {
    if (tab1 === tab2) return true

    // Split by "/" to get components
    const components1 = tab1.split('/').map(s => s.trim())
    const components2 = tab2.split('/').map(s => s.trim())

    // Check if any component from tab1 exists in components2 or vice versa
    return components1.some(c1 => components2.includes(c1)) ||
           components2.some(c2 => components1.includes(c2))
  }

  // Get active tabs from localStorage (dimension-based storage)
  const getActiveTabsByDimension = () => {
    try {
      const stored = localStorage.getItem('code-group-active-tabs')
      if (stored) {
        const parsed = JSON.parse(stored)
        // Handle both old format (array) and new format (object)
        if (Array.isArray(parsed)) {
          // Migrate from old single-value format
          return {}
        }
        return typeof parsed === 'object' ? parsed : {}
      }
    } catch (e) {
      // localStorage might not be available or JSON parse failed
    }
    return {}
  }

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
    } catch (e) {
      // localStorage might not be available
    }
  }

  // Clean up old entries on first run
  cleanupOldEntries()

  // Determine the best tab from a set based on preferences and defaults
  const getBestTab = (tabs, activeTabs) => {
    // Check if any tab matches an active preference (exact or fuzzy match)
    for (const tab of tabs) {
      // Find which dimension this tab belongs to
      const dimension = getTabDimension(tab)
      if (dimension && activeTabs[dimension]) {
        const activeTab = activeTabs[dimension]
        // Check if this tab matches the active preference
        if (tab === activeTab || tabsMatch(tab, activeTab)) {
          return tab
        }
      }
    }

    // Apply dimension defaults (first entry in each dimension)
    for (const tab of tabs) {
      const dimension = getTabDimension(tab)
      if (dimension && TAB_DIMENSIONS[dimension]) {
        const defaultTab = TAB_DIMENSIONS[dimension][0]
        // Check if this tab matches the dimension default (exact or fuzzy)
        if (tab === defaultTab || tabsMatch(tab, defaultTab)) {
          return tab
        }
      }
    }

    // Fallback to first tab alphabetically if no match
    return tabs.sort()[0]
  }

  // Load active tabs from storage
  const activeTabs = getActiveTabsByDimension()

  // Store in global variable for later use by Vue components
  window.__CODE_GROUP_ACTIVE_TABS__ = activeTabs

  // Apply preferences to a code group element
  const applyToCodeGroup = (element) => {
    const tabElements = element.querySelectorAll('.tabs label')
    const tabs = Array.from(tabElements).map((label) =>
      (label.textContent || '').trim()
    ).filter(Boolean)

    if (tabs.length === 0) return

    // Determine which tab should be selected
    const selectedTab = getBestTab(tabs, activeTabs)
    const selectedIndex = tabs.indexOf(selectedTab)

    if (selectedIndex === -1) return

    // Apply the selection immediately to prevent flicker
    const inputs = element.querySelectorAll('.tabs input')
    const blocks = element.querySelectorAll('div[class*="language-"], .vp-block')

    inputs.forEach((input, index) => {
      input.checked = (index === selectedIndex)
    })

    blocks.forEach((block, index) => {
      if (index === selectedIndex) {
        block.classList.add('active')
      } else {
        block.classList.remove('active')
      }
    })
  }

  // Function to calculate scroll offset (matches VitePress's getScrollOffset)
  const getScrollOffset = () => {
    // Check for nav element (VitePress's default header)
    const nav = document.querySelector('.VPNav')
    if (nav) {
      return nav.offsetHeight + 24 // nav height + padding
    }
    // Fallback to checking for any fixed header
    const header = document.querySelector('header')
    if (header && window.getComputedStyle(header).position === 'fixed') {
      return header.offsetHeight + 24
    }
    return 90 // Default offset if no header found
  }

  // Function to scroll to hash (matches VitePress's scrollTo logic)
  const scrollToHash = (hash) => {
    const target = document.querySelector(hash)
    if (target) {
      const targetPadding = parseInt(window.getComputedStyle(target).paddingTop, 10)
      const targetTop = window.scrollY +
        target.getBoundingClientRect().top -
        getScrollOffset() +
        targetPadding

      window.scrollTo(0, targetTop)
    }
  }

  const applyToAllCodeGroups = () => {
    const codeGroups = document.querySelectorAll('.vp-code-group')
    codeGroups.forEach(applyToCodeGroup)
  }

  // Track if we need to restore hash scroll
  const initialHash = window.location.hash
  let hashScrollPending = false

  if (initialHash) {
    // Clear hash to prevent browser's auto-scroll
    history.replaceState(null, '', window.location.pathname + window.location.search)
    hashScrollPending = true
  }

  // Apply immediately to any existing code groups (runs synchronously)
  applyToAllCodeGroups()

  // If we have code groups and a hash, restore scroll now
  if (hashScrollPending && document.querySelectorAll('.vp-code-group').length > 0) {
    // Restore hash and scroll immediately
    history.replaceState(null, '', window.location.pathname + window.location.search + initialHash)
    // Scroll on next frame to let layout settle
    requestAnimationFrame(() => {
      scrollToHash(initialHash)
      hashScrollPending = false
    })
  }

  // Watch for code groups being added dynamically (SPA navigation, HMR in dev mode)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          if (node.classList?.contains('vp-code-group')) {
            applyToCodeGroup(node)

            // If we have a pending hash scroll and this might be the last code group, try to scroll
            if (hashScrollPending) {
              history.replaceState(null, '', window.location.pathname + window.location.search + initialHash)
              requestAnimationFrame(() => {
                scrollToHash(initialHash)
                hashScrollPending = false
              })
            }
          } else if (node.querySelector) {
            const codeGroups = node.querySelectorAll('.vp-code-group')
            codeGroups.forEach(applyToCodeGroup)

            // If we have a pending hash scroll, try to scroll after processing all code groups
            if (hashScrollPending && codeGroups.length > 0) {
              history.replaceState(null, '', window.location.pathname + window.location.search + initialHash)
              requestAnimationFrame(() => {
                scrollToHash(initialHash)
                hashScrollPending = false
              })
            }
          }
        }
      }
    }
  })

  // Start observing as soon as script runs
  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    })
  }

  // Apply again on DOMContentLoaded as safety net
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyToAllCodeGroups()

      // Final attempt to restore hash scroll if still pending
      if (hashScrollPending && initialHash) {
        history.replaceState(null, '', window.location.pathname + window.location.search + initialHash)
        requestAnimationFrame(() => {
          scrollToHash(initialHash)
          hashScrollPending = false
        })
      }
    })
  }
})()
