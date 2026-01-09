<template>
  <StatusBadge
    type="tip"
    :text="`Since ${package||''} ${version}`"
    :title="`This feature is available since version ${version}${package ? ' of ' + package : ''}.`"
  />
</template>

<script setup lang="ts">
  defineProps(['version', 'package'])
</script>
