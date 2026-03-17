import { type Ref, ref } from 'vue'

import { type SettingNames, settingPreset } from '@/utils/settingPreset'

const PLATFORMS_WITH_CUSTOM_MODELS = ['official', 'gemini', 'ollama', 'groq'] as const

export function useCustomModels(settingForm: Ref<Record<string, string | number | string[]>>) {
  const newCustomModel = ref<Record<string, string>>({})
  const customModelsMap = ref<Record<string, string[]>>({})

  function getCustomModelsKey(platform: string): SettingNames | null {
    const key = `${platform}CustomModels` as SettingNames
    return settingPreset[key] ? key : null
  }

  function loadCustomModels() {
    for (const platform of PLATFORMS_WITH_CUSTOM_MODELS) {
      const key = getCustomModelsKey(platform)
      if (key && settingPreset[key].getFunc) {
        customModelsMap.value[platform] = settingPreset[key].getFunc() as string[]
      }
    }
  }

  function addCustomModel(platform: string) {
    const model = newCustomModel.value[platform]?.trim()
    if (!model) return

    const key = getCustomModelsKey(platform)
    if (!key) return

    if (!customModelsMap.value[platform]) {
      customModelsMap.value[platform] = []
    }

    if (!customModelsMap.value[platform].includes(model)) {
      customModelsMap.value[platform].push(model)
      const saveFunc = settingPreset[key].saveFunc as ((v: string[]) => void) | undefined
      saveFunc?.(customModelsMap.value[platform])
      newCustomModel.value[platform] = ''
    }
  }

  function removeCustomModel(platform: string, model: string) {
    const key = getCustomModelsKey(platform)
    if (!key) return

    customModelsMap.value[platform] = customModelsMap.value[platform].filter(m => m !== model)
    const saveFunc = settingPreset[key].saveFunc as ((v: string[]) => void) | undefined
    saveFunc?.(customModelsMap.value[platform])

    const selectKey = `${platform}ModelSelect` as SettingNames
    if (settingForm.value[selectKey] === model) {
      const options = getMergedModelOptions(platform)
      if (options.length > 0) {
        settingForm.value[selectKey] = options[0]
      }
    }
  }

  function getMergedModelOptions(platform: string): string[] {
    const selectKey = `${platform}ModelSelect` as SettingNames
    const presetOptions = settingPreset[selectKey]?.optionList || []
    const customModels = customModelsMap.value[platform] || []
    return [...customModels, ...presetOptions]
  }

  function hasCustomModelsSupport(platform: string): boolean {
    return getCustomModelsKey(platform) !== null
  }

  return {
    newCustomModel,
    customModelsMap,
    loadCustomModels,
    addCustomModel,
    removeCustomModel,
    getMergedModelOptions,
    hasCustomModelsSupport,
  }
}
