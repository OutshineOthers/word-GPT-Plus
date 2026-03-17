import { computed, type Ref } from 'vue'

import { localStorageKey } from '@/utils/enum'
import { getCustomModels, settingPreset } from '@/utils/settingPreset'

interface SettingForm {
  api: string
  officialModelSelect: string
  geminiModelSelect: string
  ollamaModelSelect: string
  groqModelSelect: string
  azureDeploymentName: string
  [key: string]: string | number | string[]
}

interface ModelConfig {
  presetKey: keyof typeof settingPreset
  customModelsKey: string
  customModelOldKey: string
  formField: keyof SettingForm
  storageKey: string
}

const MODEL_CONFIG: Record<string, ModelConfig> = {
  official: {
    presetKey: 'officialModelSelect',
    customModelsKey: localStorageKey.customModels,
    customModelOldKey: localStorageKey.customModel,
    formField: 'officialModelSelect',
    storageKey: localStorageKey.model,
  },
  gemini: {
    presetKey: 'geminiModelSelect',
    customModelsKey: localStorageKey.geminiCustomModels,
    customModelOldKey: localStorageKey.geminiCustomModel,
    formField: 'geminiModelSelect',
    storageKey: localStorageKey.geminiModel,
  },
  ollama: {
    presetKey: 'ollamaModelSelect',
    customModelsKey: localStorageKey.ollamaCustomModels,
    customModelOldKey: localStorageKey.ollamaCustomModel,
    formField: 'ollamaModelSelect',
    storageKey: localStorageKey.ollamaModel,
  },
  groq: {
    presetKey: 'groqModelSelect',
    customModelsKey: localStorageKey.groqCustomModels,
    customModelOldKey: localStorageKey.groqCustomModel,
    formField: 'groqModelSelect',
    storageKey: localStorageKey.groqModel,
  },
  azure: {
    presetKey: 'officialModelSelect',
    customModelsKey: '',
    customModelOldKey: '',
    formField: 'azureDeploymentName',
    storageKey: localStorageKey.azureDeploymentName,
  },
}

export function useModelSelection(settingForm: Ref<SettingForm>) {
  const currentModelOptions = computed(() => {
    const cfg = MODEL_CONFIG[settingForm.value.api]
    if (!cfg || settingForm.value.api === 'azure') return []

    const presetOptions = settingPreset[cfg.presetKey]?.optionList || []
    const customModels = getCustomModels(cfg.customModelsKey, cfg.customModelOldKey)
    return [...presetOptions, ...customModels]
  })

  const currentModelSelect = computed({
    get() {
      const cfg = MODEL_CONFIG[settingForm.value.api]
      if (!cfg) return ''
      return settingForm.value[cfg.formField] as string
    },
    set(value: string) {
      const cfg = MODEL_CONFIG[settingForm.value.api]
      if (!cfg) return
      settingForm.value[cfg.formField] = value
      localStorage.setItem(cfg.storageKey, value)
    },
  })

  return { currentModelOptions, currentModelSelect }
}
