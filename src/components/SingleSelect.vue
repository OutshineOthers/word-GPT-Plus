<template>
  <div :class="tight ? 'mb-0' : 'mb-3'" class="flex items-center gap-2 text-sm font-medium text-main">
    <slot name="icon">
      <component :is="icon" v-if="icon" :size="iconSize" class="text-accent" />
    </slot>
    <span class="text-sm leading-[1.4] font-semibold text-secondary">{{ title }}</span>
    <span v-if="required" class="ml-1 text-danger">*</span>
  </div>
  <div ref="dropdownRef" class="sort-dropdown relative">
    <button
      ref="triggerRef"
      class="flex h-8 w-full cursor-pointer items-center justify-between gap-1 rounded-md border border-border-secondary bg-dropdown-trigger-bg px-2 py-1.5 text-sm leading-[1.4] text-dropdown-trigger-text transition-all duration-fast ease-apple hover:border-accent-hover focus:[.active]:border-accent-hover focus:[.active]:border-accent"
      :class="{ active: dropDownOpen }"
      @click="toggleDropdown()"
    >
      <component :is="customFrontIcon || SortAscIcon" v-if="fronticon" :size="14" />
      <span class="text-left text-xs font-medium text-dropdown-trigger-text">{{ placeholder || modelValue }}</span>
      <ChevronDownIcon :size="14" />
    </button>
    <div
      v-show="dropDownOpen"
      ref="optionsRef"
      class="sort-options fixed z-10 flex overflow-hidden rounded-md border border-border-secondary bg-bg-tertiary"
      :class="opensUp ? 'flex-col-reverse' : 'flex-col'"
      :style="{ maxHeight: '200px' }"
    >
      <!-- Search input -->
      <div v-if="keyList.length > 5" class="flex items-center px-2 py-1.5" :class="opensUp ? 'border-t border-border-secondary' : 'border-b border-border-secondary'">
        <SearchIcon :size="12" class="shrink-0 text-secondary" />
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          class="ml-1.5 w-full border-none bg-transparent text-xs text-main outline-none placeholder:text-secondary/60"
          :placeholder="searchPlaceholder"
          @keydown.stop
        />
      </div>
      <!-- Options list -->
      <div class="select-dropdown flex-1 overflow-y-auto">
        <button
          v-for="key in filteredList"
          :key="key"
          class="block min-h-[unset] w-full cursor-pointer whitespace-nowrap border-none bg-bg-tertiary px-2 pr-3 py-1 text-left text-sm leading-[1.4] text-main transition-all duration-fast ease-apple hover:bg-accent/50"
          @click="selectItem(key)"
        >
          <slot name="item" :item="key"> {{ key }} </slot>
        </button>
        <div v-if="filteredList.length === 0" class="px-2 py-2 text-center text-xs text-secondary">
          {{ noResultsText }}
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { ChevronDownIcon, SearchIcon, SortAscIcon } from 'lucide-vue-next'
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const emit = defineEmits<(e: 'change', key: string) => void>()
const dropdownRef = ref(null)
const modelValue = defineModel<any>()
const triggerRef = ref<HTMLElement | null>(null)
const optionsRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const searchQuery = ref('')
const opensUp = ref(false)

const filteredList = computed(() => {
  if (!searchQuery.value) return keyList
  const q = searchQuery.value.toLowerCase()
  return keyList.filter(key => key.toLowerCase().includes(q))
})

function selectItem(key: string) {
  modelValue.value = key
  dropDownOpen.value = false
  searchQuery.value = ''
  emit('change', key)
}

const dropDownOpen = ref(false)

async function toggleDropdown() {
  dropDownOpen.value = !dropDownOpen.value

  if (dropDownOpen.value) {
    searchQuery.value = ''
    await nextTick()
    updatePosition()
    // Auto-focus search input if visible
    if (keyList.length > 5) {
      searchInputRef.value?.focus()
    }
  }
}

function updatePosition() {
  const trigger = triggerRef.value
  const dropdown = optionsRef.value
  if (!trigger || !dropdown) return

  const rect = trigger.getBoundingClientRect()
  const dropdownHeight = dropdown.offsetHeight

  // Let dropdown expand to its natural content width first
  dropdown.style.width = 'auto'
  const contentWidth = dropdown.scrollWidth
  const dropdownWidth = Math.max(rect.width, contentWidth)

  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth

  // 1. 垂直位置计算：检查下方空间是否足够
  const spaceBelow = viewportHeight - rect.bottom
  const canFitBelow = spaceBelow > dropdownHeight + 10 // 预留10px间距

  if (!canFitBelow && rect.top > dropdownHeight) {
    // 空间不足且上方放得下，向上翻转 — 用 bottom 锚定，缩小时从顶部收缩
    opensUp.value = true
    dropdown.style.top = 'auto'
    dropdown.style.bottom = `${viewportHeight - rect.top + 4}px`
  } else {
    // 默认向下 — 用 top 锚定，缩小时从底部收缩
    opensUp.value = false
    dropdown.style.bottom = 'auto'
    dropdown.style.top = `${rect.bottom + 4}px`
  }

  // 2. 水平位置计算：防止右侧溢出
  let leftPos = rect.left
  if (leftPos + dropdownWidth > viewportWidth) {
    leftPos = viewportWidth - dropdownWidth - 10 // 靠右对齐并留点边距
  }

  dropdown.style.left = `${leftPos}px`
  dropdown.style.width = `${dropdownWidth}px`

  // Sync trigger width so trigger and dropdown always match
  trigger.style.minWidth = `${dropdownWidth}px`
}

onClickOutside(dropdownRef, () => {
  dropDownOpen.value = false
  searchQuery.value = ''
})

// Precompute trigger width from content so there's no visual jump on first click
async function precomputeWidth() {
  await nextTick()
  const trigger = triggerRef.value
  const dropdown = optionsRef.value
  if (!trigger || !dropdown) return

  // Temporarily show dropdown offscreen to measure natural content width
  const prevDisplay = dropdown.style.display
  const prevVisibility = dropdown.style.visibility
  const prevPosition = dropdown.style.position
  const prevWidth = dropdown.style.width

  dropdown.style.display = 'block'
  dropdown.style.visibility = 'hidden'
  dropdown.style.position = 'fixed'
  dropdown.style.width = 'auto'
  dropdown.style.left = '-9999px'

  const contentWidth = dropdown.scrollWidth
  const triggerWidth = trigger.getBoundingClientRect().width
  const finalWidth = Math.max(triggerWidth, contentWidth)

  // Restore original state
  dropdown.style.display = prevDisplay
  dropdown.style.visibility = prevVisibility
  dropdown.style.position = prevPosition
  dropdown.style.width = prevWidth
  dropdown.style.left = ''

  trigger.style.minWidth = `${finalWidth}px`
}

onMounted(precomputeWidth)
watch(() => keyList, precomputeWidth)

const {
  title,
  placeholder = '',
  fronticon = true,
  keyList,
  icon = null,
  tight = true,
  iconSize = 18,
  customFrontIcon = null,
  required = false,
  searchPlaceholder = '搜索...',
  noResultsText = '无匹配项',
} = defineProps<{
  title: string
  icon?: any
  iconSize?: number
  tight?: boolean
  placeholder?: any
  fronticon?: boolean
  customFrontIcon?: any
  keyList: string[]
  required?: boolean
  searchPlaceholder?: string
  noResultsText?: string
}>()
</script>
