<template>
  <div class="relative flex h-full w-full items-center justify-center bg-bg-secondary">
    <div class="relative z-1 flex h-full w-full flex-col items-center justify-start gap-2 rounded-lg border-none p-2">
      <div
        class="flex w-full items-center justify-between gap-1 overflow-visible rounded-md border border-border-secondary p-0"
      >
        <div class="flex flex-wrap items-center gap-4 p-1">
          <CustomButton
            :icon="ArrowLeft"
            type="secondary"
            class="border-none p-1!"
            text=""
            :title="t('back')"
            @click="router.push('/')"
          />
        </div>
        <div class="flex-1">
          <h2 class="text-sm font-semibold text-main">{{ $t('settings') || 'Settings' }}</h2>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="flex w-full justify-between rounded-md border border-border-secondary p-0">
        <CustomButton
          v-for="tab in tabs"
          :key="tab.id"
          text=""
          :type="currentTab === tab.id ? 'primary' : 'secondary'"
          :title="$t(tab.label) || tab.defaultLabel"
          :icon="tab.icon"
          :icon-size="16"
          class="flex-1 rounded-sm border-none! p-1!"
          @click="currentTab = tab.id"
        />
      </div>

      <!-- Main Content -->
      <div class="w-full flex-1 overflow-hidden">
        <div class="no-scrollbar h-full w-full overflow-auto rounded-md border border-border">
          <!-- General Settings -->
          <div
            v-show="currentTab === 'general'"
            class="flex h-full w-full flex-col items-center gap-2 bg-bg-secondary p-1"
          >
            <SettingCard>
              <OptionSelect
                v-model="settingForm.localLanguage"
                :options="settingPreset.localLanguage.optionObj"
                :title="$t('localLanguageLabel')"
              />
            </SettingCard>
            <SettingCard>
              <OptionSelect
                v-model="settingForm.replyLanguage"
                :options="settingPreset.replyLanguage.optionObj"
                :title="$t('replyLanguageLabel')"
              />
            </SettingCard>
            <SettingCard>
              <CustomInput
                v-model.number="settingForm.agentMaxIterations"
                :title="$t('agentMaxIterationsLabel')"
                placeholder="25"
                type="number"
                :min="1"
                :max="500"
                :step="1"
              />
            </SettingCard>
          </div>

          <!-- API Provider Settings -->
          <div v-show="currentTab === 'provider'" class="flex w-full flex-col items-center gap-2 bg-bg-secondary p-1">
            <SettingCard>
              <OptionSelect
                v-model="settingForm.api"
                :options="settingPreset.api.optionObj"
                :title="$t('providerLabel')"
                :label-transform="(label: string) => label.replace('official', 'OpenAI')"
              />
            </SettingCard>

            <SettingSection
              v-for="platform in Object.keys(availableAPIs)"
              v-show="settingForm.api === platform"
              :key="platform"
            >
              <SettingCard v-for="item in getApiInputSettings(platform)" :key="item">
                <CustomInput
                  v-model="settingForm[item as SettingNames]"
                  :title="t(getLabel(item))"
                  :placeholder="t(getPlaceholder(item))"
                />
              </SettingCard>

              <SettingCard v-if="customModels.hasCustomModelsSupport(platform)" p1>
                <div class="flex flex-col items-stretch gap-2 p-3">
                  <CustomInput
                    v-model="customModels.newCustomModel.value[platform]"
                    :title="t('customModelsLabel')"
                    :placeholder="t('customModelPlaceholder')"
                    @keyup.enter="customModels.addCustomModel(platform)"
                  >
                    <template #input-extra>
                      <CustomButton
                        :icon="Plus"
                        text=""
                        class="aspect-square bg-surface"
                        type="secondary"
                        @click="customModels.addCustomModel(platform)"
                      />
                    </template>
                  </CustomInput>
                  <div v-if="customModels.customModelsMap.value[platform]?.length > 0" class="flex flex-wrap gap-1.5">
                    <span
                      v-for="model in customModels.customModelsMap.value[platform]"
                      :key="model"
                      class="inline-flex items-center gap-1 rounded-sm border border-border p-1 text-xs text-secondary hover:bg-accent/20"
                    >
                      {{ model }}
                      <button
                        class="inline-flex items-center justify-center rounded-sm p-1 text-danger hover:bg-danger/10"
                        @click="customModels.removeCustomModel(platform, model)"
                      >
                        <component :is="X" :size="12" />
                      </button>
                    </span>
                  </div>
                </div>
              </SettingCard>

              <SettingCard v-for="item in getApiSelectSettings(platform)" :key="item">
                <SingleSelect
                  v-model="settingForm[item as SettingNames]"
                  :key-list="customModels.getMergedModelOptions(platform)"
                  :title="t(getLabel(item))"
                  :fronticon="false"
                  :placeholder="settingForm[item as SettingNames]"
                />
              </SettingCard>

              <SettingCard v-for="item in getApiNumSettings(platform)" :key="item">
                <CustomInput
                  v-model.number="settingForm[item as SettingNames]"
                  :title="t(getLabel(item))"
                  :placeholder="t(getPlaceholder(item))"
                  type="number"
                  :min="0"
                  :max="item.includes('Temperature') ? 2 : 32000"
                  :step="item.includes('Temperature') ? 0.1 : 1"
                />
              </SettingCard>
            </SettingSection>
          </div>

          <!-- Prompts Settings -->
          <div
            v-show="currentTab === 'prompts'"
            class="flex w-full flex-1 flex-col items-center gap-2 bg-bg-secondary p-1"
          >
            <div class="flex h-full w-full flex-col gap-2 overflow-auto rounded-md border border-border-secondary p-2">
              <div class="flex items-center justify-between">
                <h3 class="text-center text-sm font-semibold text-main">{{ $t('savedPrompts') }}</h3>
                <CustomButton
                  :icon="Plus"
                  text=""
                  :title="t('addPrompt')"
                  class="p-1!"
                  type="secondary"
                  @click="addNewPrompt"
                />
              </div>

              <div
                v-for="prompt in prompts.savedPrompts"
                :key="prompt.id"
                class="rounded-md border border-border bg-surface p-3"
              >
                <div class="flex items-start justify-between">
                  <div class="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      v-if="editingPromptId === prompt.id"
                      v-model="editingPrompt.name"
                      class="max-w-37.5 min-w-25 flex-1 rounded-md border border-border px-2 py-1 text-sm font-semibold text-secondary focus:border-accent focus:outline-none"
                      @blur="savePromptEdit"
                      @keyup.enter="savePromptEdit"
                    />
                    <span v-else class="text-sm font-semibold text-main">{{ prompt.name }}</span>
                  </div>
                  <div class="flex shrink-0 gap-1">
                    <CustomButton
                      type="secondary"
                      :title="t('edit')"
                      :icon="Edit2"
                      class="border-none! bg-surface! p-1.5!"
                      :icon-size="14"
                      text=""
                      @click="startEditPrompt(prompt)"
                    />
                    <CustomButton
                      v-if="prompts.savedPrompts.length > 1"
                      class="border-none! bg-surface! p-1.5!"
                      :title="t('delete')"
                      type="secondary"
                      :icon="Trash2"
                      text=""
                      :icon-size="14"
                      @click="deletePrompt(prompt.id)"
                    />
                  </div>
                </div>

                <div v-if="editingPromptId === prompt.id" class="mt-3 border-t border-t-border pt-3">
                  <label class="mb-1 block text-xs font-semibold text-secondary">{{ $t('systemPrompt') }}</label>
                  <textarea
                    v-model="editingPrompt.systemPrompt"
                    class="w-full rounded-sm border border-border bg-bg-secondary px-2 py-1 text-sm leading-normal text-main transition-all duration-200 ease-apple focus:border-accent focus:outline-none"
                    rows="3"
                    :placeholder="$t('systemPromptPlaceholder')"
                  />
                  <label class="mb-1 block text-xs font-semibold text-secondary">{{ $t('userPrompt') }}</label>
                  <textarea
                    v-model="editingPrompt.userPrompt"
                    class="w-full rounded-sm border border-border bg-bg-secondary px-2 py-1 text-sm leading-normal text-main transition-all duration-200 ease-apple focus:border-accent focus:outline-none"
                    rows="3"
                    :placeholder="$t('userPromptPlaceholder')"
                  />
                  <div class="mt-3 flex gap-2">
                    <CustomButton type="primary" class="flex-1" :text="t('save')" @click="savePromptEdit" />
                    <CustomButton type="secondary" class="flex-1" :text="t('cancel')" @click="editingPromptId = ''" />
                  </div>
                </div>

                <div v-else class="mt-2">
                  <p class="overflow-hidden text-xs font-semibold text-ellipsis text-secondary">
                    {{ prompt.systemPrompt.substring(0, 100) }}{{ prompt.systemPrompt.length > 100 ? '...' : '' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Tools Settings -->
          <div
            v-show="currentTab === 'tools'"
            class="w-full flex-1 items-center gap-2 overflow-hidden bg-bg-secondary p-1"
          >
            <div class="flex h-full w-full flex-col gap-2 overflow-auto rounded-md border border-border-secondary p-2">
              <div class="rounded-md border border-border-secondary p-1">
                <h3 class="text-center text-sm font-semibold text-accent/70">{{ t('wordTools') }}</h3>
              </div>
              <div class="rounded-md border border-border-secondary p-1">
                <p class="bord text-xs leading-normal font-medium wrap-break-word text-secondary">
                  {{ t('wordToolsDescription') }}
                </p>
              </div>
              <div class="flex flex-col gap-2">
                <div
                  v-for="tool in wordToolsList"
                  :key="tool.name"
                  class="flex items-center gap-2 rounded-md border border-border bg-surface p-2 hover:border-accent"
                >
                  <input
                    :id="'tool-' + tool.name"
                    type="checkbox"
                    :checked="isToolEnabled(tool.name, !isGeneralTool(tool.name))"
                    class="h-4 w-4 cursor-pointer"
                    @change="toggleTool(tool.name, !isGeneralTool(tool.name))"
                  />
                  <div class="flex flex-col" @click="toggleTool(tool.name, !isGeneralTool(tool.name))">
                    <label :for="'tool-' + tool.name" class="text-xs font-semibold text-secondary">{{
                      $t(`wordTool_${tool.name}`)
                    }}</label>
                    <span class="text-xs text-secondary/90">{{ $t(`wordTool_${tool.name}_desc`) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Built-in Prompts Settings -->
          <div
            v-show="currentTab === 'builtinPrompts'"
            class="flex w-full flex-1 items-center gap-2 overflow-hidden bg-bg-secondary p-1"
          >
            <div class="flex h-full w-full flex-col gap-2 overflow-auto rounded-md border border-border-secondary p-2">
              <div class="rounded-md border border-border-secondary p-1">
                <h3 class="text-center text-sm font-semibold text-accent/70">
                  {{ t('builtinPrompts') || 'Built-in Prompts' }}
                </h3>
              </div>
              <div class="rounded-md border border-border-secondary p-1">
                <p class="bord text-xs leading-normal font-medium wrap-break-word text-secondary">
                  {{
                    t('builtinPromptsDescription', { language: '${language}', text: '${text}' }) ||
                    'Customize the system and user prompts for built-in tools like Translate, Polish, Academic, Summary, and Grammar.'
                  }}
                </p>
              </div>

              <div
                v-for="(promptConfig, key) in builtin.builtInPromptsData.value"
                :key="key"
                class="flex flex-col gap-2 rounded-md border border-border bg-surface p-2 hover:border-2 hover:border-accent"
              >
                <div class="flex flex-row items-start justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-secondary">{{ t(key) || key }}</span>
                  </div>
                  <div class="prompt-actions">
                    <CustomButton
                      :icon="builtin.editingBuiltinPromptKey.value === key ? Save : Edit2"
                      text=""
                      :title="builtin.editingBuiltinPromptKey.value === key ? t('save') : t('edit')"
                      class="border-none bg-surface! p-1.5!"
                      type="secondary"
                      :icon-size="14"
                      @click="builtin.toggleEditBuiltinPrompt(key)"
                    />
                    <CustomButton
                      v-if="builtin.isBuiltinPromptModified(key)"
                      :icon="RotateCcwIcon"
                      text=""
                      :title="t('reset')"
                      class="border-none bg-surface! p-1.5!"
                      type="secondary"
                      :icon-size="14"
                      @click="builtin.resetBuiltinPrompt(key)"
                    />
                  </div>
                </div>

                <div v-if="builtin.editingBuiltinPromptKey.value === key">
                  <label class="mt-2 block text-xs font-semibold text-secondary">{{ $t('systemPrompt') }}</label>
                  <textarea
                    v-model="builtin.editingBuiltinPrompt.value.system"
                    class="min-h-20 w-full rounded-md border border-border bg-bg-secondary p-2 text-xs text-main transition-all duration-200 ease-apple focus:border-accent focus:outline-none"
                    rows="3"
                    :placeholder="$t('systemPromptPlaceholder')"
                  />
                  <label class="mt-2 block text-xs font-semibold text-secondary">{{ $t('userPrompt') }}</label>
                  <textarea
                    v-model="builtin.editingBuiltinPrompt.value.user"
                    class="min-h-20 w-full rounded-md border border-border bg-bg-secondary p-2 text-xs text-main transition-all duration-200 ease-apple focus:border-accent focus:outline-none"
                    rows="4"
                    :placeholder="$t('userPromptPlaceholder')"
                  />
                </div>

                <div v-else class="mt-2">
                  <p class="mb-2 text-xs font-semibold text-secondary">{{ $t('systemPrompt') }}:</p>
                  <p class="text-xs leading-normal wrap-break-word text-secondary">
                    {{ builtin.getSystemPromptPreview(promptConfig.system) }}
                  </p>
                  <p class="mt-2 mb-2 text-xs font-semibold text-secondary">{{ $t('userPrompt') }}:</p>
                  <p class="text-xs leading-normal wrap-break-word text-secondary">
                    {{ builtin.getUserPromptPreview(promptConfig.user) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  ArrowLeft,
  Cpu,
  Edit2,
  Globe,
  MessageSquare,
  Plus,
  RotateCcwIcon,
  Save,
  Settings,
  Trash2,
  Wrench,
  X,
} from 'lucide-vue-next'
import { onBeforeMount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import CustomButton from '@/components/CustomButton.vue'
import CustomInput from '@/components/CustomInput.vue'
import OptionSelect from '@/components/OptionSelect.vue'
import SettingCard from '@/components/SettingCard.vue'
import SettingSection from '@/components/SettingSection.vue'
import SingleSelect from '@/components/SingleSelect.vue'
import { useBuiltinPrompts } from '@/composables/useBuiltinPrompts'
import { useCustomModels } from '@/composables/useCustomModels'
import useSettingForm from '@/composables/useSettingForm'
import { usePromptStore, useToolPrefsStore } from '@/stores'
import type { SavedPrompt } from '@/stores/promptStore'
import { getLabel, getPlaceholder } from '@/utils/common'
import { availableAPIs } from '@/utils/constant'
import { getGeneralToolDefinitions } from '@/utils/generalTools'
import { Setting_Names, type SettingNames, settingPreset } from '@/utils/settingPreset'
import { getWordToolDefinitions } from '@/utils/wordTools'

const { t } = useI18n()
const router = useRouter()
const settingForm = useSettingForm()
const toolPrefs = useToolPrefsStore()
const prompts = usePromptStore()

const currentTab = ref('provider')
const wordToolsList = [...getGeneralToolDefinitions(), ...getWordToolDefinitions()]

const customModels = useCustomModels(settingForm)
const builtin = useBuiltinPrompts()

const editingPromptId = ref('')
const editingPrompt = ref<SavedPrompt>({ id: '', name: '', systemPrompt: '', userPrompt: '' })

const tabs = [
  { id: 'general', label: 'general', defaultLabel: 'General', icon: Globe },
  { id: 'provider', label: 'apiProvider', defaultLabel: 'API Provider', icon: Cpu },
  { id: 'prompts', label: 'prompts', defaultLabel: 'Prompts', icon: MessageSquare },
  { id: 'builtinPrompts', label: 'builtinPrompts', defaultLabel: 'Built-in Prompts', icon: Settings },
  { id: 'tools', label: 'tools', defaultLabel: 'Tools', icon: Wrench },
]

const getApiInputSettings = (platform: string) =>
  Object.keys(settingForm.value).filter(
    key =>
      key.startsWith(platform) && settingPreset[key as SettingNames].type === 'input' && !key.endsWith('CustomModel'),
  )

const getApiNumSettings = (platform: string) =>
  Object.keys(settingForm.value).filter(
    key => key.startsWith(platform) && settingPreset[key as SettingNames].type === 'inputNum',
  )

const getApiSelectSettings = (platform: string) =>
  Object.keys(settingForm.value).filter(
    key => key.startsWith(platform) && settingPreset[key as SettingNames].type === 'select',
  )

const addNewPrompt = () => {
  const newPrompt: SavedPrompt = {
    id: `prompt_${Date.now()}`,
    name: `Prompt ${prompts.savedPrompts.length + 1}`,
    systemPrompt: '',
    userPrompt: '',
  }
  prompts.addPrompt(newPrompt)
  startEditPrompt(newPrompt)
}

const startEditPrompt = (prompt: SavedPrompt) => {
  editingPromptId.value = prompt.id
  editingPrompt.value = { ...prompt }
}

const savePromptEdit = () => {
  prompts.updatePrompt(editingPromptId.value, { ...editingPrompt.value })
  editingPromptId.value = ''
}

const deletePrompt = (id: string) => {
  if (prompts.savedPrompts.length <= 1) return
  prompts.removePrompt(id)
}

const toggleTool = (toolName: string, isWordTool: boolean) => {
  if (isWordTool) {
    toolPrefs.toggleWordTool(toolName as import('@/utils/wordTools').WordToolName)
  } else {
    toolPrefs.toggleGeneralTool(toolName as import('@/utils/generalTools').GeneralToolName)
  }
}

const isToolEnabled = (toolName: string, isWordTool: boolean): boolean => {
  if (isWordTool) return toolPrefs.isWordToolEnabled(toolName as import('@/utils/wordTools').WordToolName)
  return toolPrefs.isGeneralToolEnabled(toolName as import('@/utils/generalTools').GeneralToolName)
}

const isGeneralTool = (toolName: string): boolean =>
  toolPrefs.allGeneralTools.includes(toolName as import('@/utils/generalTools').GeneralToolName)

const addWatch = () => {
  Setting_Names.forEach(key => {
    watch(
      () => settingForm.value[key],
      () => {
        if (settingPreset[key].saveFunc) {
          const save = settingPreset[key].saveFunc as (v: string | number | string[]) => void
          save(settingForm.value[key])
          return
        }
        localStorage.setItem(settingPreset[key].saveKey || key, settingForm.value[key] as string)
      },
      { deep: true },
    )
  })
}

const initPrompts = () => {
  prompts.load()
  if (prompts.savedPrompts.length === 0) {
    prompts.addPrompt({
      id: 'default',
      name: 'Default',
      systemPrompt: settingForm.value.systemPrompt || '',
      userPrompt: settingForm.value.userPrompt || '',
    })
  }
}

onBeforeMount(() => {
  initPrompts()
  customModels.loadCustomModels()
  builtin.loadBuiltInPrompts()
  addWatch()
})
</script>
