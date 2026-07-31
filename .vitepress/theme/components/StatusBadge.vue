<template>
  <a :href="withBase('/releases/#status-badges')">
    <Badge :type="type" :text="text" :title="title" />
  </a>
</template>

<script setup lang="ts">
defineProps<{ type: string, text:string, title:string  }>()
import { withBase } from 'vitepress'
</script>