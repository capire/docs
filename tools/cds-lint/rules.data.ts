import * as fs from 'fs'
import * as path from 'path'

export default {
  async load() {
    const data: any = { "Model Validation": [], "Environment": [], "Javascript": [] };
    let plugin: any;
    try {
      // @ts-ignore
      plugin = (await import('@sap/eslint-plugin-cds')).default;
    } catch {
      return data
    }
    const allCdsRules = Object.keys(plugin.configs.all.rules)
    .map((ruleName: string) => ruleName.replace('@sap/cds/', ''))
    .sort();

    for (const cdsRuleName of allCdsRules) {
      const rule = plugin.rules[cdsRuleName]
      const model = rule.meta?.model
      const category = model === 'none' ? 'Environment' : 'Model Validation';
      
      data[category].push({...ruleInfo(cdsRuleName, rule),
        model: model === 'parsed' ? '👀' : ''
      })
    }

    const allJsRuleName = Object.keys(plugin.configs.js.all.rules)
      .map((ruleName: string) => ruleName.replace('@sap/cds/', ''))
      .sort();

    for (const jsRuleName of allJsRuleName) {
      data.Javascript.push(ruleInfo(jsRuleName, plugin.rules[jsRuleName]))
    }

    return data;
  }

}

function ruleInfo (name, rule) {
  const meta = rule.meta ?? {}
  const ruleDocs = path.join(__dirname, `rules/${name}.md`)
  const hasRuleDocs = fs.existsSync(ruleDocs)
  return {
    rule: name,
    description: md2Html(meta.docs.description),
    url: hasRuleDocs ? `./${name}` : null,
    isRecommended: meta.docs?.recommended ? '✅' : '',
    hasFix: meta.fixable ? '🔧' : '',
    hasSuggestions: meta.hasSuggestions ? '💡' : '',
    model: meta.model === 'parsed' ? '👀' : ''
  }
}

function md2Html(string:string='') {
  return string
    // @ts-ignore
    .replaceAll(/`(.*?)`/g, '<code>$1</code>')
    .replaceAll(/(https?:\/\/.*?)(\s)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>$2')
}
