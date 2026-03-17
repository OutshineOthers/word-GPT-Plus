<template>
  <CheckPointsPage
    v-if="showCheckpoints"
    :thread-id="session.threadId"
    :saver="session.saver"
    :current-checkpoint-id="session.currentCheckpointId"
    @close="showCheckpoints = false"
    @restore="onRestore"
    @select-thread="onSelectThread"
  />
  <div
    v-show="!showCheckpoints"
    class="relative flex h-full w-full flex-col items-center justify-center bg-bg-secondary p-1"
  >
    <div class="relative flex h-full w-full flex-col gap-2 rounded-md">
      <!-- Header -->
      <div class="flex justify-between rounded-sm p-1.5">
        <div class="flex flex-1 items-center gap-2 text-accent">
          <Sparkles :size="18" />
          <span class="text-sm font-semibold text-main">WORD-灵核</span>
        </div>
        <div class="flex items-center gap-1">
          <CustomButton
            :title="t('newChat')"
            :icon="Plus"
            text=""
            type="secondary"
            :icon-size="18"
            @click="onNewChat"
          />
          <CustomButton
            :title="t('settings')"
            :icon="Settings"
            text=""
            type="secondary"
            :icon-size="18"
            @click="router.push('/settings')"
          />
          <CustomButton
            :title="t('checkPoints')"
            :icon="History"
            text=""
            type="secondary"
            :icon-size="18"
            @click="showCheckpoints = true"
          />
          <CustomButton
            :title="isDark ? t('themeLight') : t('themeDark')"
            :icon="isDark ? Sun : Moon"
            text=""
            type="secondary"
            :icon-size="18"
            @click="toggleTheme"
          />
        </div>
      </div>

      <!-- Quick Actions Bar -->
      <div class="flex w-full items-center justify-center gap-2 overflow-visible rounded-md py-1">
        <CustomButton
          v-for="action in quickActions"
          :key="action.key"
          :title="action.label"
          text=""
          :icon="action.icon"
          type="secondary"
          :icon-size="16"
          class="shrink-0! bg-surface! p-1.5!"
          :disabled="session.loading"
          @click="applyQuickAction(action.key)"
        />
        <SingleSelect
          v-model="prompts.selectedPromptId"
          :key-list="prompts.savedPrompts.map(p => p.id)"
          :placeholder="t('selectPrompt')"
          title=""
          :fronticon="false"
          class="max-w-xs! flex-1! bg-surface! text-xs!"
          @change="onPromptChange"
        >
          <template #item="{ item }">
            {{ prompts.savedPrompts.find(p => p.id === item)?.name || item }}
          </template>
        </SingleSelect>
      </div>

      <!-- Chat Messages Container -->
      <div
        ref="messagesContainer"
        class="flex flex-1 flex-col gap-4 overflow-y-auto rounded-md border border-border-secondary bg-surface p-2"
      >
        <div
          v-if="session.history.length === 0"
          class="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-accent"
        >
          <Sparkles :size="32" />
          <p class="font-semibold text-main">{{ $t('emptyTitle') }}</p>
          <p class="text-xs font-semibold text-secondary">{{ $t('emptySubtitle') }}</p>
        </div>

        <ChatMessage
          v-for="(msg, index) in session.displayHistory"
          :key="(msg as MessageWithId).id || index"
          :msg="msg"
          @insert="type => insertToDocument(cleanMessageText(msg), type)"
          @copy="copyToClipboard(cleanMessageText(msg))"
        />
      </div>

      <!-- Input Area -->
      <div class="flex flex-col gap-2 rounded-md">
        <div class="flex items-center justify-between gap-2 overflow-hidden">
          <div class="flex shrink-0 gap-1 rounded-sm border border-border bg-surface p-0.5">
            <button
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none text-secondary hover:bg-accent/30 hover:text-white! [.active]:text-accent"
              :class="{ active: session.mode === 'ask' }"
              title="Ask Mode"
              @click="session.setMode('ask')"
            >
              <MessageSquare :size="14" />
            </button>
            <button
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none text-secondary hover:bg-accent/30 hover:text-white! [.active]:text-accent"
              :class="{ active: session.mode === 'agent' }"
              title="Agent Mode"
              @click="session.setMode('agent')"
            >
              <BotMessageSquare :size="17" />
            </button>
          </div>
          <div class="flex min-w-0 flex-1 gap-1 overflow-visible">
            <SingleSelect
              v-model="settingForm.api"
              :key-list="settingPreset.api.optionObj.map(item => item.value)"
              title=""
              :tight="true"
              :fronticon="false"
              :placeholder="
                settingPreset.api.optionObj
                  .find(o => o.value === settingForm.api)
                  ?.label.replace('official', 'OpenAI') || settingForm.api
              "
              class="min-w-0 flex-1"
            >
              <template #item="{ item }">
                {{
                  settingPreset.api.optionObj.find(o => o.value === item)?.label.replace('official', 'OpenAI') || item
                }}
              </template>
            </SingleSelect>
            <SingleSelect
              v-if="currentModelOptions && currentModelOptions.length > 0"
              v-model="currentModelSelect"
              :key-list="currentModelOptions"
              title=""
              :tight="true"
              :fronticon="false"
              :placeholder="currentModelSelect"
              class="min-w-0 flex-1"
            />
          </div>
        </div>
        <div
          class="flex min-w-12 items-center gap-2 rounded-md border border-border bg-surface p-2 focus-within:border-accent"
        >
          <textarea
            ref="inputTextarea"
            v-model="userInput"
            class="placeholder::text-secondary block max-h-30 flex-1 resize-none overflow-y-auto border-none bg-transparent py-2 text-xs leading-normal text-main outline-none placeholder:text-xs"
            :placeholder="session.mode === 'ask' ? $t('askAnything') : $t('directTheAgent')"
            rows="1"
            @keydown.enter.exact.prevent="sendMessage"
            @input="adjustTextareaHeight"
          />
          <button
            v-if="session.loading"
            class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-sm border-none bg-danger text-white"
            title="Stop"
            @click="session.stopGeneration()"
          >
            <Square :size="18" />
          </button>
          <button
            v-else
            class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-sm border-none bg-accent text-white disabled:cursor-not-allowed disabled:bg-accent/50"
            title="Send"
            :disabled="!userInput.trim()"
            @click="sendMessage"
          >
            <Send :size="18" />
          </button>
        </div>
        <div class="flex justify-center gap-3 px-1">
          <label class="flex h-3.5 w-3.5 flex-1 cursor-pointer items-center gap-1 text-xs text-secondary">
            <input v-model="useWordFormatting" type="checkbox" />
            <span>{{ $t('useWordFormattingLabel') }}</span>
          </label>
          <label class="flex h-3.5 w-3.5 flex-1 cursor-pointer items-center gap-1 text-xs text-secondary">
            <input v-model="useSelectedText" type="checkbox" />
            <span>{{ $t('includeSelectionLabel') }}</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { HumanMessage, type Message } from '@langchain/core/messages'
import {
  BookOpen,
  BotMessageSquare,
  CheckCircle,
  FileCheck,
  Globe,
  History,
  MessageSquare,
  Moon,
  Plus,
  Send,
  Settings,
  Sparkle,
  Sparkles,
  Square,
  Sun,
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeMount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import ChatMessage from '@/components/ChatMessage.vue'
import CustomButton from '@/components/CustomButton.vue'
import SingleSelect from '@/components/SingleSelect.vue'
import { cleanMessageText } from '@/composables'
import { useChatProcess } from '@/composables/useChatProcess'
import { useModelSelection } from '@/composables/useModelSelection'
import useSettingForm from '@/composables/useSettingForm'
import { useTheme } from '@/composables/useTheme'
import CheckPointsPage from '@/pages/checkPointsPage.vue'
import { usePromptStore, useSessionStore } from '@/stores'
import { checkAuth } from '@/utils/common'
import { buildInPrompt, getBuiltInPrompt } from '@/utils/constant'
import { localStorageKey } from '@/utils/enum'
import { message as messageUtil } from '@/utils/message'
import { settingPreset } from '@/utils/settingPreset'
import { insertFormattedResult, insertResult } from '@/utils/wordInsert'

interface MessageWithId extends Message {
  id?: string
}

const router = useRouter()
const { t } = useI18n()

const session = useSessionStore()
const prompts = usePromptStore()
const settingForm = useSettingForm()

const showCheckpoints = ref(false)
const userInput = ref('')
const messagesContainer = ref<HTMLElement>()
const inputTextarea = ref<HTMLTextAreaElement>()

const useWordFormatting = ref(localStorage.getItem(localStorageKey.useWordFormatting) !== 'false')
const useSelectedText = ref(localStorage.getItem(localStorageKey.useSelectedText) !== 'false')
const insertType = ref<insertTypes>('replace')

const { isDark, toggleTheme } = useTheme()
const { currentModelOptions, currentModelSelect } = useModelSelection(settingForm)

watch(useWordFormatting, v => localStorage.setItem(localStorageKey.useWordFormatting, String(v)))
watch(useSelectedText, v => localStorage.setItem(localStorageKey.useSelectedText, String(v)))

const quickActions = computed<{ key: keyof typeof buildInPrompt; label: string; icon: typeof Globe }[]>(() => [
  { key: 'translate', label: t('translate'), icon: Globe },
  { key: 'polish', label: t('polish'), icon: Sparkle },
  { key: 'academic', label: t('academic'), icon: BookOpen },
  { key: 'summary', label: t('summary'), icon: FileCheck },
  { key: 'grammar', label: t('grammar'), icon: CheckCircle },
])

async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const { processChat } = useChatProcess(settingForm, scrollToBottom)

function adjustTextareaHeight() {
  if (inputTextarea.value) {
    inputTextarea.value.style.height = 'auto'
    inputTextarea.value.style.height = Math.min(inputTextarea.value.scrollHeight, 120) + 'px'
  }
}

function onNewChat() {
  session.startNewChat()
  userInput.value = ''
  prompts.clearSelection()
  adjustTextareaHeight()
}

function onPromptChange() {
  const result = prompts.selectPrompt(prompts.selectedPromptId)
  if (result) {
    userInput.value = result.userPrompt
    adjustTextareaHeight()
    inputTextarea.value?.focus()
  }
}

function checkApiKey(): boolean {
  const auth = {
    type: settingForm.value.api as supportedPlatforms,
    apiKey: settingForm.value.officialAPIKey,
    azureAPIKey: settingForm.value.azureAPIKey,
    geminiAPIKey: settingForm.value.geminiAPIKey,
    groqAPIKey: settingForm.value.groqAPIKey,
  }
  if (!checkAuth(auth)) {
    messageUtil.error(t('noAPIKey'))
    return false
  }
  return true
}

async function sendMessage() {
  if (!userInput.value.trim() || session.loading) return
  if (!checkApiKey()) return

  const userMessage = userInput.value.trim()
  userInput.value = ''
  adjustTextareaHeight()

  let selectedText = ''
  if (useSelectedText.value) {
    selectedText = await Word.run(async ctx => {
      const range = ctx.document.getSelection()
      range.load('text')
      await ctx.sync()
      return range.text
    })
  }

  const fullMessage = new HumanMessage(
    selectedText ? `${userMessage}\n\n[Selected text: "${selectedText}"]` : userMessage,
  )

  scrollToBottom()
  session.loading = true
  session.createAbortController()

  try {
    await processChat(fullMessage, undefined)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      messageUtil.info(t('generationStop'))
    } else {
      console.error(error)
      messageUtil.error(t('failedToResponse'))
      session.popLastMessage()
    }
  } finally {
    session.loading = false
    session.abortController = null
  }
}

async function applyQuickAction(actionKey: keyof typeof buildInPrompt) {
  if (!checkApiKey()) return

  const selectedText = await Word.run(async ctx => {
    const range = ctx.document.getSelection()
    range.load('text')
    await ctx.sync()
    return range.text
  })

  if (!selectedText) {
    messageUtil.error(t('selectTextPrompt'))
    return
  }

  const builtInPrompts = getBuiltInPrompt()
  const action = builtInPrompts[actionKey]
  const { replyLanguage: lang } = settingForm.value

  scrollToBottom()
  session.loading = true
  session.createAbortController()

  try {
    await processChat(new HumanMessage(action.user(selectedText, lang)), action.system(lang))
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      messageUtil.info(t('generationStop'))
    } else {
      console.error(error)
      messageUtil.error(t('failedToProcessAction'))
      session.popLastMessage()
    }
  } finally {
    session.loading = false
    session.abortController = null
  }
}

async function insertToDocument(content: string, type: insertTypes) {
  insertType.value = type
  if (useWordFormatting.value) {
    await insertFormattedResult(content, insertType)
  } else {
    insertResult(content, insertType)
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  messageUtil.success(t('copied'))
}

async function onRestore(checkpointId: string) {
  await session.handleRestore(checkpointId)
  showCheckpoints.value = false
  scrollToBottom()
}

async function onSelectThread(newThreadId: string) {
  await session.handleSelectThread(newThreadId)
  showCheckpoints.value = false
  scrollToBottom()
}

const addWatch = () => {
  watch(
    () => settingForm.value.replyLanguage,
    () => localStorage.setItem(localStorageKey.replyLanguage, settingForm.value.replyLanguage),
  )
  watch(
    () => settingForm.value.api,
    () => localStorage.setItem(localStorageKey.api, settingForm.value.api),
  )
}

onBeforeMount(async () => {
  addWatch()
  insertType.value = (localStorage.getItem(localStorageKey.insertType) as insertTypes) || 'replace'
  prompts.load()
  await session.initFromStorage()
})
</script>
