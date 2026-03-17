import { ref } from 'vue'

import { buildInPrompt } from '@/utils/constant'

interface BuiltinPromptConfig {
  system: (language: string) => string
  user: (text: string, language: string) => string
}

export type BuiltinPromptKey = 'translate' | 'polish' | 'academic' | 'summary' | 'grammar'

export function useBuiltinPrompts() {
  const builtInPromptsData = ref<Record<BuiltinPromptKey, BuiltinPromptConfig>>({
    translate: { ...buildInPrompt.translate },
    polish: { ...buildInPrompt.polish },
    academic: { ...buildInPrompt.academic },
    summary: { ...buildInPrompt.summary },
    grammar: { ...buildInPrompt.grammar },
  })

  const editingBuiltinPromptKey = ref<BuiltinPromptKey | ''>('')
  const editingBuiltinPrompt = ref<{ system: string; user: string }>({ system: '', user: '' })
  const originalBuiltInPrompts = { ...buildInPrompt }

  function loadBuiltInPrompts() {
    const stored = localStorage.getItem('customBuiltInPrompts')
    if (!stored) return

    try {
      const customPrompts = JSON.parse(stored)
      for (const key of Object.keys(customPrompts)) {
        const typedKey = key as BuiltinPromptKey
        if (builtInPromptsData.value[typedKey]) {
          builtInPromptsData.value[typedKey] = {
            system: (language: string) => customPrompts[key].system.replace('${language}', language),
            user: (text: string, language: string) =>
              customPrompts[key].user.replace('${text}', text).replace('${language}', language),
          }
        }
      }
    } catch (error) {
      console.error('Error loading custom built-in prompts:', error)
    }
  }

  function saveBuiltInPrompts() {
    const customPrompts: Record<string, { system: string; user: string }> = {}
    for (const key of Object.keys(builtInPromptsData.value)) {
      const typedKey = key as BuiltinPromptKey
      customPrompts[key] = {
        system: builtInPromptsData.value[typedKey].system('${language}'),
        user: builtInPromptsData.value[typedKey].user('${text}', '${language}'),
      }
    }
    localStorage.setItem('customBuiltInPrompts', JSON.stringify(customPrompts))
  }

  function toggleEditBuiltinPrompt(key: BuiltinPromptKey) {
    if (editingBuiltinPromptKey.value === key) {
      builtInPromptsData.value[key] = {
        system: (language: string) => editingBuiltinPrompt.value.system.replace(/\$\{language\}/g, language),
        user: (text: string, language: string) =>
          editingBuiltinPrompt.value.user.replace(/\$\{text\}/g, text).replace(/\$\{language\}/g, language),
      }
      saveBuiltInPrompts()
      editingBuiltinPromptKey.value = ''
    } else {
      editingBuiltinPromptKey.value = key
      editingBuiltinPrompt.value = {
        system: builtInPromptsData.value[key].system('${language}'),
        user: builtInPromptsData.value[key].user('${text}', '${language}'),
      }
    }
  }

  function isBuiltinPromptModified(key: BuiltinPromptKey): boolean {
    const current = {
      system: builtInPromptsData.value[key].system('English'),
      user: builtInPromptsData.value[key].user('sample text', 'English'),
    }
    const original = {
      system: originalBuiltInPrompts[key].system('English'),
      user: originalBuiltInPrompts[key].user('sample text', 'English'),
    }
    return current.system !== original.system || current.user !== original.user
  }

  function resetBuiltinPrompt(key: BuiltinPromptKey) {
    builtInPromptsData.value[key] = { ...originalBuiltInPrompts[key] }
    saveBuiltInPrompts()
    if (editingBuiltinPromptKey.value === key) {
      editingBuiltinPromptKey.value = ''
    }
  }

  function getSystemPromptPreview(systemFunc: (language: string) => string): string {
    const full = systemFunc('English')
    return full.length > 100 ? full.substring(0, 100) + '...' : full
  }

  function getUserPromptPreview(userFunc: (text: string, language: string) => string): string {
    const full = userFunc('[selected text]', 'English')
    return full.length > 100 ? full.substring(0, 100) + '...' : full
  }

  return {
    builtInPromptsData,
    editingBuiltinPromptKey,
    editingBuiltinPrompt,
    loadBuiltInPrompts,
    toggleEditBuiltinPrompt,
    isBuiltinPromptModified,
    resetBuiltinPrompt,
    getSystemPromptPreview,
    getUserPromptPreview,
  }
}
