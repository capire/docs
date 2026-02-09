<template>
  <div class="migration-tool-container">
      <section class="version-selector">
        <div class="selector-group">
          <div class="selector-item">
            <label for="sourceVersion">Source Version</label>
            <select v-model="sourceVersion" id="sourceVersion" class="version-dropdown">
              <option value="">Select version...</option>
              <option v-for="version in versions" :key="version" :value="version">
                {{ version }}
              </option>
            </select>
          </div>
          <div class="arrow">→</div>
          <div class="selector-item">
            <label for="targetVersion">Target Version</label>
            <select v-model="targetVersion" id="targetVersion" class="version-dropdown">
              <option value="">Select version...</option>
              <option v-for="version in versions" :key="version" :value="version">
                {{ version }}
              </option>
            </select>
          </div>
        </div>
        <button @click="showMigrations" class="btn-primary">Show Migration Steps</button>
      </section>

      <section v-show="resultsVisible" class="results">
        <div class="results-header">
          <div class="header-left">
            <h3>Migration Steps</h3>
            <div class="search-container">
              <input 
                v-model="searchQuery" 
                type="text" 
                class="search-input" 
                placeholder="Search migrations..."
                @input="onSearchInput"
              >
              <button 
                v-show="searchQuery" 
                @click="clearSearch" 
                class="clear-search"
              >×</button>
            </div>
          </div>
          <div class="header-right">
            <div class="filter-buttons">
              <button 
                v-for="filter in filters" 
                :key="filter.value"
                :class="['filter-btn', { active: activeFilter === filter.value }]"
                @click="setFilter(filter.value)"
              >
                {{ filter.label }}
              </button>
              <button @click="exportToMarkdown" class="btn-export">Export Checklist</button>
            </div>
          </div>
        </div>
        <div v-show="visibleMigrations.length > 0" class="migration-list">
          <div 
            v-for="migration in visibleMigrations" 
            :key="migration.id"
            :class="['migration-card', `severity-${migration.severity}`]"
            :data-category="migration.category"
            :data-id="migration.id"
          >
            <div class="card-header">
              <h4>{{ migration.title }}</h4>
              <div class="badges">
                <span v-if="migration.severity === 'high'" class="badge severity-high">High Priority</span>
                <span v-if="migration.severity === 'medium'" class="badge severity-medium">Medium Priority</span>
                <span v-if="migration.severity === 'low'" class="badge severity-low">Low Priority</span>
                <span class="badge category-badge">{{ migration.category }}</span>
                <span v-if="migration.actionRequired" class="badge action-required">Action Required</span>
              </div>
            </div>
            <div class="version-info">
              <span class="version-tag">{{ migration.sourceVersion }}</span>
              <span class="arrow">→</span>
              <span class="version-tag">{{ migration.targetVersion }}</span>
            </div>
            <p class="description">{{ migration.description }}</p>
            <div v-if="migration.steps && migration.steps.length > 0" class="steps">
              <h5>Migration Steps:</h5>
              <ol>
                <li v-for="(step, index) in migration.steps" :key="index">{{ step }}</li>
              </ol>
            </div>
            <div v-if="migration.references && migration.references.length > 0" class="references">
              <h5>References:</h5>
              <ul>
                <li v-for="(ref, index) in migration.references" :key="index">
                  <a :href="ref" target="_blank">{{ ref }}</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div v-show="currentMigrations.length > 0 && visibleMigrations.length === 0" class="no-results">
          <p>No migrations found matching your search.</p>
        </div>
        <div v-show="currentMigrations.length === 0" class="no-results">
          <p>No migration steps found for the selected versions.</p>
        </div>
      </section>
  </div>
</template>

<script setup lang="ts">
// @ts-ignore
import { ref, computed } from 'vue'
// @ts-ignore
import migrationDataJson from '../../../../migration-data.json'

// Type definitions
interface Migration {
  id: string
  title: string
  sourceVersion: string
  targetVersion: string
  category: string
  severity: string
  actionRequired: boolean
  description: string
  steps: string[]
  references: string[]
}

// Reactive state
const sourceVersion = ref('')
const targetVersion = ref('')
const currentMigrations = ref<Migration[]>([])
const resultsVisible = ref(false)
const searchQuery = ref('')
const activeFilter = ref('all')

// Data from imported JSON
// @ts-ignore
const versions: string[] = migrationDataJson.versions
// @ts-ignore
const allMigrations: Migration[] = migrationDataJson.migrations

// Filter options
const filters = [
  { value: 'all', label: 'All' },
  { value: 'Breaking Change', label: 'Breaking Changes' },
  { value: 'Requirement', label: 'Requirements' },
  { value: 'Enhancement', label: 'Enhancements' }
]

// Computed property for visible migrations after filtering
const visibleMigrations = computed(() => {
  // @ts-ignore
  return currentMigrations.value.filter(migration => {
    // Category filter
    const matchesCategory = activeFilter.value === 'all' || migration.category === activeFilter.value
    
    // Search filter
    const searchTerm = searchQuery.value.toLowerCase()
    const matchesSearch = !searchTerm || (
      migration.title.toLowerCase().includes(searchTerm) ||
      migration.description.toLowerCase().includes(searchTerm) ||
      migration.category.toLowerCase().includes(searchTerm)
    )
    
    return matchesCategory && matchesSearch
  })
})

// Methods
function showMigrations() {
  if (!sourceVersion.value || !targetVersion.value) {
    alert('Please select both source and target versions.')
    return
  }
  
  if (parseFloat(sourceVersion.value) >= parseFloat(targetVersion.value)) {
    alert('Target version must be higher than source version.')
    return
  }
  
  const sourceNum = parseFloat(sourceVersion.value)
  const targetNum = parseFloat(targetVersion.value)
  
  // @ts-ignore
  currentMigrations.value = allMigrations.filter(migration => {
    const migrationSource = parseFloat(migration.sourceVersion)
    const migrationTarget = parseFloat(migration.targetVersion)
    
    return migrationSource >= sourceNum && migrationTarget <= targetNum
  })
  
  resultsVisible.value = true
  
  // Scroll to results with a small delay to ensure rendering
  setTimeout(() => {
    const resultsSection = document.querySelector('.results')
    if (resultsSection) {
      resultsSection.scrollIntoView({ behavior: 'smooth' })
    }
  }, 100)
}

function setFilter(filterValue: string) {
  activeFilter.value = filterValue
}

function onSearchInput() {
  // Search is handled by computed property
}

function clearSearch() {
  searchQuery.value = ''
}

function exportToMarkdown() {
  if (!sourceVersion.value || !targetVersion.value || currentMigrations.value.length === 0) {
    alert('Please select versions and show migrations first.')
    return
  }
  
  let markdown = `# CAP Migration Checklist\n\n`
  markdown += `## Migration: ${sourceVersion.value} → ${targetVersion.value}\n\n`
  markdown += `Generated: ${new Date().toLocaleDateString()}\n\n`
  markdown += `---\n\n`
  
  const categories = ['Breaking Change', 'Requirement', 'Enhancement']
  
  categories.forEach(category => {
    // @ts-ignore
    const migrations = currentMigrations.value.filter(m => m.category === category)
    
    if (migrations.length > 0) {
      markdown += `## ${category}s\n\n`
      
      migrations.forEach(migration => {
        markdown += `### ${migration.title}\n\n`
        markdown += `**Versions:** ${migration.sourceVersion} → ${migration.targetVersion}  \n`
        markdown += `**Severity:** ${migration.severity}  \n`
        markdown += `**Action Required:** ${migration.actionRequired ? 'Yes' : 'No'}  \n\n`
        markdown += `${migration.description}\n\n`
        
        if (migration.steps && migration.steps.length > 0) {
          markdown += `**Migration Steps:**\n\n`
          migration.steps.forEach((step: string, index: number) => {
            markdown += `${index + 1}. ${step}\n`
          })
          markdown += `\n`
        }
        
        if (migration.references && migration.references.length > 0) {
          markdown += `**References:**\n\n`
          migration.references.forEach((ref: string) => {
            markdown += `- ${ref}\n`
          })
          markdown += `\n`
        }
        
        markdown += `---\n\n`
      })
    }
  })
  
  markdown += `## Summary\n\n`
  markdown += `- Total migrations: ${currentMigrations.value.length}\n`
  
  downloadMarkdown(markdown, `CAP-Migration-${sourceVersion.value}-to-${targetVersion.value}.md`)
}

function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
/* Component container - use VitePress theme variables */
.migration-tool-container {
  margin: 2rem 0;
  max-width: 100%;
}

.migration-tool-container * {
  box-sizing: border-box;
}

/* Version selector */
.version-selector {
  background: var(--vp-c-bg-soft);
  padding: 30px;
  border-radius: 8px;
  margin-bottom: 30px;
  border: 1px solid var(--vp-c-divider);
}

.selector-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.selector-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selector-item label {
  font-weight: 600;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.version-dropdown {
  padding: 12px 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 1rem;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 200px;
}

.version-dropdown:hover {
  border-color: var(--vp-c-brand-1);
}

.version-dropdown:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.arrow {
  font-size: 2rem;
  color: var(--vp-c-brand-1);
  font-weight: bold;
}

.btn-primary {
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  padding: 14px 40px;
  font-size: 1.1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  font-weight: 600;
  display: block;
  margin: 0 auto;
}

.btn-primary:hover {
  background: var(--vp-c-brand-2);
  transform: translateY(-2px);
}

.btn-primary:active {
  transform: translateY(0);
}

/* Results section */
.results {
  margin-top: 40px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 20px;
}

.header-left {
  flex: 1;
  min-width: 300px;
}

.header-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}

.filter-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.results-header h3 {
  font-size: 1.8rem;
  color: var(--vp-c-text-1);
  margin-bottom: 12px;
  margin-top: 0;
}

/* Search bar */
.search-container {
  position: relative;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 1rem;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.clear-search {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.clear-search:hover {
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger-1);
  border-color: var(--vp-c-danger-1);
}

.btn-export {
  background: var(--vp-c-brand-1);
  color: white;
  border: 1px solid var(--vp-c-brand-1);
  padding: 8px 16px;
  font-size: 0.9rem;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  white-space: nowrap;
}

.btn-export:hover {
  background: var(--vp-c-brand-2);
  border-color: var(--vp-c-brand-2);
  transform: translateY(-1px);
}

.filter-btn {
  padding: 8px 16px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  font-weight: 500;
}

.filter-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.filter-btn.active {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

/* Migration list */
.migration-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.migration-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s ease;
  border-left: 4px solid var(--vp-c-divider);
}

.migration-card:hover {
  box-shadow: 0 4px 12px var(--vp-c-shadow-1);
  transform: translateY(-2px);
}

.migration-card.severity-high {
  border-left-color: #dc3545;
}

.migration-card.severity-medium {
  border-left-color: #ffc107;
}

.migration-card.severity-low {
  border-left-color: #28a745;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
  gap: 20px;
  flex-wrap: wrap;
}

.card-header h4 {
  font-size: 1.4rem;
  color: var(--vp-c-text-1);
  flex: 1;
  margin: 0;
}

.badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid;
}

.severity-high {
  background: rgba(220, 53, 69, 0.1);
  color: #c9302c;
  border-color: rgba(220, 53, 69, 0.3);
}

.dark .severity-high {
  background: rgba(220, 53, 69, 0.15);
  color: #ff6b6b;
  border-color: rgba(220, 53, 69, 0.4);
}

.severity-medium {
  background: rgba(255, 193, 7, 0.1);
  color: #d39e00;
  border-color: rgba(255, 193, 7, 0.3);
}

.dark .severity-medium {
  background: rgba(255, 193, 7, 0.15);
  color: #ffc107;
  border-color: rgba(255, 193, 7, 0.4);
}

.severity-low {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
  border-color: rgba(40, 167, 69, 0.3);
}

.dark .severity-low {
  background: rgba(40, 167, 69, 0.15);
  color: #5cb85c;
  border-color: rgba(40, 167, 69, 0.4);
}

.category-badge {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
  border-color: var(--vp-c-divider);
}

.action-required {
  background: rgba(255, 107, 107, 0.1);
  color: #d9534f;
  border-color: rgba(255, 107, 107, 0.3);
}

.dark .action-required {
  background: rgba(255, 107, 107, 0.15);
  color: #ff6b6b;
  border-color: rgba(255, 107, 107, 0.4);
}

.version-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.version-tag {
  background: var(--vp-c-default-soft);
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.version-info .arrow {
  font-size: 1rem;
  color: var(--vp-c-text-3);
}

.description {
  color: var(--vp-c-text-2);
  margin-bottom: 16px;
  line-height: 1.6;
}

.steps, .references {
  margin-top: 16px;
}

.steps h5, .references h5 {
  color: var(--vp-c-text-1);
  margin-bottom: 8px;
  font-size: 1rem;
  margin-top: 0;
}

.steps ol {
  padding-left: 24px;
  margin: 0;
}

.steps li {
  margin-bottom: 8px;
  color: var(--vp-c-text-2);
}

.references ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.references li {
  margin-bottom: 6px;
}

.references a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  word-break: break-all;
}

.references a:hover {
  color: var(--vp-c-brand-2);
  text-decoration: underline;
}

.no-results {
  text-align: center;
  padding: 60px 20px;
  color: var(--vp-c-text-2);
  font-size: 1.2rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .version-selector {
    padding: 20px;
  }

  .selector-group {
    flex-direction: column;
    gap: 15px;
  }

  .arrow {
    transform: rotate(90deg);
  }

  .version-dropdown {
    width: 100%;
  }

  .results-header {
    flex-direction: column;
    align-items: start;
  }

  .header-left,
  .header-right {
    width: 100%;
  }

  .header-right {
    align-items: stretch;
  }

  .search-container {
    max-width: 100%;
  }

  .filter-buttons {
    width: 100%;
    justify-content: flex-start;
  }

  .btn-export {
    width: auto;
  }

  .card-header {
    flex-direction: column;
    align-items: start;
  }
}
</style>
