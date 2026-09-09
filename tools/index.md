---
description: >
  Overview of the command-line and IDE tools available for developing CAP applications.
---

# Choose Your Preferred Tools
{{$frontmatter?.description}}


<script setup>
import { useData } from 'vitepress'
const { theme } = useData()
const { versions } = theme.value.capire

import { data as pages } from './index.data.ts'
</script>

<br>
<IndexList :pages='pages' />
