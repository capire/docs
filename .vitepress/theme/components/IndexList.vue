<script setup>
  const { pages, list } = defineProps(['pages', 'list'])
</script>

<template>
  <ul v-if="list">
    <li v-for="p in pages" :key="p.url">
      <a :href="p.url">{{ p.title }}</a>
    </li>
  </ul>
  <dl class="index" v-else>
    <template v-for="p in pages" :key="p.url">
      <dt><a :href="p.url">{{ p.title }}</a></dt>
      <dd v-html="p.frontmatter?.description || ''"></dd>
    </template>
  </dl>
</template>

<style scoped lang="scss">
  dt {
    font-size: 17px;
    dl.index & {
      font-size: 19px;
    }
  }
  dd {
    margin: 11px 0 22px 22px;
  }
</style>