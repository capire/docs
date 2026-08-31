/**
 * Shared helpers for code-group preference matching and activation.
 */

export const STORAGE_KEY = 'code-group-active-tabs'

export const TAB_DIMENSIONS = {
  runtime: ['Node.js', 'Java'],
  os: ['macOS', 'Windows', 'Linux'],
  'cloud-runtime': ['Cloud Foundry', 'Kyma']
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, string>}
 */
export function isTabMap(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * @param {string} tab1
 * @param {string} tab2
 */
export function tabsMatch(tab1, tab2) {
  if (tab1 === tab2) return true

  const normalized1 = tab1.trim().toLowerCase()
  const normalized2 = tab2.trim().toLowerCase()

  if (normalized1 && normalized2 && (normalized1.includes(normalized2) || normalized2.includes(normalized1))) {
    return true
  }

  const components1 = tab1.split('/').map(s => s.trim())
  const components2 = tab2.split('/').map(s => s.trim())

  return components1.some(c1 => components2.includes(c1)) ||
    components2.some(c2 => components1.includes(c2))
}

/**
 * @param {string} tabLabel
 * @returns {string | null}
 */
export function getTabDimension(tabLabel) {
  for (const [dimension, tabs] of Object.entries(TAB_DIMENSIONS)) {
    for (const dimTab of tabs) {
      if (tabsMatch(tabLabel, dimTab)) {
        return dimension
      }
    }
  }

  return null
}

/**
 * @param {Record<string, string> | undefined} [seedTabs]
 * @returns {Record<string, string>}
 */
export function getActiveTabsByDimension(seedTabs) {
  const activeTabs = {}

  if (isTabMap(seedTabs)) {
    Object.assign(activeTabs, seedTabs)
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return activeTabs
      }
      if (isTabMap(parsed)) {
        Object.assign(activeTabs, parsed)
      }
    }
  } catch {
    // localStorage might not be available or JSON parsing failed
  }

  return activeTabs
}

/**
 * @param {Record<string, string>} activeTabs
 */
export function saveActiveTabsByDimension(activeTabs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeTabs))
  } catch {
    // localStorage might not be available
  }
}

/**
 * @param {string} tabLabel
 */
export function addActiveTab(tabLabel) {
  const activeTabs = getActiveTabsByDimension()
  const dimension = getTabDimension(tabLabel)

  if (dimension) {
    activeTabs[dimension] = tabLabel
    saveActiveTabsByDimension(activeTabs)
  }

  return activeTabs
}

/**
 * @param {string[]} tabs
 * @param {Record<string, string>} [activeTabs]
 */
export function getBestTab(tabs, activeTabs = getActiveTabsByDimension()) {
  for (const tab of tabs) {
    const dimension = getTabDimension(tab)
    if (dimension && activeTabs[dimension]) {
      const activeTab = activeTabs[dimension]
      if (tab === activeTab || tabsMatch(tab, activeTab)) {
        return tab
      }
    }
  }

  for (const tab of tabs) {
    const dimension = getTabDimension(tab)
    if (dimension && TAB_DIMENSIONS[dimension]) {
      const defaultTab = TAB_DIMENSIONS[dimension][0]
      if (tab === defaultTab || tabsMatch(tab, defaultTab)) {
        return tab
      }
    }
  }

  return tabs[0]
}

/**
 * @param {HTMLElement} element
 * @param {number} activeIndex
 */
export function setActiveTab(element, activeIndex) {
  const inputs = element.querySelectorAll('.tabs input')
  const blocks = element.querySelectorAll('div[class*="language-"], .vp-block')

  inputs.forEach((input, index) => {
    input.checked = index === activeIndex
  })

  blocks.forEach((block, index) => {
    block.classList.toggle('active', index === activeIndex)
  })
}