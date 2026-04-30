/**
 * Code Group Tab Synchronization Composable
 *
 * Manages tab preferences for VitePress code groups:
 * - Synchronizes tab selection across all code groups with exact or fuzzy matching
 * - Fuzzy matching treats "/" as delimiter: "macOS/Linux" matches both "macOS" and "Linux"
 * - Stores preferences by independent dimensions (runtime vs OS):
 *   - runtime: Node.js ↔ Java
 *   - os: Windows ↔ macOS ↔ Linux (+ combinations)
 * - Selecting "Java" won't overwrite "macOS" (different dimensions)
 * - Storage format: { "runtime": "Java", "os": "macOS" }
 * - First entry in each dimension array is the default
 */

// Define independent dimensions of tabs (must match restoreCodeGroupPreferences.js)
// Tabs within a dimension are mutually exclusive
// Note: First entry in each dimension is the default (used when no preference is saved)
// Note: Combinations like "macOS/Linux" are handled automatically by fuzzy matching
const TAB_DIMENSIONS: Record<string, string[]> = {
  'runtime': ['Node.js', 'Java'],
  'os': ['macOS', 'Windows', 'Linux']
}

interface CodeGroupInfo {
  element: HTMLElement
  tabs: string[]
}

/**
 * Determine which dimension a tab belongs to (including fuzzy matches)
 */
function getTabDimension(tabLabel: string): string | null {
  for (const [dimension, tabs] of Object.entries(TAB_DIMENSIONS)) {
    for (const dimTab of tabs) {
      if (tabsMatch(tabLabel, dimTab)) {
        return dimension
      }
    }
  }
  return null // Unknown dimension
}

/**
 * Check if two tab labels match (exact or fuzzy match)
 * Treats "/" as a delimiter for combined tabs
 * Examples:
 *   - "macOS" matches "macOS" (exact)
 *   - "macOS" matches "macOS/Linux" (fuzzy - macOS is part of the combined tab)
 *   - "macOS/Linux" matches "macOS" (fuzzy - macOS is part of the combined tab)
 *   - "Windows" does NOT match "macOS/Linux" (no overlap)
 */
function tabsMatch(tab1: string, tab2: string): boolean {
  if (tab1 === tab2) return true

  // Split by "/" to get components
  const components1 = tab1.split('/').map(s => s.trim())
  const components2 = tab2.split('/').map(s => s.trim())

  // Check if any component from tab1 exists in components2 or vice versa
  return components1.some(c1 => components2.includes(c1)) ||
         components2.some(c2 => components1.includes(c2))
}

/**
 * Get the best tab to select based on preferences and defaults
 */
function getBestTab(tabs: string[]): string {
  // Get active tabs from localStorage or early-loaded window variable
  let activeTabs: Record<string, string> = getActiveTabsByDimension()

  // Fallback to early-loaded active tabs if available
  const earlyActiveTabs = (window as any).__CODE_GROUP_ACTIVE_TABS__
  if (earlyActiveTabs && Object.keys(earlyActiveTabs).length > 0) {
    activeTabs = earlyActiveTabs
  }

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

  // Fallback to first tab alphabetically
  return [...tabs].sort()[0]
}

/**
 * Get active tabs from localStorage (dimension-based storage)
 */
function getActiveTabsByDimension(): Record<string, string> {
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

/**
 * Save active tabs to localStorage (dimension-based storage)
 */
function saveActiveTabsByDimension(activeTabs: Record<string, string>): void {
  try {
    localStorage.setItem('code-group-active-tabs', JSON.stringify(activeTabs))
  } catch (e) {
    // localStorage might not be available
  }
}

/**
 * Add a tab to the active tabs (updates only the relevant dimension)
 */
function addActiveTab(tabLabel: string): void {
  const activeTabs = getActiveTabsByDimension()
  const dimension = getTabDimension(tabLabel)

  if (dimension) {
    // Update only this dimension
    activeTabs[dimension] = tabLabel
    saveActiveTabsByDimension(activeTabs)
  }
}

/**
 * Find all code groups in the document
 */
function findCodeGroups(): CodeGroupInfo[] {
  const codeGroups: CodeGroupInfo[] = []
  const elements = document.querySelectorAll('.vp-code-group')

  elements.forEach((element) => {
    const tabElements = element.querySelectorAll('.tabs label')
    const tabs = Array.from(tabElements).map((label) =>
      (label.textContent || '').trim()
    ).filter(Boolean)

    if (tabs.length > 0) {
      codeGroups.push({
        element: element as HTMLElement,
        tabs
      })
    }
  })

  return codeGroups
}

/**
 * Apply saved preference to a code group
 */
function applyPreference(codeGroup: CodeGroupInfo): void {
  const { element, tabs } = codeGroup
  const selectedTab = getBestTab(tabs)
  const selectedIndex = tabs.indexOf(selectedTab)

  if (selectedIndex === -1) return

  // Find and check the corresponding radio button and activate content
  const labels = element.querySelectorAll('.tabs label')
  const blocks = element.querySelectorAll('div[class*="language-"], .vp-block')

  // Check if ALL tabs and blocks are already in the correct state
  // This prevents any DOM changes that could affect scroll position
  let alreadyCorrect = true

  labels.forEach((label, index) => {
    const input = element.querySelector(`.tabs input:nth-of-type(${index + 1})`) as HTMLInputElement
    const block = blocks[index] as HTMLElement

    if (index === selectedIndex) {
      // This tab should be active
      if (!input?.checked || !block?.classList.contains('active')) {
        alreadyCorrect = false
      }
    } else {
      // This tab should be inactive
      if (input?.checked || block?.classList.contains('active')) {
        alreadyCorrect = false
      }
    }
  })

  // If everything is already correct, don't touch the DOM at all
  if (alreadyCorrect) {
    return
  }

  // Apply the preference
  labels.forEach((label, index) => {
    const tabLabel = (label.textContent || '').trim()
    const input = element.querySelector(`.tabs input:nth-of-type(${index + 1})`) as HTMLInputElement
    const block = blocks[index] as HTMLElement

    if (tabLabel === selectedTab) {
      // Activate this tab
      if (input && !input.checked) {
        input.checked = true
      }
      if (block && !block.classList.contains('active')) {
        block.classList.add('active')
      }
    } else {
      // Deactivate other tabs
      if (input && input.checked) {
        input.checked = false
      }
      if (block && block.classList.contains('active')) {
        block.classList.remove('active')
      }
    }
  })
}

/**
 * Synchronize tab selection across all code groups
 * Syncs both exact tab set matches and fuzzy matches (tab label matching)
 */
function syncTabs(selectedTab: string): void {
  const codeGroups = findCodeGroups()

  codeGroups.forEach((codeGroup) => {
    // Find a matching tab in this code group (exact or fuzzy match)
    const matchingTab = codeGroup.tabs.find(tab => tabsMatch(tab, selectedTab))

    if (matchingTab) {
      const { element, tabs } = codeGroup
      const tabIndex = tabs.indexOf(matchingTab)
      const blocks = element.querySelectorAll('div[class*="language-"], .vp-block')

      if (tabIndex !== -1) {
        // Update all tabs and blocks in this code group
        tabs.forEach((_, index) => {
          const input = element.querySelector(`.tabs input:nth-of-type(${index + 1})`) as HTMLInputElement
          const block = blocks[index] as HTMLElement

          if (index === tabIndex) {
            // Activate selected tab
            if (input) input.checked = true
            if (block) block.classList.add('active')
          } else {
            // Deactivate other tabs
            if (input) input.checked = false
            if (block) block.classList.remove('active')
          }
        })
      }
    }
  })

  // Save the selected tab to active tabs
  addActiveTab(selectedTab)
}

/**
 * Setup event listeners for tab clicks
 */
function setupEventListeners(): void {
  // Use event delegation for better performance
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement

    // Check if clicked on a code group tab label or input
    const label = target.closest('.vp-code-group .tabs label') as HTMLLabelElement
    if (!label) return

    const codeGroup = target.closest('.vp-code-group') as HTMLElement
    if (!codeGroup) return

    const tabLabel = (label.textContent || '').trim()
    if (!tabLabel) return

    // Capture the viewport position of the clicked tab before syncing
    const clickedRect = label.getBoundingClientRect()

    // Sync all code groups with fuzzy matching
    syncTabs(tabLabel)

    // Restore scroll position to keep the clicked tab in view
    requestAnimationFrame(() => {
      const newRect = label.getBoundingClientRect()
      const scrollDelta = newRect.top - clickedRect.top

      if (scrollDelta !== 0) {
        window.scrollTo({
          top: (window.pageYOffset || document.documentElement.scrollTop) + scrollDelta,
          behavior: 'instant'
        })
      }
    })
  })
}

/**
 * Initialize code group synchronization
 */
function initCodeGroupSync(): void {
  // Apply saved preferences to all code groups
  const codeGroups = findCodeGroups()
  codeGroups.forEach(applyPreference)

  // Setup event listeners for future interactions
  setupEventListeners()
}

/**
 * Reinitialize for SPA navigation
 */
function reinitCodeGroupSync(): void {
  // Apply preferences to newly rendered code groups
  const codeGroups = findCodeGroups()
  codeGroups.forEach(applyPreference)
}

/**
 * Setup code group synchronization
 * Call this function when the app is mounted and after route changes
 */
export function setupCodeGroupSync(): void {
  // Initialize on first load
  if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initCodeGroupSync())
    } else {
      // DOM is already ready
      initCodeGroupSync()
    }

    // Handle dynamic content changes (e.g., hot module replacement in dev mode)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          // Check if any added nodes contain code groups
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement) {
              if (node.classList?.contains('vp-code-group') ||
                  node.querySelector?.('.vp-code-group')) {
                reinitCodeGroupSync()
                break
              }
            }
          }
        }
      }
    })

    // Start observing the document body for added code groups
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }
}

/**
 * Reinitialize after route change (for SPA navigation)
 */
export function onRouteChange(): void {
  if (typeof window !== 'undefined') {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => { reinitCodeGroupSync() }, 0)
  }
}
