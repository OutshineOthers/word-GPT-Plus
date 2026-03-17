<template>
  <div class="group flex items-end gap-4 [.user]:flex-row-reverse" :class="isAI ? 'assistant' : 'user'">
    <div
      class="flex min-w-0 flex-1 flex-col gap-1 group-[.assistant]:items-start group-[.assistant]:text-left group-[.user]:items-end group-[.user]:text-left"
    >
      <div
        class="group max-w-[95%] rounded-md border border-border-secondary p-1 text-sm leading-[1.4] wrap-break-word whitespace-pre-wrap text-main/90 group-[.assistant]:bg-bg-tertiary group-[.assistant]:text-left group-[.user]:bg-accent/10"
      >
        <template v-for="(segment, idx) in segments" :key="idx">
          <span v-if="segment.type === 'text'">{{ segment.text.trim() }}</span>
          <details v-else class="mb-1 rounded-sm border border-border-secondary bg-bg-secondary">
            <summary class="cursor-pointer list-none p-1 text-sm font-semibold text-secondary">Thought process</summary>
            <pre class="m-0 p-1 text-xs wrap-break-word whitespace-pre-wrap text-secondary">{{
              segment.text.trim()
            }}</pre>
          </details>
        </template>
      </div>
      <div v-if="isAI" class="flex gap-1">
        <CustomButton
          :title="t('replaceSelectedText')"
          text=""
          :icon="FileText"
          type="secondary"
          class="bg-surface! p-1.5! text-secondary!"
          :icon-size="12"
          @click="emit('insert', 'replace')"
        />
        <CustomButton
          :title="t('appendToSelection')"
          text=""
          :icon="Plus"
          type="secondary"
          class="bg-surface! p-1.5! text-secondary!"
          :icon-size="12"
          @click="emit('insert', 'append')"
        />
        <CustomButton
          :title="t('copyToClipboard')"
          text=""
          :icon="Copy"
          type="secondary"
          class="bg-surface! p-1.5! text-secondary!"
          :icon-size="12"
          @click="emit('copy')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AIMessage, type Message } from '@langchain/core/messages'
import { Copy, FileText, Plus } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { renderSegments } from '@/composables'

import CustomButton from './CustomButton.vue'

const props = defineProps<{
  msg: Message
}>()

const emit = defineEmits<{
  (e: 'insert', type: 'replace' | 'append'): void
  (e: 'copy'): void
}>()

const { t } = useI18n()
const isAI = computed(() => props.msg instanceof AIMessage)
const segments = computed(() => renderSegments(props.msg))
</script>
