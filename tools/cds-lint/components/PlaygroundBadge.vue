<script setup lang="ts">
interface Props {
  name: string;
  kind: 'correct' | 'incorrect';
  rules?: Record<string, string | number | [string, string | number]> | undefined;
  files?: Array<string> | undefined;
  packages?: Record<string, string> | undefined;
  nolink?: boolean;
}
// @ts-ignore
withDefaults(defineProps<Props>(), { nolink: false })
import { compress, prettyStringify } from './eslint-online-playground/utils';
// @ts-ignore
import { data } from '../examples/examples.data.ts';

const configFileName = "eslint.config.js";
const packageJsonFileName = "package.json";

const defaultConfig: string = `import cds from '@sap/cds/eslint.config.mjs'
import cdsPlugin from '@sap/eslint-plugin-cds'

export default [
  ...cds.recommended,
  cdsPlugin.configs.js.all,
  cdsPlugin.configs.recommended,
  // %RULES%
]
`

const defaultPackageJson = JSON.parse(data['package.json']);

const is_object = x => typeof x === 'object' && x !== null && !Array.isArray(x)
function merge (o:any,...xs:any) {
  let v:any; for (let x of xs) for (let k in x)
    if (k === '__proto__' || k === 'constructor') continue //> avoid prototype pollution
    else o[k] = is_object(v=x[k]) ? merge(o[k]??={},v) : v
  return o
}

function link(name: Props['name'] = "", kind: Props['kind'], rules?: Props['rules'], files?: Props['files'], packages?: Props['packages'] ): string {
  let json = {};
  const sources = {} as Record<string, string>;
  if (rules) {
    let rulesList:string[] = []
    for (const [key, value] of Object.entries(rules)) {
      rulesList.push(`"${key}": ${JSON.stringify(value)}`);
    }
    sources[configFileName] = defaultConfig.replace(
      /\/\/ %RULES%/,
      `{\n    rules: {\n      ${rulesList.join(',\n')}\n    }\n  }`
    );
  } else{
    sources[configFileName] = defaultConfig.replace(/\/\/ %RULES%/, '');
  }
  if (packages) {
    json = merge(defaultPackageJson, packages);
  } else {
    json = defaultPackageJson;
  }
  sources[packageJsonFileName] = prettyStringify(json);
  if (files) {
    for (const file of files) {
      sources[file] = data[`${name}/${kind}/${file}`]
        ?.replace(/\/?\/?\s*\[!code.*?\]/g, ''); // remove Vitepress code comments
    }
  }
  return `https://eslint-online-playground.netlify.app/#${compress(sources)}`
}

</script>

<template>
  <Badge v-if="!nolink" type="warning">
    <a target="_blank" :href="link(name, kind, rules, files, packages)">Open In Playground</a>
  </Badge>
  <Badge v-if="nolink" type="tip">
    <a class="nolink" target="_blank">Playground link coming soon!</a>
  </Badge>
</template>

<style scoped>
.VPBadge {
  position: relative;
  float: right;
  transform: translateX(-15px) translateY(-55px);
  z-index: 1000
}

a.nolink {
  color: var(--vp-badge-info-text);
  text-decoration: none;
  pointer-events: none;
  cursor: default;
}

.headerless.th {
  display: none;
}
.vp-code {
  overflow-x: hidden !important;
}
</style>