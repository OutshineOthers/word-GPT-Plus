<template>
  <div class="relative w-full rounded-md border border-border bg-bg-secondary" :class="p1 ? 'p-1' : 'p-3'">
    <slot></slot>
    <slot name="extra"></slot>
  </div>
</template>

<script setup lang="ts">
const { p1 = false } = defineProps<{
  p1?: boolean
}>()
</script>
