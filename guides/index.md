---
section: Cookbook
status: released
---

# The CAP Cookbook
Guides and Recipes for Common Tasks
{ .subtitle}


The following figure illustrates a walkthrough of the most prominent tasks within CAP's universe of discourse (aka scope). The guides contained in this section provide details and instructions about each.

![The graphic groups topics into three phases: Development, Deploy, Use. The development phase covers topics like domain modeling, sing and providing services, databases and frontends. The deploy phase covers the deployment as well as CI/CD, monitoring and publishing APIs and packages for reuse. The use phase is about the subscription flow of multitenant applications and about customizing and extending those applications. ](cookbook.drawio.svg)

<script setup>
import { data as pages } from './index.data.ts'
</script>

<br>
<IndexList :pages='pages' />
