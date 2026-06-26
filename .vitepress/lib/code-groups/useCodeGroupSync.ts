/**
 * Code Group Tab Synchronization Composable
 *
 * Manages tab preferences for VitePress code groups:
 * - Synchronizes tab selection across all code groups with exact or fuzzy matching
 * - Fuzzy matching treats "/" as delimiter: "macOS/Linux" matches both "macOS" and "Linux"
 * - Stores preferences by independent dimensions (runtime vs OS)
 * - Selecting a tab only updates its own dimension in persistent storage
 */

import {
  addActiveTab,
  getActiveTabsByDimension,
  getBestTab,
  setActiveTab,
  tabsMatch
} from './shared.js'

interface CodeGroupInfo {
  element: HTMLElement
  tabs: string[]
}

let hasClickListener = false
let codeGroupObserver: MutationObserver | null = null

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

function applyPreference(codeGroup: CodeGroupInfo): void {
  const { element, tabs } = codeGroup
  const selectedTab = getBestTab(
    tabs,
    getActiveTabsByDimension((window as any).__CODE_GROUP_ACTIVE_TABS__)
  )
  const selectedIndex = tabs.indexOf(selectedTab)

  if (selectedIndex !== -1) {
    setActiveTab(element, selectedIndex)
  }
}

function syncTabs(selectedTab: string): void {
  const codeGroups = findCodeGroups()

  codeGroups.forEach((codeGroup) => {
    const matchingTab = codeGroup.tabs.find(tab => tabsMatch(tab, selectedTab))

    if (matchingTab) {
      const { element, tabs } = codeGroup
      const tabIndex = tabs.indexOf(matchingTab)

      if (tabIndex !== -1) {
        setActiveTab(element, tabIndex)
      }
    }
  })

  ;(window as any).__CODE_GROUP_ACTIVE_TABS__ = addActiveTab(selectedTab)
}

function handleDocumentClick(event: Event): void {
  const target = event.target as HTMLElement | null
  const label = target?.closest('.vp-code-group .tabs label') as HTMLLabelElement | null
  if (!label) return

  const codeGroup = target?.closest('.vp-code-group') as HTMLElement | null
  if (!codeGroup) return

  const tabLabel = (label.textContent || '').trim()
  if (!tabLabel) return

  const clickedRect = label.getBoundingClientRect()

  syncTabs(tabLabel)

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
}

function ensureClickListener(enabled: boolean): void {
  if (enabled && !hasClickListener) {
    document.addEventListener('click', handleDocumentClick)
    hasClickListener = true
    return
  }

  if (!enabled && hasClickListener) {
    document.removeEventListener('click', handleDocumentClick)
    hasClickListener = false
  }
}

function startObservingCodeGroups(): void {
  if (codeGroupObserver || !document.body) return

  codeGroupObserver = new MutationObserver((mutations) => {
    let shouldReapply = false

    for (const mutation of mutations) {
      if (mutation.addedNodes.length === 0) continue

      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement &&
            (node.classList?.contains('vp-code-group') || node.querySelector?.('.vp-code-group'))) {
          shouldReapply = true
          break
        }
      }

      if (shouldReapply) break
    }

    if (shouldReapply) {
      reinitCodeGroupSync()
    }
  })

  codeGroupObserver.observe(document.body, {
    childList: true,
    subtree: true
  })
}

function initCodeGroupSync(): void {
  startObservingCodeGroups()

  const codeGroups = findCodeGroups()
  codeGroups.forEach(applyPreference)
  ensureClickListener(codeGroups.length > 0)
}

function reinitCodeGroupSync(): void {
  const codeGroups = findCodeGroups()
  codeGroups.forEach(applyPreference)
  ensureClickListener(codeGroups.length > 0)
}

export function setupCodeGroupSync(): void {
  if (typeof window === 'undefined') return

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initCodeGroupSync(), { once: true })
  } else {
    initCodeGroupSync()
  }
}

export function onRouteChange(): void {
  if (typeof window !== 'undefined') {
    setTimeout(() => { reinitCodeGroupSync() }, 0)
  }
}