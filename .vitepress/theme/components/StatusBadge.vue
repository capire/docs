<template>
  <!-- ignore-header: excludes this link's text from the outline/TOC (see VitePress serializeHeader) -->
  <a :href="withBase('/releases/#status-badges')" class="ignore-header">
    <Badge :type="type" :text="text" :title="title" />
  </a>
</template>

<script setup lang="ts">
defineProps<{ type: string, text:string, title:string  }>()
import { withBase } from 'vitepress'
</script>