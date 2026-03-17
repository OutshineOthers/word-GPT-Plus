import { type Message, SystemMessage } from '@langchain/core/messages'
import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { computed, ref, shallowRef, triggerRef } from 'vue'

import { fetchCheckpointHistory, getSessionSaver } from '@/api/sessionApi'

export const useSessionStore = defineStore('session', () => {
  const threadId = ref(localStorage.getItem('threadId') || uuidv4())
  const mode = ref<'ask' | 'agent'>((localStorage.getItem('chatMode') as 'ask' | 'agent') || 'ask')
  const history = shallowRef<Message[]>([])
  const loading = ref(false)
  const abortController = ref<AbortController | null>(null)
  const currentCheckpointId = ref('')
  const errorIssue = ref<boolean | string | null>(false)
  const initError = ref<Error | null>(null)

  const saver = getSessionSaver()

  const displayHistory = computed(() => history.value.filter(msg => !(msg instanceof SystemMessage)))

  function persistThreadId() {
    localStorage.setItem('threadId', threadId.value)
  }

  function setMode(newMode: 'ask' | 'agent') {
    mode.value = newMode
    localStorage.setItem('chatMode', newMode)
  }

  function startNewChat() {
    if (loading.value) stopGeneration()
    history.value = []
    threadId.value = uuidv4()
    currentCheckpointId.value = ''
    persistThreadId()
  }

  function stopGeneration() {
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }
    loading.value = false
  }

  function createAbortController() {
    abortController.value = new AbortController()
    return abortController.value
  }

  function pushMessage(msg: Message) {
    history.value.push(msg)
    triggerRef(history)
  }

  function updateLastMessage(msg: Message) {
    const lastIndex = history.value.length - 1
    if (lastIndex >= 0) {
      history.value[lastIndex] = msg
      triggerRef(history)
    }
  }

  function popLastMessage() {
    history.value.pop()
    triggerRef(history)
  }

  function getLastMessageText(): string {
    const last = history.value[history.value.length - 1]
    if (!last) return ''
    const content = (last as { content: unknown }).content
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
      return content
        .map((part: unknown) => {
          if (typeof part === 'string') return part
          if (part && typeof part === 'object' && 'text' in part) return String((part as { text: string }).text)
          if (part && typeof part === 'object' && 'data' in part) return String((part as { data: string }).data)
          return ''
        })
        .join('')
    }
    return ''
  }

  async function handleRestore(checkpointId: string) {
    const result = await fetchCheckpointHistory(threadId.value, checkpointId)
    history.value = result.messages
    currentCheckpointId.value = result.checkpointId
  }

  async function loadThreadHistory(targetThreadId: string) {
    const result = await fetchCheckpointHistory(targetThreadId)
    history.value = result.messages
    currentCheckpointId.value = result.checkpointId
  }

  async function handleSelectThread(newThreadId: string) {
    threadId.value = newThreadId
    persistThreadId()
    await loadThreadHistory(newThreadId)
  }

  async function initFromStorage() {
    if (threadId.value) {
      try {
        await loadThreadHistory(threadId.value)
        initError.value = null
      } catch (e) {
        initError.value = e instanceof Error ? e : new Error(String(e))
        console.error('[sessionStore] Auto reload history failed:', e)
      }
    }
  }

  return {
    threadId,
    mode,
    history,
    loading,
    abortController,
    currentCheckpointId,
    errorIssue,
    initError,
    saver,
    displayHistory,
    setMode,
    startNewChat,
    stopGeneration,
    createAbortController,
    pushMessage,
    updateLastMessage,
    popLastMessage,
    getLastMessageText,
    handleRestore,
    loadThreadHistory,
    handleSelectThread,
    initFromStorage,
    persistThreadId,
  }
})
