---
section: Java
status: released
---

<style scoped>
.badges img {
  display: unset;
  margin: 0 5px;
}
</style>

# CAP Service SDK for Java

Reference Documentation { .subtitle}

<span class="badges">

<a :href="`https://javadoc.io/doc/com.sap.cds/cds-services-api/${enc(versions.java_services)}/overview-summary.html`" target="_blank" rel="noopener noreferrer" class="no-ext-link"><img :src="`https://img.shields.io/badge/cds--services-${enc(versions.java_services)}-brightgreen.svg`" title="cds-services" crossorigin/></a>
<a :href="`https://javadoc.io/doc/com.sap.cds/cds4j-api/${enc(versions.java_cds4j)}/com/sap/cds/ql/package-summary.html`" target="_blank" rel="noopener noreferrer" class="no-ext-link"><img :src="`https://img.shields.io/badge/cds4j--api-${enc(versions.java_cds4j)}-brightgreen.svg`" title="cds4j-api" crossorigin/></a>

</span>

<script setup>
import { useData } from 'vitepress'
const { theme } = useData()
const { versions } = theme.value.capire

import { data as pages } from './index.data.ts'
const enc = s => s.replace(/-/g,'--')
</script>

<br>
<IndexList :pages='pages' />
