<template>
  <Badge
    :type="type"
    :text="text"
    :title="title"
    @click="click" style="cursor: pointer"
  />
</template>

<script setup lang="ts">
defineProps<{ type: string, text:string, title:string  }>()

import { withBase } from 'vitepress'
function click() {
  location.href = withBase('/releases/index#feature-status-badges')
}
</script>