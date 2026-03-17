import { buildModel, executeStream } from './streamCore'
import type { AgentOptions } from './types'

interface AgentMessage {
  _getType?: () => string
  content?: string | unknown[]
  tool_calls?: { name: string; args: Record<string, unknown> }[]
  name?: string
}

export async function getAgentResponse(options: AgentOptions): Promise<void> {
  const model = buildModel(options.provider, options as unknown as Record<string, unknown>)

  return executeStream(
    model,
    {
      messages: options.messages,
      errorIssue: options.errorIssue,
      loading: options.loading,
      abortSignal: options.abortSignal,
      threadId: options.threadId,
      onStream: options.onStream,
    },
    {
      tools: options.tools,
      streamMode: 'values',
      recursionLimit: options.recursionLimit,
      checkpointId: options.checkpointId,
      onToolCall: options.onToolCall,
      onToolResult: options.onToolResult,
      processChunk(chunk) {
        const messages: AgentMessage[] = (chunk as { messages?: AgentMessage[] }).messages ?? []
        const lastMessage = messages[messages.length - 1]
        if (!lastMessage) return ''

        if (lastMessage._getType?.() === 'ai' && lastMessage.tool_calls?.length) {
          for (const toolCall of lastMessage.tool_calls) {
            options.onToolCall?.(toolCall.name, toolCall.args)
          }
        }

        if (lastMessage._getType?.() === 'tool') {
          options.onToolResult?.(lastMessage.name ?? 'unknown', String(lastMessage.content ?? ''))
        }

        if (lastMessage._getType?.() === 'ai' && lastMessage.content) {
          const content = typeof lastMessage.content === 'string' ? lastMessage.content : ''
          if (content && (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0)) {
            return content
          }
        }

        return ''
      },
    },
  )
}
