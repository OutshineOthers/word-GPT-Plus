<template>
  <div class="flex flex-col">
    <label v-if="title" class="mb-1 block text-xs font-semibold text-secondary">{{ title }}</label>
    <textarea
      v-model="modelValue"
      class="w-full rounded-md border border-border bg-bg-secondary p-2 text-sm leading-normal text-main transition-all duration-200 ease-apple focus:border-accent focus:outline-none"
      :rows="rows"
      :placeholder="placeholder"
      v-bind="$attrs"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const modelValue = defineModel<string>({ required: true })

defineProps<{
  title?: string
  placeholder?: string
  rows?: number
}>()
</script>
