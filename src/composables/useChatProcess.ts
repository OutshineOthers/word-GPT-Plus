import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { useI18n } from 'vue-i18n'

import { getAgentResponse, getChatResponse } from '@/api/union'
import { usePromptStore, useSessionStore, useToolPrefsStore } from '@/stores'
import { message as messageUtil } from '@/utils/message'

import { buildProviderConfig } from './useProviderConfig'
import type useSettingForm from './useSettingForm'

const agentPrompt = (lang: string) =>
  `
# Role
You are a highly skilled Microsoft Word Expert Agent. Your goal is to assist users in creating, editing, and formatting documents with professional precision.

# Capabilities
- You can interact with the document directly using provided tools (reading text, applying styles, inserting content, etc.).
- You understand document structure, typography, and professional writing standards.

# Guidelines
1. **Tool First**: If a request requires document modification or inspection or web search and fetch, prioritize using the available tools.
2. **Accuracy**: Ensure formatting and content changes are precise and follow the user's intent.
3. **Conciseness**: Provide brief, helpful explanations of your actions.
4. **Language**: You must communicate entirely in ${lang}.

# Safety
Do not perform destructive actions (like clearing the whole document) unless explicitly instructed.
`.trim()

const standardPrompt = (lang: string) =>
  `You are a helpful Microsoft Word specialist. Help users with drafting, brainstorming, and Word-related questions. Reply in ${lang}.`

export function useChatProcess(settingForm: ReturnType<typeof useSettingForm>, scrollToBottom: () => void) {
  const session = useSessionStore()
  const toolPrefs = useToolPrefsStore()
  const prompts = usePromptStore()
  const { t } = useI18n()

  async function processChat(userMessage: HumanMessage, systemPrompt?: string) {
    const { replyLanguage: lang } = settingForm.value
    const isAgentMode = session.mode === 'agent'

    const finalSystemPrompt =
      prompts.customSystemPrompt || systemPrompt || (isAgentMode ? agentPrompt(lang) : standardPrompt(lang))

    const { SystemMessage: SysMsg } = await import('@langchain/core/messages')
    const defaultSystemMessage = new SysMsg(finalSystemPrompt)

    session.pushMessage(userMessage)
    const finalMessages = [defaultSystemMessage, ...session.history]

    const currentConfig = buildProviderConfig(settingForm)
    if (!currentConfig) {
      messageUtil.error(t('notSupportedProvider'))
      return
    }

    session.pushMessage(new AIMessage(''))

    const commonOpts = {
      ...currentConfig,
      messages: finalMessages,
      errorIssue: session.errorIssue,
      loading: session.loading,
      abortSignal: session.abortController?.signal,
      threadId: session.threadId,
      onStream: (text: string) => {
        session.updateLastMessage(new AIMessage(text))
        scrollToBottom()
      },
    }

    if (isAgentMode) {
      await getAgentResponse({
        ...commonOpts,
        recursionLimit: settingForm.value.agentMaxIterations,
        tools: toolPrefs.getActiveTools(),
        checkpointId: session.currentCheckpointId,
        onToolCall: (toolName: string) => {
          const currentContent = session.getLastMessageText()
          session.updateLastMessage(new AIMessage(currentContent + `\n\n🔧 Calling tool: ${toolName}...`))
          scrollToBottom()
        },
        onToolResult: (toolName: string) => {
          const currentContent = session.getLastMessageText()
          const updatedContent = currentContent.replace(
            `🔧 Calling tool: ${toolName}...`,
            `✅ Tool ${toolName} completed`,
          )
          session.updateLastMessage(new AIMessage(updatedContent))
          scrollToBottom()
        },
      } as unknown as Parameters<typeof getAgentResponse>[0])
    } else {
      await getChatResponse(commonOpts as unknown as Parameters<typeof getChatResponse>[0])
    }

    if (session.errorIssue) {
      if (typeof session.errorIssue === 'string') {
        messageUtil.error(t(session.errorIssue))
      } else {
        messageUtil.error(t('somethingWentWrong'))
      }
      session.errorIssue = null
    }

    scrollToBottom()
  }

  return { processChat }
}
