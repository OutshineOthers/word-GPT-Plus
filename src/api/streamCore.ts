import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { StructuredToolInterface } from '@langchain/core/tools'
import type { Messages } from '@langchain/langgraph'
import { createAgent } from 'langchain'
import type { Ref } from 'vue'

import { getCheckpointer } from './checkpointRuntime'
import { createModel } from './providerRegistry'

export interface StreamContext {
  messages: Messages
  errorIssue: Ref<boolean | string | null>
  loading: Ref<boolean>
  abortSignal?: AbortSignal
  threadId: string
  onStream: (text: string) => void
}

export interface StreamConfig {
  tools?: StructuredToolInterface[]
  streamMode: 'messages' | 'values'
  recursionLimit?: number
  checkpointId?: string
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void
  onToolResult?: (toolName: string, result: string) => void
  processChunk: (chunk: unknown, fullContent: string) => string
}

export function buildModel(provider: string, opts: Record<string, unknown>): BaseChatModel {
  return createModel(provider, opts)
}

export async function executeStream(model: BaseChatModel, ctx: StreamContext, cfg: StreamConfig): Promise<void> {
  try {
    if (!ctx.threadId) {
      ctx.threadId = crypto.randomUUID()
    }

    const agent = createAgent({
      model,
      tools: cfg.tools ?? [],
      checkpointer: getCheckpointer(),
    })

    const stream = await agent.stream(
      { messages: ctx.messages },
      {
        recursionLimit: cfg.recursionLimit ? Number(cfg.recursionLimit) : undefined,
        signal: ctx.abortSignal,
        configurable: {
          thread_id: ctx.threadId,
          checkpoint_id: cfg.checkpointId,
        },
        streamMode: cfg.streamMode,
      },
    )

    let fullContent = ''
    for await (const chunk of stream) {
      if (ctx.abortSignal?.aborted) break
      fullContent = cfg.processChunk(chunk, fullContent)
      ctx.onStream(fullContent)
    }
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === 'AbortError' || ctx.abortSignal?.aborted)) {
      throw error
    }
    if (error instanceof Error && error.name === 'GraphRecursionError') {
      ctx.errorIssue.value = 'recursionLimitExceeded'
    } else {
      ctx.errorIssue.value = error instanceof Error ? error.message || true : true
    }
    console.error('[streamCore]', error)
  } finally {
    ctx.loading.value = false
  }
}
